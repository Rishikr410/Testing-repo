# ClinQ Medicine Module

This handoff contains the source changes for the medicine search, demo price comparison, prescription look-up, and pack-based cost estimate feature.

## Included changes

- `helioBackend/src/models/Medicine.model.js` binds the Mongoose model to the existing `ClinQ.Medicine` collection.
- `helioBackend/src/utils/medicineSeed.js` seeds illustrative demo products without overwriting existing records.
- `helioBackend/src/utils/medicine.utils.js` maps existing collection records to the API shape and calculates pack estimates.
- `helioBackend/src/controllers/medicine.controllers.js` implements authenticated search, details, alternatives, and estimate handlers.
- `helioBackend/src/routes/medicine.routes.js` exposes the medicine API.
- `helioBackend/src/config/db.js` runs the demo seed after connecting to MongoDB.
- `helioBackend/src/server.js` mounts `/api/medicines`.
- `helioFrontend/src/components/MedicinePage.jsx` implements the medicine UI.
- `helioFrontend/src/App.jsx` adds doctor and patient medicine routes.
- `helioFrontend/src/components/doctorFrontend/DoctorSidebar.jsx` and `helioFrontend/src/components/patientFrontend/PatientSidebar.jsx` add navigation links.

## Applying to the main project

1. Copy the included files into the matching paths in the main project, merging the route and database initialization changes into existing files rather than replacing unrelated project work.
2. Keep the existing MongoDB connection configuration. The medicine model explicitly uses the `ClinQ` database and `Medicine` collection shown in the current project.
3. Keep the existing dependencies; this feature does not require adding packages.
4. Start the backend from `helioBackend` using `npm run dev` and the frontend from `helioFrontend` using `npm run dev`.
5. Sign in as a patient or doctor and open Medicines from the relevant sidebar.

## API routes

All routes require the existing bearer-token authentication middleware:

- `GET /api/medicines` — search and filter the catalog; supports `query`, `strength`, `dosageForm`, `pharmacy`, and `sort`.
- `GET /api/medicines/:medicineId` — medicine detail and pharmacy listings.
- `GET /api/medicines/:medicineId/alternatives` — cautious catalog matches.
- `POST /api/medicines/estimate` — estimate the total for selected medicine/listing IDs and quantities.

The catalog displays demo prices and availability as illustrative only. There are no generated purchase links. Prescription results are retrieved through the existing user-scoped prescription endpoints; the module does not modify prescriptions.

## Verification and limitations

The frontend production build, focused frontend lint, backend syntax checks, local medicine API search/details/estimate requests, and schema mapping/calculation checks passed during implementation. The backend package still has a placeholder `npm test` script, and a real database integration test suite is not configured.
