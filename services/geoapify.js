
async function geocodePlace(place) {
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    throw new Error("GEOAPIFY_API_KEY is missing from .env");
  }

  const params = new URLSearchParams({
    text: place,
    limit: "1",
    lang: "en",
    apiKey,
  });

  const url =
    `https://api.geoapify.com/v1/geocode/search?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Geoapify geocoding error ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error(`Place not found: ${place}`);
  }

  const properties = data.features[0].properties;

  return {
    latitude: properties.lat,
    longitude: properties.lon,
    formatted: properties.formatted || place,
  };
}

const SPECIALTY_CATEGORIES = {
  Allergist: "healthcare.clinic_or_praxis.allergology",
  Cardiologist: "healthcare.clinic_or_praxis.cardiology",
  Dermatologist: "healthcare.clinic_or_praxis.dermatology",
  Endocrinologist: "healthcare.clinic_or_praxis.endocrinology",
  Gastroenterologist: "healthcare.clinic_or_praxis.gastroenterology",
  Gynecologist: "healthcare.clinic_or_praxis.gynaecology",
  Otolaryngologist: "healthcare.clinic_or_praxis.otolaryngology",
  Pediatrician: "healthcare.clinic_or_praxis.paediatrics",
  Pulmonologist: "healthcare.clinic_or_praxis.pulmonology",
  Rheumatologist: "healthcare.clinic_or_praxis.rheumatology",
  "Internal Medicine": "healthcare.clinic_or_praxis.general",
  InternalMedicine: "healthcare.clinic_or_praxis.general"
};


// ======================================================
// SEARCH GEOAPIFY
// ======================================================

async function searchGeoapify(
  latitude,
  longitude,
  radiusMeters,
  category
) {
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    throw new Error("GEOAPIFY_API_KEY is missing from .env");
  }

  const params = new URLSearchParams({
    categories: category,
    filter: `circle:${longitude},${latitude},${radiusMeters}`,
    bias: `proximity:${longitude},${latitude}`,
    limit: "50",
    lang: "en",
    apiKey
  });

  const url =
    `https://api.geoapify.com/v2/places?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Geoapify API error ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();

  return data.features || [];
}


// ======================================================
// CHECK BASIC HOSPITAL / CLINIC TYPE
// ======================================================

function isHospitalOrClinic(feature) {
  const categories =
    feature.properties?.categories || [];

  return categories.some((category) => {
    const value = category.toLowerCase();

    return (
      value === "healthcare.hospital" ||
      value.startsWith("healthcare.hospital.") ||
      value === "healthcare.clinic_or_praxis" ||
      value.startsWith("healthcare.clinic_or_praxis.")
    );
  });
}


// ======================================================
// EXCLUDE UNRELATED PROVIDER TYPES
// ======================================================

function isRelevantGeneralProvider(feature) {
  const properties = feature.properties || {};

  const categories =
    properties.categories || [];

  const name =
    properties.name || "";

  const searchableText = [
    name,
    ...categories
  ]
    .join(" ")
    .toLowerCase();

  const excludedTerms = [
  "ayurveda",
  "ayurvedha",
  "ayurvedic",
  "arya vaidya",
  "vaidya sala",
  "vaidya shala",
  "homeo",
  "homoeo",
  "homeopathy",
  "homoeopathy",
  "eye care",
  "eye hospital",
  "ophthalm",
  "optical",
  "optometry",
  "dental",
  "dentist",
  "dentistry",
  "tb centre",
  "tb center",
  "tuberculosis",
  "oldage home",
  "old age home"
];

  return !excludedTerms.some((term) =>
    searchableText.includes(term)
  );
}


// ======================================================
// FORMAT PLACE
// ======================================================

function formatPlace(
  feature,
  requestedSpecialty,
  isFallback = false
) {
  const properties = feature.properties || {};

  return {
    name:
      properties.name ||
      "Healthcare Provider",

    type:
      properties.categories?.join(", ") ||
      "healthcare",

    specialty:
      requestedSpecialty || null,

    address:
      properties.formatted ||
      [
        properties.address_line1,
        properties.address_line2
      ]
        .filter(Boolean)
        .join(", "),

    latitude:
      properties.lat ??
      feature.geometry?.coordinates?.[1],

    longitude:
      properties.lon ??
      feature.geometry?.coordinates?.[0],

    distance:
      properties.distance ?? null,

    phone:
      properties.datasource?.raw?.phone ||
      properties.phone ||
      null,

    website:
      properties.datasource?.raw?.website ||
      properties.website ||
      null,

    place_id:
      properties.place_id ||
      feature.id ||
      null,

    fallback: isFallback
  };
}


// ======================================================
// FIND NEARBY HEALTHCARE
// ======================================================

async function findHealthcarePlaces(
  latitude,
  longitude,
  radiusKm = 5,
  specialty = "Dermatologist"
) {
  const radiusMeters =
    Math.min(
      Math.max(Number(radiusKm) * 1000, 1000),
      25000
    );

  let results = [];

  // ====================================================
  // STEP 1
  // SEARCH FOR ACTUAL SPECIALTY
  // ====================================================

  const selectedCategory =
    SPECIALTY_CATEGORIES[specialty] || null;

  if (selectedCategory) {
    console.log(
      `Searching Geoapify for ${specialty}...`
    );

    let features = await searchGeoapify(
      latitude,
      longitude,
      radiusMeters,
      selectedCategory
    );

    // Make sure returned places really belong
    // to the requested specialty category.
    features = features.filter((feature) => {
      const categories =
        feature.properties?.categories || [];

      return categories.some(
        (category) =>
          category === selectedCategory ||
          category.startsWith(`${selectedCategory}.`)
      );
    });

    // Remove obviously unrelated providers.
    features = features.filter(
      isRelevantGeneralProvider
    );

    results = features.map((feature) =>
      formatPlace(
        feature,
        specialty,
        false
      )
    );
  } else {
    console.log(
      `${specialty} does not have a supported Geoapify specialty category.`
    );
  }


  // ====================================================
  // STEP 2
  // GENERAL MEDICINE FALLBACK
  // ====================================================

  if (results.length === 0) {
    console.log(
      `No ${specialty} places found. Searching General Medicine hospitals and clinics...`
    );

    let generalFeatures = [];

    // --------------------------------------------------
    // 2A. General hospitals
    // --------------------------------------------------

    const hospitalFeatures = await searchGeoapify(
      latitude,
      longitude,
      radiusMeters,
      "healthcare.hospital"
    );

    // --------------------------------------------------
    // 2B. General Medicine clinics
    // --------------------------------------------------

    const generalClinicFeatures =
      await searchGeoapify(
        latitude,
        longitude,
        radiusMeters,
        "healthcare.clinic_or_praxis.general"
      );

    generalFeatures = [
      ...hospitalFeatures,
      ...generalClinicFeatures
    ];

    // Only actual hospitals/clinics
    generalFeatures =
      generalFeatures.filter(
        isHospitalOrClinic
      );

    // Remove unrelated provider types
    generalFeatures =
      generalFeatures.filter(
        isRelevantGeneralProvider
      );

    results = generalFeatures.map(
      (feature) =>
        formatPlace(
          feature,
          "General Medicine",
          true
        )
    );
  }


  // ====================================================
  // STEP 3
  // LAST FALLBACK
  // OTHER RELEVANT HOSPITALS / CLINICS
  // ====================================================

  if (results.length === 0) {
    console.log(
      "No General Medicine providers found. Searching other relevant hospitals and clinics..."
    );

    let features = await searchGeoapify(
      latitude,
      longitude,
      radiusMeters,
      "healthcare"
    );

    features =
      features.filter(
        isHospitalOrClinic
      );

    features =
      features.filter(
        isRelevantGeneralProvider
      );

    results = features.map(
      (feature) =>
        formatPlace(
          feature,
          "General Healthcare",
          true
        )
    );
  }


  // ====================================================
  // STEP 4
  // REMOVE DUPLICATES
  // ====================================================

  const uniquePlaces = [];

  for (const place of results) {
    const normalizedName =
      (place.name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const alreadyExists =
      uniquePlaces.some((existing) => {
        const existingName =
          (existing.name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

        if (
          existingName !== normalizedName
        ) {
          return false;
        }

        if (
          place.latitude == null ||
          place.longitude == null ||
          existing.latitude == null ||
          existing.longitude == null
        ) {
          return false;
        }

        const latitudeDifference =
          Math.abs(
            place.latitude -
            existing.latitude
          );

        const longitudeDifference =
          Math.abs(
            place.longitude -
            existing.longitude
          );

        // Approximately within 200 metres.
        return (
          latitudeDifference < 0.002 &&
          longitudeDifference < 0.002
        );
      });

    if (!alreadyExists) {
      uniquePlaces.push(place);
    }
  }


  // ====================================================
  // STEP 5
  // SORT BY DISTANCE
  // ====================================================

  uniquePlaces.sort((a, b) => {
    if (
      a.distance == null &&
      b.distance == null
    ) {
      return 0;
    }

    if (a.distance == null) {
      return 1;
    }

    if (b.distance == null) {
      return -1;
    }

    return a.distance - b.distance;
  });


  return uniquePlaces;
}


module.exports = {
  findHealthcarePlaces,
  geocodePlace,
};