import { verifyAccessToken } from "../utils/tokenService.js";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for Bearer Token in Authorization Header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    // Verify Access Token
    const decoded = verifyAccessToken(token);

    // Fetch user from DB (excluding password)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // Check if account is active (Guard against deactivated accounts)
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact Admin.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
      error: error.message,
    });
  }
};