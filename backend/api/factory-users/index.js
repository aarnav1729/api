// api/factory-users/index.js
const dbConnect = require('../../utils/dbConnect');
const User = require('../../models/User');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      await dbConnect();
      const factoryUsers = await User.find({ role: "factory" });
      res.status(200).json(factoryUsers);
    } catch (error) {
      console.error("Error fetching factory users:", error);
      res.status(500).json({ error: "Failed to fetch factory users" });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};