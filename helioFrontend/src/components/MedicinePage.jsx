import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertCircle, ArrowDownWideNarrow, BadgePercent, CircleDollarSign, PackageSearch, Plus, Search, ShoppingBasket } from "lucide-react";
import { request } from "../api/client";

const DEMO_LABEL = "DEMO DATA — NOT LIVE PHARMACY PRICES.";
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

function getAccess(pathname) {
  const role = pathname.startsWith("/doctor/") ? "doctor" : "patient";
  const storageKey = role === "doctor" ? "doctorAccessToken" : "patientAccessToken";
  return { token: localStorage.getItem(storageKey) || "", role };
}

function priceOf(listing) {
  return Number.isFinite(listing.sellingPrice) ? listing.sellingPrice : null;
}

function formatPrice(value) {
  return Number.isFinite(value) ? currency.format(value) : "Price unavailable";
}

export default function MedicinePage() {
  const location = useLocation();
  const { token, role } = getAccess(location.pathname);
  const [query, setQuery] = useState("");
  const [strength, setStrength] = useState("");
  const [dosageForm, setDosageForm] = useState("");
  const [pharmacy, setPharmacy] = useState("");
  const [sort, setSort] = useState("");
  const [products, setProducts] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [medicineLoading, setMedicineLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [detailsError, setDetailsError] = useState("");
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionError, setPrescriptionError] = useState("");
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(true);
  const [estimateItems, setEstimateItems] = useState([]);
  const [estimate, setEstimate] = useState(null);
  const [estimateError, setEstimateError] = useState("");
  const [estimateLoading, setEstimateLoading] = useState(false);

  useEffect(() => {
    let current = true;
    const timer = setTimeout(async () => {
      setMedicineLoading(true);
      setSearchError("");
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (strength) params.set("strength", strength);
      if (dosageForm) params.set("dosageForm", dosageForm);
      if (pharmacy) params.set("pharmacy", pharmacy);
      if (sort) params.set("sort", sort);
      try {
        const result = await request("get", `/api/medicines?${params.toString()}`, undefined, token);
        if (!current) return;
        const found = result.products || [];
        setProducts(found);
        if (!query.trim() && !strength && !dosageForm && !pharmacy && !sort) setCatalog(found);
        setSelectedId((activeId) => found.some((product) => product._id === activeId) ? activeId : (found[0]?._id || ""));
        if (found.length === 0) {
          setSelectedMedicine(null);
          setAlternatives([]);
          setDetailsLoading(false);
        }
      } catch (error) {
        if (current) setSearchError(error.response?.data?.message || error.message || "Unable to search medicines.");
      } finally {
        if (current) setMedicineLoading(false);
      }
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, strength, dosageForm, pharmacy, sort, token]);

  useEffect(() => {
    let current = true;
    if (!selectedId) {
      return () => { current = false; };
    }
    Promise.resolve().then(() => {
      if (!current) return null;
      setDetailsLoading(true);
      setDetailsError("");
      return Promise.all([
        request("get", `/api/medicines/${selectedId}`, undefined, token),
        request("get", `/api/medicines/${selectedId}/alternatives`, undefined, token),
      ]);
    }).then((result) => {
      if (!current || !result) return;
      const [details, alternativeResult] = result;
      setSelectedMedicine(details.medicine);
      setAlternatives(alternativeResult.alternatives || []);
    }).catch((error) => {
      if (current) setDetailsError(error.response?.data?.message || error.message || "Unable to load medicine details.");
    }).finally(() => {
      if (current) setDetailsLoading(false);
    });
    return () => { current = false; };
  }, [selectedId, token]);

  useEffect(() => {
    let current = true;
    const path = role === "doctor"
      ? "/api/prescription/doctor/my-prescriptions"
      : "/api/prescription/patient/my-prescriptions";
    request("get", path, undefined, token)
      .then((result) => {
        if (current) setPrescriptions((result.prescriptions || []).flatMap((prescription) => (
          (prescription.medicines || []).map((medicine, index) => ({
            key: `${prescription._id}-${index}`,
            name: medicine.name,
            strength: medicine.strength || medicine.dosage || "",
          }))
        )));
      })
      .catch((error) => {
        if (current) setPrescriptionError(error.response?.data?.message || error.message || "Unable to load authorized prescription medicines.");
      })
      .finally(() => {
        if (current) setPrescriptionsLoading(false);
      });
    return () => { current = false; };
  }, [role, token]);

  useEffect(() => {
    let current = true;
    if (!estimateItems.length) {
      return () => { current = false; };
    }
    const timer = setTimeout(async () => {
      setEstimateLoading(true);
      setEstimateError("");
      try {
        const result = await request("post", "/api/medicines/estimate", {
          items: estimateItems.map(({ medicineId, listingId, quantity }) => ({ medicineId, listingId, quantity })),
        }, token);
        if (current) setEstimate(result);
      } catch (error) {
        if (current) setEstimateError(error.response?.data?.message || error.message || "Unable to calculate the estimate.");
      } finally {
        if (current) setEstimateLoading(false);
      }
    }, 150);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [estimateItems, token]);

  const comparisonListings = useMemo(() => {
    if (!selectedMedicine?.listings) return [];
    return [...selectedMedicine.listings].filter((listing) => !pharmacy || listing.pharmacy === pharmacy).sort((left, right) => {
      if (sort === "highestDiscount") return (right.discountPercent ?? -1) - (left.discountPercent ?? -1);
      return (priceOf(left) ?? Infinity) - (priceOf(right) ?? Infinity);
    });
  }, [selectedMedicine, sort, pharmacy]);
  const selectedListing = comparisonListings.reduce((cheapest, listing) => {
    const price = priceOf(listing);
    return price !== null && (!cheapest || price < priceOf(cheapest)) ? listing : cheapest;
  }, null);
  const lowestPrice = comparisonListings.reduce((lowest, listing) => {
    const price = priceOf(listing);
    return price !== null && (lowest === null || price < lowest) ? price : lowest;
  }, null);
  const isInEstimate = (medicineId) => estimateItems.some((item) => item.medicineId === medicineId);

  function addToEstimate(medicine, listing) {
    if (!medicine || !listing || isInEstimate(medicine._id)) return;
    setEstimate(null);
    setEstimateError("");
    setEstimateItems((items) => [...items, {
      medicineId: medicine._id,
      listingId: listing._id,
      quantity: 1,
      medicine,
    }]);
  }

  function updateEstimateItem(medicineId, change) {
    setEstimate(null);
    setEstimateError("");
    setEstimateItems((items) => items.map((item) => (
      item.medicineId === medicineId ? { ...item, ...change } : item
    )));
  }

  function searchPrescriptionMedicine(medicine) {
    const searchText = [medicine.name, medicine.strength].filter(Boolean).join(" ");
    setStrength("");
    setDosageForm("");
    setPharmacy("");
    setQuery(searchText);
  }

  const strengths = [...new Set(catalog.map((product) => product.strength))].sort();
  const dosageForms = [...new Set(catalog.map((product) => product.dosageForm))].sort();
  const pharmacies = [...new Set(catalog.flatMap((product) => product.listings.map((listing) => listing.pharmacy)))].sort();

  return (
    <div className="min-h-screen bg-[#F8F9FB] px-4 py-6 text-[#24314E] sm:px-8 sm:py-9">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#72809A]">Medicine</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#202C49]">Search & compare</h1>
            <p className="mt-2 text-sm text-[#75819A]">Explore medicine details and estimate costs using illustrative demo listings.</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 sm:self-auto">
            <AlertCircle size={15} aria-hidden="true" />
            {DEMO_LABEL}
          </div>
        </header>

        <section className="rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6">
          <label htmlFor="medicine-search" className="mb-2 block text-sm font-semibold text-[#293652]">Search medicine</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8591A7]" size={19} aria-hidden="true" />
            <input
              id="medicine-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search medicine by name, brand, or active ingredient..."
              className="h-12 w-full rounded-xl border border-[#DDE3EC] bg-[#FBFCFE] pl-12 pr-4 text-sm outline-none transition focus:border-[#6888B7] focus:ring-2 focus:ring-[#6888B7]/15"
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-medium text-[#6F7C94]">Strength
              <select value={strength} onChange={(event) => setStrength(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#DDE3EC] bg-white px-3 text-sm text-[#293652]">
                <option value="">All strengths</option>
                {strengths.map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-[#6F7C94]">Dosage form
              <select value={dosageForm} onChange={(event) => setDosageForm(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#DDE3EC] bg-white px-3 text-sm text-[#293652]">
                <option value="">All forms</option>
                {dosageForms.map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-[#6F7C94]">Pharmacy label
              <select value={pharmacy} onChange={(event) => setPharmacy(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#DDE3EC] bg-white px-3 text-sm text-[#293652]">
                <option value="">All demo listings</option>
                {pharmacies.map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-[#6F7C94]">Sort results
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#DDE3EC] bg-white px-3 text-sm text-[#293652]">
                <option value="">Relevance</option>
                <option value="lowestPrice">Lowest demo price</option>
                <option value="highestDiscount">Highest demo discount</option>
              </select>
            </label>
          </div>
        </section>

        {searchError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{searchError}</p>}

        <div className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-[#293652]">Search results</h2>
              <span className="text-xs text-[#8290A7]">{medicineLoading ? "Searching..." : `${products.length} products`}</span>
            </div>
            {medicineLoading ? <LoadingMessage text="Searching the medicine catalog..." /> : products.length === 0 ? (
              <div className="rounded-xl bg-[#F7F9FC] px-5 py-8 text-center text-sm text-[#78859C]">
                {query || strength || dosageForm || pharmacy ? "No medicines match these filters. Try another name or clear a filter." : "No demo medicines are currently available."}
              </div>
            ) : (
              <ul className="max-h-[610px] space-y-2 overflow-y-auto pr-1">
                {products.map((product) => {
                  const cheapest = product.listings.reduce((value, listing) => {
                    const price = priceOf(listing);
                    return price !== null && (value === null || price < value) ? price : value;
                  }, null);
                  return (
                    <li key={product._id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(product._id)}
                        aria-pressed={selectedId === product._id}
                        className={`w-full rounded-xl border p-3 text-left transition ${selectedId === product._id ? "border-[#8096B7] bg-[#F1F5FA]" : "border-[#E7EAF0] hover:border-[#C4CDDA] hover:bg-[#FBFCFE]"}`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span>
                            <span className="block text-sm font-semibold text-[#293652]">{product.genericName}</span>
                            <span className="mt-1 block text-xs text-[#7C879C]">{product.brandName} · {product.strength} · {product.dosageForm}</span>
                            <span className="mt-1 block text-[11px] text-[#919BAE]">{product.packSize}</span>
                          </span>
                          <span className="shrink-0 text-right text-xs font-semibold text-[#455879]">{formatPrice(cheapest)}<span className="mt-1 block font-normal text-[#929DB0]">demo / pack</span></span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-5">
            <div className="rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-[#293652]">Medicine details & price comparison</h2>
                {detailsLoading && <span className="text-xs text-[#8290A7]">Loading...</span>}
              </div>
              {detailsError && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{detailsError}</p>}
              {selectedMedicine ? (
                <>
                  <div className="rounded-xl bg-[#F6F8FB] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-[#293652]">{selectedMedicine.genericName}</h3>
                        <p className="mt-1 text-sm text-[#6D7B94]">{selectedMedicine.brandName} · {selectedMedicine.activeIngredient}</p>
                      </div>
                      <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#596984]">{selectedMedicine.strength} · {selectedMedicine.dosageForm}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#78859B]">
                      <span>Route: {selectedMedicine.route}</span>
                      <span>Formulation: {selectedMedicine.formulation}</span>
                      <span>Pack: {selectedMedicine.packSize}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-[#7C879C]">Illustrative listings only; availability is not verified.</p>
                    <span className="inline-flex items-center gap-1 text-xs text-[#78859B]"><ArrowDownWideNarrow size={14} /> {sort === "highestDiscount" ? "Highest discount first" : "Lowest price first"}</span>
                  </div>
                  {comparisonListings.length === 0 ? (
                    <p className="mt-3 rounded-lg bg-[#F7F9FC] px-3 py-4 text-sm text-[#8290A7]">No pharmacy listings match the selected filter.</p>
                  ) : <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E8EBF1] text-[#8792A7]">
                          <th className="px-2 py-3 font-medium">Pharmacy label</th>
                          <th className="px-2 py-3 font-medium">Product / pack</th>
                          <th className="px-2 py-3 font-medium">MRP (demo)</th>
                          <th className="px-2 py-3 font-medium">Price (demo)</th>
                          <th className="px-2 py-3 font-medium">Discount</th>
                          <th className="px-2 py-3 font-medium">Availability</th>
                          <th className="px-2 py-3 font-medium">Data source</th>
                          <th className="px-2 py-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonListings.map((listing) => (
                          <tr key={listing._id} className="border-b border-[#F0F2F6]">
                            <td className="px-2 py-3 font-medium text-[#384761]">{listing.pharmacy}<span className="mt-1 block text-[10px] font-normal text-[#9AA4B4]">Demo label</span></td>
                            <td className="px-2 py-3 text-[#5F6E86]">{selectedMedicine.brandName}<span className="mt-1 block text-[10px] text-[#9AA4B4]">{selectedMedicine.strength} · {selectedMedicine.dosageForm} · {selectedMedicine.packSize}</span></td>
                            <td className="px-2 py-3 text-[#6D7B94]">{formatPrice(listing.mrp)}</td>
                            <td className="px-2 py-3 font-semibold text-[#293652]">
                              {formatPrice(priceOf(listing))}
                              {priceOf(listing) !== null && priceOf(listing) === lowestPrice && <span className="ml-1.5 rounded bg-emerald-50 px-1.5 py-1 text-[9px] font-bold uppercase text-emerald-800">Lowest comparable</span>}
                            </td>
                            <td className="px-2 py-3 text-[#6D7B94]">{Number.isFinite(listing.discountPercent) ? `${listing.discountPercent}%` : "—"}</td>
                            <td className="px-2 py-3 capitalize text-[#6D7B94]">{listing.availability} (demo)</td>
                            <td className="px-2 py-3 capitalize text-[#6D7B94]">{listing.sourceType || "unknown"}</td>
                            <td className="px-2 py-3">
                              {listing.productUrl ? <a href={listing.productUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#47658D] underline">Verified details</a> : <span className="text-[10px] text-[#929DB0]">Demo listing — purchase link unavailable</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>}
                  <p className="mt-3 text-[11px] text-[#929DB0]">Updated: {selectedMedicine.listings?.length ? new Date(Math.max(...selectedMedicine.listings.map((listing) => new Date(listing.lastUpdated).getTime()))).toLocaleDateString("en-IN") : "Not available"}. Pharmacy names are illustrative labels only and do not indicate data supplied by those companies.</p>
                  {selectedMedicine.listings?.length > 0 && (
                    <button type="button" onClick={() => addToEstimate(selectedMedicine, selectedListing)} disabled={!selectedListing || isInEstimate(selectedMedicine._id)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#263653] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#354A70] disabled:cursor-not-allowed disabled:opacity-50">
                      <Plus size={15} /> {isInEstimate(selectedMedicine._id) ? "Already in estimate" : "Add to cost estimate"}
                    </button>
                  )}
                </>
              ) : (
                <div className="rounded-xl bg-[#F7F9FC] px-5 py-9 text-center text-sm text-[#78859C]"><PackageSearch className="mx-auto mb-2 text-[#99A5B8]" size={24} />Select a search result to view its details.</div>
              )}
            </div>

            <section className="rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-2">
                <BadgePercent size={18} className="text-[#637B9E]" />
                <h2 className="font-semibold text-[#293652]">Medicine alternatives</h2>
              </div>
              {!selectedMedicine ? <p className="mt-3 text-sm text-[#8290A7]">Select a medicine to check for products with matching ingredient, strength, form, route, and formulation.</p> : alternatives.length === 0 ? (
                <p className="mt-3 text-sm text-[#8290A7]">No catalog products with matching ingredient, strength, form, route, and formulation were found.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {alternatives.map((alternative) => (
                    <li key={alternative._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E8EBF1] px-3 py-2.5">
                      <span><span className="block text-sm font-medium text-[#3A4964]">{alternative.brandName}</span><span className="text-xs text-[#8792A7]">{alternative.genericName} · {alternative.strength} · {alternative.dosageForm} · {alternative.packSize}</span></span>
                      <button type="button" onClick={() => setSelectedId(alternative._id)} className="text-xs font-semibold text-[#526D92] underline">View details</button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Catalog attribute matches are not a clinical recommendation. Ask a doctor or pharmacist to confirm any alternative. Never substitute a prescribed medicine based only on price.</p>
            </section>

            <section className="rounded-2xl border border-[#E4E8EF] bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-2">
                <ShoppingBasket size={18} className="text-[#637B9E]" />
                <h2 className="font-semibold text-[#293652]">Prescription medicine list</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#8792A7]">Only prescriptions authorized for your signed-in {role} account are shown. Choosing a medicine below only searches the catalog; it does not change the prescription.</p>
              {prescriptionError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{prescriptionError}</p>}
              {prescriptionsLoading ? <LoadingMessage text="Loading authorized prescription medicines..." /> : prescriptions.length === 0 ? (
                <p className="mt-3 rounded-lg bg-[#F7F9FC] px-3 py-4 text-sm text-[#8290A7]">No medicines were found in your available prescriptions.</p>
              ) : (
                <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                  {prescriptions.map((medicine) => (
                    <li key={medicine.key} className="flex items-center justify-between gap-3 rounded-lg border border-[#E8EBF1] px-3 py-2">
                      <span className="text-sm text-[#485771]">{medicine.name}{medicine.strength ? ` · ${medicine.strength}` : ""}</span>
                      <button type="button" onClick={() => searchPrescriptionMedicine(medicine)} className="shrink-0 text-xs font-semibold text-[#526D92] underline">Search catalog</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-[#DDE4ED] bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-2">
                <CircleDollarSign size={18} className="text-[#637B9E]" />
                <h2 className="font-semibold text-[#293652]">Estimated total medicine cost</h2>
              </div>
              <p className="mt-1 text-xs text-[#8792A7]">Required quantity uses the selected listing's pack units. Complete packs are rounded up; shipping and other fees are excluded.</p>
              {estimateItems.length === 0 ? <p className="mt-4 rounded-lg bg-[#F7F9FC] px-3 py-4 text-sm text-[#8290A7]">Add medicines from the comparison above to create a temporary estimate.</p> : (
                <>
                  <ul className="mt-4 space-y-3">
                    {estimateItems.map((item) => (
                      <li key={item.medicineId} className="rounded-xl border border-[#E8EBF1] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#3A4964]">{item.medicine.genericName} · {item.medicine.strength}</p>
                            <p className="mt-1 text-xs text-[#8792A7]">{item.medicine.dosageForm} · {item.medicine.packSize}</p>
                          </div>
                          <button type="button" onClick={() => {
                            setEstimate(null);
                            setEstimateError("");
                            setEstimateItems((items) => items.filter((entry) => entry.medicineId !== item.medicineId));
                          }} className="text-xs font-medium text-[#9A6470] underline">Remove</button>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_150px]">
                          <label className="text-[11px] font-medium text-[#78859B]">Selected demo listing
                            <select value={item.listingId} onChange={(event) => updateEstimateItem(item.medicineId, { listingId: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-[#DDE3EC] bg-white px-2 text-xs text-[#3A4964]">
                              {item.medicine.listings.map((listing) => <option key={listing._id} value={listing._id}>{listing.pharmacy} · {formatPrice(priceOf(listing))} per pack</option>)}
                            </select>
                          </label>
                          <label className="text-[11px] font-medium text-[#78859B]">Required quantity ({item.medicine.quantityUnit})
                            <input type="number" min="1" step="1" value={item.quantity} onChange={(event) => {
                              const value = event.target.value;
                              if (value === "") return;
                              const quantity = Number(value);
                              if (Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 1000000) updateEstimateItem(item.medicineId, { quantity });
                            }} className="mt-1 h-9 w-full rounded-lg border border-[#DDE3EC] px-2 text-xs text-[#3A4964]" />
                          </label>
                        </div>
                        {estimate?.lines?.find((line) => line.medicineId === item.medicineId) && (
                          <p className="mt-2 text-xs text-[#70809A]">
                            {estimate.lines.find((line) => line.medicineId === item.medicineId).missingPrice
                              ? "Price unavailable; this item cannot be included in the total."
                              : `${estimate.lines.find((line) => line.medicineId === item.medicineId).packsRequired} pack(s) · ${formatPrice(estimate.lines.find((line) => line.medicineId === item.medicineId).estimatedCost)}`}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                  {estimateError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{estimateError}</p>}
                  <div className="mt-4 rounded-xl bg-[#F1F5FA] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#34435E]">Estimated Total Medicine Cost:</span>
                      <span className="text-lg font-bold text-[#293652]">{estimateLoading ? "Calculating..." : estimate ? formatPrice(estimate.selectedTotal) : "—"}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#8390A5]">Demo-price estimate only. Shipping, minimum-order requirements, and other fees are not included.</p>
                    {estimate?.pharmacyTotals?.length > 0 && (
                      <div className="mt-4 border-t border-[#DDE4ED] pt-3">
                        <p className="text-xs font-semibold text-[#52617A]">Complete basket by one pharmacy</p>
                        <ul className="mt-2 space-y-1.5">
                          {estimate.pharmacyTotals.map((entry) => (
                            <li key={entry.pharmacy} className="flex justify-between gap-3 text-xs text-[#6F7C94]">
                              <span>{entry.pharmacy}{entry.complete ? "" : ` · incomplete (${entry.missingCount} unavailable)`}</span>
                              <span className="font-semibold text-[#485771]">{formatPrice(entry.estimatedCost)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 text-xs text-[#52617A]">Cheapest listing combination: <strong>{formatPrice(estimate.cheapestCombination?.estimatedCost)}</strong></p>
                        {estimate.cheapestCombination?.lines?.some(Boolean) && (
                          <ul className="mt-2 space-y-1 text-[11px] text-[#7A879D]">
                            {estimate.cheapestCombination.lines.filter(Boolean).map((line, index) => (
                              <li key={`${line.medicine}-${index}`} className="flex justify-between gap-3">
                                <span>{line.medicine} · {line.pharmacy}</span>
                                <span>{formatPrice(line.estimatedCost)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </section>
        </div>
      </div>
    </div>
  );
}

function LoadingMessage({ text }) {
  return <div role="status" className="flex items-center gap-2 py-4 text-sm text-[#8290A7]"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#CAD3E0] border-t-[#536D93]" />{text}</div>;
}
