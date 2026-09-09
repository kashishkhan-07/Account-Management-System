import express from "express";
import cors from "cors";
import helmet from "helmet";
import config from "./config.js";
import connectDB from "./config/db.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Import Auth Routes (Phases 1-3)
import authRoutes from "./routes/authRoutes.js";

const app = express();

// Security & Body Parsing Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(apiRateLimiter);

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date() });
});

// Mount Routes
app.use("/api/auth", authRoutes);

// Global Error Handler
app.use(errorHandler);

// Connect Database & Start Server
connectDB().then(() => {
  app.listen(config.PORT, () => {
    console.log(`🚀 Server listening on port ${config.PORT}`);
    console.log(`🔗 Health Check: http://localhost:${config.PORT}/health`);
  });
});