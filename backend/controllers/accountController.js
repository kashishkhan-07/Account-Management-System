import mongoose from "mongoose";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";

// Helper function to generate unique Transaction IDs
const generateTxnId = () => "TXN" + Date.now() + Math.floor(1000 + Math.random() * 9000);

// @desc    Get logged-in user's account balance
// @route   GET /api/account/balance
// @access  Private
export const getBalance = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    let account = await Account.findOne({ userId });

    if (!account) {
      account = await Account.create({
        userId,
        accountHolderName: req.user.fullName || req.user.name || "Account Holder",
        accountNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
        balance: 0.0,
        accountType: "Savings Account",
      });
    }

    res.status(200).json({
      success: true,
      balance: account.balance,
      data: {
        accountHolderName: account.accountHolderName || account.name,
        accountNumber: account.accountNumber,
        balance: account.balance,
        currency: account.currency || "INR",
        createdAt: account.createdAt
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deposit money into account
// @route   POST /api/account/deposit
// @access  Private
export const deposit = async (req, res, next) => {
  try {
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Deposit amount must be greater than 0" });
    }

    const userId = req.user._id || req.user.id;
    let account = await Account.findOne({ userId });

    // Safety Fallback: Auto-create account if missing
    if (!account) {
      account = await Account.create({
        userId,
        accountHolderName: req.user.fullName || req.user.name || "Account Holder",
        accountNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
        balance: 0.0,
        accountType: "Savings Account",
      });
    }

    // Add deposit amount to balance
    account.balance += Number(amount);
    await account.save();

    // Create deposit transaction log
    const transaction = await Transaction.create({
      transactionId: generateTxnId(),
      type: "deposit",
      amount: Number(amount),
      receiverAccount: account.accountNumber,
      description: description || "Account deposit",
      status: "completed",
    });

    res.status(200).json({
      success: true,
      message: `Successfully deposited ₹${amount}`,
      balance: account.balance,
      data: {
        accountNumber: account.accountNumber,
        newBalance: account.balance,
        transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Withdraw money from account
// @route   POST /api/account/withdraw
// @access  Private
export const withdraw = async (req, res, next) => {
  try {
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Withdrawal amount must be greater than 0" });
    }

    const userId = req.user._id || req.user.id;
    const account = await Account.findOne({ userId });
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    // Check for Insufficient Balance
    if (account.balance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient funds! Your current balance is ₹${account.balance}`,
      });
    }

    // Deduct withdrawal amount from balance
    account.balance -= Number(amount);
    await account.save();

    // Create withdrawal transaction log
    const transaction = await Transaction.create({
      transactionId: generateTxnId(),
      type: "withdrawal",
      amount: Number(amount),
      senderAccount: account.accountNumber,
      description: description || "Account withdrawal",
      status: "completed",
    });

    res.status(200).json({
      success: true,
      message: `Successfully withdrew ₹${amount}`,
      balance: account.balance,
      data: {
        accountNumber: account.accountNumber,
        newBalance: account.balance,
        transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Transfer money to another account
// @route   POST /api/account/transfer
// @access  Private
export const transfer = async (req, res, next) => {
  const receiverAccountNumber = req.body.receiverAccountNumber || req.body.recipientAccountNumber || req.body.accountNumber;
  const amount = Number(req.body.amount);
  const description = req.body.description;

  if (!receiverAccountNumber || !amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Receiver account number and a valid transfer amount (> 0) are required",
    });
  }

  const userId = req.user._id || req.user.id;

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const senderAccount = await Account.findOne({ userId }).session(session);
    if (!senderAccount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Sender account not found in database" });
    }

    if (String(senderAccount.accountNumber) === String(receiverAccountNumber)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Cannot transfer money to your own account" });
    }

    if (senderAccount.balance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Insufficient funds! Available balance: ₹${senderAccount.balance}`,
      });
    }

    const receiverAccount = await Account.findOne({ accountNumber: String(receiverAccountNumber) }).session(session);
    if (!receiverAccount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: `Receiver account number (${receiverAccountNumber}) does not exist in database`
      });
    }

    senderAccount.balance -= amount;
    receiverAccount.balance += amount;

    await senderAccount.save({ session });
    await receiverAccount.save({ session });

    const transaction = new Transaction({
      transactionId: generateTxnId(),
      type: "transfer",
      amount: amount,
      senderAccount: senderAccount.accountNumber,
      receiverAccount: receiverAccount.accountNumber,
      description: description || `Transfer to ${receiverAccount.accountHolderName || 'Account'} (${receiverAccountNumber})`,
      status: "completed",
    });

    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `Successfully transferred ₹${amount} to ${receiverAccount.accountHolderName || receiverAccountNumber}`,
      balance: senderAccount.balance,
      data: {
        senderAccountNumber: senderAccount.accountNumber,
        remainingBalance: senderAccount.balance,
        transaction,
      },
    });

  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (sErr) {}
    }

    try {
      const senderAccount = await Account.findOne({ userId });
      if (!senderAccount) {
        return res.status(404).json({ success: false, message: "Sender account not found" });
      }
      if (String(senderAccount.accountNumber) === String(receiverAccountNumber)) {
        return res.status(400).json({ success: false, message: "Cannot transfer money to your own account" });
      }
      if (senderAccount.balance < amount) {
        return res.status(400).json({ success: false, message: `Insufficient funds! Available balance: ₹${senderAccount.balance}` });
      }

      const receiverAccount = await Account.findOne({ accountNumber: String(receiverAccountNumber) });
      if (!receiverAccount) {
        return res.status(404).json({ success: false, message: `Receiver account number (${receiverAccountNumber}) does not exist` });
      }

      senderAccount.balance -= amount;
      receiverAccount.balance += amount;

      await senderAccount.save();
      await receiverAccount.save();

      const transaction = await Transaction.create({
        transactionId: generateTxnId(),
        type: "transfer",
        amount: amount,
        senderAccount: senderAccount.accountNumber,
        receiverAccount: receiverAccount.accountNumber,
        description: description || `Transfer to ${receiverAccount.accountHolderName || 'Account'} (${receiverAccountNumber})`,
        status: "completed",
      });

      return res.status(200).json({
        success: true,
        message: `Successfully transferred ₹${amount} to ${receiverAccount.accountHolderName || receiverAccountNumber}`,
        balance: senderAccount.balance,
        data: {
          senderAccountNumber: senderAccount.accountNumber,
          remainingBalance: senderAccount.balance,
          transaction,
        },
      });
    } catch (fallbackErr) {
      next(fallbackErr);
    }
  }
};