// api/quote/[quoteId].js
const dbConnect = require('../../utils/dbConnect');
const Quote = require('../../models/Quote');
const RFQ = require('../../models/RFQ');
const { client, SENDER_EMAIL } = require('../../utils/emailClient');

module.exports = async (req, res) => {
  const { quoteId } = req.query;

  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { price, trucksAllotted } = req.body;

  // Input Validation
  if (
    typeof price !== 'number' ||
    typeof trucksAllotted !== 'number'
  ) {
    res.status(400).json({ error: 'Invalid input data.' });
    return;
  }

  try {
    await dbConnect();

    // Find the quote by ID
    const existingQuote = await Quote.findById(quoteId);
    if (!existingQuote) {
      return res.status(404).json({ error: "Quote not found" });
    }

    // Find the RFQ to check status
    const rfq = await RFQ.findById(existingQuote.rfqId);
    if (!rfq) {
      return res.status(404).json({ error: "RFQ not found" });
    }

    if (rfq.status === "closed") {
      return res
        .status(400)
        .json({ error: "Cannot update quote. RFQ is closed." });
    }

    // Fetch all quotes for the RFQ
    const allQuotes = await Quote.find({ rfqId: rfq._id });

    // Calculate total trucks allotted with the updated value
    const totalTrucksAllotted = allQuotes.reduce((sum, q) => {
      if (q._id.toString() === quoteId) {
        return sum + trucksAllotted;
      }
      return sum + (q.trucksAllotted || 0);
    }, 0);

    if (totalTrucksAllotted > rfq.numberOfVehicles) {
      return res.status(400).json({
        error: `Total trucks allotted (${totalTrucksAllotted}) exceeds required number (${rfq.numberOfVehicles}).`,
      });
    }

    // L1 Constraints
    if (existingQuote.label === "L1") {
      const minL1Trucks = Math.ceil(rfq.numberOfVehicles * 0.39);

      if (price > existingQuote.price) {
        return res.status(400).json({ error: "L1 price cannot be increased." });
      }

      if (trucksAllotted < minL1Trucks) {
        return res.status(400).json({
          error: `L1 trucks allotted cannot be less than 39% of total trucks (${minL1Trucks}).`,
        });
      }
    }

    // Proceed to update the quote
    existingQuote.price = price;
    existingQuote.trucksAllotted = trucksAllotted;
    await existingQuote.save();

    res.status(200).json({
      message: "Quote updated successfully",
      updatedQuote: existingQuote,
    });
  } catch (error) {
    console.error("Error updating quote:", error);
    res.status(500).json({ error: "Failed to update quote" });
  }
};