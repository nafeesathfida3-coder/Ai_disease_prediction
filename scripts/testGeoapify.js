require("dotenv").config();

async function testGeoapify() {
  try {
    const latitude = 9.9312;
    const longitude = 76.2673;

    const url =
      `https://api.geoapify.com/v2/places` +
      `?categories=healthcare.clinic_or_praxis.dermatology` +
      `&filter=circle:${longitude},${latitude},5000` +
      `&bias=proximity:${longitude},${latitude}` +
      `&limit=5` +
      `&apiKey=${process.env.GEOAPIFY_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Geoapify API error: ${response.status} ${await response.text()}`
      );
    }

    const data = await response.json();

    console.log("\nGeoapify test successful.");
    console.log(`Places found: ${data.features.length}\n`);

    data.features.forEach((place, index) => {
      const p = place.properties;

      console.log(`${index + 1}. ${p.name || "Unnamed place"}`);
      console.log(`   Address: ${p.formatted || "Not available"}`);
      console.log(`   Distance: ${p.distance ?? "Not available"} meters`);
      console.log(`   Place ID: ${p.place_id || "Not available"}`);
      console.log("");
    });
  } catch (error) {
    console.error("\nGeoapify test failed.");
    console.error(error.message);
  }
}

testGeoapify();