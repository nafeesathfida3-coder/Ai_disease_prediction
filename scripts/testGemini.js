require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function testGemini() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents:
        "Give me a short response confirming that the Gemini API is working."
    });

    console.log("Gemini API test successful.");
    console.log("Response:");
    console.log(response.text);
  } catch (error) {
    console.error("Gemini API test failed.");
    console.error(error);
  }
}

testGemini();