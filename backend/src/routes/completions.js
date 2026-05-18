const { z } = require("zod");

const { requireAuth, requireRole } = require("../middleware/auth");

function emptyToNull(v) {
  const s = typeof v === "string" ? v.trim() : v;

  if (s === "") return null;

  return v;
}

async function getSelfParticipantId(prisma, userId) {
  const participant = await prisma.participant.findUnique({
    where: { userId },
    select: { id: true },
  });

  return participant ? participant.id : null;
}

async function getLeaderGroupIds(prisma, userId) {
  const selfId = await getSelfParticipantId(prisma, userId);

  if (!selfId) return [];

  const memberships = await prisma.groupMember.findMany({
    where: { participantId: selfId },
    select: { groupId: true },
  });

  return memberships.map((m) => m.groupId).filter(Boolean);
}

async function canAccessGroup(prisma, req, groupId) {
  if (req.auth.role === "ADMIN") return true;

  if (req.auth.role === "LIDER") {
    const leaderGroupIds = await getLeaderGroupIds(prisma, req.auth.userId);
    return leaderGroupIds.includes(groupId);
  }

  return false;
}

function registerCompletionRoutes(app, prisma) {
  app.get("/api/completions", requireAuth, async (req, res) => {
    res.status(410).json({ error: "DEPRECATED" });
  });

  app.put("/api/completions", requireAuth, async (req, res) => {
    res.status(410).json({ error: "DEPRECATED" });
  });

  app.get("/api/completions/by-group", requireAuth, async (req, res) => {
    const schema = z.object({
      groupId: z.string().min(1),
      periodKey: z.string().min(1),
    });

    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { groupId, periodKey } = parsed.data;

    const allowed = await canAccessGroup(prisma, req, groupId);

    if (!allowed) {
      res.status(403).json({ error: "FORBIDDEN" });
      return;
    }

    try {
      const completions = await prisma.completion.findMany({
        where: {
          groupId,
          periodKey,
        },
        select: {
          id: true,
          groupId: true,
          activityId: true,
          periodKey: true,
          status: true,
          completedAt: true,
          activityPeriod: true,
          activityPoints: true,
          isValidated: true,
          validatedAt: true,
          evidenceUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ updatedAt: "desc" }],
      });

      res.json({ completions });
    } catch (error) {
      console.error("Erro ao buscar conclusões por grupo:", error);

      res.status(500).json({
        error: "REQUEST_FAILED",
        message: "Não foi possível buscar as conclusões.",
      });
    }
  });

  app.get("/api/completions/by-group/summary", requireAuth, async (req, res) => {
    const schema = z.object({
      groupId: z.string().min(1),
      periodKey: z.string().min(1),
    });

    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { groupId, periodKey } = parsed.data;

    const allowed = await canAccessGroup(prisma, req, groupId);

    if (!allowed) {
      res.status(403).json({ error: "FORBIDDEN" });
      return;
    }

    try {
      const totalParticipants = await prisma.groupMember.count({
        where: { groupId },
      });

      const completions = await prisma.completion.findMany({
        where: {
          groupId,
          periodKey,
        },
        select: {
          activityId: true,
          status: true,
          isValidated: true,
          evidenceUrl: true,
          updatedAt: true,
        },
      });

      const byActivityId = {};

      for (const c of completions) {
        const activityId = String(c.activityId || "");

        if (!activityId) continue;

        const validated = c.isValidated === true || c.status === "CONCLUIDA";

        byActivityId[activityId] = {
          saved: 1,
          status: validated ? "CONCLUIDA" : c.status || "PENDENTE",
          isValidated: validated,
          hasEvidence: !!c.evidenceUrl,
          updatedAt: c.updatedAt,
        };
      }

      res.json({
        totalParticipants,
        byActivityId,
      });
    } catch (error) {
      console.error("Erro ao buscar resumo de conclusões:", error);

      res.status(500).json({
        error: "REQUEST_FAILED",
        message: "Não foi possível buscar o resumo.",
      });
    }
  });

  app.get("/api/completions/by-group/activity", requireAuth, async (req, res) => {
    const schema = z.object({
      groupId: z.string().min(1),
      periodKey: z.string().min(1),
      activityId: z.string().min(1),
    });

    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { groupId, activityId, periodKey } = parsed.data;

    const allowed = await canAccessGroup(prisma, req, groupId);

    if (!allowed) {
      res.status(403).json({ error: "FORBIDDEN" });
      return;
    }

    try {
      const completion = await prisma.completion.findUnique({
        where: {
          groupId_activityId_periodKey: {
            groupId,
            activityId,
            periodKey,
          },
        },
        select: {
          id: true,
          groupId: true,
          activityId: true,
          periodKey: true,
          status: true,
          completedAt: true,
          activityPeriod: true,
          activityPoints: true,
          isValidated: true,
          validatedAt: true,
          evidenceUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        completion: completion || null,
      });
    } catch (error) {
      console.error("Erro ao buscar atividade do grupo:", error);

      res.status(500).json({
        error: "REQUEST_FAILED",
        message: "Não foi possível buscar a atividade.",
      });
    }
  });

  app.put("/api/completions/by-group", requireAuth, async (req, res) => {
    const schema = z.object({
      groupId: z.string().min(1),
      activityId: z.string().min(1),
      periodKey: z.string().min(1),
      status: z.enum(["PENDENTE", "CONCLUIDA"]).optional(),
      evidenceUrl: z.preprocess(
        emptyToNull,
        z.string().min(1).max(6_000_000).nullable().optional(),
      ),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { groupId, activityId, periodKey } = parsed.data;

    const allowed = await canAccessGroup(prisma, req, groupId);

    if (!allowed) {
      res.status(403).json({ error: "FORBIDDEN" });
      return;
    }

    const status = parsed.data.status || "PENDENTE";
    const evidenceUrl =
      parsed.data.evidenceUrl === undefined ? undefined : parsed.data.evidenceUrl;

    try {
      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: {
          period: true,
          points: true,
        },
      });

      if (!activity) {
        res.status(400).json({ error: "ACTIVITY_NOT_FOUND" });
        return;
      }

      const existing = await prisma.completion.findUnique({
        where: {
          groupId_activityId_periodKey: {
            groupId,
            activityId,
            periodKey,
          },
        },
        select: {
          status: true,
          completedAt: true,
          isValidated: true,
          validatedAt: true,
        },
      });

      const alreadyValidated =
        existing?.isValidated === true || existing?.status === "CONCLUIDA";

      const now = new Date();

      const nextStatus = alreadyValidated ? "CONCLUIDA" : status;
      const nextIsValidated = alreadyValidated || status === "CONCLUIDA";
      const nextCompletedAt = alreadyValidated
        ? existing.completedAt
        : status === "CONCLUIDA"
          ? now
          : null;
      const nextValidatedAt = alreadyValidated
        ? existing.validatedAt
        : status === "CONCLUIDA"
          ? now
          : null;

      const completion = await prisma.completion.upsert({
        where: {
          groupId_activityId_periodKey: {
            groupId,
            activityId,
            periodKey,
          },
        },
        create: {
          groupId,
          activityId,
          periodKey,
          status: nextStatus,
          completedAt: nextCompletedAt,
          activityPeriod: activity.period,
          activityPoints: activity.points,
          isValidated: nextIsValidated,
          validatedAt: nextValidatedAt,
          evidenceUrl: evidenceUrl === undefined ? null : evidenceUrl,
        },
        update: {
          status: nextStatus,
          completedAt: nextCompletedAt,
          activityPeriod: activity.period,
          activityPoints: activity.points,
          isValidated: nextIsValidated,
          validatedAt: nextValidatedAt,
          ...(evidenceUrl === undefined ? {} : { evidenceUrl }),
        },
      });

      res.json({
        ok: true,
        completion,
      });
    } catch (error) {
      console.error("Erro ao salvar conclusão por grupo:", error);

      res.status(500).json({
        error: "REQUEST_FAILED",
        message: "Não foi possível salvar a conclusão.",
      });
    }
  });

  app.put("/api/completions/by-group/validate", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    const schema = z.object({
      groupId: z.string().min(1),
      activityId: z.string().min(1),
      periodKey: z.string().min(1),
      evidenceUrl: z.preprocess(
        emptyToNull,
        z.string().min(1).max(6_000_000).nullable().optional(),
      ),
    });

    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { groupId, activityId, periodKey } = parsed.data;

    const evidenceUrl =
      parsed.data.evidenceUrl === undefined ? undefined : parsed.data.evidenceUrl;

    try {
      const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        select: {
          period: true,
          points: true,
        },
      });

      if (!activity) {
        res.status(400).json({ error: "ACTIVITY_NOT_FOUND" });
        return;
      }

      const now = new Date();

      const completion = await prisma.completion.upsert({
        where: {
          groupId_activityId_periodKey: {
            groupId,
            activityId,
            periodKey,
          },
        },
        create: {
          groupId,
          activityId,
          periodKey,
          status: "CONCLUIDA",
          completedAt: now,
          activityPeriod: activity.period,
          activityPoints: activity.points,
          isValidated: true,
          validatedAt: now,
          evidenceUrl: evidenceUrl === undefined ? null : evidenceUrl,
        },
        update: {
          status: "CONCLUIDA",
          completedAt: now,
          activityPeriod: activity.period,
          activityPoints: activity.points,
          isValidated: true,
          validatedAt: now,
          ...(evidenceUrl === undefined ? {} : { evidenceUrl }),
        },
      });

      res.json({
        ok: true,
        completion,
      });
    } catch (error) {
      console.error("Erro ao validar conclusão por grupo:", error);

      res.status(500).json({
        error: "REQUEST_FAILED",
        message: "Não foi possível validar a conclusão.",
      });
    }
  });
}

module.exports = { registerCompletionRoutes };