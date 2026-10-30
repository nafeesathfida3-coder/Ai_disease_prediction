const mongoose = require("mongoose");

const diseaseSpecialistSchema = new mongoose.Schema(
  {
    disease: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    specialty: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "DiseaseSpecialist",
  diseaseSpecialistSchema
);