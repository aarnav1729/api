// api/send-otp.js
const dbConnect = require('../utils/dbConnect');
const Verification = require('../models/Verification');
const { client, SENDER_EMAIL } = require('../utils/emailClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
    return;
  }

  const { email } = req.body;

  // Validate email
  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, message: 'Invalid email provided.' });
    return;
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await dbConnect();

    // Save the OTP to the database
    const newVerification = new Verification({ email, otp });
    await newVerification.save();

    // Create the email content
    const emailContent = {
      message: {
        subject: 'Your OTP for Registration',
        body: {
          contentType: 'Text',
          content: `Your OTP for registration is: ${otp}. It is valid for 5 minutes.`,
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

    res.status(200).json({ success: true, message: 'OTP sent to email.' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
};