// api/rfq/add-vendors.js
const dbConnect = require('../../utils/dbConnect');
const RFQ = require('../../models/RFQ');
const { sendRFQEmail } = require('../../utils/sendRFQEmail');

module.exports = async (req, res) => {
  const { id } = req.query;
  const { vendorIds } = req.body;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Input Validation
  if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
    res.status(400).json({ error: 'No vendor IDs provided.' });
    return;
  }

  try {
    await dbConnect();

    const rfq = await RFQ.findById(id);
    if (!rfq) {
      return res.status(404).json({ error: "RFQ not found" });
    }

    // Update the selectedVendors list
    const existingVendorIds = rfq.selectedVendors.map((vendorId) =>
      vendorId.toString()
    );
    const newVendorIds = vendorIds.filter(
      (vendorId) => !existingVendorIds.includes(vendorId)
    );

    rfq.selectedVendors = rfq.selectedVendors.concat(newVendorIds);

    // Record the vendor addition actions
    newVendorIds.forEach((vendorId) => {
      rfq.vendorActions.push({
        action: "added",
        vendorId,
        timestamp: new Date(),
      });
    });

    await rfq.save();

    // Convert the RFQ document to a plain JS object
    const rfqData = rfq.toObject();

    // Send RFQ email to the newly added vendors
    const emailResponse = await sendRFQEmail(rfqData, newVendorIds);

    if (!emailResponse.success) {
      return res
        .status(500)
        .json({ message: "Failed to send emails to added vendors." });
    }

    res
      .status(200)
      .json({ message: "Vendors added and emails sent successfully." });
  } catch (error) {
    console.error("Error adding vendors to RFQ:", error);
    res.status(500).json({ error: "Failed to add vendors to RFQ" });
  }
};