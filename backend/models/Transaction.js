import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "transfer"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be greater than 0"],
    },
    senderAccount: {
      type: String,
      default: null,
      index: true,
    },
    receiverAccount: {
      type: String,
      default: null,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["completed", "failed"],
      default: "completed",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);