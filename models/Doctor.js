const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    specialization: {
      type: String,
      required: true,
      trim: true
    },

    diseases: {
      type: [String],
      default: []
    },

    location: {
      type: String,
      default: ''
    },

    hospital: {
      type: String,
      default: ''
    },

    experience: {
      type: Number,
      default: 0
    },

    phone: {
      type: String,
      default: ''
    },

    email: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Doctor', doctorSchema);