const jwt = require("jsonwebtoken");
const { Env } = require("../config/env.config");

const isProduction = Env.NODE_ENV === "production";

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
    secure: isProduction,           // must be true for sameSite: none
    sameSite: isProduction ? "none" : "lax", // none = cross-domain cookies allowed
  });
};

const clearJwtAuthCookie = (res) =>
  res.clearCookie("accessToken", {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });

module.exports = { setJwtAuthCookie, clearJwtAuthCookie };