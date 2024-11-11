// api/quote.js
const dbConnect = require('../utils/dbConnect');
const Quote = require('../models/Quote');
const RFQ = require('../models/RFQ');
const { client, SENDER_EMAIL } = require('../utils/emailClient');
const moment = require('moment-timezone');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const {
    rfqId,
    quote,
    message,
    vendorName,
    numberOfTrucks,
    validityPeriod,
    numberOfVehiclesPerDay,
  } = req.body;

  // Input Validation
  if (
    !rfqId ||
    typeof rfqId !== 'string' ||
    !quote ||
    typeof quote !== 'number' ||
    !vendorName ||
    typeof vendorName !== 'string' ||
    !numberOfTrucks ||
    typeof numberOfTrucks !== 'number' ||
    !numberOfVehiclesPerDay ||
    typeof numberOfVehiclesPerDay !== 'number'
  ) {
    res.status(400).json({ error: 'Invalid input data.' });
    return;
  }

  try {
    await dbConnect();

    // Fetch the RFQ to get numberOfVehicles
    const rfq = await RFQ.findById(rfqId);
    if (!rfq) {
      return res.status(404).json({ error: "RFQ not found" });
    }

    const now = moment().tz("Asia/Kolkata");

    const minTrucksRequired = Math.floor(0.39 * rfq.numberOfVehicles);

    if (numberOfTrucks < minTrucksRequired) {
      return res.status(400).json({
        error: `Number of Trucks must be at least ${minTrucksRequired}`,
      });
    }

    if (rfq.status === "initial") {
      if (now.isAfter(rfq.initialQuoteEndTime)) {
        return res
          .status(400)
          .json({ error: "Initial quote period has ended." });
      }

      // Allow submission of initial quotes
      // Save or update the quote
      let existingQuote = await Quote.findOne({ rfqId, vendorName });
      if (existingQuote) {
        existingQuote.price = quote;
        existingQuote.numberOfTrucks = numberOfTrucks;
        existingQuote.numberOfVehiclesPerDay = numberOfVehiclesPerDay;
        existingQuote.message = message;
        existingQuote.validityPeriod = validityPeriod;
        await existingQuote.save();
      } else {
        const newQuote = new Quote({
          rfqId,
          vendorName,
          companyName: vendorName, // Assuming companyName is same as vendorName
          price: quote,
          numberOfTrucks,
          numberOfVehiclesPerDay,
          message,
          validityPeriod,
        });
        await newQuote.save();
      }

      const emailContent = {
        message: {
          subject: `Initial Quote Submitted by ${vendorName} for RFQ ${rfq.RFQNumber}`,
          body: {
            contentType: "Text",
            content: `
              A new quote has been submitted for RFQ ID: ${rfqId}.
              Vendor: ${vendorName}
              Quote: ${quote}
              Number of Trucks: ${numberOfTrucks}
              Validity Period: ${validityPeriod}
              Message: ${message}
            `,
          },
          toRecipients: [
            {
              emailAddress: {
                address: SENDER_EMAIL,
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

      res.status(200).json({ message: "Quote submitted successfully." });
    } else if (rfq.status === "evaluation") {
      // Only allow vendors who submitted initial quotes to update
      const existingQuote = await Quote.findOne({ rfqId, vendorName });
      if (!existingQuote) {
        return res
          .status(400)
          .json({ error: "You did not submit an initial quote." });
      }

      if (vendorName === rfq.l1VendorId.toString()) {
        return res
          .status(400)
          .json({ error: "L1 vendor cannot update the quote." });
      }

      // Allow updating the quote
      existingQuote.price = quote;
      existingQuote.numberOfTrucks = numberOfTrucks;
      existingQuote.numberOfVehiclesPerDay = numberOfVehiclesPerDay;
      existingQuote.message = message;
      existingQuote.validityPeriod = validityPeriod;
      await existingQuote.save();

      const emailContent = {
        message: {
          subject: `Quote Updated by ${vendorName} for RFQ ${rfq.RFQNumber}`,
          body: {
            contentType: "Text",
            content: `
              A quote has been updated for RFQ ID: ${rfqId}.
              Vendor: ${vendorName}
              Quote: ${quote}
              Number of Trucks: ${numberOfTrucks}
              Validity Period: ${validityPeriod}
              Message: ${message}
            `,
          },
          toRecipients: [
            {
              emailAddress: {
                address: SENDER_EMAIL,
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

      res.status(200).json({ message: "Quote updated successfully." });
    } else {
      return res
        .status(400)
        .json({ error: "RFQ is closed. You cannot submit a quote." });
    }
  } catch (error) {
    console.error("Error submitting quote:", error);
    res.status(500).json({ error: "Failed to submit quote." });
  }
};