const { verifyAccessToken } = require("../lib/jwt");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: "UNAUTHORIZED" });
  }
}

function requireRole(roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    if (!req.auth || !allowed.has(req.auth.role)) {
      res.status(403).json({ error: "FORBIDDEN" });
      return;
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };

