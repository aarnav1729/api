// utils/sendRFQEmail.js
const Vendor = require('../models/Vendor');
const { client, SENDER_EMAIL } = require('./emailClient');
const moment = require('moment-timezone');

async function sendRFQEmail(rfqData, selectedVendorIds) {
  const excludedFields = [
    "_id",
    "budgetedPriceBySalesDept",
    "maxAllowablePrice",
    "customerName",
    "selectedVendors",
    "vendorActions",
    "createdAt",
    "updatedAt",
    "__v",
    "eReverseTime",
    "eReverseDate",
    "sapOrder",
    "status",
    "eReverseToggle",
  ];

  try {
    let vendorsToEmail;

    if (selectedVendorIds && selectedVendorIds.length > 0) {
      vendorsToEmail = await Vendor.find(
        { _id: { $in: selectedVendorIds } },
        "email vendorName"
      );
    } else {
      vendorsToEmail = [];
    }

    const vendorEmails = vendorsToEmail.map((vendor) => vendor.email);

    if (vendorEmails.length > 0) {
      for (const vendor of vendorsToEmail) {
        const emailContent = {
          message: {
            subject: "New RFQ Posted - Submit Initial Quote",
            body: {
              contentType: "HTML",
              content: `
                  <p>Dear ${vendor.vendorName},</p>
                  <p>You are one of the selected vendors for ${rfqData.RFQNumber}.</p>
                  <p>Initial Quote End Time: ${moment(rfqData.initialQuoteEndTime)
                    .tz("Asia/Kolkata")
                    .format("YYYY-MM-DD HH:mm")}</p>
                  <p>Evaluation Period End Time: ${moment(rfqData.evaluationEndTime)
                    .tz("Asia/Kolkata")
                    .format("YYYY-MM-DD HH:mm")}</p>
                  <p>Please log in to your account to submit your quote.</p>

                <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
                  <thead>
                    <tr>
                      <th style="background-color: #f2f2f2;">Field</th>
                      <th style="background-color: #f2f2f2;">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Object.entries(rfqData)
                      .filter(([key]) => !excludedFields.includes(key))
                      .map(
                        ([key, value]) => `
                          <tr>
                            <td style="padding: 8px; text-align: left;">${key
                              .replace(/([A-Z])/g, " $1")
                              .replace(/^./, (str) => str.toUpperCase())}</td>
                            <td style="padding: 8px; text-align: left;">${value}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
                <p>We look forward to receiving your quote.</p>
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
        console.log(`Email sent to ${vendor.email}`);
      }
      return { success: true };
    } else {
      console.log("No selected vendors to send emails to.");
      return { success: false };
    }
  } catch (error) {
    console.error("Error sending RFQ email:", error);
    return { success: false };
  }
}

module.exports = { sendRFQEmail };