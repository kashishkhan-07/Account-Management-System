import User from "../models/User.js";
import Account from "../models/Account.js";
import mongoose from "mongoose";

// @desc    Get all users and their account balances
// @route   GET /api/admin/users
// @access  Private (Admin Only)
export const getAllUsersWithBalances = async (req, res, next) => {
  try {
    const users = await User.find().select("-password -refreshToken").sort({ createdAt: -1 });

    const usersWithAccounts = await Promise.all(
      users.map(async (user) => {
        const account = await Account.findOne({ userId: user._id });
        return {
          id: user._id,
          _id: user._id,
          fullName: user.fullName || user.name || (user.email ? user.email.split("@")[0] : "User"),
          email: user.email,
          role: user.role || "user",
          isActive: user.isActive !== undefined ? user.isActive : !user.isFrozen,
          createdAt: user.createdAt,
          account: account
            ? {
                accountHolderName: account.accountHolderName || user.fullName,
                accountNumber: account.accountNumber,
                balance: account.balance,
                currency: account.currency || "USD",
                accountType: account.accountType || "Savings Account",
              }
            : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: usersWithAccounts.length,
      data: usersWithAccounts,
      users: usersWithAccounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate or Reactivate a user account (Atomic & Error-Proof)
// @route   PATCH /api/admin/users/:userId/status
// @access  Private (Admin Only)
export const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive field must be true or false" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid User ID format" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(400).json({ success: false, message: "Cannot deactivate an admin user" });
    }

    // Atomic Update (Bypasses whole-document validation errors)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          isActive: isActive,
          isFrozen: !isActive,
          ...(isActive ? {} : { refreshToken: null }),
        },
      },
      { new: true, runValidators: false }
    );

    res.status(200).json({
      success: true,
      message: `User account has been ${isActive ? "reactivated" : "deactivated"} successfully`,
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error("updateUserStatus Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while updating user status",
    });
  }
};