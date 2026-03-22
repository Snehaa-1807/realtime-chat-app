const { Router } = require("express");
const {
  loginController,
  logoutController,
  registerController,
  authStatusController,
} = require("../controllers/auth.controller");
const { passportAuthenticateJwt } = require("../config/passport.config");

const authRoutes = Router()
  .post("/register", registerController)
  .post("/login", loginController)
  .post("/logout", logoutController)
  .get("/status", passportAuthenticateJwt, authStatusController);

module.exports = authRoutes;
