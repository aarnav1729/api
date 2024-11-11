// api/rfq/index.js
const dbConnect = require('../../utils/dbConnect');
const RFQ = require('../../models/RFQ');
const { sendRFQEmail } = require('../../utils/sendRFQEmail');
const moment = require('moment-timezone');

module.exports = async (req, res) => {
  await dbConnect();

  if (req.method === 'POST') {
    try {
      const formData = req.body;
      const now = moment().tz("Asia/Kolkata");

      // Parse initialQuoteEndTime and evaluationEndTime from req.body
      const initialQuoteEndTime = moment
        .tz(formData.initialQuoteEndTime, "YYYY-MM-DDTHH:mm", "Asia/Kolkata")
        .toDate();
      const evaluationEndTime = moment
        .tz(formData.evaluationEndTime, "YYYY-MM-DDTHH:mm", "Asia/Kolkata")
        .toDate();

      // Validate that evaluationEndTime is after initialQuoteEndTime
      if (evaluationEndTime <= initialQuoteEndTime) {
        return res.status(400).json({
          error: "Evaluation End Time must be after Initial Quote End Time",
        });
      }

      // Fetch the last created RFQ to get the current highest RFQNumber
      const lastRFQ = await RFQ.findOne().sort({ _id: -1 });

      // Initialize RFQ number, increment from the last RFQ number or start at RFQ1
      const nextRFQNumber = lastRFQ
        ? `RFQ${parseInt(lastRFQ.RFQNumber.slice(3)) + 1}`
        : "RFQ1";

      // Add the generated RFQ number to the request body
      const newRFQData = {
        ...formData,
        RFQNumber: nextRFQNumber,
        status: "initial",
        initialQuoteEndTime,
        evaluationEndTime,
        selectedVendors: formData.selectedVendors || [],
      };

      // Create a new RFQ with the generated number
      const rfq = new RFQ(newRFQData);

      if (newRFQData.selectedVendors.length > 0) {
        newRFQData.selectedVendors.forEach((vendorId) => {
          rfq.vendorActions.push({
            action: "addedAtCreation",
            vendorId,
            timestamp: new Date(),
          });
        });
      }

      await rfq.save();

      // Send email to vendors
      const emailResponse = await sendRFQEmail(
        newRFQData,
        newRFQData.selectedVendors
      );

      if (!emailResponse.success) {
        // If email sending fails, remove the RFQ entry to prevent incomplete processes
        await RFQ.findByIdAndDelete(rfq._id);
        return res.status(500).json({
          message:
            "RFQ created but failed to send emails. RFQ entry has been removed.",
        });
      }

      // If everything is successful, return the response
      res.status(201).json({
        message: "RFQ created and email sent successfully",
        RFQNumber: nextRFQNumber,
      });
    } catch (error) {
      console.error("Error creating RFQ:", error);
      res.status(500).json({ error: "Failed to create RFQ" });
    }
  } else if (req.method === 'GET') {
    try {
      const rfqs = await RFQ.find();
      res.status(200).json(rfqs);
    } catch (error) {
      console.error("Error fetching RFQs:", error);
      res.status(500).json({ error: "Failed to fetch RFQs" });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};