// api/decline-account/[id].js
const dbConnect = require('../../utils/dbConnect');
const User = require('../../models/User');
const { client, SENDER_EMAIL } = require('../../utils/emailClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { id } = req.query;

  try {
    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create the email content
    const emailContent = {
      message: {
        subject: "Account Rejected",
        body: {
          contentType: "Text",
          content: `
            Dear ${user.username},

            We regret to inform you that your account registration has been rejected by the admin.

            For any further inquiries, please contact our support team.

            Best regards,
            Team LEAF
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

    // Delete the user account
    await User.findByIdAndDelete(id);

    res.status(200).json({ message: "User account declined and email sent." });
  } catch (error) {
    console.error("Error declining user account:", error);
    res.status(500).json({ error: "Failed to decline user account" });
  }
};