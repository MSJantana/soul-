const { z } = require("zod");

const { requireAuth, requireRole } = require("../middleware/auth");
const { getPeriodKey } = require("../utils/periodKey");

async function getSelfParticipantId(prisma, userId) {
  const participant = await prisma.participant.findUnique({ where: { userId } });
  return participant ? participant.id : null;
}

function registerReportRoutes(app, prisma) {
  app.get("/api/reports/ranking", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    const schema = z.object({
      periodKey: z.string().min(1).optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR" });
      return;
    }

    const periodKey = parsed.data.periodKey || getPeriodKey(new Date(), "QUARTER");

    const completions = await prisma.completion.findMany({
      where: { periodKey, status: "CONCLUIDA" },
      include: {
        activity: { select: { points: true } },
        participant: { select: { id: true, name: true } },
      },
    });

    const byParticipant = new Map();
    for (const c of completions) {
      const id = c.participant.id;
      const current = byParticipant.get(id) || { participantId: id, name: c.participant.name, points: 0 };
      current.points += c.activity.points || 0;
      byParticipant.set(id, current);
    }

    const ranking = Array.from(byParticipant.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.name.localeCompare(b.name);
    });

    res.json({ periodKey, ranking });
  });

  app.get("/api/reports/participant/:id", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    const schema = z.object({
      periodKey: z.string().min(1).optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR" });
      return;
    }

    const periodKey = parsed.data.periodKey || getPeriodKey(new Date(), "QUARTER");

    const completions = await prisma.completion.findMany({
      where: { participantId: req.params.id, periodKey },
      include: { activity: true },
      orderBy: [{ updatedAt: "desc" }],
    });

    res.json({ periodKey, completions });
  });

  app.get("/api/reports/me", requireAuth, async (req, res) => {
    const schema = z.object({
      periodKey: z.string().min(1).optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR" });
      return;
    }

    const selfId = await getSelfParticipantId(prisma, req.auth.userId);
    if (!selfId) {
      res.status(403).json({ error: "NO_PARTICIPANT_PROFILE" });
      return;
    }

    const periodKey = parsed.data.periodKey || getPeriodKey(new Date(), "QUARTER");

    const completions = await prisma.completion.findMany({
      where: { participantId: selfId, periodKey },
      include: { activity: true },
      orderBy: [{ updatedAt: "desc" }],
    });

    res.json({ periodKey, participantId: selfId, completions });
  });
}

module.exports = { registerReportRoutes };

