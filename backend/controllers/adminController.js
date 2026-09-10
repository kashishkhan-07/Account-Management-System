import User from "../models/User.js";
import Account from "../models/Account.js";

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
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          account: account
            ? {
                accountHolderName: account.accountHolderName,
                accountNumber: account.accountNumber,
                balance: account.balance,
                currency: account.currency,
              }
            : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: usersWithAccounts.length,
      data: usersWithAccounts,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate or Reactivate a user account
// @route   PATCH /api/admin/users/:userId/status
// @access  Private (Admin Only)
export const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive field must be true or false" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(400).json({ success: false, message: "Cannot deactivate an admin user" });
    }

    user.isActive = isActive;
    if (!isActive) {
      user.refreshToken = null; // Revoke session immediately if deactivated
    }
    await user.save();

    res.status(200).json({
      success: true,
      message: `User account has been ${isActive ? "reactivated" : "deactivated"} successfully`,
      data: {
        id: user._id,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};