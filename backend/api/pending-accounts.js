// api/pending-accounts.js
const dbConnect = require('../utils/dbConnect');
const User = require('../models/User');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    await dbConnect();
    const pendingAccounts = await User.find({ status: "pending" });
    res.status(200).json(pendingAccounts);
  } catch (error) {
    console.error("Error fetching pending accounts:", error);
    res.status(500).json({ error: "Failed to fetch pending accounts" });
  }
};