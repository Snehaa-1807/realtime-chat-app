require("dotenv/config");
const express = require("express"); // ✅ path removed
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const passport = require("passport");

const { Env } = require("./config/env.config");
const { asyncHandler } = require("./middlewares/asyncHandler.middleware");
const { HTTPSTATUS } = require("./config/http.config");
const { errorHandler } = require("./middlewares/errorHandler.middleware");
const connectDatabase = require("./config/database.config");
const { initializeSocket } = require("./lib/socket");
const routes = require("./routes");

// Must be required after env is loaded
require("./config/passport.config");

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: Env.FRONTEND_ORIGIN,
    credentials: true,
  })
);

app.use(passport.initialize());

// ✅ Health route
app.get(
  "/health",
  asyncHandler(async (req, res) => {
    res.status(HTTPSTATUS.OK).json({
      message: "Server is healthy",
      status: "OK",
    });
  })
);

// ✅ Optional root route (recommended)
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

app.use("/api", routes);

// ❌ REMOVED static frontend serving block

app.use(errorHandler);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${Env.PORT} is already in use. Please stop the other process or change PORT in your .env`
    );
    process.exit(1);
  }
  console.error("Server error", error);
  process.exit(1);
});

server.listen(Env.PORT, async () => {
  await connectDatabase();
  console.log(`Server running on port ${Env.PORT} in ${Env.NODE_ENV} mode`);
});