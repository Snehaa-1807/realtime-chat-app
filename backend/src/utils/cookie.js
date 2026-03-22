const jwt = require("jsonwebtoken");
const { Env } = require("../config/env.config");

const setJwtAuthCookie = ({ res, userId }) => {
  const payload = { userId };
  const expiresIn = Env.JWT_EXPIRES_IN || "7d";
  const token = jwt.sign(payload, Env.JWT_SECRET, {
    audience: ["user"],
    expiresIn,
  });

  return res.cookie("accessToken", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: Env.NODE_ENV === "production",
    sameSite: Env.NODE_ENV === "production" ? "strict" : "lax",
  });
};

const clearJwtAuthCookie = (res) =>
  res.clearCookie("accessToken", { path: "/" });

module.exports = { setJwtAuthCookie, clearJwtAuthCookie };
