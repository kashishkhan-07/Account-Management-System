import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0.0,
      min: [0, "Balance cannot be negative"],
    },
    currency: {
      type: String,
      default: "USD",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Account", accountSchema);