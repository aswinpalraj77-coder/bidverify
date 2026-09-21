/**
 * Calculates a Risk & Trust Score based on verification checks.
 * Starts with a baseline of 100 and applies dynamic deductions.
 * 
 * Deductions:
 * -10: Missing or mismatched non-critical documents (Udyam, EPFO, etc.)
 * -30: OCR vs API mismatches on critical documents (PAN, GSTIN, CIN, Company Name)
 * -50: Major compliance failures (Blacklisted, Local Content failure)
 * 
 * @param {Array} checks - The array of check objects from verify.js
 * @returns {{ score: number, category: string, status: string }}
 */
export function calculateRiskScore(checks) {
  let score = 900;

  checks.forEach(check => {
    if (!check.match) {
      if (["Blacklist Status", "Local Content %"].includes(check.field)) {
        score -= 250;
      } else if (["PAN Number", "GSTIN", "CIN", "Company Name"].includes(check.field)) {
        score -= 150;
      } else {
        // Fallback for non-critical fields like Udyam, EPFO
        score -= 50;
      }
    }
  });

  // Bound the score between 300 and 900 (CIBIL style)
  score = Math.max(300, Math.min(900, score));

  // Determine category and database status enum
  let category = "Low Risk";
  let status = "SAFE";

  if (score < 500) {
    category = "High Risk";
    status = "RISK";
  } else if (score < 750) {
    category = "Moderate Risk";
    status = "MODERATE";
  }

  return { score, category, status };
}
