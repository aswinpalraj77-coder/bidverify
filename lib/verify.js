import { supabase } from "./supabaseClient";
import { calculateRiskScore } from "./scoring";

function similarity(a, b) {
  if (!a || !b) return 0;
  a = a.trim().toUpperCase();
  b = b.trim().toUpperCase();
  if (a === b) return 1;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

/**
 * Cross-checks OCR-extracted fields against live Supabase registry tables
 * (pan_records, gst_records, cin_records) and computes a
 * weighted compliance score. Also checks against mock APIs for Udyam, EPFO, 
 * and a Blacklist Registry, as well as Local Content percentage.
 *
 * @param {Object} extracted
 * @param {string} tenderName - Tender specific reference to fetch dynamic rules
 * @param {Object} bboxes - Bounding boxes from OCR
 * @returns {Promise<{checks: Array, score: number, status: string}>}
 */
export async function verifyAgainstSupabase(extracted, tenderName, bboxes = {}) {
  const [panRes, gstRes, cinRes, rulesRes] = await Promise.all([
    supabase.from("pan_records").select("*").ilike("pan", extracted.pan || "___NONE___"),
    supabase.from("gst_records").select("*").ilike("gstin", extracted.gstin || "___NONE___"),
    supabase.from("cin_records").select("*").ilike("cin", extracted.cin || "___NONE___"),
    supabase.from("tender_rules").select("*").eq("tender_name", tenderName || "___NONE___").maybeSingle(),
  ]);

  if (panRes.error || gstRes.error || cinRes.error) {
    throw new Error(
      "Supabase query failed: " +
        (panRes.error?.message || gstRes.error?.message || cinRes.error?.message)
    );
  }

  const panRec = panRes.data?.[0] || null;
  const gstRec = gstRes.data?.[0] || null;
  const cinRec = cinRes.data?.[0] || null;

  // Extract dynamic rules if they exist
  let minLocalContent = 50; // Fallback default
  if (rulesRes.data && rulesRes.data.rules) {
    const rules = rulesRes.data.rules;
    const miiRule = rules.find(r => r.category === "Make in India" || r.requirement?.toLowerCase().includes("local content"));
    if (miiRule && miiRule.threshold) {
      minLocalContent = parseInt(miiRule.threshold, 10);
    }
  }

  // Mock API calls for GeM compliance entities
  const udyamValue = extracted.udyam_msme_number || extracted.udyam;
  const [udyamMockRec, epfoMockRec, isBlacklisted] = await Promise.all([
    mockUdyamAPI(udyamValue),
    mockEpfoAPI(extracted.epfo_code),
    mockBlacklistRegistry(extracted.companyName, extracted.pan)
  ]);

  const checks = [];

  checks.push({
    field: "PAN Number",
    key: "pan",
    extracted: extracted.pan || "(not detected)",
    dbValue: panRec ? panRec.pan : "Not found in registry",
    match: !!panRec,
    weight: 15,
    bbox: bboxes.pan,
    detail: panRec ? `Registry status: ${panRec.status}` : "No matching PAN record in verification database",
  });

  const refLegalName = panRec?.legal_name || gstRec?.legal_name;
  const nameSim = refLegalName ? similarity(refLegalName, extracted.companyName) : 0;
  checks.push({
    field: "Company Name",
    key: "companyName",
    extracted: extracted.companyName || "(not detected)",
    dbValue: refLegalName || "No reference record",
    match: nameSim > 0.85,
    weight: 10,
    bbox: bboxes.companyName,
    detail: refLegalName
      ? `${Math.round(nameSim * 100)}% textual match against registry legal name`
      : "No reference legal name available for comparison",
  });

  checks.push({
    field: "GSTIN",
    key: "gstin",
    extracted: extracted.gstin || "(not detected)",
    dbValue: gstRec ? gstRec.gstin : "Not found in registry",
    match: !!gstRec,
    weight: 15,
    bbox: bboxes.gstin,
    detail: gstRec
      ? `Registered in ${gstRec.state || "—"} · Status: ${gstRec.status}${gstRec.status !== "Active" ? " (flagged)" : ""}`
      : "GSTIN does not match any record in verification database",
  });

  checks.push({
    field: "Udyam / MSME Number",
    key: "udyam_msme_number",
    extracted: udyamValue || "(not detected)",
    dbValue: udyamMockRec ? udyamMockRec.udyam_number : "Not found in portal",
    match: !!udyamMockRec,
    weight: 10,
    bbox: bboxes.udyam_msme_number || bboxes.udyam,
    detail: udyamMockRec ? `MSME category: ${udyamMockRec.category}` : "No matching Udyam registration found",
  });

  checks.push({
    field: "CIN",
    key: "cin",
    extracted: extracted.cin || "(not detected)",
    dbValue: cinRec ? cinRec.cin : "Not found in registry",
    match: !!cinRec,
    weight: 15,
    bbox: bboxes.cin,
    detail: cinRec ? `Incorporated ${cinRec.incorporation_date}` : "CIN does not match Ministry of Corporate Affairs records",
  });

  checks.push({
    field: "EPFO Code",
    key: "epfo_code",
    extracted: extracted.epfo_code || "(not detected)",
    dbValue: epfoMockRec ? epfoMockRec.epfo_code : "Not found in EPFO DB",
    match: !!epfoMockRec,
    weight: 10,
    bbox: bboxes.epfo_code,
    detail: epfoMockRec ? `Status: ${epfoMockRec.status} (Last Filed: ${epfoMockRec.last_filed})` : "EPFO Code does not match any record",
  });
  
  checks.push({
    field: "Blacklist Status",
    key: "is_blacklisted",
    extracted: extracted.companyName || extracted.pan ? "Checked" : "(not detected)",
    dbValue: isBlacklisted ? "Blacklisted" : "Clear",
    match: !isBlacklisted, // Match means it's clear (safe)
    weight: 15,
    bbox: bboxes.companyName || bboxes.pan, // Fallback to company name bbox
    detail: isBlacklisted ? "Company or PAN is flagged in the Blacklist Registry" : "No negative records found in Blacklist Registry",
  });

  let localContentOk = false;
  if (extracted.local_content_percentage) {
    const parsedPercent = parseInt(extracted.local_content_percentage, 10);
    if (!isNaN(parsedPercent) && parsedPercent >= minLocalContent) {
      localContentOk = true;
    }
  }
  
  checks.push({
    field: "Local Content %",
    key: "local_content_percentage",
    extracted: extracted.local_content_percentage ? `${extracted.local_content_percentage}%` : "(not detected)",
    dbValue: `Min ${minLocalContent}% Required (Dynamic)`,
    match: localContentOk,
    weight: 10,
    bbox: bboxes.local_content_percentage,
    detail: localContentOk ? "Meets Make in India local content requirement" : `Fails to meet minimum ${minLocalContent}% requirement`,
  });

  const { score, status } = calculateRiskScore(checks);

  return { checks, score, status, isBlacklisted };
}

// ----------------------------------------------------------------------
// Mock APIs for GeM Compliance
// ----------------------------------------------------------------------

async function mockUdyamAPI(udyamNumber) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  if (!udyamNumber || udyamNumber === "___NONE___") return null;
  
  // Return mock valid data for any well-formatted Udyam number
  if (/^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/i.test(udyamNumber)) {
    return {
      udyam_number: udyamNumber.toUpperCase(),
      category: "Small",
      status: "Active"
    };
  }
  return null;
}

async function mockEpfoAPI(epfoCode) {
  await new Promise(resolve => setTimeout(resolve, 100));
  if (!epfoCode) return null;
  
  return {
    epfo_code: epfoCode,
    status: "Compliant",
    last_filed: new Date().toISOString().split('T')[0]
  };
}

async function mockBlacklistRegistry(companyName, pan) {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const searchName = (companyName || "").toLowerCase();
  const searchPan = (pan || "").toUpperCase();
  
  // Mock condition: any name with "scam", "fraud", or specific mock PAN is blacklisted
  if (searchName.includes("scam") || searchName.includes("fraud") || searchName.includes("blacklisted")) {
    return true;
  }
  if (searchPan === "BLACKLIST") {
    return true;
  }
  
  return false;
}
