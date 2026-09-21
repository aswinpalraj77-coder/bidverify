"use client";

import { createWorker } from "tesseract.js";
import { checkForgery } from "./forgery_action";

/**
 * Runs real OCR on an uploaded image/PDF-page file using Tesseract.js.
 * This executes entirely client-side in the browser (no API key, no
 * server round trip) using WASM. Works on PNG/JPG directly; for PDFs,
 * the first page is rasterized to a canvas before OCR (see pdfToImage).
 *
 * @param {File} file - the uploaded file (image or single-page render)
 * @param {(progress: {status: string, progress: number}) => void} onProgress
 * @param {Object} context - Optional context (tenderName, bidderEmail) for logging forged bids
 * @returns {Promise<{text: string, words: Array}>} raw extracted text and word bboxes
 */
export async function runOCR(file, onProgress, context = {}) {
  if (onProgress) onProgress({ status: "Running Digital Forensics (ELA)", progress: 0.5 });
  
  const formData = new FormData();
  formData.append("file", file);
  if (context.tenderName) formData.append("tenderName", context.tenderName);
  if (context.bidderEmail) formData.append("bidderEmail", context.bidderEmail);

  try {
    const forgeryResult = await checkForgery(formData);
    if (forgeryResult.tampered) {
      throw new Error(`TAMPERED:${forgeryResult.bidId}:${forgeryResult.message}`);
    }
  } catch (err) {
    if (err.message.startsWith("TAMPERED:")) throw err;
    console.warn("Forgery check failed or bypassed:", err.message);
  }

  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (onProgress) onProgress({ status: m.status, progress: m.progress ?? 0 });
    },
  });

  try {
    const {
      data: { text, words },
    } = await worker.recognize(file);
    return { text, words };
  } finally {
    await worker.terminate();
  }
}

/**
 * If the uploaded file is a PDF, rasterizes its first page to a PNG Blob
 * using pdf.js (loaded from CDN at runtime) so Tesseract can OCR it.
 * If the file is already an image, it's returned unchanged.
 */
export async function fileToOcrInput(file) {
  if (file.type !== "application/pdf") return file;

  // Load pdf.js from CDN lazily (kept out of the main bundle).
  if (!window.pdfjsLib) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${src}. Your browser or adblocker might be blocking the CDN.`));
    document.head.appendChild(script);
  });
}

/**
 * Parses raw OCR text and extracts structured eligibility fields using
 * pattern matching tuned to Indian company-identifier formats:
 *   PAN:   5 letters, 4 digits, 1 letter        e.g. AABCU9603R
 *   GSTIN: 2 digits + PAN + 1 digit + Z + 1 char e.g. 27AABCU9603R1ZV
 *   CIN:   21 chars: L/U + 5 digits + 2 letters + 4 digits + 3 letters + 6 digits
 * Udyam: UDYAM-XX-00-0000000
 * Company name is taken as the best-guess line near "Company Name" /
 * "M/s" / the top of the document if no explicit label is found.
 */
export function extractFieldsFromText(rawText, words = []) {
  const text = rawText.replace(/\r/g, "");
  const cleaned = text.replace(/[|]/g, "I"); // common OCR artifact

  let panMatch = cleaned.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/);
  if (!panMatch) {
    const m = cleaned.match(/PAN\s*[:\-]?\s*([A-Z0-9]{8,12})\b/i);
    if (m) panMatch = [m[1].toUpperCase()];
  }

  let gstinMatch = cleaned.match(/\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9][A-Z][A-Z0-9]\b/);
  if (!gstinMatch) {
    const m = cleaned.match(/GST(?:IN)?\s*[:\-]?\s*([A-Z0-9]{8,15})\b/i);
    if (m) gstinMatch = [m[1].toUpperCase()];
  }

  const cinMatch = cleaned.match(/\b[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}\b/);
  const udyamMatch = cleaned.match(/\bUDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}\b/i);

  // New statutory entity extractions
  const dpiitMatch = cleaned.match(/\b(?:DPIIT|DIPP)[a-z0-9\-\/]+\b/i);
  const epfoMatch = cleaned.match(/\b[A-Z]{2}[\s\/-]?[A-Z]{3}[\s\/-]?[0-9]{7}(?:[\s\/-]?[A-Z0-9]{1,3})?\b/i);
  
  let makeInIndiaClass = "";
  let localContentPercentage = "";
  
  const miiClassMatch = cleaned.match(/Class[- ]?(I|II)\b/i);
  if (miiClassMatch) {
    makeInIndiaClass = `Class-${miiClassMatch[1].toUpperCase()}`;
  }

  const localContentMatch = cleaned.match(/local content.*?(\d{1,3})\s*%/i);
  if (localContentMatch) {
    localContentPercentage = localContentMatch[1];
  } else {
    const altPercentMatch = cleaned.match(/(\d{1,3})\s*%\s*(?:local|content)/i);
    if (altPercentMatch) {
      localContentPercentage = altPercentMatch[1];
    }
  }

  const companyName = guessCompanyName(cleaned);

  const fields = {
    companyName: companyName || "",
    pan: panMatch ? panMatch[0] : "",
    gstin: gstinMatch ? gstinMatch[0] : "",
    cin: cinMatch ? cinMatch[0] : "",
    udyam: udyamMatch ? udyamMatch[0].toUpperCase() : "",
    udyam_msme_number: udyamMatch ? udyamMatch[0].toUpperCase() : "",
    epfo_code: epfoMatch ? epfoMatch[0].toUpperCase().replace(/[\s]/g, '') : "",
    make_in_india_class: makeInIndiaClass,
    local_content_percentage: localContentPercentage,
    startup_india_dpiit_no: dpiitMatch ? dpiitMatch[0].toUpperCase() : "",
  };

  const bboxes = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value && value.length > 3) { // Only try to find bbox for meaningful extracted values
      bboxes[key] = findBboxForMatch(value, words);
    }
  }

  return { fields, bboxes };
}

function findBboxForMatch(matchString, words) {
  if (!matchString || !words || !words.length) return null;
  const target = matchString.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!target) return null;

  for (let i = 0; i < words.length; i++) {
    let combined = "";
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let j = i; j < words.length && combined.length < target.length + 10; j++) {
      combined += words[j].text.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (!words[j].bbox) continue;
      const { x0, y0, x1, y1 } = words[j].bbox;
      minX = Math.min(minX, x0);
      minY = Math.min(minY, y0);
      maxX = Math.max(maxX, x1);
      maxY = Math.max(maxY, y1);
      
      if (combined.includes(target) || (target.includes(combined) && combined.length >= target.length * 0.8)) {
        return { x0: minX, y0: minY, x1: maxX, y1: maxY };
      }
    }
  }
  return null;
}

function guessCompanyName(text) {
  const lines = text.split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter(l => !l.startsWith("--- Document:"));

  // 1. Explicit label patterns
  const labelPatterns = [
    /(?:company name|legal name|name of (?:the )?(?:company|entity|firm)|m\/s)\s*[:\-]?\s*(.+)/i,
  ];
  for (const line of lines) {
    for (const pattern of labelPatterns) {
      const m = line.match(pattern);
      if (m && m[1] && m[1].trim().length > 3) {
        return cleanCompanyName(m[1]);
      }
    }
  }

  // 2. Fallback: first line containing a common company suffix
  const suffixPattern = /\b(pvt\.?\s?ltd\.?|private limited|ltd\.?|limited|llp|works|enterprises|constructions?|infra|projects?)\b/i;
  const candidate = lines.find((l) => suffixPattern.test(l) && l.length < 80);
  if (candidate) return cleanCompanyName(candidate);

  // 3. Last resort: first non-trivial line of the document
  return lines.find((l) => l.length > 4 && l.length < 80) ? cleanCompanyName(lines[0]) : "";
}

function cleanCompanyName(raw) {
  return raw
    .replace(/[^A-Za-z0-9&.,'()\- ]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
