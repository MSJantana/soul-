const { z } = require("zod");

const { getPeriodKey } = require("../utils/periodKey");

function normalizePeriodType(value) {
  const raw = String(value || "").trim().toUpperCase();
  const cleaned = raw.normalize("NFD").replaceAll(/\p{Diacritic}+/gu, "");

  if (cleaned === "WEEK" || cleaned === "SEMANAL") return "WEEK";
  if (cleaned === "MONTH" || cleaned === "MES") return "MONTH";
  if (cleaned === "QUARTER" || cleaned === "QUADRIENAL" || cleaned === "TRIMESTRE" || cleaned === "TRIMESTRAL") {
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

    const monthsBack = periodType === "MONTH" ? -1 : periodType === "QUARTER" ? -3 : periodType === "SEMESTER" ? -6 : 0;

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

function registerPeriodRoutes(app) {
  app.get("/api/periods/current", (req, res) => {
    const now = new Date();
    res.json({
      now: now.toISOString(),
      weekKey: getPeriodKey(now, "WEEK"),
      monthKey: getPeriodKey(now, "MONTH"),
      quarterKey: getPeriodKey(now, "QUARTER"),
      semesterKey: getPeriodKey(now, "SEMESTER"),
      yearKey: getPeriodKey(now, "YEAR"),
    });
  });

  app.get("/api/periods/list", (req, res) => {
    const schema = z.object({
      periodType: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(48).optional(),
      anchor: z.string().optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR" });
      return;
    }

    const periodType = normalizePeriodType(parsed.data.periodType) || "WEEK";
    const limit =
      parsed.data.limit ??
      (periodType === "WEEK" ? 12 : periodType === "MONTH" ? 12 : periodType === "QUARTER" ? 8 : periodType === "SEMESTER" ? 6 : 5);
    const anchorDate = parsed.data.anchor ? new Date(parsed.data.anchor) : new Date();
    if (Number.isNaN(anchorDate.getTime())) {
      res.status(400).json({ error: "INVALID_DATE" });
      return;
    }

    const periodKeys = getPeriodKeys(anchorDate, periodType, limit);
    res.json({ periodType, periodKeys });
  });
}

module.exports = { registerPeriodRoutes };
