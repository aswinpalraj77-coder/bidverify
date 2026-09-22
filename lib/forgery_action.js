"use server";

import { createBid } from "./bids";

export async function checkForgery(formData) {
  const file = formData.get("file");
  const tenderName = formData.get("tenderName") || "Unknown Tender";
  const bidderEmail = formData.get("bidderEmail") || "Unknown";
  
  if (!file) return { error: "No file provided" };
  
  try {
    // Create new FormData to send to our Python serverless function
    const pyFormData = new FormData();
    pyFormData.append('file', file);
    
    // Determine base URL depending on environment
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/forgery`, {
      method: 'POST',
      body: pyFormData
    });
    
    if (!response.ok) {
      return { error: `Forgery API failed: ${response.statusText}` };
    }
    
    const result = await response.json();
    
    if (result.error) {
      return { error: result.error };
    }
    
    if (result.is_tampered) {
      // Create FORGED bid in Supabase
      const bid = await createBid({
        tenderName,
        bidderEmail,
        companyName: "UNKNOWN - TAMPERED DOCUMENT",
        documentName: file.name || "Uploaded Document",
        ocrRawText: "ERROR: ELA detected digital tampering or pixel anomalies. Standard text extraction aborted.",
        extracted: {},
        score: 0,
        status: "FORGED",
        checks: [{
          field: "Digital Forensics (ELA)",
          extracted: "Tampering Detected",
          dbValue: "Pristine Document",
          match: false,
          weight: 100,
          detail: `Confidence: ${(result.confidence * 100).toFixed(1)}%. Anomalous pixels detected (std_dev: ${result.metrics.std_dev}).`
        }]
      });
      
      return { tampered: true, message: "Document flagged for digital tampering (ELA)", bidId: bid.id };
    }
    
    return { tampered: false };
  } catch (error) {
    console.error("Forgery detection execution error:", error);
    return { error: error.message };
  }
}
