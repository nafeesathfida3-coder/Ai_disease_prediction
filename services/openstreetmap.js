const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"
];

async function findHealthcarePlaces(latitude, longitude, radius = 5000) {
  const query = `
[out:json][timeout:15];

(
  nwr["amenity"="hospital"](around:${radius},${latitude},${longitude});
  nwr["amenity"="clinic"](around:${radius},${latitude},${longitude});
  nwr["amenity"="doctors"](around:${radius},${latitude},${longitude});
  nwr["healthcare"="hospital"](around:${radius},${latitude},${longitude});
  nwr["healthcare"="clinic"](around:${radius},${latitude},${longitude});
  nwr["healthcare"="doctor"](around:${radius},${latitude},${longitude});
);

out center tags;
`;

  let lastError = null;

  for (const server of OVERPASS_SERVERS) {
    try {
      console.log(`Trying OpenStreetMap server: ${server}`);

      const response = await fetch(server, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "AI-Disease-Doctor-MCA-Project/1.0"
        },
        body: new URLSearchParams({ data: query })
      });

      if (!response.ok) {
        lastError = new Error(`OpenStreetMap search failed: ${response.status}`);
        continue;
      }

      const data = await response.json();

      return data.elements.map((place) => {
        const tags = place.tags || {};

        const lat = place.lat ?? place.center?.lat ?? null;
        const lon = place.lon ?? place.center?.lon ?? null;

        return {
          id: `${place.type}-${place.id}`,
          name: tags.name || "Unnamed healthcare provider",
          type: tags.amenity || tags.healthcare || "healthcare",

          speciality:
            tags["healthcare:speciality"] ||
            tags["healthcare:specialty"] ||
            "",

          address: [
            tags["addr:housenumber"],
            tags["addr:street"],
            tags["addr:suburb"],
            tags["addr:city"]
          ]
            .filter(Boolean)
            .join(", "),

          phone: tags.phone || tags["contact:phone"] || "",

          website:
            tags.website ||
            tags["contact:website"] ||
            "",

          opening_hours: tags.opening_hours || "",

          latitude: lat,
          longitude: lon,

          osm_url:
            `https://www.openstreetmap.org/${place.type}/${place.id}`
        };
      });
    } catch (error) {
      console.log(`Server failed: ${error.message}`);
      lastError = error;
    }
  }

  throw lastError || new Error("All OpenStreetMap servers failed");
}

module.exports = { findHealthcarePlaces };