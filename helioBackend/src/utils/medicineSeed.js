import Medicine from "../models/Medicine.model.js";

const pharmacies = ["Tata 1mg", "PharmEasy", "Apollo Pharmacy", "Netmeds"];

function createProduct(
  genericName,
  brandName,
  activeIngredient,
  strength,
  dosageForm,
  route,
  formulation,
  packSize,
  unitsPerPack,
  quantityUnit,
  basePrice,
  pharmacyIndexes = [0, 1, 2]
) {
  const seedKey = [
    genericName,
    brandName,
    strength,
    dosageForm,
    packSize,
  ].join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    seedKey,
    genericName,
    brandName,
    activeIngredient,
    strength,
    dosageForm,
    route,
    formulation,
    packSize,
    unitsPerPack,
    quantityUnit,
    listings: pharmacyIndexes.map((pharmacyIndex, index) => {
      const price = Number((basePrice * (1 + index * 0.11)).toFixed(2));
      const mrp = Number((price * 1.2).toFixed(2));
      return {
        pharmacy: pharmacies[pharmacyIndex],
        mrp,
        sellingPrice: price,
        availability: index === 2 ? "limited" : "available",
        productUrl: null,
        sourceType: "demo",
        lastUpdated: new Date("2026-10-01T00:00:00.000Z"),
      };
    }),
  };
}

export const demoProducts = [
  createProduct("Paracetamol", "Generic Paracetamol", "Paracetamol", "500 mg", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 18, [0, 1, 2, 3]),
  createProduct("Paracetamol", "Dolo 500", "Paracetamol", "500 mg", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 21, [0, 1, 3]),
  createProduct("Paracetamol", "Generic Paracetamol", "Paracetamol", "650 mg", "Tablet", "Oral", "Immediate release", "15 tablets", 15, "tablets", 29, [0, 2, 3]),
  createProduct("Paracetamol", "Generic Paracetamol Suspension", "Paracetamol", "120 mg/5 ml", "Syrup", "Oral", "Oral suspension", "60 ml bottle", 60, "ml", 35, [0, 1, 2]),
  createProduct("Cetirizine", "Generic Cetirizine", "Cetirizine", "10 mg", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 14, [0, 1, 2, 3]),
  createProduct("Cetirizine", "Cetzine 10", "Cetirizine", "10 mg", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 17, [0, 2, 3]),
  createProduct("Cetirizine", "Generic Cetirizine Syrup", "Cetirizine", "5 mg/5 ml", "Syrup", "Oral", "Oral solution", "60 ml bottle", 60, "ml", 32, [1, 2, 3]),
  createProduct("Oral Rehydration Salts", "ORS Sachet", "Glucose, sodium chloride, potassium chloride, sodium citrate", "21.8 g", "Powder sachet", "Oral", "Powder for reconstitution", "1 sachet", 1, "sachets", 18, [0, 1, 2, 3]),
  createProduct("Ibuprofen", "Generic Ibuprofen", "Ibuprofen", "200 mg", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 22, [0, 1, 2]),
  createProduct("Ibuprofen", "Generic Ibuprofen", "Ibuprofen", "400 mg", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 31, [0, 2, 3]),
  createProduct("Omeprazole", "Generic Omeprazole", "Omeprazole", "20 mg", "Capsule", "Oral", "Delayed release", "10 capsules", 10, "capsules", 26, [0, 1, 3]),
  createProduct("Pantoprazole", "Generic Pantoprazole", "Pantoprazole", "40 mg", "Tablet", "Oral", "Delayed release", "15 tablets", 15, "tablets", 48, [0, 1, 2, 3]),
  createProduct("Amoxicillin", "Generic Amoxicillin", "Amoxicillin", "500 mg", "Capsule", "Oral", "Immediate release", "10 capsules", 10, "capsules", 75, [0, 1, 2]),
  createProduct("Azithromycin", "Generic Azithromycin", "Azithromycin", "500 mg", "Tablet", "Oral", "Immediate release", "3 tablets", 3, "tablets", 62, [0, 2, 3]),
  createProduct("Metformin", "Generic Metformin", "Metformin", "500 mg", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 19, [0, 1, 2, 3]),
  createProduct("Amlodipine", "Generic Amlodipine", "Amlodipine", "5 mg", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 16, [0, 1, 3]),
  createProduct("Atorvastatin", "Generic Atorvastatin", "Atorvastatin", "10 mg", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 34, [0, 2, 3]),
  createProduct("Montelukast", "Generic Montelukast", "Montelukast", "10 mg", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 42, [0, 1, 2]),
  createProduct("Salbutamol", "Salbutamol Inhaler", "Salbutamol", "100 mcg/actuation", "Inhaler", "Inhalation", "Metered-dose aerosol", "200 metered doses", 200, "actuations", 145, [0, 1, 3]),
  createProduct("Cough relief syrup", "Demo Cough Syrup", "Dextromethorphan", "10 mg/5 ml", "Syrup", "Oral", "Oral solution", "100 ml bottle", 100, "ml", 68, [0, 2, 3]),
  createProduct("Ascorbic acid", "Vitamin C 500", "Ascorbic acid", "500 mg", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 28, [0, 1, 2, 3]),
  createProduct("Multivitamin", "Daily Multivitamin", "Multivitamins and minerals", "Standard", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 55, [0, 1, 3]),
  createProduct("Calcium with Vitamin D3", "Calcium-D3", "Calcium carbonate, cholecalciferol", "500 mg + 250 IU", "Tablet", "Oral", "Immediate release", "15 tablets", 15, "tablets", 64, [0, 2, 3]),
  createProduct("Iron with folic acid", "Iron-Folic Acid", "Ferrous sulfate, folic acid", "Standard", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 24, [0, 1, 2]),
  createProduct("Diclofenac", "Generic Diclofenac", "Diclofenac sodium", "50 mg", "Tablet", "Oral", "Delayed release", "10 tablets", 10, "tablets", 31, [0, 1, 3]),
  createProduct("Aspirin", "Generic Aspirin", "Acetylsalicylic acid", "75 mg", "Tablet", "Oral", "Delayed release", "14 tablets", 14, "tablets", 23, [0, 2, 3]),
  createProduct("Levocetirizine", "Generic Levocetirizine", "Levocetirizine", "5 mg", "Tablet", "Oral", "Immediate release", "10 tablets", 10, "tablets", 24, [0, 1, 2, 3]),
];

export async function seedDemoMedicines() {
  const existingCount = await Medicine.countDocuments({ dataSource: /^DEMO$/i });
  const needed = Math.max(0, 27 - existingCount);
  if (needed === 0) return;

  const operations = demoProducts.slice(0, needed).map((medicine, index) => ({
    updateOne: {
      filter: { seedKey: medicine.seedKey },
      update: {
        $setOnInsert: {
          medicineId: `CLINQ-DEMO-${String(index + 1).padStart(3, "0")}`,
          genericName: medicine.genericName,
          brandName: medicine.brandName,
          activeIngredients: medicine.activeIngredient.split(",").map((ingredient) => ingredient.trim()),
          strength: medicine.strength,
          dosageForm: medicine.dosageForm,
          packSize: {
            quantity: medicine.unitsPerPack,
            unit: medicine.quantityUnit,
            label: medicine.packSize,
          },
          category: medicine.genericName === "Paracetamol" ? "Analgesic/antipyretic" : "General medicine",
          prescriptionRequired: ["Amoxicillin", "Azithromycin"].includes(medicine.genericName),
          dataSource: "DEMO",
          demoDataNotice: "Fictional demonstration data. Not real pharmacy prices, discounts, stock, or product links.",
          pharmacyListings: medicine.listings.map((listing) => ({
            pharmacyName: listing.pharmacy,
            mrp: listing.mrp,
            sellingPrice: listing.sellingPrice,
            discountPercent: Math.round(((listing.mrp - listing.sellingPrice) / listing.mrp) * 100),
            availability: listing.availability,
            productUrl: null,
            dataSource: "DEMO",
            lastUpdated: listing.lastUpdated,
          })),
          seedKey: medicine.seedKey,
        },
      },
      upsert: true,
    },
  }));
  if (operations.length) await Medicine.bulkWrite(operations, { ordered: false });
}
