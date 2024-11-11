// api/register.js
const dbConnect = require('../utils/dbConnect');
const User = require('../models/User');
const { client, SENDER_EMAIL } = require('../utils/emailClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
    return;
  }

  const { username, password, vendorName, email, contactNumber, role } = req.body;

  // Validate input
  if (
    !username ||
    typeof username !== 'string' ||
    !password ||
    typeof password !== 'string' ||
    !email ||
    typeof email !== 'string' ||
    !contactNumber ||
    typeof contactNumber !== 'string' ||
    !role ||
    !['vendor', 'factory'].includes(role)
  ) {
    res.status(400).json({ success: false, message: 'Invalid input data.' });
    return;
  }

  try {
    await dbConnect();

    const newUser = new User({
      username,
      password, // Consider hashing passwords in production
      email,
      contactNumber,
      role,
      status: "pending",
    });
    await newUser.save();

    // Create the email content
    const emailContent = {
      message: {
        subject: "Welcome to Premier Energies",
        body: {
          contentType: "Text",
          content: `
            Dear ${username},
            
            Welcome to LEAF by Premier Energies! We're excited to have you onboard.

            Here are your login credentials:
            Username: ${username}
            Password: ${password}

            Thank you for registering with us! Your account is currently pending admin approval.
            You will be notified once your account has been approved.

            Best regards,
            Team LEAF.
          `,
        },
        toRecipients: [
          {
            emailAddress: {
              address: email,
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

    res.status(201).json({
      success: true,
      message: "User registered successfully and welcome email sent.",
    });
  } catch (error) {
    console.error("Error registering vendor:", error);
    res.status(500).json({ success: false, message: "Failed to register vendor." });
  }
};