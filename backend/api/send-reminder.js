// api/send-reminder.js
const dbConnect = require('../utils/dbConnect');
const RFQ = require('../models/RFQ');
const Vendor = require('../models/Vendor');
const { client, SENDER_EMAIL } = require('../utils/emailClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  const { rfqId, vendorIds } = req.body;

  // Input Validation
  if (
    !rfqId ||
    typeof rfqId !== 'string' ||
    !vendorIds ||
    !Array.isArray(vendorIds) ||
    vendorIds.length === 0
  ) {
    res.status(400).json({ message: 'Invalid input data.' });
    return;
  }

  try {
    await dbConnect();

    const rfq = await RFQ.findById(rfqId);
    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    // Fetch vendors to email
    const vendorsToEmail = await Vendor.find(
      { _id: { $in: vendorIds } },
      'email vendorName'
    );

    if (vendorsToEmail.length === 0) {
      return res.status(400).json({ message: "No valid vendors found to send reminders." });
    }

    for (const vendor of vendorsToEmail) {
      const emailContent = {
        message: {
          subject: `Reminder: Participation for ${rfq.RFQNumber}`,
          body: {
            contentType: "HTML",
            content: `
              <p>Dear ${vendor.vendorName},</p>
              <p>This is a reminder to participate in the RFQ process for RFQ Number: <strong>${rfq.RFQNumber}</strong>.</p>
              <p>Please submit your quote at your earliest convenience.</p>
              <p>Best regards,<br/>Team LEAF.</p>
            `,
          },
          toRecipients: [
            {
              emailAddress: {
                address: vendor.email,
              },
            },
          ],
          from: {
            emailAddress: {
              address: SENDER_EMAIL,
            },
          },
        },
      };

      await client.api(`/users/${SENDER_EMAIL}/sendMail`).post(emailContent);
    }

    // Record the reminder sent actions
    rfq.vendorActions.push(
      ...vendorIds.map((vendorId) => ({
        action: "reminderSent",
        vendorId,
        timestamp: new Date(),
      }))
    );

    await rfq.save();

    res.status(200).json({ message: "Reminder emails sent successfully." });
  } catch (error) {
    console.error("Error sending participation reminder emails:", error);
    res.status(500).json({ message: "Failed to send participation reminder." });
  }
};