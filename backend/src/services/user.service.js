const UserModel = require("../models/user.model");

const findByIdUserService = async (userId) => {
  return await UserModel.findById(userId);
};

const getUsersService = async (userId) => {
  const users = await UserModel.find({ _id: { $ne: userId } }).select(
    "-password"
  );
  return users;
};

module.exports = { findByIdUserService, getUsersService };
