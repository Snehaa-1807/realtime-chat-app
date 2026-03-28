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

require("./config/passport.config");

const app = express();
const server = http.createServer(app);

initializeSocket(server);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// CORS — must support cross-domain cookies (Vercel frontend + Render backend)
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const allowedOrigins = Env.FRONTEND_ORIGIN
        ? Env.FRONTEND_ORIGIN.split(",").map((o) => o.trim())
        : [];
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(passport.initialize());

app.get(
  "/health",
  asyncHandler(async (req, res) => {
    res.status(HTTPSTATUS.OK).json({ message: "Server is healthy", status: "OK" });
  })
);

app.use("/api", routes);
app.use(errorHandler);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${Env.PORT} is already in use. Please stop the other process or change PORT in your .env`);
    process.exit(1);
  }
  console.error("Server error", error);
  process.exit(1);
});

server.listen(Env.PORT, async () => {
  await connectDatabase();
  console.log(`Server running on port ${Env.PORT} in ${Env.NODE_ENV} mode`);
});