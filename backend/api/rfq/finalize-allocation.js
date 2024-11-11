// api/rfq/finalize-allocation.js
const dbConnect = require('../../utils/dbConnect');
const RFQ = require('../../models/RFQ');
const Quote = require('../../models/Quote');
const Vendor = require('../../models/Vendor');
const { client, SENDER_EMAIL } = require('../../utils/emailClient');
const moment = require('moment-timezone');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { id } = req.query;
  const { logisticsAllocation, finalizeReason } = req.body;

  // Input Validation
  if (
    !logisticsAllocation ||
    !Array.isArray(logisticsAllocation) ||
    logisticsAllocation.some(
      (alloc) =>
        !alloc.vendorName ||
        typeof alloc.vendorName !== 'string' ||
        typeof alloc.price !== 'number' ||
        typeof alloc.trucksAllotted !== 'number' ||
        !alloc.label ||
        typeof alloc.label !== 'string'
    )
  ) {
    res.status(400).json({ error: 'Invalid logistics allocation data.' });
    return;
  }

  try {
    await dbConnect();

    // Fetch the RFQ
    const rfq = await RFQ.findById(id);
    if (!rfq) {
      return res.status(404).json({ error: "RFQ not found" });
    }

    // Check if RFQ is already closed
    if (rfq.status === "closed") {
      return res.status(400).json({ error: "RFQ has already been finalized." });
    }

    // Fetch all quotes for this RFQ
    const quotes = await Quote.find({ rfqId: id });

    // Compute LEAF Allocation based on quotes
    const assignLeafAllocation = (quotes, requiredTrucks) => {
      if (!requiredTrucks || requiredTrucks <= 0) return [];

      // Sort quotes by price (ascending)
      const sortedQuotes = [...quotes].sort((a, b) => a.price - b.price);
      let totalTrucks = 0;

      return sortedQuotes.map((quote, index) => {
        if (totalTrucks < requiredTrucks) {
          const trucksToAllot = Math.min(
            quote.numberOfTrucks,
            requiredTrucks - totalTrucks
          );
          totalTrucks += trucksToAllot;
          return {
            ...quote.toObject(),
            label: `L${index + 1}`,
            trucksAllotted: trucksToAllot,
          };
        }
        return { ...quote.toObject(), label: "-", trucksAllotted: 0 };
      });
    };

    const leafAllocation = assignLeafAllocation(quotes, rfq.numberOfVehicles);

    // Prepare data for comparison
    const leafAllocData = leafAllocation.map((alloc) => ({
      vendorName: alloc.vendorName,
      trucksAllotted: alloc.trucksAllotted,
    }));
    const logisticsAllocData = logisticsAllocation.map((alloc) => ({
      vendorName: alloc.vendorName,
      trucksAllotted: alloc.trucksAllotted,
    }));

    // Check if Logistics Allocation matches LEAF Allocation
    const isIdentical =
      JSON.stringify(leafAllocData) === JSON.stringify(logisticsAllocData);

    // If there is a mismatch, send email to specified addresses
    if (!isIdentical) {
      // Compute Total LEAF Price and Total Logistics Price
      const totalLeafPrice = leafAllocation.reduce(
        (sum, alloc) => sum + alloc.price * alloc.trucksAllotted,
        0
      );
      const totalLogisticsPrice = logisticsAllocation.reduce(
        (sum, alloc) => sum + alloc.price * alloc.trucksAllotted,
        0
      );

      // Prepare tables for email
      const generateTableHTML = (allocations, title) => {
        let tableRows = allocations
          .map(
            (alloc) => `
          <tr>
            <td>${alloc.vendorName}</td>
            <td>${alloc.price}</td>
            <td>${alloc.trucksAllotted}</td>
            <td>${alloc.label}</td>
          </tr>
        `
          )
          .join("");

        return `
          <h3>${title}</h3>
          <table border="1" cellpadding="5" cellspacing="0">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Price</th>
                <th>Trucks Allotted</th>
                <th>Label</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        `;
      };

      const leafAllocationTable = generateTableHTML(
        leafAllocation,
        "LEAF Allocation"
      );
      const logisticsAllocationTable = generateTableHTML(
        logisticsAllocation,
        "Logistics Allocation"
      );

      // Define reasonContent
      const reasonContent = finalizeReason
        ? `<p><strong>Reason given for Difference:</strong> ${finalizeReason}</p>`
        : "";

      const emailContent = {
        message: {
          subject: "Mismatch in Allocation",
          body: {
            contentType: "HTML",
            content: `
              <p>This is a LEAF auto-alert to notify you of a mismatch between LEAF and Logistics Allocation for <strong>${rfq.RFQNumber}</strong>.</p>
              ${leafAllocationTable}
              ${logisticsAllocationTable}
              <p><strong>Total LEAF Price:</strong> ${totalLeafPrice}</p>
              <p><strong>Total Logistics Price:</strong> ${totalLogisticsPrice}</p>
              ${reasonContent}
            `,
          },
          toRecipients: [
            {
              emailAddress: {
                address: "aarnav.singh@premierenergies.com",
              },
            },
            {
              emailAddress: {
                address: "saluja@premierenergies.com",
              },
            },
            {
              emailAddress: {
                address: "vishnu.hazari@premierenergies.com",
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

      try {
        await client.api(`/users/${SENDER_EMAIL}/sendMail`).post(emailContent);
      } catch (error) {
        console.error("Error sending mismatch email:", error);
      }
    }

    // Update the RFQ status to 'closed' and save the finalizeReason
    rfq.status = "closed";
    if (finalizeReason) {
      rfq.finalizeReason = finalizeReason;
    }
    await rfq.save();

    for (const alloc of logisticsAllocation) {
      // Find the quote
      const quote = await Quote.findOne({
        rfqId: id,
        vendorName: alloc.vendorName,
      });
      if (quote) {
        quote.price = alloc.price;
        quote.trucksAllotted = alloc.trucksAllotted;
        quote.label = alloc.label;
        await quote.save();
      }
    }

    // Send emails to vendors with the final allocation
    for (const alloc of logisticsAllocation) {
      if (alloc.trucksAllotted > 0) {
        const vendor = await Vendor.findOne({ vendorName: alloc.vendorName });
        if (vendor) {
          const emailContent = {
            message: {
              subject: `${rfq.RFQNumber} Finalized Allocation`,
              body: {
                contentType: "Text",
                content: `
                  Dear ${vendor.vendorName},
                  The RFQ ${rfq.RFQNumber} has been finalized. Here are your allocation details:
                  Price: ${alloc.price}
                  Trucks Allotted: ${alloc.trucksAllotted}
                  Label: ${alloc.label}
                  Best regards,
                  Team LEAF.
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
      }
    }

    res.status(200).json({
      message:
        "Allocation finalized and emails sent to vendors and management.",
    });
  } catch (error) {
    console.error("Error finalizing allocation:", error);
    res.status(500).json({ error: "Failed to finalize allocation." });
  }
};