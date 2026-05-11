const { z } = require("zod");

const { requireAuth } = require("../middleware/auth");

async function getSelfParticipantId(prisma, userId) {
  const participant = await prisma.participant.findUnique({ where: { userId } });
  return participant ? participant.id : null;
}

function registerCompletionRoutes(app, prisma) {
  app.get("/api/completions", requireAuth, async (req, res) => {
    const schema = z.object({
      participantId: z.string().min(1).optional(),
      periodKey: z.string().min(1).optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR" });
      return;
    }

    let participantId = parsed.data.participantId;

    if (req.auth.role === "PARTICIPANTE") {
      const selfId = await getSelfParticipantId(prisma, req.auth.userId);
      if (!selfId) {
        res.status(403).json({ error: "NO_PARTICIPANT_PROFILE" });
        return;
      }
      participantId = selfId;
    }

    if (!participantId) {
      res.status(400).json({ error: "PARTICIPANT_REQUIRED" });
      return;
    }

    const completions = await prisma.completion.findMany({
      where: {
        participantId,
        periodKey: parsed.data.periodKey,
      },
      include: { activity: true },
      orderBy: [{ updatedAt: "desc" }],
    });

    res.json({ completions });
  });

  app.put("/api/completions", requireAuth, async (req, res) => {
    const schema = z.object({
      participantId: z.string().min(1),
      activityId: z.string().min(1),
      periodKey: z.string().min(1),
      status: z.enum(["PENDENTE", "CONCLUIDA"]),
      note: z.string().min(1).optional(),
      evidenceUrl: z.string().url().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR" });
      return;
    }

    let participantId = parsed.data.participantId;

    if (req.auth.role === "PARTICIPANTE") {
      const selfId = await getSelfParticipantId(prisma, req.auth.userId);
      if (!selfId) {
        res.status(403).json({ error: "NO_PARTICIPANT_PROFILE" });
        return;
      }
      if (selfId !== participantId) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
      }
    }

    const completedAt = parsed.data.status === "CONCLUIDA" ? new Date() : null;

    const completion = await prisma.completion.upsert({
      where: {
        participantId_activityId_periodKey: {
          participantId,
          activityId: parsed.data.activityId,
          periodKey: parsed.data.periodKey,
        },
      },
      create: {
        participantId,
        activityId: parsed.data.activityId,
        periodKey: parsed.data.periodKey,
        status: parsed.data.status,
        completedAt,
        note: parsed.data.note,
        evidenceUrl: parsed.data.evidenceUrl,
      },
      update: {
        status: parsed.data.status,
        completedAt,
        note: parsed.data.note,
        evidenceUrl: parsed.data.evidenceUrl,
      },
      include: { activity: true },
    });

    res.json({ completion });
  });
}

module.exports = { registerCompletionRoutes };

