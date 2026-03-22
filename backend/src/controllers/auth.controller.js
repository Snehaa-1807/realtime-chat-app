const { asyncHandler } = require("../middlewares/asyncHandler.middleware");
const { loginSchema, registerSchema } = require("../validators/auth.validator");
const { loginService, registerService } = require("../services/auth.service");
const { clearJwtAuthCookie, setJwtAuthCookie } = require("../utils/cookie");
const { HTTPSTATUS } = require("../config/http.config");

const registerController = asyncHandler(async (req, res) => {
  const body = registerSchema.parse(req.body);
  const user = await registerService(body);
  const userId = user._id.toString();

  return setJwtAuthCookie({ res, userId })
    .status(HTTPSTATUS.CREATED)
    .json({ message: "User created & login successfully", user });
});

const loginController = asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = await loginService(body);
  const userId = user._id.toString();

  return setJwtAuthCookie({ res, userId })
    .status(HTTPSTATUS.OK)
    .json({ message: "User login successfully", user });
});

const logoutController = asyncHandler(async (req, res) => {
  return clearJwtAuthCookie(res)
    .status(HTTPSTATUS.OK)
    .json({ message: "User logout successfully" });
});

const authStatusController = asyncHandler(async (req, res) => {
  const user = req.user;
  return res.status(HTTPSTATUS.OK).json({ message: "Authenticated User", user });
});

module.exports = {
  registerController,
  loginController,
  logoutController,
  authStatusController,
};
