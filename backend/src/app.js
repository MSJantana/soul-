const cors = require("cors");
const express = require("express");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const { PrismaClient } = require("@prisma/client");
const mariadb = require("mariadb");

const { registerAuthRoutes } = require("./routes/auth");
const { registerParticipantRoutes } = require("./routes/participants");
const { registerGroupRoutes } = require("./routes/groups");
const { registerPeriodRoutes } = require("./routes/periods");
const { registerCompletionRoutes } = require("./routes/completions");
const { registerReportRoutes } = require("./routes/reports");
const { registerActivityRoutes } = require("./routes/activities");
const { requireAuth, requireRole } = require("./middleware/auth");
const { seedDatabase } = require("../prisma/seed");

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
  connectTimeout: 10000,
  acquireTimeout: 30000,
  allowPublicKeyRetrieval: true,
});

const prisma = new PrismaClient({ adapter });

function createApp() {
  const app = express();

  if (process.env.NODE_ENV !== "production") {
    const host = process.env.DB_HOST || "";
    const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
    const user = process.env.DB_USER || "";
    const database = process.env.DB_NAME || "";
    const passwordSet = !!process.env.DB_PASSWORD;
    process.stdout.write(
      `DB: host=${host} port=${port} user=${user} db=${database} passwordSet=${passwordSet}\n`,
    );
    mariadb
      .createConnection({
        host,
        port,
        user,
        password: process.env.DB_PASSWORD || "",
        database,
        connectTimeout: 8000,
        allowPublicKeyRetrieval: true,
      })
      .then((conn) => conn.end().then(() => process.stdout.write("DB: conexão OK\n")))
      .catch((e) => {
        const msg = e?.code ? `${e.code} ${e.message || ""}` : e?.message || String(e);
        process.stdout.write(`DB: conexão FALHOU (${msg})\n`);
      });
  }

  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? true
          : ["http://localhost:5173", "http://127.0.0.1:5173"],
    }),
  );
  app.use(express.json());

  registerAuthRoutes(app, prisma);
  registerParticipantRoutes(app, prisma);
  registerGroupRoutes(app, prisma);
  registerPeriodRoutes(app);
  registerCompletionRoutes(app, prisma);
  registerReportRoutes(app, prisma);
  registerActivityRoutes(app, prisma);

  app.post("/api/admin/reset-db", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      res.status(403).json({ error: "FORBIDDEN" });
      return;
    }

    const confirm = String(req.body?.confirm || "");
    if (confirm !== "RESET_DB") {
      res.status(400).json({ error: "CONFIRM_REQUIRED" });
      return;
    }

    try {
      await prisma.$transaction([
        prisma.completion.deleteMany(),
        prisma.groupMember.deleteMany(),
        prisma.activity.deleteMany(),
        prisma.group.deleteMany(),
        prisma.participant.deleteMany(),
        prisma.user.deleteMany(),
      ]);

      await seedDatabase(prisma);

      const [users, participants, groups, groupMembers, activities, completions] = await Promise.all([
        prisma.user.count(),
        prisma.participant.count(),
        prisma.group.count(),
        prisma.groupMember.count(),
        prisma.activity.count(),
        prisma.completion.count(),
      ]);

      res.json({ ok: true, counts: { users, participants, groups, groupMembers, activities, completions } });
    } catch (e) {
      res.status(500).json({ error: "RESET_FAILED", message: e?.message || String(e) });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  return app;
}

module.exports = { createApp };
