// api/factory-users/add-factory-user.js
const dbConnect = require('../../utils/dbConnect');
const User = require('../../models/User');
const { client, SENDER_EMAIL } = require('../../utils/emailClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { username, password, email, contactNumber } = req.body;

  // Validate input
  if (
    !username ||
    typeof username !== 'string' ||
    !password ||
    typeof password !== 'string' ||
    !email ||
    typeof email !== 'string' ||
    !contactNumber ||
    typeof contactNumber !== 'string'
  ) {
    res.status(400).json({ error: 'Invalid input data.' });
    return;
  }

  try {
    await dbConnect();

    const newUser = new User({
      username,
      password, // Consider hashing passwords in production
      email,
      contactNumber,
      role: "factory",
      status: "approved",
    });

    await newUser.save();

    // Create the email content
    const emailContent = {
      message: {
        subject: "Welcome to Leaf",
        body: {
          contentType: "Text",
          content: `
            Dear ${username},

            Welcome to LEAF by Premier Energies! We're excited to have you onboard.

            Here are your login credentials:
            Username: ${username}
            Password: ${password}

            Thank you for registering with us! Your account is currently approved.
            You can now log in to the portal using your credentials.

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

    res.status(201).json({ message: "Factory user added successfully!" });
  } catch (error) {
    console.error("Error adding factory user:", error.message);
    res.status(500).json({ error: "Failed to add factory user" });
  }
};