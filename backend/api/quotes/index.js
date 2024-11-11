// api/quotes/index.js
const dbConnect = require('../../utils/dbConnect');
const Quote = require('../../models/Quote');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      await dbConnect();
      const quotes = await Quote.find();
      res.status(200).json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};