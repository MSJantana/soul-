const { z } = require("zod");

const { requireAuth, requireRole } = require("../middleware/auth");
const { getPeriodKey } = require("../utils/periodKey");

async function getSelfParticipantId(prisma, userId) {
  const participant = await prisma.participant.findUnique({ where: { userId } });
  return participant ? participant.id : null;
}

async function getLeaderGroupIds(prisma, userId) {
  const selfId = await getSelfParticipantId(prisma, userId);
  if (!selfId) return [];
  const memberships = await prisma.groupMember.findMany({ where: { participantId: selfId }, select: { groupId: true } });
  return memberships.map((m) => m.groupId).filter(Boolean);
}

function normalizePeriodType(value) {
  const raw = String(value || "").trim().toUpperCase();
  const cleaned = raw.normalize("NFD").replaceAll(/\p{Diacritic}+/gu, "");

  if (cleaned === "WEEK" || cleaned === "SEMANAL") return "WEEK";
  if (cleaned === "MONTH" || cleaned === "MES") return "MONTH";
  if (
    cleaned === "QUARTER" ||
    cleaned === "QUADRIENAL" ||
    cleaned === "TRIMESTRE" ||
    cleaned === "TRIMESTRAL"
  ) {
    return "QUARTER";
  }
  if (cleaned === "SEMESTER" || cleaned === "SEMESTRAL" || cleaned === "SEMETRAL") return "SEMESTER";
  if (cleaned === "YEAR" || cleaned === "ANO") return "YEAR";

  return null;
}

function getPeriodKeys(anchorDate, periodType, limit) {
  const keys = [];
  let cursor = new Date(anchorDate);
  cursor.setHours(12, 0, 0, 0);

  if (periodType !== "WEEK") {
    cursor.setDate(15);
  }

  for (let i = 0; i < limit; i += 1) {
    keys.push(getPeriodKey(cursor, periodType));
    if (periodType === "WEEK") {
      cursor = new Date(cursor.getTime() - 7 * 24 * 60 * 60 * 1000);
      continue;
    }

    const monthsBack =
      periodType === "MONTH" ? -1 : periodType === "QUARTER" ? -3 : periodType === "SEMESTER" ? -6 : 0;

    if (monthsBack !== 0) {
      const d = new Date(cursor);
      d.setMonth(d.getMonth() + monthsBack);
      cursor = d;
      continue;
    }

    const d = new Date(cursor);
    d.setFullYear(d.getFullYear() - 1);
    cursor = d;
  }

  return Array.from(new Set(keys)).reverse();
}

function extractYearFromPeriodKey(periodKey) {
  const raw = String(periodKey || "");
  const m = /^(\d{4})/.exec(raw);
  return m ? m[1] : null;
}

function sortRows(rows) {
  return rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.groupName.localeCompare(b.groupName);
  });
}

function registerReportRoutes(app, prisma) {
  app.get("/api/reports/ranking", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    res.status(410).json({ error: "DEPRECATED" });
  });

  app.get(
    "/api/reports/ranking-groups",
    requireAuth,
    requireRole(["ADMIN", "LIDER"]),
    async (req, res) => {
      const schema = z.object({
        periodType: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(24).optional(),
        anchor: z.string().optional(),
        includeInactiveGroups: z.coerce.boolean().optional(),
      });

      const parsed = schema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: "VALIDATION_ERROR" });
        return;
      }

      const periodType = normalizePeriodType(parsed.data.periodType) || "QUARTER";
      const limit =
        parsed.data.limit ??
        (periodType === "WEEK"
          ? 8
          : periodType === "MONTH"
            ? 6
            : periodType === "QUARTER"
              ? 4
              : periodType === "SEMESTER"
                ? 2
                : 1);
      const includeInactiveGroups = parsed.data.includeInactiveGroups === true;

      const anchorDate = parsed.data.anchor ? new Date(parsed.data.anchor) : new Date();
      if (Number.isNaN(anchorDate.getTime())) {
        res.status(400).json({ error: "INVALID_DATE" });
        return;
      }

      const periodKeys = getPeriodKeys(anchorDate, periodType, limit);

      const leaderGroupIds = req.auth.role === "LIDER" ? await getLeaderGroupIds(prisma, req.auth.userId) : [];

      const groups = await prisma.group.findMany({
        where:
          req.auth.role === "LIDER"
            ? {
                id: { in: leaderGroupIds },
                ...(includeInactiveGroups ? {} : { isActive: true }),
              }
            : includeInactiveGroups
              ? undefined
              : { isActive: true },
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true, isActive: true },
      });

      const statsByGroup = new Map();
      for (const g of groups) {
        statsByGroup.set(g.id, {
          groupId: g.id,
          groupName: g.name,
          perPeriod: Object.fromEntries(periodKeys.map((k) => [k, { doneCount: 0, points: 0 }])),
          total: { doneCount: 0, points: 0 },
        });
      }

      const completionWhereBase =
        periodType === "YEAR"
          ? {
              status: "CONCLUIDA",
              isValidated: true,
              OR: periodKeys.flatMap((y) => [{ periodKey: y }, { periodKey: { startsWith: `${y}-` } }]),
            }
          : { periodKey: { in: periodKeys }, status: "CONCLUIDA", isValidated: true };

      const completionWhere =
        req.auth.role === "LIDER"
          ? { ...completionWhereBase, groupId: { in: leaderGroupIds } }
          : completionWhereBase;

      const completions = await prisma.completion.findMany({
        where: completionWhere,
        select: { groupId: true, periodKey: true, activityPoints: true, activity: { select: { points: true } } },
      });

      for (const c of completions) {
        const stats = statsByGroup.get(c.groupId);
        if (!stats) continue;

        const points = c.activityPoints ?? c.activity?.points ?? 0;
        const bucketKey = periodType === "YEAR" ? extractYearFromPeriodKey(c.periodKey) : c.periodKey;
        if (!bucketKey || !stats.perPeriod[bucketKey]) continue;

        const cell = stats.perPeriod[bucketKey] || { doneCount: 0, points: 0 };
        cell.doneCount += 1;
        cell.points += points;
        stats.perPeriod[bucketKey] = cell;
        stats.total.doneCount += 1;
        stats.total.points += points;
      }

      const consolidated = sortRows(
        Array.from(statsByGroup.values()).map((g) => ({
          groupId: g.groupId,
          groupName: g.groupName,
          doneCount: g.total.doneCount,
          points: g.total.points,
        })),
      );

      const byPeriod = {};
      for (const key of periodKeys) {
        byPeriod[key] = sortRows(
          Array.from(statsByGroup.values()).map((g) => ({
            groupId: g.groupId,
            groupName: g.groupName,
            doneCount: g.perPeriod[key]?.doneCount || 0,
            points: g.perPeriod[key]?.points || 0,
          })),
        );
      }

      res.json({ periodType, periodKeys, byPeriod, consolidated });
    },
  );

  app.get("/api/reports/participant/:id", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    res.status(410).json({ error: "DEPRECATED" });
  });

  app.get("/api/reports/me", requireAuth, async (req, res) => {
    res.status(410).json({ error: "DEPRECATED" });
  });
}

module.exports = { registerReportRoutes };
