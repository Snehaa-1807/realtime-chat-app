const { Router } = require("express");
const { passportAuthenticateJwt } = require("../config/passport.config");
const { getUsersController } = require("../controllers/user.controller");

const userRoutes = Router()
  .use(passportAuthenticateJwt)
  .get("/all", getUsersController);

module.exports = userRoutes;
