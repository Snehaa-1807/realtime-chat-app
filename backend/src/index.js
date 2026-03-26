require("dotenv/config");
const express = require("express");
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

app.get(
  "/health",
  asyncHandler(async (req, res) => {
    res.status(HTTPSTATUS.OK).json({
      message: "Server is healthy",
      status: "OK",
    });
  })
);

app.use("/api", routes);

app.use(errorHandler);

server.listen(Env.PORT, async () => {
  await connectDatabase();
  console.log(`Server running on port ${Env.PORT} in ${Env.NODE_ENV} mode`);
});