import Account from "../models/Account.js";

/**
 * Generates a unique 10-digit account number.
 */
export const generateUniqueAccountNumber = async () => {
  let isUnique = false;
  let accountNumber = "";

  while (!isUnique) {
    // Generate a random 10-digit number string starting with 1-9
    accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    // Check if account number already exists in database
    const existingAccount = await Account.findOne({ accountNumber });
    if (!existingAccount) {
      isUnique = true;
    }
  }

  return accountNumber;
};