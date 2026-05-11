const { z } = require("zod");

const { requireAuth, requireRole } = require("../middleware/auth");

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function normalizePeriod(period) {
  if (period === "WEEK") return "SEMANAL";
  if (period === "MONTH") return "MES";
  if (period === "QUARTER") return "QUADRIENAL";
  if (period === "SEMESTER") return "SEMESTRAL";
  if (period === "SEMETRAL") return "SEMESTRAL";
  if (period === "YEAR") return "ANO";
  return period;
}

function registerActivityRoutes(app, prisma) {
  app.get("/api/activities", async (req, res) => {
    const schema = z.object({
      includeInactive: z.union([z.literal("1"), z.literal("true")]).optional(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR" });
      return;
    }

    const includeInactive = !!parsed.data.includeInactive;

    const activities = await prisma.activity.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isActive: "desc" }, { period: "asc" }, { title: "asc" }],
    });

    res.json({ activities });
  });

  app.get("/api/activities/:id", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    const activity = await prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!activity) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    res.json({ activity });
  });

  app.post("/api/activities", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    const schema = z.object({
      slug: z.string().min(1).optional(),
      title: z.string().min(1),
      description: z.string().min(1),
      period: z.enum([
        "SEMANAL",
        "MES",
        "QUADRIENAL",
        "SEMESTRAL",
        "ANO",
        "SEMETRAL",
        "WEEK",
        "MONTH",
        "QUARTER",
        "SEMESTER",
        "YEAR",
      ]),
      area: z.enum([
        "DISCIPLINAS",
        "CELEBRACAO",
        "LIDERANCA",
        "FAMILIA",
        "MISSAO_SOCIAL",
        "EVENTOS_IGREJA",
        "IDENTIDADE",
      ]),
      points: z.number().int().min(0).optional(),
      isActive: z.boolean().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR" });
      return;
    }

    const slug = parsed.data.slug ? slugify(parsed.data.slug) : slugify(parsed.data.title);
    if (!slug) {
      res.status(400).json({ error: "INVALID_SLUG" });
      return;
    }

    try {
      const activity = await prisma.activity.create({
        data: {
          slug,
          title: parsed.data.title,
          description: parsed.data.description,
          period: normalizePeriod(parsed.data.period),
          area: parsed.data.area,
          points: parsed.data.points ?? 0,
          isActive: parsed.data.isActive ?? true,
        },
      });

      res.status(201).json({ activity });
    } catch (e) {
      res.status(409).json({ error: "CONFLICT", message: String(e) });
    }
  });

  app.put("/api/activities/:id", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    const schema = z.object({
      slug: z.string().min(1).optional(),
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      period: z
        .enum([
          "SEMANAL",
          "MES",
          "QUADRIENAL",
          "SEMESTRAL",
          "ANO",
          "SEMETRAL",
          "WEEK",
          "MONTH",
          "QUARTER",
          "SEMESTER",
          "YEAR",
        ])
        .optional(),
      area: z
        .enum([
          "DISCIPLINAS",
          "CELEBRACAO",
          "LIDERANCA",
          "FAMILIA",
          "MISSAO_SOCIAL",
          "EVENTOS_IGREJA",
          "IDENTIDADE",
        ])
        .optional(),
      points: z.number().int().min(0).optional(),
      isActive: z.boolean().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR" });
      return;
    }

    const data = { ...parsed.data };
    if (data.slug) data.slug = slugify(data.slug);
    if (data.period) data.period = normalizePeriod(data.period);

    try {
      const activity = await prisma.activity.update({
        where: { id: req.params.id },
        data,
      });

      res.json({ activity });
    } catch (e) {
      res.status(404).json({ error: "NOT_FOUND", message: String(e) });
    }
  });

  app.delete("/api/activities/:id", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    try {
      const activity = await prisma.activity.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });

      res.json({ activity });
    } catch (e) {
      res.status(404).json({ error: "NOT_FOUND", message: String(e) });
    }
  });
}

module.exports = { registerActivityRoutes };

