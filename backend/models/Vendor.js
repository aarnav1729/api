// models/Vendor.js
const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  vendorName: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  contactNumber: { type: String, unique: true, required: true },
});

module.exports = mongoose.model('Vendor', vendorSchema);