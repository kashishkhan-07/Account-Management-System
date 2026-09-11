import express from "express";
import { getAllUsersWithBalances, updateUserStatus } from "../controllers/adminController.js";
import { protect } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/users", getAllUsersWithBalances);

// Support both PATCH & PUT for CORS compatibility
router.patch("/users/:userId/status", updateUserStatus);
router.put("/users/:userId/status", updateUserStatus);

export default router;