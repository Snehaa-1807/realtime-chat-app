const { asyncHandler } = require("../middlewares/asyncHandler.middleware");
const { HTTPSTATUS } = require("../config/http.config");
const { getUsersService } = require("../services/user.service");

const getUsersController = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const users = await getUsersService(userId);

  return res.status(HTTPSTATUS.OK).json({
    message: "Users retrieved successfully",
    users,
  });
});

module.exports = { getUsersController };
