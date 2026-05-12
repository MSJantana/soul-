const rateLimit = require("express-rate-limit");
const { z } = require("zod");

const { hashPassword, verifyPassword } = require("../lib/password");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../lib/jwt");

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

function shouldLogTokens() {
  if (process.env.NODE_ENV === "production") return false;
  const raw = String(process.env.DEV_LOG_TOKENS || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function isDev() {
  return String(process.env.NODE_ENV || "").toLowerCase() !== "production";
}

function logTokens(label, { accessToken, refreshToken }) {
  if (!shouldLogTokens()) return;
  process.stdout.write(`[DEV_TOKEN] ${label} accessToken=${accessToken}\n`);
  if (refreshToken) process.stdout.write(`[DEV_TOKEN] ${label} refreshToken=${refreshToken}\n`);
}

function registerAuthRoutes(app, prisma) {
  if (shouldLogTokens()) {
    process.stdout.write(
      "[DEV_TOKEN] DEV_LOG_TOKENS habilitado: tokens serão exibidos ao chamar /api/auth/login, /api/auth/bootstrap e /api/auth/refresh\n",
    );
  }

  app.post("/api/auth/bootstrap", async (req, res) => {
    const schema = z.object({
      email: z.email(),
      password: z.string().min(8),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR", details: isDev() ? parsed.error.issues : undefined });
      return;
    }

    const userCount = await prisma.user.count();
    if (userCount > 0) {
      res.status(409).json({ error: "BOOTSTRAP_ALREADY_DONE" });
      return;
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        role: "ADMIN",
      },
      select: { id: true, email: true, role: true },
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    logTokens(`bootstrap:${user.email}`, { accessToken, refreshToken });

    res.json({
      user,
      accessToken,
      refreshToken,
    });
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    const schema = z.object({
      email: z.email(),
      password: z.string().min(1),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR", details: isDev() ? parsed.error.issues : undefined });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "INVALID_CREDENTIALS" });
      return;
    }

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "INVALID_CREDENTIALS" });
      return;
    }

    const safeUser = { id: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(safeUser);
    const refreshToken = signRefreshToken(safeUser);
    logTokens(`login:${safeUser.email}`, { accessToken, refreshToken });
    res.json({
      user: safeUser,
      accessToken,
      refreshToken,
    });
  });

  app.post("/api/auth/refresh", async (req, res) => {
    const schema = z.object({
      refreshToken: z.string().min(1),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_ERROR", details: isDev() ? parsed.error.issues : undefined });
      return;
    }

    try {
      const payload = verifyRefreshToken(parsed.data.refreshToken);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        res.status(401).json({ error: "UNAUTHORIZED" });
        return;
      }

      const safeUser = { id: user.id, email: user.email, role: user.role };
      const accessToken = signAccessToken(safeUser);
      logTokens(`refresh:${safeUser.email}`, { accessToken });
      res.json({ accessToken });
    } catch {
      res.status(401).json({ error: "UNAUTHORIZED" });
    }
  });
}

module.exports = { registerAuthRoutes };
