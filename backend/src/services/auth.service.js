const UserModel = require("../models/user.model");
const { NotFoundException, UnauthorizedException } = require("../utils/app-error");

const registerService = async (body) => {
  const { email } = body;
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) throw new UnauthorizedException("User already exist");

  const newUser = new UserModel({
    name: body.name,
    email: body.email,
    password: body.password,
    avatar: body.avatar,
  });
  await newUser.save();
  return newUser;
};

const loginService = async (body) => {
  const { email, password } = body;

  const user = await UserModel.findOne({ email });
  if (!user) throw new NotFoundException("Email or Password not found");

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid)
    throw new UnauthorizedException("Invalid email or password");

  return user;
};

module.exports = { registerService, loginService };
