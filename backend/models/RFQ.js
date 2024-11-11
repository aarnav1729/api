// models/RFQ.js
const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema(
  {
    RFQNumber: { type: String, unique: true, required: true },
    shortName: { type: String, required: false },
    companyType: { type: String, required: false },
    sapOrder: { type: String, required: false },
    itemType: { type: String, required: false },
    customerName: { type: String, required: false },
    originLocation: { type: String, required: false },
    dropLocationState: { type: String, required: false },
    dropLocationDistrict: { type: String, required: false },
    address: { type: String, required: true },
    pincode: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\d{6}$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid pincode. It should be exactly 6 digits.`,
      },
    },
    vehicleType: { type: String, required: false },
    additionalVehicleDetails: { type: String, required: false },
    numberOfVehicles: { type: Number, required: true },
    weight: { type: String, required: false },
    budgetedPriceBySalesDept: { type: Number, required: false },
    maxAllowablePrice: { type: Number, required: false },
    eReverseDate: { type: Date, required: false },
    eReverseTime: { type: String, required: false },
    vehiclePlacementBeginDate: { type: Date, required: false },
    vehiclePlacementEndDate: { type: Date, required: false },
    status: {
      type: String,
      enum: ['initial', 'evaluation', 'closed'],
      default: 'initial',
    },
    initialQuoteEndTime: { type: Date, required: true },
    evaluationEndTime: { type: Date, required: true },
    finalizeReason: { type: String, required: false },
    l1Price: { type: Number, required: false },
    l1VendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: false },
    RFQClosingDate: { type: Date, required: false },
    RFQClosingTime: { type: String, required: true },
    eReverseToggle: { type: Boolean, default: false },
    rfqType: { type: String, enum: ['Long Term', 'D2D'], default: 'D2D' },
    selectedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    vendorActions: [
      {
        action: { type: String }, // "addedAtCreation", "added", "reminderSent"
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('RFQ', rfqSchema);