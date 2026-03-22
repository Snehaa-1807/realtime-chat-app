const { Router } = require("express");
const { passportAuthenticateJwt } = require("../config/passport.config");
const {
  getProfileController,
  updateProfileController,
  changePasswordController,
  deleteAccountController,
} = require("../controllers/profile.controller");

const profileRoutes = Router()
  .use(passportAuthenticateJwt)
  .get("/", getProfileController)
  .put("/update", updateProfileController)
  .put("/change-password", changePasswordController)
  .delete("/delete", deleteAccountController);

module.exports = profileRoutes;