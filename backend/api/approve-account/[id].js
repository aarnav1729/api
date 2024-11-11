// api/approve-account/[id].js
const dbConnect = require('../../utils/dbConnect');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const { client, SENDER_EMAIL } = require('../../utils/emailClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { id } = req.query;

  try {
    await dbConnect();

    const user = await User.findByIdAndUpdate(
      id,
      { status: "approved" },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If the user is a vendor, create an entry in the Vendor collection
    if (user.role === "vendor") {
      const newVendor = new Vendor({
        username: user.username,
        vendorName: user.vendorName || user.username, // Ensure vendorName is set
        password: user.password, // Consider hashing passwords in production
        email: user.email,
        contactNumber: user.contactNumber,
      });
      await newVendor.save();
    }

    // Create the email content
    const emailContent = {
      message: {
        subject: "Account Approved",
        body: {
          contentType: "Text",
          content: `
            Dear ${user.username},
            
            Congratulations! Your account has been approved by the admin.
            You can now log in to the portal using your credentials.

            Best regards,
            Team LEAF.
          `,
        },
        toRecipients: [
          {
            emailAddress: {
              address: user.email,
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

    // Send the email using Microsoft Graph API
    await client.api(`/users/${SENDER_EMAIL}/sendMail`).post(emailContent);

    res.status(200).json({ message: "User account approved and email sent." });
  } catch (error) {
    console.error("Error approving user account:", error);
    res.status(500).json({ error: "Failed to approve user account" });
  }
};