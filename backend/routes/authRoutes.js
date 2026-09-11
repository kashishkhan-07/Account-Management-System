import express from "express";
import { register, login, refreshToken, logout, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

// Add /me endpoint with protect middleware
router.get("/me", protect, getMe);

export default router;