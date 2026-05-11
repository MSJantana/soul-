const cors = require("cors");
const express = require("express");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const { PrismaClient } = require("@prisma/client");

const { registerAuthRoutes } = require("./routes/auth");
const { registerParticipantRoutes } = require("./routes/participants");
const { registerGroupRoutes } = require("./routes/groups");
const { registerPeriodRoutes } = require("./routes/periods");
const { registerCompletionRoutes } = require("./routes/completions");
const { registerReportRoutes } = require("./routes/reports");
const { registerActivityRoutes } = require("./routes/activities");

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});

const prisma = new PrismaClient({ adapter });

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
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

  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  return app;
}

module.exports = { createApp };
