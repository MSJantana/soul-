const jwt = require("jsonwebtoken");

function getAccessSecret() {
  return process.env.JWT_ACCESS_SECRET || "";
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || "";
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, getAccessSecret(), { expiresIn: "15m" });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, type: "refresh" }, getRefreshSecret(), {
    expiresIn: "30d",
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, getAccessSecret());
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, getRefreshSecret());
  if (payload && payload.type !== "refresh") {
    const err = new Error("INVALID_TOKEN_TYPE");
    err.code = "INVALID_TOKEN_TYPE";
    throw err;
  }
  return payload;
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };

