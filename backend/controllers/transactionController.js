import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";

// @desc    Get logged-in user's transaction history with Pagination & Filtering
// @route   GET /api/transactions
// @access  Private
export const getTransactionHistory = async (req, res, next) => {
  try {
    // 1. Fetch user's account
    const account = await Account.findOne({ userId: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const { type, startDate, endDate, page = 1, limit = 10 } = req.query;

    // 2. Build Query: Search transactions where user is sender OR receiver
    let query = {
      $or: [
        { senderAccount: account.accountNumber },
        { receiverAccount: account.accountNumber },
      ],
    };

    // 3. Optional Filter by transaction type (deposit, withdrawal, transfer)
    if (type) {
      query.type = type;
    }

    // 4. Optional Filter by Date Range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // 5. Pagination Math (skip & limit)
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // 6. Database Queries (Total count & paginated results)
    const totalTransactions = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 }) // Newest transactions first
      .skip(skip)
      .limit(limitNum);

    // 7. Send Response with pagination metadata
    res.status(200).json({
      success: true,
      count: transactions.length,
      pagination: {
        total: totalTransactions,
        page: pageNum,
        pages: Math.ceil(totalTransactions / limitNum),
        limit: limitNum,
      },
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};