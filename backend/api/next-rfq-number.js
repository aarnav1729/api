// api/next-rfq-number.js
const dbConnect = require('../utils/dbConnect');
const RFQ = require('../models/RFQ');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    await dbConnect();

    // Fetch the last created RFQ to get the current highest RFQNumber
    const lastRFQ = await RFQ.findOne().sort({ _id: -1 });

    // Initialize RFQ number, increment from the last RFQ number or start at RFQ1
    const nextRFQNumber = lastRFQ
      ? `RFQ${parseInt(lastRFQ.RFQNumber.slice(3)) + 1}`
      : "RFQ1";

    // Return the next available RFQ number
    res.status(200).json({ RFQNumber: nextRFQNumber });
  } catch (error) {
    console.error("Error fetching next RFQ number:", error);
    res.status(500).json({ error: "Failed to fetch next RFQ number" });
  }
};