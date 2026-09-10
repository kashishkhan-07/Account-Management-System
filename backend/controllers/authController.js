import User from "../models/User.js";
import Account from "../models/Account.js";
import { generateUniqueAccountNumber } from "../utils/generateAccount.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/tokenService.js";

// @desc    Register user & auto-generate bank account
// @route   POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email is already registered" });
    }

    // 1. Create User Document
    const user = new User({
      fullName,
      email,
      password,
      role: role === "admin" ? "admin" : "user",
    });

    // 2. Auto-generate Unique 10-Digit Account Number & Create Linked Account
    const accountNumber = await generateUniqueAccountNumber();
    const account = new Account({
      userId: user._id,
       accountHolderName: user.fullName,
      accountNumber,
      balance: 0.0,
    });

    await user.save();
    await account.save();

    // 3. Generate Access Token & Refresh Token
    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token to user document
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      tokens: { accessToken, refreshToken },
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        accountNumber: account.accountNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account is deactivated. Contact admin." });
    }

    const account = await Account.findOne({ userId: user._id });

    const payload = { id: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Login successful",
      tokens: { accessToken, refreshToken },
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        accountNumber: account ? account.accountNumber : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh Access Token using valid Refresh Token
// @route   POST /api/auth/refresh-token
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "Refresh token is required" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: "Invalid or revoked refresh token" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account is deactivated" });
    }

    // Token rotation: Issue new access token and refresh token
    const payload = { id: user._id, role: user.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid refresh token", error: error.message });
  }
};

// @desc    Logout user & revoke active refresh token
// @route   POST /api/auth/logout
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "Refresh token is required" });
    }

    // Database me active refresh token search karein
    const user = await User.findOne({ refreshToken });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or already revoked refresh token (Old token)",
      });
    }

    // Active refresh token ko remove karein (Logout)
    user.refreshToken = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};