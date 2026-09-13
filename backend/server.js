import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
connectDB();

const app = express();

// Dynamically reflects incoming origin so withCredentials works in both localhost & production
app.use(
  cors({
    origin: (origin, callback) => callback(null, origin || true),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

// =========================================================================
// SAFE FIX: Support both singular (/api/account) and plural (/api/accounts)
// =========================================================================
app.use("/api/account", accountRoutes);
app.use("/api/accounts", accountRoutes);

app.use("/api/transactions", transactionRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || "Server Error" });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// SIRF Production mode (Render) par static frontend serve hoga
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend/dist/index.html"));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));