// api/quotes/[rfqId].js
const dbConnect = require('../../utils/dbConnect');
const Quote = require('../../models/Quote');

module.exports = async (req, res) => {
  const { rfqId } = req.query;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Validate rfqId
  if (!rfqId || typeof rfqId !== 'string') {
    res.status(400).json({ error: 'Invalid RFQ ID.' });
    return;
  }

  try {
    await dbConnect();
    const quotes = await Quote.find({ rfqId });
    res.status(200).json(quotes);
  } catch (error) {
    console.error("Error fetching quotes:", error);
    res.status(500).json({ error: "Failed to fetch quotes" });
  }
};