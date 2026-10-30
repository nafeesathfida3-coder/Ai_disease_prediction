require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function testGoogleSearch() {
  try {
    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input:
        "Find real dermatologists and dermatology clinics in Kochi, Kerala, India. Give the names and source links. Do not invent any businesses or doctors.",
      tools: [
        {
          type: "google_search"
        }
      ]
    });

    console.log("\nGoogle Search grounding test successful.\n");
    console.log(interaction.output_text);
  } catch (error) {
    console.error("\nGoogle Search grounding test failed.\n");
    console.error(error);
  }
}

testGoogleSearch();