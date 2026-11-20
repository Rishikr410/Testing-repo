import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    medicineId: { type: String, index: true },
    genericName: { type: String, trim: true, index: true },
    brandName: { type: String, trim: true, default: null, index: true },
    activeIngredients: { type: [String], default: [] },
    strength: { type: String, trim: true },
    dosageForm: { type: String, trim: true, index: true },
    packSize: { type: mongoose.Schema.Types.Mixed },
    category: { type: String, trim: true },
    prescriptionRequired: { type: Boolean, default: false },
    dataSource: { type: String, default: "DEMO" },
    demoDataNotice: { type: String },
    pharmacyListings: { type: [mongoose.Schema.Types.Mixed], default: [] },
    seedKey: { type: String, index: true },
  },
  {
    collection: "Medicine",
    strict: false,
    timestamps: true,
  }
);

const medicineConnection = mongoose.connection.useDb("ClinQ", { useCache: true });
const Medicine = medicineConnection.models.Medicine ||
  medicineConnection.model("Medicine", medicineSchema, "Medicine");

export default Medicine;
