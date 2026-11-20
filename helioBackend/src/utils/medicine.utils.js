export function calculateMedicineCost(medicine, listing, quantity) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive whole number.");
  }

  const price = listing.sellingPrice;
  if (!Number.isFinite(price) || price < 0) {
    return {
      unitPrice: null,
      packsRequired: null,
      estimatedCost: null,
      missingPrice: true,
    };
  }

  const packsRequired = Math.ceil(quantity / medicine.unitsPerPack);
  return {
    unitPrice: price,
    packsRequired,
    estimatedCost: Number((packsRequired * price).toFixed(2)),
    missingPrice: false,
  };
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toText(value, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function getUnitsPerPack(packSize) {
  if (Number.isSafeInteger(packSize) && packSize > 0) return packSize;
  if (typeof packSize === "string") {
    const count = packSize.match(/\d+(?:\.\d+)?/);
    if (count) return Math.max(1, Math.floor(Number(count[0])));
  }
  if (packSize && typeof packSize === "object") {
    for (const key of ["quantity", "units", "count", "size", "value", "packCount", "qty"]) {
      const value = Number(packSize[key]);
      if (Number.isSafeInteger(value) && value > 0) return value;
    }
  }
  return 1;
}

function getQuantityUnit(packSize) {
  if (packSize && typeof packSize === "object") {
    for (const key of ["unit", "quantityUnit", "unitsLabel"]) {
      if (typeof packSize[key] === "string" && packSize[key].trim()) return packSize[key].trim();
    }
    if (typeof packSize.label === "string") {
      return packSize.label.replace(/^\s*\d+(?:\.\d+)?\s*/, "").trim() || "units";
    }
  }
  if (typeof packSize === "string") {
    return packSize.replace(/^\s*\d+(?:\.\d+)?\s*/, "").trim() || "units";
  }
  return "units";
}

function displayPackSize(packSize, unitsPerPack, quantityUnit) {
  if (typeof packSize === "string" && packSize.trim()) return packSize;
  if (packSize && typeof packSize === "object" && typeof packSize.label === "string") return packSize.label;
  return `${unitsPerPack} ${quantityUnit}`;
}

function priceNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const price = Number(value);
    if (Number.isFinite(price) && price >= 0) return price;
  }
  return null;
}

function normalizeListing(listing, index, medicineSource) {
  const item = listing && typeof listing === "object" ? listing : {};
  const source = toText(item.sourceType || item.dataSource || medicineSource, "DEMO").toLowerCase();
  const sourceType = source === "live" ? "live" : "demo";
  const lastUpdated = item.lastUpdated || item.updatedAt || item.createdAt;
  const date = lastUpdated ? new Date(lastUpdated) : null;
  const availability = item.availability ?? item.availabilityStatus ?? item.stockStatus ?? item.status;
  return {
    _id: toText(item._id, `${index}`),
    pharmacy: toText(item.pharmacy || item.pharmacyName || item.platform || item.name, "Unlabelled demo pharmacy"),
    mrp: priceNumber(item.mrp, item.demoMRP, item.maximumRetailPrice),
    sellingPrice: priceNumber(item.sellingPrice, item.demoSellingPrice, item.price),
    availability: typeof availability === "boolean"
      ? (availability ? "available" : "unavailable")
      : toText(availability, item.inStock === true || item.isAvailable === true ? "available" : "unavailable").toLowerCase(),
    productUrl: sourceType === "live" && (item.verified === true || item.isVerified === true) &&
      typeof (item.productUrl || item.url) === "string" ? (item.productUrl || item.url) : null,
    sourceType,
    lastUpdated: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
  };
}

export function normalizeMedicine(document) {
  const medicine = typeof document?.toObject === "function" ? document.toObject() : document;
  const packSize = medicine.packSize;
  const unitsPerPack = getUnitsPerPack(packSize);
  const quantityUnit = getQuantityUnit(packSize);
  const activeIngredients = Array.isArray(medicine.activeIngredients)
    ? medicine.activeIngredients.map((ingredient) => toText(ingredient)).filter(Boolean)
    : [toText(medicine.activeIngredients || medicine.activeIngredient)].filter(Boolean);
  const dosageForm = toText(medicine.dosageForm, "Unspecified");
  const listings = Array.isArray(medicine.pharmacyListings)
    ? medicine.pharmacyListings
    : (Array.isArray(medicine.listings) ? medicine.listings : []);

  return {
    _id: toText(medicine.medicineId || medicine._id),
    genericName: toText(medicine.genericName, "Unnamed medicine"),
    brandName: toText(medicine.brandName, toText(medicine.genericName, "Unnamed medicine")),
    activeIngredient: activeIngredients.join(", ") || "Not specified",
    strength: toText(medicine.strength, "Not specified"),
    dosageForm,
    route: toText(medicine.route, /inhaler/i.test(dosageForm) ? "Inhalation" : "Oral"),
    formulation: toText(medicine.formulation || medicine.releaseType, dosageForm),
    packSize: displayPackSize(packSize, unitsPerPack, quantityUnit),
    unitsPerPack,
    quantityUnit,
    category: toText(medicine.category),
    prescriptionRequired: medicine.prescriptionRequired === true,
    dataSource: toText(medicine.dataSource, "DEMO").toLowerCase(),
    demoDataNotice: toText(medicine.demoDataNotice),
    listings: listings.map((listing, index) => normalizeListing(listing, index, medicine.dataSource)),
    lastUpdated: medicine.updatedAt || medicine.createdAt || null,
  };
}

export function isValidMedicineId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}
