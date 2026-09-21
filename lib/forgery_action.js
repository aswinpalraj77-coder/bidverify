"use server";

import fs from "fs";
import os from "os";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { createBid } from "./bids";

const execAsync = promisify(exec);

export async function checkForgery(formData) {
  const file = formData.get("file");
  const tenderName = formData.get("tenderName") || "Unknown Tender";
  const bidderEmail = formData.get("bidderEmail") || "Unknown";
  
  if (!file) return { error: "No file provided" };
  
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const tempPath = path.join(os.tmpdir(), `check_${Date.now()}.jpg`);
  fs.writeFileSync(tempPath, buffer);
  
  try {
    const scriptPath = path.join(process.cwd(), "python", "forgery_detect.py");
    // Ensure we run python properly. Depending on environment, it might be python or python3
    const { stdout } = await execAsync(`python "${scriptPath}" "${tempPath}"`);
    
    let result;
    try {
      result = JSON.parse(stdout.trim());
    } catch (e) {
      console.error("Failed to parse python output:", stdout);
      return { error: "Failed to parse forgery script output" };
    }
    
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
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}
