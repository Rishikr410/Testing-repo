import express from "express";
import authMiddleWare from "../middleware/auth.middleware.js";
import {
  estimateMedicineCosts,
  getMedicineAlternatives,
  getMedicineById,
  searchMedicines,
} from "../controllers/medicine.controllers.js";

const router = express.Router();

router.use(authMiddleWare);
router.get("/", searchMedicines);
router.post("/estimate", estimateMedicineCosts);
router.get("/:medicineId/alternatives", getMedicineAlternatives);
router.get("/:medicineId", getMedicineById);

export default router;
