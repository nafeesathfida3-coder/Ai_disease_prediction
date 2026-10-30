require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function testGoogleMaps() {
  try {
    // Test location: Kochi, Kerala
    const latitude = 9.9312;
    const longitude = 76.2673;

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",

      input:
        "Find dermatologists, dermatology clinics, and hospitals with dermatology services near this location. Return real places from Google Maps. Do not invent names or details.",

      tools: [
        {
          type: "google_maps",
          latitude,
          longitude
        }
      ]
    });

    console.log("\nGoogle Maps grounding test successful.\n");

    console.log("Gemini response:");
    console.log(interaction.output_text);

    console.log("\nGoogle Maps sources:");

    for (const step of interaction.steps || []) {
      if (step.type === "model_output") {
        for (const contentBlock of step.content || []) {
          if (contentBlock.type === "text" && contentBlock.annotations) {
            for (const annotation of contentBlock.annotations) {
              if (annotation.type === "place_citation") {
                console.log(`- ${annotation.name}`);
                console.log(`  ${annotation.url}`);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("\nGoogle Maps grounding test failed.\n");
    console.error(error);
  }
}

testGoogleMaps();