const { Router } = require("express");
const authRoutes = require("./auth.route");
const chatRoutes = require("./chat.route");
const userRoutes = require("./user.route");
const profileRoutes = require("./profile.route");

const router = Router();
router.use("/auth", authRoutes);
router.use("/chat", chatRoutes);
router.use("/user", userRoutes);
router.use("/profile", profileRoutes);

module.exports = router;