// api/vendors/index.js
const dbConnect = require('../../utils/dbConnect');
const Vendor = require('../../models/Vendor');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      await dbConnect();
      const vendors = await Vendor.find();
      res.status(200).json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};