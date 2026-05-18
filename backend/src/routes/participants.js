const { z } = require("zod");

const { hashPassword } = require("../lib/password");
const { requireAuth, requireRole } = require("../middleware/auth");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isDev() {
  return String(process.env.NODE_ENV || "").toLowerCase() !== "production";
}

function emptyToUndefined(value) {
  if (value === "") return undefined;
  return value;
}

function emptyToNull(value) {
  if (value === "") return null;
  return value;
}

async function getSelfParticipant(prisma, userId) {
  return prisma.participant.findUnique({
    where: { userId },
    select: { id: true, groups: { select: { groupId: true } } },
  });
}

async function getLeaderGroupIds(prisma, userId) {
  const self = await getSelfParticipant(prisma, userId);
  return (self?.groups || []).map((g) => g.groupId).filter(Boolean);
}

function registerParticipantRoutes(app, prisma) {
  app.get("/api/participants", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    const where =
      req.auth.role === "LIDER"
        ? {
            OR: [
              { userId: req.auth.userId },
              {
                groups: {
                  some: {
                    groupId: { in: await getLeaderGroupIds(prisma, req.auth.userId) },
                  },
                },
              },
            ],
          }
        : undefined;

    const participants = await prisma.participant.findMany({
      where,
      orderBy: [{ name: "asc" }],
      include: { groups: { include: { group: true } } },
    });

    res.json({ participants });
  });

  app.post("/api/participants", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      birthDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
      guardianName: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
      phone: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
      church: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
      isLeader: z.boolean().optional(),
      groupId: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
      email: z
        .preprocess(emptyToUndefined, z.string().min(3).max(320))
        .refine((v) => v === undefined || EMAIL_REGEX.test(v), { message: "INVALID_EMAIL" })
        .optional(),
      password: z.preprocess(emptyToUndefined, z.string().min(8).optional()),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR", details: isDev() ? parsed.error.issues : undefined });
      return;
    }

    const { name, birthDate, guardianName, phone, church, isLeader, groupId, email, password } = parsed.data;

    if (req.auth.role !== "ADMIN") {
      if (email || password) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
      }
      if (isLeader === true) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
      }
    }

    const leaderGroupIds = req.auth.role === "LIDER" ? await getLeaderGroupIds(prisma, req.auth.userId) : [];
    const resolvedGroupId =
      req.auth.role === "LIDER" ? (groupId || (leaderGroupIds.length === 1 ? leaderGroupIds[0] : "")) : groupId || "";

    if (req.auth.role === "LIDER") {
      if (!resolvedGroupId) {
        res.status(400).json({ error: "GROUP_REQUIRED" });
        return;
      }
      if (!leaderGroupIds.includes(resolvedGroupId)) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
      }
    }

    const data = {
      name,
      birthDate,
      guardianName,
      phone,
      church,
      isLeader: req.auth.role === "ADMIN" ? !!isLeader : false,
    };

    if (email) {
      if (!password) {
        res.status(400).json({ error: "PASSWORD_REQUIRED" });
        return;
      }

      const passwordHash = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: isLeader ? "LIDER" : "PARTICIPANTE",
        },
        select: { id: true },
      });

      data.userId = user.id;
    }

    const participant = await prisma.$transaction(async (tx) => {
      const created = await tx.participant.create({ data });
      if (resolvedGroupId) {
        await tx.groupMember.create({ data: { groupId: resolvedGroupId, participantId: created.id } });
      }
      return created;
    });

    res.status(201).json({ participant });
  });

  app.put("/api/participants/:id", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    const schema = z.object({
      name: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
      birthDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
      guardianName: z.preprocess(emptyToNull, z.string().min(1).nullable().optional()),
      phone: z.preprocess(emptyToNull, z.string().min(1).nullable().optional()),
      church: z.preprocess(emptyToNull, z.string().min(1).nullable().optional()),
      isLeader: z.boolean().optional(),
      groupId: z.preprocess(emptyToNull, z.string().min(1).nullable().optional()),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR", details: isDev() ? parsed.error.issues : undefined });
      return;
    }

    const leaderGroupIds = req.auth.role === "LIDER" ? await getLeaderGroupIds(prisma, req.auth.userId) : [];
    if (req.auth.role === "LIDER") {
      const inScope = await prisma.groupMember.findFirst({
        where: { participantId: req.params.id, groupId: { in: leaderGroupIds } },
        select: { id: true },
      });
      if (!inScope) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
      }
      if (parsed.data.isLeader !== undefined) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
      }
      if (parsed.data.groupId && !leaderGroupIds.includes(parsed.data.groupId)) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
      }
    }

    const participant = await prisma.$transaction(async (tx) => {
      const updated = await tx.participant.update({
        where: { id: req.params.id },
        data: {
          name: parsed.data.name,
          birthDate: parsed.data.birthDate === null ? null : parsed.data.birthDate,
          guardianName: parsed.data.guardianName === null ? null : parsed.data.guardianName,
          phone: parsed.data.phone === null ? null : parsed.data.phone,
          church: parsed.data.church === null ? null : parsed.data.church,
          isLeader: req.auth.role === "ADMIN" ? parsed.data.isLeader : undefined,
        },
      });

      if (parsed.data.groupId !== undefined) {
        await tx.groupMember.deleteMany({ where: { participantId: updated.id } });
        if (parsed.data.groupId) {
          await tx.groupMember.create({ data: { participantId: updated.id, groupId: parsed.data.groupId } });
        }
      }

      if (req.auth.role === "ADMIN" && parsed.data.isLeader !== undefined && updated.userId) {
        const nextRole = parsed.data.isLeader ? "LIDER" : "PARTICIPANTE";
        const current = await tx.user.findUnique({ where: { id: updated.userId }, select: { role: true } });
        if (current && current.role !== "ADMIN" && current.role !== nextRole) {
          await tx.user.update({ where: { id: updated.userId }, data: { role: nextRole } });
        }
      }

      return updated;
    });

    res.json({ participant });
  });

  app.delete("/api/participants/:id", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    const id = req.params.id;
    const participant = await prisma.participant.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!participant) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    if (req.auth.role === "LIDER") {
      const leaderGroupIds = await getLeaderGroupIds(prisma, req.auth.userId);
      const inScope = await prisma.groupMember.findFirst({
        where: { participantId: id, groupId: { in: leaderGroupIds } },
        select: { id: true },
      });
      if (!inScope) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.groupMember.deleteMany({ where: { participantId: id } });
      await tx.participant.delete({ where: { id } });

      if (participant.userId) {
        const user = await tx.user.findUnique({ where: { id: participant.userId }, select: { id: true, role: true } });
        if (user?.role === "PARTICIPANTE" || user?.role === "LIDER") {
          await tx.user.delete({ where: { id: user.id } });
        }
      }
    });

    res.json({ ok: true });
  });

  app.get("/api/participants/me", requireAuth, async (req, res) => {
    const participant = await prisma.participant.findUnique({
      where: { userId: req.auth.userId },
      include: { groups: { include: { group: true } } },
    });

    if (!participant) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    res.json({ participant });
  });
}

module.exports = { registerParticipantRoutes };
