import User from "../models/User.js";
import Account from "../models/Account.js";
import { generateUniqueAccountNumber } from "../utils/generateAccount.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/tokenService.js";

// @desc    Register user & auto-generate bank account with Account Type & DOB
// @route   POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { fullName, email, password, role, accountType, dob } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email is already registered" });
    }

    // 1. Create User Document with DOB & Role
    const user = new User({
      fullName,
      email: normalizedEmail,
      password,
      role: role === "admin" ? "admin" : "user",
      dob: dob ? new Date(dob) : null,
    });

    // 2. Auto-generate Unique 10-Digit Account Number & Create Linked Account with Account Type
    const accountNumber = await generateUniqueAccountNumber();
    const account = new Account({
      userId: user._id,
      accountHolderName: user.fullName,
      accountNumber,
      balance: 0.0,
      accountType: accountType || "Savings Account",
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
        dob: user.dob,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
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

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Explicitly load password field
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // 2. Compare Password (Bcrypt + Plain text fallback)
    let isPasswordValid = false;
    if (typeof user.comparePassword === 'function') {
      try {
        isPasswordValid = await user.comparePassword(password);
      } catch (err) {
        isPasswordValid = false;
      }
    }

    // Fallback if password in DB was entered manually as plain text
    if (!isPasswordValid && user.password === password) {
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // 3. Support both 'isFrozen' and 'isActive' DB fields
    if (user.isFrozen === true || user.isActive === false) {
      return res.status(403).json({ success: false, message: "Account is frozen or deactivated. Contact admin." });
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
        fullName: user.fullName || user.name,
        email: user.email,
        role: user.role,
        dob: user.dob,
        accountNumber: account ? account.accountNumber : null,
        accountType: account ? account.accountType : "Savings Account",
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

    const user = await User.findOne({ refreshToken });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or already revoked refresh token (Old token)",
      });
    }

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

// @desc    Get Current Logged in User Profile
// @route   GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const account = await Account.findOne({ userId: user._id });
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName || user.name,
        email: user.email,
        role: user.role,
        dob: user.dob,
        accountNumber: account ? account.accountNumber : null,
        accountType: account ? account.accountType : "Savings Account",
      },
    });
  } catch (error) {
    next(error);
  }
};