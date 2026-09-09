import mongoose from "mongoose";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";

// Helper function to generate unique Transaction IDs (e.g., TXN1725789012345)
const generateTxnId = () => "TXN" + Date.now() + Math.floor(1000 + Math.random() * 9000);

// @desc    Get logged-in user's account balance
// @route   GET /api/account/balance
// @access  Private
export const getBalance = async (req, res, next) => {
  try {
    const account = await Account.findOne({ userId: req.user._id });

    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        accountHolderName: account.accountHolderName,
        accountNumber: account.accountNumber,
        balance: account.balance,
        currency: account.currency,
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

    const account = await Account.findOne({ userId: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
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
      message: `Successfully deposited $${amount}`,
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

// @desc    Withdraw money from account (with Insufficient Funds check)
// @route   POST /api/account/withdraw
// @access  Private
export const withdraw = async (req, res, next) => {
  try {
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Withdrawal amount must be greater than 0" });
    }

    const account = await Account.findOne({ userId: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    // Check for Insufficient Balance
    if (account.balance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient funds! Your current balance is $${account.balance}`,
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
      message: `Successfully withdrew $${amount}`,
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

// @desc    Transfer money to another account (Atomic Mongoose Transaction)
// @route   POST /api/account/transfer
// @access  Private
export const transfer = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { receiverAccountNumber, amount, description } = req.body;

    if (!receiverAccountNumber || !amount || amount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Receiver account number and a valid transfer amount (> 0) are required",
      });
    }

    // 1. Fetch Sender Account inside Session
    const senderAccount = await Account.findOne({ userId: req.user._id }).session(session);
    if (!senderAccount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Sender account not found" });
    }

    // Guard: Cannot transfer to own account
    if (senderAccount.accountNumber === receiverAccountNumber) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Cannot transfer money to your own account" });
    }

    // Guard: Check Insufficient Funds
    if (senderAccount.balance < amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Insufficient funds! Available balance: $${senderAccount.balance}`,
      });
    }

    // 2. Fetch Receiver Account inside Session
    const receiverAccount = await Account.findOne({ accountNumber: receiverAccountNumber }).session(session);
    if (!receiverAccount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Receiver account not found" });
    }

    // 3. Deduct from Sender & Credit to Receiver
    senderAccount.balance -= Number(amount);
    receiverAccount.balance += Number(amount);

    await senderAccount.save({ session });
    await receiverAccount.save({ session });

    // 4. Create Transfer Transaction Log inside Session
    const transaction = new Transaction({
      transactionId: generateTxnId(),
      type: "transfer",
      amount: Number(amount),
      senderAccount: senderAccount.accountNumber,
      receiverAccount: receiverAccount.accountNumber,
      description: description || `Transfer to ${receiverAccount.accountHolderName} (${receiverAccountNumber})`,
      status: "completed",
    });

    await transaction.save({ session });

    // Commit Transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: `Successfully transferred $${amount} to ${receiverAccount.accountHolderName}`,
      data: {
        senderAccountNumber: senderAccount.accountNumber,
        remainingBalance: senderAccount.balance,
        transaction,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};