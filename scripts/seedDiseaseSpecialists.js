require("dotenv").config();

const mongoose = require("mongoose");
const DiseaseSpecialist = require("../models/DiseaseSpecialist");

const diseaseSpecialties = [
  {
    disease: "Drug Reaction",
    specialty: "Allergist"
  },
  {
  disease: "Common Cold",
  specialty: "Internal Medicine"
},
  {
    disease: "Allergy",
    specialty: "Allergist"
  },
  {
  disease: "Paralysis",
  specialty: "Neurologist"
},
{
  disease: "Paralysis (brain hemorrhage)",
  specialty: "Neurologist"
},
  {
    disease: "Hypertension",
    specialty: "Cardiologist"
  },
  {
    disease: "Heart attack",
    specialty: "Cardiologist"
  },
  {
    disease: "Psoriasis",
    specialty: "Dermatologist"
  },
  {
    disease: "Chicken pox",
    specialty: "Dermatologist"
  },
  {
    disease: "Acne",
    specialty: "Dermatologist"
  },
  {
    disease: "Impetigo",
    specialty: "Dermatologist"
  },
  {
    disease: "Fungal infection",
    specialty: "Dermatologist"
  },
  {
    disease: "Hypothyroidism",
    specialty: "Endocrinologist"
  },
  {
    disease: "Diabetes",
    specialty: "Endocrinologist"
  },
  {
    disease: "Hypoglycemia",
    specialty: "Endocrinologist"
  },
  {
    disease: "Hyperthyroidism",
    specialty: "Endocrinologist"
  },
  {
    disease: "GERD",
    specialty: "Gastroenterologist"
  },
  {
    disease: "Peptic ulcer diseae",
    specialty: "Gastroenterologist"
  },
  {
    disease: "Jaundice",
    specialty: "Gastroenterologist"
  },
  {
    disease: "Dimorphic hemmorhoids(piles)",
    specialty: "Gastroenterologist"
  },
  {
    disease: "Gastroenteritis",
    specialty: "Gastroenterologist"
  },
  {
    disease: "Urinary tract infection",
    specialty: "Gynecologist"
  },
  {
    disease: "chronic cholestasis",
    specialty: "Hepatologist"
  },
  {
    disease: "Hepatitis A",
    specialty: "Hepatologist"
  },
  {
    disease: "Hepatitis B",
    specialty: "Hepatologist"
  },
  {
    disease: "Hepatitis C",
    specialty: "Hepatologist"
  },
  {
    disease: "Hepatitis D",
    specialty: "Hepatologist"
  },
  {
    disease: "Hepatitis E",
    specialty: "Hepatologist"
  },
  {
    disease: "Alcoholic hepatitis",
    specialty: "Hepatologist"
  },
  {
    disease: "Malaria",
    specialty: "Internal Medicine"
  },
  {
    disease: "Dengue",
    specialty: "Internal Medicine"
  },
  {
    disease: "Migraine",
    specialty: "Neurologist"
  },
  {
    disease: "Cervical spondylosis",
    specialty: "Neurologist"
  },
  {
    disease: "Paralysis (brain hemorrhage)",
    specialty: "Neurologist"
  },
  {
    disease: "AIDS",
    specialty: "Osteopathic"
  },
  {
    disease: "(vertigo) Paroymsal  Positional Vertigo",
    specialty: "Otolaryngologist"
  },
  {
    disease: "Typhoid",
    specialty: "Pediatrician"
  },
  {
    disease: "Varicose veins",
    specialty: "Phlebologist"
  },
  {
    disease: "Bronchial Asthma",
    specialty: "Pulmonologist"
  },
  {
    disease: "Pneumonia",
    specialty: "Pulmonologist"
  },
  {
    disease: "Osteoarthristis",
    specialty: "Rheumatologist"
  },
  {
    disease: "Arthritis",
    specialty: "Rheumatologist"
  },
  {
    disease: "Tuberculosis",
    specialty: "Tuberculosis"
  }
];

async function seedDiseaseSpecialties() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected.");

    const operations = diseaseSpecialties.map((item) => ({
      updateOne: {
        filter: { disease: item.disease },
        update: {
          $set: {
            disease: item.disease,
            specialty: item.specialty
          }
        },
        upsert: true
      }
    }));

    const result = await DiseaseSpecialist.bulkWrite(operations);

    console.log("Disease-specialty mapping completed.");
    console.log(`Mappings processed: ${diseaseSpecialties.length}`);
    console.log(`Inserted: ${result.upsertedCount}`);
    console.log(`Updated: ${result.modifiedCount}`);

    process.exit(0);
  } catch (error) {
    console.error("Failed to seed disease-specialty mappings:");
    console.error(error);
    process.exit(1);
  }
}

seedDiseaseSpecialties();