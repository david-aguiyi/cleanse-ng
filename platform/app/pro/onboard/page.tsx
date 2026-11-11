"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AGREEMENT_CLAUSES, AGREEMENT_VERSION } from "./clauses";

const IBADAN_LGAS = [
  "Ibadan North",
  "Ibadan North-East",
  "Ibadan North-West",
  "Ibadan South-East",
  "Ibadan South-West",
  "Akinyele",
  "Egbeda",
  "Ido",
  "Lagelu",
  "Oluyole",
  "Ona Ara",
  "Other",
];

const CORE_ZONES = ["Bodija", "Oluyole", "Jericho", "Akobo", "Iyaganku", "Other"] as const;
const TRANSPORT_MODES = ["Bike / Okada", "Bus / Danfo", "Keke / Tricycle", "Car", "Walk"] as const;
const TRAVEL_TIMES = [
  "Under 20 minutes",
  "20 to 40 minutes",
  "40 to 60 minutes",
  "Over 1 hour",
];

const EDUCATION_LEVELS = [
  "Primary School",
  "SSCE / WAEC / NECO",
  "OND / NCE",
  "HND / Bachelor's Degree",
  "Vocational / Technical",
  "Other",
];

const LANGUAGES = ["Yoruba", "English", "Pidgin", "Hausa", "Igbo"];

const CLEANING_PRODUCTS = [
  "Detergents (Omo/Ariel/Sunlight)",
  "Bleach (Hypo)",
  "Glass cleaner (Windolene)",
  "Disinfectant (Dettol/Zgerm)",
  "Toilet cleaner (Harpic)",
  "Floor polish/Tile cleaner",
  "Degreaser",
];

const CLEANING_EQUIPMENT = [
  "Mop and wringer bucket",
  "Microfibre cloths",
  "Squeegee",
  "Vacuum cleaner",
  "Floor scrubber/buffer",
  "Pressure washer",
  "Broom and dustpan",
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Client-side image resize and JPEG compression */
async function compressImage(file: File, maxDim = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function OnboardingForm() {
  const searchParams = useSearchParams();
  const applicantId = searchParams.get("app") || searchParams.get("applicant_id") || "";
  const initialName = searchParams.get("name") || "";
  const initialPhone = searchParams.get("phone") || searchParams.get("whatsapp") || "";

  // Section 1: About You
  const [fullName, setFullName] = useState(initialName);
  const [photoUrl, setPhotoUrl] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Female");
  const [ninDigits, setNinDigits] = useState("");
  const [ninDocUrl, setNinDocUrl] = useState("");

  // Section 2: Where You Live
  const [streetAddress, setStreetAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [neighbourhood, setNeighbourhood] = useState("");
  const [lga, setLga] = useState("Ibadan North");
  const [cityState, setCityState] = useState("Ibadan, Oyo State");
  const [directions, setDirections] = useState("");
  const [closestZone, setClosestZone] = useState<typeof CORE_ZONES[number]>("Bodija");
  const [transportMode, setTransportMode] = useState<typeof TRANSPORT_MODES[number]>("Bus / Danfo");
  const [travelTimeHub, setTravelTimeHub] = useState("20 to 40 minutes");

  // Section 3: Background
  const [education, setEducation] = useState("SSCE / WAEC / NECO");
  const [religion, setReligion] = useState("");
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["Yoruba", "English"]);
  const [experienceDetails, setExperienceDetails] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([
    "Detergents (Omo/Ariel/Sunlight)",
    "Bleach (Hypo)",
  ]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([
    "Mop and wringer bucket",
    "Microfibre cloths",
    "Broom and dustpan",
  ]);

  // Section 4: Availability
  const [availableDays, setAvailableDays] = useState<string[]>([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]);
  const [earlyMorningOk, setEarlyMorningOk] = useState(true);
  const [pairWorkOk, setPairWorkOk] = useState(true);
  const [startReadiness, setStartReadiness] = useState("Immediately");

  // Section 5: Trust and Safety
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  const [guarantorRel, setGuarantorRel] = useState("");
  const [guarantorOcc, setGuarantorOcc] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRel, setEmergencyRel] = useState("");
  const [allergies, setAllergies] = useState("");

  // Section 6: About You & Cleanse
  const [whyCleanse, setWhyCleanse] = useState("");
  const [oneYearGoal, setOneYearGoal] = useState("");
  const [breakageResponse, setBreakageResponse] = useState("");
  const [referralSource, setReferralSource] = useState("");

  // Section 7: Agreement
  const [agreedClauses, setAgreedClauses] = useState<number[]>([]);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const ninDocInputRef = useRef<HTMLInputElement>(null);

  const toggleArray = (list: string[], set: (v: string[]) => void, item: string) => {
    set(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const toggleClause = (id: number) => {
    setAgreedClauses((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const selectAllClauses = () => {
    if (agreedClauses.length === AGREEMENT_CLAUSES.length) {
      setAgreedClauses([]);
    } else {
      setAgreedClauses(AGREEMENT_CLAUSES.map((c) => c.id));
    }
  };

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUri = await compressImage(file, 800, 0.75);
      setPhotoUrl(dataUri);
    } catch {
      setError("Could not process photo. Please choose another image.");
    }
  }

  async function handleNinDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUri = await compressImage(file, 1000, 0.75);
      setNinDocUrl(dataUri);
    } catch {
      setError("Could not process NIN document. Please choose another image.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation checks
    if (!photoUrl) {
      setError("Please upload a clear photo of yourself with face visible.");
      return;
    }
    const cleanNin = ninDigits.replace(/\D/g, "");
    if (cleanNin.length !== 11) {
      setError("Please enter your 11-digit NIN (National Identification Number).");
      return;
    }
    if (!ninDocUrl) {
      setError("Please upload a photo of your NIN slip or card.");
      return;
    }
    if (agreedClauses.length < AGREEMENT_CLAUSES.length) {
      setError(
        `Please read and tick all ${AGREEMENT_CLAUSES.length} clauses of the Cleanse Pro Agreement (${agreedClauses.length} of ${AGREEMENT_CLAUSES.length} currently agreed).`
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        applicant_id: applicantId || undefined,
        full_name: fullName.trim(),
        photo_url: photoUrl,
        whatsapp: phone.trim(),
        date_of_birth: dob,
        gender,
        nin_digits: cleanNin,
        nin_document_url: ninDocUrl,

        street_address: streetAddress.trim(),
        landmark: landmark.trim(),
        neighbourhood: neighbourhood.trim(),
        lga,
        city_state: cityState.trim(),
        directions: directions.trim() || undefined,
        closest_zone: closestZone,
        transport_mode: transportMode,
        travel_time_hub: travelTimeHub,

        education_level: education,
        religion: religion.trim() || undefined,
        languages: selectedLangs,
        experience_details: experienceDetails.trim() || undefined,
        products_used: selectedProducts,
        equipment_used: selectedEquipment,

        available_days: availableDays,
        early_morning_ok: earlyMorningOk,
        pair_work_ok: pairWorkOk,
        start_readiness: startReadiness,

        guarantor_name: guarantorName.trim(),
        guarantor_phone: guarantorPhone.trim(),
        guarantor_relationship: guarantorRel.trim(),
        guarantor_occupation: guarantorOcc.trim() || undefined,
        emergency_name: emergencyName.trim(),
        emergency_phone: emergencyPhone.trim(),
        emergency_relationship: emergencyRel.trim(),
        allergies: allergies.trim() || undefined,

        why_cleanse: whyCleanse.trim() || undefined,
        one_year_goal: oneYearGoal.trim() || undefined,
        accidental_breakage_response: breakageResponse.trim() || undefined,
        referral_source: referralSource.trim() || undefined,

        agreed_clauses: agreedClauses,
        agreement_version: AGREEMENT_VERSION,
      };

      const res = await fetch("/api/v1/pro/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Could not submit onboarding form.");
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please check your entries.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="card" style={{ maxWidth: 640, margin: "40px auto", textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h1 className="admin-h1" style={{ fontSize: 26, marginBottom: 12 }}>
          Onboarding Received!
        </h1>
        <p style={{ fontSize: 16, color: "var(--mid-gray)", lineHeight: 1.6, marginBottom: 24 }}>
          Thank you, <strong>{fullName}</strong>. Your Cleanse Pro onboarding details, NIN verification documents,
          and signed agreement have been received securely by the Cleanse operations team.
        </p>
        <div className="notice info" style={{ textAlign: "left", marginBottom: 24 }}>
          <strong>Next steps:</strong> We will review your submission and contact you directly on WhatsApp (
          {phone}) to schedule your in-person verification meeting and equipment handover.
        </div>
        <Link href="/" className="btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>
          Return to Cleanse.ng
        </Link>
      </div>
    );
  }

  // Group clauses by category
  const clauseGroups = Array.from(new Set(AGREEMENT_CLAUSES.map((c) => c.group)));

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 80px" }}>
      <div style={{ marginBottom: 24 }}>
        <p className="muted" style={{ marginBottom: 6 }}>
          <Link href="/">← Back to Cleanse.ng</Link>
        </p>
        <h1 className="admin-h1" style={{ fontSize: 28 }}>
          Cleanse Pro Onboarding Form
        </h1>
        <p className="muted" style={{ fontSize: 15, lineHeight: 1.5 }}>
          Welcome to the Cleanse Pro onboarding step. Please fill in your accurate details, identity documents,
          and review the 19-clause agreement below before your in-person equipment meeting.
        </p>
      </div>

      {applicantId && (
        <div className="notice info" style={{ marginBottom: 20 }}>
          <strong>✨ Candidate Verified:</strong> Linked with your candidate application ID (
          <code style={{ fontSize: 12 }}>{applicantId}</code>).
        </div>
      )}

      {error && (
        <div className="notice error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* SECTION 1: ABOUT YOU */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            1. About You
          </h2>

          <div className="field">
            <label htmlFor="full_name">Full name (exactly as shown on your NIN) *</label>
            <input
              id="full_name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Adebayo Blessing Oluwaseun"
            />
          </div>

          <div className="field">
            <label>Clear photo of yourself (face visible, no sunglasses or cap) *</label>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 8 }}>
              {photoUrl ? (
                <div style={{ width: 84, height: 84, borderRadius: 12, overflow: "hidden", border: "2px solid var(--primary-purple)" }}>
                  <img src={photoUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <div
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 12,
                    background: "var(--off-white-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    color: "var(--mid-gray)",
                  }}
                >
                  👤
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  ref={photoInputRef}
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => photoInputRef.current?.click()}
                  style={{ padding: "8px 14px", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" }}
                >
                  {photoUrl ? "Change Photo" : "📷 Take or Upload Photo"}
                </button>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Ensure your face is well-lit and clearly visible.
                </div>
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="phone">Phone number (WhatsApp) *</label>
            <input
              id="phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678 or +234..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label htmlFor="dob">Date of birth *</label>
              <input
                id="dob"
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="gender">Gender *</label>
              <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="nin">National Identification Number (NIN - 11 digits) *</label>
            <input
              id="nin"
              required
              maxLength={11}
              value={ninDigits}
              onChange={(e) => setNinDigits(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="11-digit NIN"
            />
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Your NIN is protected securely and used solely for background and identity verification.
            </div>
          </div>

          <div className="field">
            <label>Upload a photo of your NIN slip or card *</label>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 8 }}>
              {ninDocUrl ? (
                <div style={{ width: 100, height: 70, borderRadius: 8, overflow: "hidden", border: "2px solid #059669" }}>
                  <img src={ninDocUrl} alt="NIN Doc Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <div
                  style={{
                    width: 100,
                    height: 70,
                    borderRadius: 8,
                    background: "var(--off-white-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    color: "var(--mid-gray)",
                  }}
                >
                  🪪
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  ref={ninDocInputRef}
                  onChange={handleNinDocUpload}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => ninDocInputRef.current?.click()}
                  style={{ padding: "8px 14px", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" }}
                >
                  {ninDocUrl ? "Change NIN Photo" : "📄 Upload NIN Slip or Card"}
                </button>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Ensure all details and your NIN digits are readable.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: WHERE YOU LIVE */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            2. Where You Live
          </h2>

          <div className="field">
            <label htmlFor="street">House number and street name *</label>
            <input
              id="street"
              required
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="e.g. 14 Adebayo Street, Flat 2"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label htmlFor="landmark">Nearest landmark or bus stop *</label>
              <input
                id="landmark"
                required
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Opposite Total filling station"
              />
            </div>
            <div className="field">
              <label htmlFor="neighbourhood">Area or neighbourhood *</label>
              <input
                id="neighbourhood"
                required
                value={neighbourhood}
                onChange={(e) => setNeighbourhood(e.target.value)}
                placeholder="e.g. Agbowo, Samonda, Challenge"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label htmlFor="lga">Local Government Area (LGA) *</label>
              <select id="lga" value={lga} onChange={(e) => setLga(e.target.value)}>
                {IBADAN_LGAS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="city_state">City and state</label>
              <input
                id="city_state"
                value={cityState}
                onChange={(e) => setCityState(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="directions">Directions to your house (optional, 1–2 lines)</label>
            <input
              id="directions"
              value={directions}
              onChange={(e) => setDirections(e.target.value)}
              placeholder="e.g. Enter through the green gate beside the pharmacy"
            />
          </div>

          <div className="field">
            <label htmlFor="closest_zone">Which Cleanse zone are you closest to? *</label>
            <select
              id="closest_zone"
              value={closestZone}
              onChange={(e) => setClosestZone(e.target.value as typeof CORE_ZONES[number])}
            >
              {CORE_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label htmlFor="transport">How will you get to jobs? *</label>
              <select
                id="transport"
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value as typeof TRANSPORT_MODES[number])}
              >
                {TRANSPORT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="travel_time">Travel time to Bodija or Jericho? *</label>
              <select
                id="travel_time"
                value={travelTimeHub}
                onChange={(e) => setTravelTimeHub(e.target.value)}
              >
                {TRAVEL_TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: BACKGROUND */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            3. Background & Skills
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label htmlFor="edu">Highest level of education *</label>
              <select id="edu" value={education} onChange={(e) => setEducation(e.target.value)}>
                {EDUCATION_LEVELS.map((ed) => (
                  <option key={ed} value={ed}>
                    {ed}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="rel">Religion (optional)</label>
              <input
                id="rel"
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                placeholder="Optional (e.g. Christianity, Islam)"
              />
            </div>
          </div>

          <label className="field-label">Languages you speak (tick all that apply) *</label>
          <div className="chip-row" style={{ marginBottom: 16 }}>
            {LANGUAGES.map((lang) => (
              <button
                type="button"
                key={lang}
                className={`chip ${selectedLangs.includes(lang) ? "selected" : ""}`}
                onClick={() => toggleArray(selectedLangs, setSelectedLangs, lang)}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="field">
            <label htmlFor="exp">Have you done cleaning work before, at home or for pay? Tell us about it</label>
            <textarea
              id="exp"
              rows={3}
              value={experienceDetails}
              onChange={(e) => setExperienceDetails(e.target.value)}
              placeholder="e.g. I have cleaned private residences and offices in Bodija for 2 years..."
            />
          </div>

          <label className="field-label">Cleaning products you have used before</label>
          <div className="chip-row" style={{ marginBottom: 16 }}>
            {CLEANING_PRODUCTS.map((prod) => (
              <button
                type="button"
                key={prod}
                className={`chip ${selectedProducts.includes(prod) ? "selected" : ""}`}
                onClick={() => toggleArray(selectedProducts, setSelectedProducts, prod)}
              >
                {prod}
              </button>
            ))}
          </div>

          <label className="field-label">Cleaning equipment you have used before</label>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {CLEANING_EQUIPMENT.map((eq) => (
              <button
                type="button"
                key={eq}
                className={`chip ${selectedEquipment.includes(eq) ? "selected" : ""}`}
                onClick={() => toggleArray(selectedEquipment, setSelectedEquipment, eq)}
              >
                {eq}
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 4: AVAILABILITY */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            4. Availability & Working Style
          </h2>

          <label className="field-label">Which days can you work? (Tick all that apply) *</label>
          <div className="chip-row" style={{ marginBottom: 16 }}>
            {DAYS_OF_WEEK.map((d) => (
              <button
                type="button"
                key={d}
                className={`chip ${availableDays.includes(d) ? "selected" : ""}`}
                onClick={() => toggleArray(availableDays, setAvailableDays, d)}
              >
                {d}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div className="field">
              <label>Can you start early in the morning (7:30am - 8:00am)?</label>
              <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="early"
                    checked={earlyMorningOk}
                    onChange={() => setEarlyMorningOk(true)}
                  />
                  Yes
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="early"
                    checked={!earlyMorningOk}
                    onChange={() => setEarlyMorningOk(false)}
                  />
                  No
                </label>
              </div>
            </div>

            <div className="field">
              <label>Are you comfortable working in a pair with a partner?</label>
              <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="pair"
                    checked={pairWorkOk}
                    onChange={() => setPairWorkOk(true)}
                  />
                  Yes
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="pair"
                    checked={!pairWorkOk}
                    onChange={() => setPairWorkOk(false)}
                  />
                  No
                </label>
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="start_when">When can you start? *</label>
            <select
              id="start_when"
              value={startReadiness}
              onChange={(e) => setStartReadiness(e.target.value)}
            >
              <option value="Immediately">Immediately</option>
              <option value="Within 3 days">Within 3 days</option>
              <option value="Within 1 week">Within 1 week</option>
              <option value="In 2 weeks or more">In 2 weeks or more</option>
            </select>
          </div>
        </div>

        {/* SECTION 5: TRUST AND SAFETY */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            5. Trust & Safety
          </h2>

          <h3 style={{ fontSize: 15, margin: "10px 0 8px", color: "var(--primary-purple)" }}>
            Guarantor Information
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label htmlFor="g_name">Guarantor&apos;s full name *</label>
              <input
                id="g_name"
                required
                value={guarantorName}
                onChange={(e) => setGuarantorName(e.target.value)}
                placeholder="Guarantor name"
              />
            </div>
            <div className="field">
              <label htmlFor="g_phone">Guarantor&apos;s phone number *</label>
              <input
                id="g_phone"
                required
                value={guarantorPhone}
                onChange={(e) => setGuarantorPhone(e.target.value)}
                placeholder="080..."
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label htmlFor="g_rel">Relationship to you *</label>
              <input
                id="g_rel"
                required
                value={guarantorRel}
                onChange={(e) => setGuarantorRel(e.target.value)}
                placeholder="e.g. Pastor, Uncle, Landlord"
              />
            </div>
            <div className="field">
              <label htmlFor="g_occ">Guarantor&apos;s occupation (optional)</label>
              <input
                id="g_occ"
                value={guarantorOcc}
                onChange={(e) => setGuarantorOcc(e.target.value)}
                placeholder="Occupation"
              />
            </div>
          </div>

          <h3 style={{ fontSize: 15, margin: "16px 0 8px", color: "var(--primary-purple)" }}>
            Emergency Contact
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label htmlFor="em_name">Emergency contact full name *</label>
              <input
                id="em_name"
                required
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Emergency contact"
              />
            </div>
            <div className="field">
              <label htmlFor="em_phone">Emergency contact phone number *</label>
              <input
                id="em_phone"
                required
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="080..."
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="em_rel">Emergency contact relationship *</label>
            <input
              id="em_rel"
              required
              value={emergencyRel}
              onChange={(e) => setEmergencyRel(e.target.value)}
              placeholder="e.g. Sibling, Mother, Spouse"
            />
          </div>

          <div className="field">
            <label htmlFor="allergies">Any allergies to dust, pets, or strong chemicals? (Optional)</label>
            <input
              id="allergies"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. Mild dust allergy, no other conditions"
            />
          </div>
        </div>

        {/* SECTION 6: ABOUT YOU & CLEANSE */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            6. About You &amp; Cleanse
          </h2>

          <div className="field">
            <label htmlFor="why">Why do you want to be a Cleanse Pro?</label>
            <textarea
              id="why"
              rows={2}
              value={whyCleanse}
              onChange={(e) => setWhyCleanse(e.target.value)}
              placeholder="Tell us what motivates you..."
            />
          </div>

          <div className="field">
            <label htmlFor="year">Where do you want to be in one year?</label>
            <textarea
              id="year"
              rows={2}
              value={oneYearGoal}
              onChange={(e) => setOneYearGoal(e.target.value)}
              placeholder="Your goals and aspirations..."
            />
          </div>

          <div className="field">
            <label htmlFor="break">What would you do if you accidentally broke something in a client&apos;s home?</label>
            <textarea
              id="break"
              rows={2}
              value={breakageResponse}
              onChange={(e) => setBreakageResponse(e.target.value)}
              placeholder="Explain what steps you would take..."
            />
          </div>

          <div className="field">
            <label htmlFor="hear">How did you hear about Cleanse?</label>
            <input
              id="hear"
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
              placeholder="e.g. WhatsApp, Flyer, Instagram, Friend"
            />
          </div>
        </div>

        {/* SECTION 7: AGREEMENT */}
        <div className="card" style={{ marginBottom: 30, border: "2px solid var(--primary-purple)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <h2 style={{ fontSize: 20, margin: 0 }}>7. Cleanse Pro Agreement</h2>
            <button
              type="button"
              className="btn-ghost"
              onClick={selectAllClauses}
              style={{ fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: 0 }}
            >
              {agreedClauses.length === AGREEMENT_CLAUSES.length
                ? "Deselect All"
                : "Select All (I Agree to All Clauses)"}
            </button>
          </div>

          <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
            Please read and tick each of the 19 clauses below to confirm your understanding and agreement.
            Progress: <strong>{agreedClauses.length} of {AGREEMENT_CLAUSES.length} agreed</strong>
          </p>

          {clauseGroups.map((group) => {
            const groupClauses = AGREEMENT_CLAUSES.filter((c) => c.group === group);
            return (
              <div key={group} style={{ marginBottom: 18 }}>
                <h3
                  style={{
                    fontSize: 14,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "var(--primary-purple)",
                    marginBottom: 8,
                  }}
                >
                  {group}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {groupClauses.map((clause) => {
                    const checked = agreedClauses.includes(clause.id);
                    return (
                      <label
                        key={clause.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "8px 10px",
                          borderRadius: 8,
                          background: checked ? "rgba(124, 252, 0, 0.08)" : "var(--off-white)",
                          border: checked ? "1px solid rgba(124, 252, 0, 0.4)" : "1px solid var(--border)",
                          cursor: "pointer",
                          fontSize: 13.5,
                          lineHeight: 1.45,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleClause(clause.id)}
                          style={{ marginTop: 3, width: "auto" }}
                        />
                        <span>
                          <strong>{clause.id}.</strong> {clause.text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="notice error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          style={{ width: "100%", padding: 18, fontSize: 16 }}
          disabled={loading || agreedClauses.length < AGREEMENT_CLAUSES.length}
        >
          {loading
            ? "Submitting your onboarding details…"
            : agreedClauses.length < AGREEMENT_CLAUSES.length
            ? `Please tick all 19 clauses (${agreedClauses.length}/${AGREEMENT_CLAUSES.length})`
            : "✓ Confirm and Submit Onboarding Form"}
        </button>
      </form>
    </div>
  );
}

export default function CleanseProOnboardingPage() {
  return (
    <main className="admin-shell" style={{ background: "var(--off-white)", minHeight: "100vh" }}>
      <Suspense fallback={<div style={{ textAlign: "center", padding: 60 }}>Loading onboarding form…</div>}>
        <OnboardingForm />
      </Suspense>
    </main>
  );
}
