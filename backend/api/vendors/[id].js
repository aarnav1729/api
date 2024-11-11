// api/vendors/[id].js
const dbConnect = require('../../utils/dbConnect');
const Vendor = require('../../models/Vendor');
const User = require('../../models/User');

module.exports = async (req, res) => {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      await dbConnect();

      const vendor = await Vendor.findByIdAndDelete(id);

      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }

      // Also delete the associated user account
      await User.findOneAndDelete({ username: vendor.username });

      res.status(200).json({ message: "Vendor deleted successfully" });
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};