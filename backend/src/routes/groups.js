const { z } = require("zod");

const { requireAuth, requireRole } = require("../middleware/auth");

function registerGroupRoutes(app, prisma) {
  app.get("/api/groups", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    const groups = await prisma.group.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { members: { include: { participant: true } } },
    });

    res.json({ groups });
  });

  app.post("/api/groups", requireAuth, requireRole(["ADMIN", "LIDER"]), async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      year: z.number().int().optional(),
      isActive: z.boolean().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR" });
      return;
    }

    const group = await prisma.group.create({
      data: {
        name: parsed.data.name,
        year: parsed.data.year,
        isActive: parsed.data.isActive ?? true,
      },
    });

    res.status(201).json({ group });
  });

  app.post(
    "/api/groups/:groupId/members",
    requireAuth,
    requireRole(["ADMIN", "LIDER"]),
    async (req, res) => {
      const schema = z.object({
        participantId: z.string().min(1),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "VALIDATION_ERROR" });
        return;
      }

      const member = await prisma.groupMember.create({
        data: {
          groupId: req.params.groupId,
          participantId: parsed.data.participantId,
        },
      });

      res.status(201).json({ member });
    },
  );

  app.delete(
    "/api/groups/:groupId/members/:participantId",
    requireAuth,
    requireRole(["ADMIN", "LIDER"]),
    async (req, res) => {
      await prisma.groupMember.delete({
        where: {
          groupId_participantId: {
            groupId: req.params.groupId,
            participantId: req.params.participantId,
          },
        },
      });

      res.json({ ok: true });
    },
  );
}

module.exports = { registerGroupRoutes };

