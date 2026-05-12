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

function registerParticipantRoutes(app, prisma) {
  app.get("/api/participants", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    const participants = await prisma.participant.findMany({
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

    const { name, birthDate, guardianName, phone, email, password } = parsed.data;

    const data = {
      name,
      birthDate,
      guardianName,
      phone,
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
          role: "PARTICIPANTE",
        },
        select: { id: true },
      });

      data.userId = user.id;
    }

    const participant = await prisma.participant.create({
      data,
    });

    res.status(201).json({ participant });
  });

  app.put("/api/participants/:id", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    const schema = z.object({
      name: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
      birthDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
      guardianName: z.preprocess(emptyToNull, z.string().min(1).nullable().optional()),
      phone: z.preprocess(emptyToNull, z.string().min(1).nullable().optional()),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR", details: isDev() ? parsed.error.issues : undefined });
      return;
    }

    const participant = await prisma.participant.update({
      where: { id: req.params.id },
      data: {
        name: parsed.data.name,
        birthDate: parsed.data.birthDate === null ? null : parsed.data.birthDate,
        guardianName: parsed.data.guardianName === null ? null : parsed.data.guardianName,
        phone: parsed.data.phone === null ? null : parsed.data.phone,
      },
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

    await prisma.$transaction(async (tx) => {
      await tx.completion.deleteMany({ where: { participantId: id } });
      await tx.groupMember.deleteMany({ where: { participantId: id } });
      await tx.participant.delete({ where: { id } });

      if (participant.userId) {
        const user = await tx.user.findUnique({ where: { id: participant.userId }, select: { id: true, role: true } });
        if (user?.role === "PARTICIPANTE") {
          await tx.user.delete({ where: { id: user.id } });
        }
      }
    });

    res.json({ ok: true });
  });

  app.get("/api/participants/me", requireAuth, async (req, res) => {
    const participant = await prisma.participant.findUnique({
      where: { userId: req.auth.userId },
    });

    if (!participant) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    res.json({ participant });
  });
}

module.exports = { registerParticipantRoutes };
