const { z } = require("zod");

const { hashPassword } = require("../lib/password");
const { requireAuth, requireRole } = require("../middleware/auth");

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
      birthDate: z.string().datetime().optional(),
      guardianName: z.string().min(1).optional(),
      phone: z.string().min(1).optional(),
      email: z.string().email().optional(),
      password: z.string().min(8).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR" });
      return;
    }

    const { name, birthDate, guardianName, phone, email, password } = parsed.data;

    const data = {
      name,
      birthDate: birthDate ? new Date(birthDate) : undefined,
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
      name: z.string().min(1).optional(),
      birthDate: z.string().datetime().nullable().optional(),
      guardianName: z.string().min(1).nullable().optional(),
      phone: z.string().min(1).nullable().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR" });
      return;
    }

    const participant = await prisma.participant.update({
      where: { id: req.params.id },
      data: {
        name: parsed.data.name,
        birthDate: parsed.data.birthDate === null ? null : parsed.data.birthDate ? new Date(parsed.data.birthDate) : undefined,
        guardianName: parsed.data.guardianName === null ? null : parsed.data.guardianName,
        phone: parsed.data.phone === null ? null : parsed.data.phone,
      },
    });

    res.json({ participant });
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

