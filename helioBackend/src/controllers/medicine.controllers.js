import mongoose from "mongoose";
import Medicine from "../models/Medicine.model.js";
import {
  calculateMedicineCost,
  escapeRegExp,
  isValidMedicineId,
  normalizeMedicine,
} from "../utils/medicine.utils.js";

const allowedRoles = ["doctor", "patient", "user"];
const demoBanner = "DEMO DATA — NOT LIVE PHARMACY PRICES.";

function canUseMedicineModule(req, res) {
  if (!allowedRoles.includes(req.user?.role)) {
    res.status(403).json({ message: "Medicine access is available to doctors and patients only." });
    return false;
  }
  return true;
}

function medicineQuery(req, res) {
  const { query = "", strength = "", dosageForm = "", pharmacy = "" } = req.query;
  if ([query, strength, dosageForm, pharmacy].some((value) => typeof value !== "string")) {
    res.status(400).json({ message: "Search filters must be text values." });
    return null;
  }
  if (query.length > 100 || strength.length > 50 || dosageForm.length > 50 || pharmacy.length > 80) {
    res.status(400).json({ message: "Search filter is too long." });
    return null;
  }

  const filters = {};
  if (query.trim()) {
    filters.$and = query.trim().split(/\s+/).map((token) => {
      const expression = new RegExp(escapeRegExp(token), "i");
      return {
        $or: ["genericName", "brandName", "activeIngredients", "strength", "dosageForm", "medicineId"]
          .map((field) => ({ [field]: expression })),
      };
    });
  }
  if (strength) filters.strength = strength;
  if (dosageForm) filters.dosageForm = dosageForm;
  if (pharmacy) {
    filters.pharmacyListings = {
      $elemMatch: {
        $or: [
          { pharmacyName: pharmacy },
          { pharmacy },
          { platform: pharmacy },
          { name: pharmacy },
        ],
      },
    };
  }
  return filters;
}

function listingDiscount(listing) {
  if (!Number.isFinite(listing.mrp) || listing.mrp <= 0 || !Number.isFinite(listing.sellingPrice)) return null;
  return Math.max(0, Math.round(((listing.mrp - listing.sellingPrice) / listing.mrp) * 100));
}

function withDiscounts(medicine) {
  return {
    ...medicine,
    listings: medicine.listings.map((listing) => ({
      ...listing,
      discountPercent: listingDiscount(listing),
    })),
  };
}

async function findMedicineByPublicId(id) {
  const alternatives = [{ medicineId: id }];
  if (mongoose.isValidObjectId(id)) alternatives.push({ _id: id });
  return Medicine.findOne({ $or: alternatives }).lean();
}

function cheapestPrice(medicine) {
  const prices = medicine.listings.map((listing) => listing.sellingPrice).filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : null;
}

function highestDiscount(medicine) {
  const discounts = medicine.listings.map(listingDiscount).filter(Number.isFinite);
  return discounts.length ? Math.max(...discounts) : null;
}

export async function searchMedicines(req, res) {
  if (!canUseMedicineModule(req, res)) return;
  try {
    const filters = medicineQuery(req, res);
    if (!filters) return;
    const sort = req.query.sort;
    if (sort && !["lowestPrice", "highestDiscount"].includes(sort)) {
      return res.status(400).json({ message: "Sort must be lowestPrice or highestDiscount." });
    }
    const records = await Medicine.find(filters).sort({ genericName: 1, brandName: 1 }).lean();
    const products = records.map((record) => withDiscounts(normalizeMedicine(record)));
    if (sort === "lowestPrice") {
      products.sort((left, right) => (cheapestPrice(left) ?? Infinity) - (cheapestPrice(right) ?? Infinity));
    } else if (sort === "highestDiscount") {
      products.sort((left, right) => (highestDiscount(right) ?? -1) - (highestDiscount(left) ?? -1));
    }
    return res.json({ demoLabel: demoBanner, count: products.length, products });
  } catch (error) {
    console.error("Medicine search failed:", error);
    return res.status(500).json({ message: "Unable to search medicines." });
  }
}

export async function getMedicineById(req, res) {
  if (!canUseMedicineModule(req, res)) return;
  if (!isValidMedicineId(req.params.medicineId)) {
    return res.status(400).json({ message: "Invalid medicine ID." });
  }
  try {
    const record = await findMedicineByPublicId(req.params.medicineId);
    if (!record) return res.status(404).json({ message: "Medicine not found." });
    return res.json({ demoLabel: demoBanner, medicine: withDiscounts(normalizeMedicine(record)) });
  } catch (error) {
    console.error("Medicine details lookup failed:", error);
    return res.status(500).json({ message: "Unable to load medicine details." });
  }
}

export async function getMedicineAlternatives(req, res) {
  if (!canUseMedicineModule(req, res)) return;
  if (!isValidMedicineId(req.params.medicineId)) {
    return res.status(400).json({ message: "Invalid medicine ID." });
  }
  try {
    const record = await findMedicineByPublicId(req.params.medicineId);
    if (!record) return res.status(404).json({ message: "Medicine not found." });
    const medicine = normalizeMedicine(record);
    const records = await Medicine.find({
      _id: { $ne: record._id },
      strength: record.strength,
      dosageForm: record.dosageForm,
    }).lean();
    const alternatives = records
      .map(normalizeMedicine)
      .filter((candidate) => (
        candidate.activeIngredient === medicine.activeIngredient &&
        candidate.route === medicine.route &&
        candidate.formulation === medicine.formulation
      ));

    return res.json({
      demoLabel: demoBanner,
      clinicalNotice: "These products share listed attributes only. Ask a doctor or pharmacist to confirm suitability; do not substitute a prescribed medicine based on price.",
      alternatives,
    });
  } catch (error) {
    console.error("Medicine alternatives lookup failed:", error);
    return res.status(500).json({ message: "Unable to load medicine alternatives." });
  }
}

export async function estimateMedicineCosts(req, res) {
  if (!canUseMedicineModule(req, res)) return;
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
    return res.status(400).json({ message: "Provide between 1 and 30 estimate items." });
  }
  if (items.some((item) => !item || !isValidMedicineId(item.medicineId) ||
    !isValidMedicineId(item.listingId) || !Number.isSafeInteger(item.quantity) ||
    item.quantity <= 0 || item.quantity > 1000000)) {
    return res.status(400).json({ message: "Each item needs valid medicine and listing IDs and a positive whole-number quantity." });
  }
  if (new Set(items.map((item) => item.medicineId)).size !== items.length) {
    return res.status(400).json({ message: "A medicine can appear only once in an estimate." });
  }

  try {
    const records = await Promise.all(items.map((item) => findMedicineByPublicId(item.medicineId)));
    if (records.some((record) => !record)) {
      return res.status(404).json({ message: "One or more selected medicines are no longer available." });
    }
    const medicines = records.map((record) => normalizeMedicine(record));
    const byId = new Map(medicines.map((medicine) => [medicine._id, medicine]));
    const lines = [];

    for (const item of items) {
      const medicine = byId.get(item.medicineId);
      const listing = medicine.listings.find((entry) => entry._id === item.listingId);
      if (!listing) return res.status(404).json({ message: "A selected pharmacy listing is no longer available." });
      lines.push({
        medicineId: medicine._id,
        listingId: listing._id,
        medicine: medicine.genericName,
        brandName: medicine.brandName,
        strength: medicine.strength,
        dosageForm: medicine.dosageForm,
        packSize: medicine.packSize,
        unitsPerPack: medicine.unitsPerPack,
        quantityUnit: medicine.quantityUnit,
        quantity: item.quantity,
        pharmacy: listing.pharmacy,
        ...calculateMedicineCost(medicine, listing, item.quantity),
      });
    }

    const selectedTotal = lines.every((line) => !line.missingPrice)
      ? Number(lines.reduce((sum, line) => sum + line.estimatedCost, 0).toFixed(2))
      : null;
    const pharmacyNames = [...new Set(medicines.flatMap((medicine) => medicine.listings.map((listing) => listing.pharmacy)))];
    const pharmacyTotals = pharmacyNames.map((pharmacy) => {
      const pharmacyLines = items.map((item) => {
        const medicine = byId.get(item.medicineId);
        const listing = medicine.listings.find((entry) => entry.pharmacy === pharmacy);
        return listing ? calculateMedicineCost(medicine, listing, item.quantity) : null;
      });
      const complete = pharmacyLines.every((line) => line && !line.missingPrice);
      return {
        pharmacy,
        complete,
        missingCount: pharmacyLines.filter((line) => !line || line.missingPrice).length,
        estimatedCost: complete ? Number(pharmacyLines.reduce((sum, line) => sum + line.estimatedCost, 0).toFixed(2)) : null,
      };
    });
    const combinationLines = items.map((item) => {
      const medicine = byId.get(item.medicineId);
      const cheapestListing = medicine.listings
        .filter((listing) => Number.isFinite(listing.sellingPrice) && listing.sellingPrice >= 0)
        .sort((left, right) => left.sellingPrice - right.sellingPrice)[0];
      return cheapestListing
        ? {
          medicine: medicine.genericName,
          pharmacy: cheapestListing.pharmacy,
          ...calculateMedicineCost(medicine, cheapestListing, item.quantity),
        }
        : null;
    });
    const combinationComplete = combinationLines.every((line) => line && !line.missingPrice);
    const combination = combinationComplete
      ? Number(combinationLines.reduce((sum, line) => sum + line.estimatedCost, 0).toFixed(2))
      : null;

    return res.json({
      demoLabel: demoBanner,
      currency: "INR",
      selectedTotal,
      lines,
      pharmacyTotals,
      cheapestCombination: { complete: combination !== null, estimatedCost: combination, lines: combinationLines },
      note: "Shipping, minimum-order requirements, and other fees are excluded. Availability and prices are illustrative demo data.",
    });
  } catch (error) {
    console.error("Medicine estimate failed:", error);
    return res.status(500).json({ message: "Unable to calculate medicine estimate." });
  }
}
