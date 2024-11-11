// api/verify-otp.js
const dbConnect = require('../utils/dbConnect');
const Verification = require('../models/Verification');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
    return;
  }

  const { email, otp } = req.body;

  // Validate input
  if (
    !email ||
    typeof email !== 'string' ||
    !otp ||
    typeof otp !== 'string'
  ) {
    res.status(400).json({ success: false, message: 'Invalid input.' });
    return;
  }

  try {
    await dbConnect();

    const verification = await Verification.findOne({ email, otp });
    if (verification) {
      // OTP is correct
      // Remove the verification entry
      await Verification.deleteOne({ _id: verification._id });
      res.status(200).json({ success: true, message: 'OTP verified.' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP.' });
  }
};