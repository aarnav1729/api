// api/rfq/[id].js
const dbConnect = require('../../utils/dbConnect');
const RFQ = require('../../models/RFQ');
const Quote = require('../../models/Quote');
const mongoose = require('mongoose');

module.exports = async (req, res) => {
  const { id } = req.query;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // Ensure that the ID is valid for MongoDB ObjectID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid RFQ ID" });
    }

    // Fetch the RFQ and populate the necessary fields
    const rfq = await RFQ.findById(id)
      .populate('selectedVendors')
      .populate('vendorActions.vendorId')
      .lean(); // Using .lean() to get a plain JS object

    if (!rfq) {
      return res.status(404).json({ error: "RFQ not found" });
    }

    // Fetch quotes for this RFQ, including labels and trucksAllotted
    const quotes = await Quote.find({ rfqId: id });

    // Add quotes to the RFQ object
    rfq.quotes = quotes;

    res.status(200).json(rfq);
  } catch (error) {
    console.error("Error fetching RFQ details:", error);
    res.status(500).json({ error: "Failed to fetch RFQ details" });
  }
};