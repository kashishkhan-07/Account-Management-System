import express from "express";
import { register, login, refreshToken, logout } from "../controllers/authController.js";
import { authRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", /*authRateLimiter*/ register);
router.post("/login",/* authRateLimiter,*/ login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

export default router;
