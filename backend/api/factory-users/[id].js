// api/factory-users/[id].js
const dbConnect = require('../../utils/dbConnect');
const User = require('../../models/User');

module.exports = async (req, res) => {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      await dbConnect();

      const user = await User.findByIdAndDelete(id);

      if (!user) {
        return res.status(404).json({ error: "Factory user not found" });
      }

      res.status(200).json({ message: "Factory user deleted successfully" });
    } catch (error) {
      console.error("Error deleting factory user:", error);
      res.status(500).json({ error: "Failed to delete factory user" });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};