"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileCheck2, CheckCircle2, ScanLine, AlertTriangle, FileText, Trash2 } from "lucide-react";
import { Shell } from "../../../components/Shell";
import { Card } from "../../../components/ui";
import { getAuth } from "../../../lib/auth";
import { runOCR, fileToOcrInput, extractFieldsFromText } from "../../../lib/ocr";
import { verifyAgainstSupabase } from "../../../lib/verify";
import { createBid } from "../../../lib/bids";

export default function SubmitBidPage() {
  const router = useRouter();
  const [auth, setAuthState] = useState(null);
  const [tender, setTender] = useState("NHAI/2026/RD-CONST/118 — Highway Widening Package 4");
  const [stage, setStage] = useState("select"); // select -> scanning -> extracted -> verifying
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rawText, setRawText] = useState("");
  const [progress, setProgress] = useState({ status: "", progress: 0 });
  const [fields, setFields] = useState(null);
  const [bboxes, setBboxes] = useState(null);
  const [error, setError] = useState("");
  const [showThanks, setShowThanks] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const a = getAuth();
    if (!a || a.role !== "bidder") {
      router.replace("/login");
      return;
    }
    setAuthState(a);
  }, [router]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError("");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setError("");
    }
  };

  const handleScan = async () => {
    if (!file) {
      setError("Please upload a master document.");
      return;
    }
    
    setError("");
    setStage("scanning");
    
    try {
      setProgress({ status: `Reading ${file.name}`, progress: 0 });
      const ocrInput = await fileToOcrInput(file);
      const textData = await runOCR(ocrInput, setProgress, { tenderName: tender, bidderEmail: auth.email });
      const text = textData.text;
      
      const reader = new FileReader();
      reader.onload = (e) => localStorage.setItem("temp_doc", e.target.result);
      reader.readAsDataURL(ocrInput);

      setRawText(text);
      const { fields: extracted, bboxes: extractedBboxes } = extractFieldsFromText(text);
      setFields(extracted);
      setBboxes(extractedBboxes);
      setStage("extracted");
    } catch (err) {
      console.error(err);
      const errMsg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
      if (errMsg.startsWith("TAMPERED:")) {
        setError(`CRITICAL: Digital tampering detected via Error Level Analysis (ELA). This bid has been permanently flagged as FORGED. Contact support if this is a mistake.`);
      } else {
        setError("OCR failed: " + errMsg + ". Try clearer images, or PDFs with text-based first pages.");
      }
      setStage("select");
    }
  };

  const confirmAndVerify = async () => {
    setStage("verifying");
    setError("");
    try {
      // 1. Run deterministic registry checks
      const result = await verifyAgainstSupabase(fields, tender, bboxes);
      
      // 2. Run XAI verification for complex rules via backend LLM
      setProgress({ status: "Generating XAI explanations", progress: 0.8 });
      const apiRes = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          words: bboxes ? bboxes.words : [], // If words was passed in bboxes obj
          tenderName: tender
        })
      });
      
      let xaiChecks = [];
      if (apiRes.ok) {
        const xaiData = await apiRes.json();
        if (xaiData.success && xaiData.results) {
          xaiChecks = xaiData.results.map(r => ({
            field_name: r.requirement,
            expected_value: "See tender document",
            extracted_value: r.extracted_value || "Not found",
            status: r.status,
            confidence: r.confidence,
            explanation: r.explanation,
            evidence_text: r.evidence_text,
            bbox: r.bbox,
            is_xai: true
          }));
        }
      }

      // Format deterministic checks to match new structure
      const formattedDeterministicChecks = result.checks.map(c => ({
        field_name: c.field,
        expected_value: c.dbValue,
        extracted_value: c.extracted,
        status: c.match ? "PASS" : "FAIL",
        confidence: 1.0, // Deterministic
        explanation: c.detail,
        evidence_text: c.extracted,
        bbox: c.bbox,
        is_xai: false
      }));

      const allChecks = [...formattedDeterministicChecks, ...xaiChecks];

      // Re-calculate score dynamically
      const passCount = allChecks.filter(c => c.status === "PASS").length;
      const failCount = allChecks.filter(c => c.status === "FAIL").length;
      const warningCount = allChecks.filter(c => c.status === "WARNING" || c.status === "NOT FOUND").length;
      
      const totalScore = allChecks.length > 0 ? Math.round((passCount / allChecks.length) * 100) : 0;
      let finalStatus = "PENDING";
      // Map to old schema values: SAFE, MODERATE, RISK to prevent constraint violation
      if (totalScore >= 80 && failCount === 0) finalStatus = "SAFE";
      else if (totalScore >= 50 && failCount === 0) finalStatus = "MODERATE";
      else if (failCount > 0) finalStatus = "RISK";
      else finalStatus = "MODERATE";

      setProgress({ status: "Verification complete", progress: 1.0 });

      const bid = await createBid({
        tenderName: tender,
        bidderEmail: auth.email,
        companyName: fields.companyName,
        documentName: file.name,
        ocrRawText: rawText,
        extracted: fields,
        score: totalScore,
        status: finalStatus,
        checks: allChecks,
      });

      const tempDoc = localStorage.getItem("temp_doc");
      if (tempDoc) {
        localStorage.setItem(`bid_doc_${bid.id}`, tempDoc);
        localStorage.removeItem("temp_doc");
      }

      setShowThanks(true);
      setTimeout(() => {
        router.push(`/bidder/result/${bid.id}`);
      }, 2000);
    } catch (err) {
      console.error(err);
      setError("Verification failed: " + err.message + ". Confirm your Supabase schema and seed data are set up (see sql/ folder).");
      setStage("extracted");
    }
  };

  if (!auth) return null;

  return (
    <Shell role="bidder" user={auth.email} title="Submit Bid" subtitle="Upload your unified compliance document for real OCR extraction and verification." crumbs={["Bidder Portal", "Submit Bid"]}>
      <div className="fade-in" style={{ padding: 32, maxWidth: 880 }}>
        {error && (
          <Card style={{ padding: 14, marginBottom: 18, background: "var(--risk-bg)", color: "var(--risk)", fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start", border: "1px solid rgba(192, 57, 43, 0.2)", borderRadius: 12 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
          </Card>
        )}

        <Card style={{ padding: 28, borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ marginBottom: 4, fontSize: 11.5, fontWeight: 700, color: "var(--teal)", letterSpacing: 0.4, textTransform: "uppercase" }}>Step 1 of 2</div>
          <h3 className="serif" style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 600 }}>Tender Selection</h3>
          <p style={{ fontSize: 13, color: "var(--slate)", margin: "0 0 16px" }}>Select the tender this bid is being submitted against.</p>
          <select
            value={tender}
            onChange={(e) => setTender(e.target.value)}
            disabled={stage !== "select"}
            style={{ width: "100%", padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 10, fontSize: 14, fontFamily: "inherit", background: stage !== "select" ? "#F5F7F8" : "#fff", outline: "none", transition: "border-color 0.2s" }}
            onFocus={(e) => e.target.style.borderColor = "var(--teal)"}
            onBlur={(e) => e.target.style.borderColor = "var(--border)"}
          >
            <option>NHAI/2026/RD-CONST/118 — Highway Widening Package 4</option>
            <option>PWD/KA/2026/BR-77 — Bridge Rehabilitation Works</option>
            <option>MCD/2026/CIVIL-22 — Municipal Complex Renovation</option>
          </select>
        </Card>

        <Card style={{ padding: 28, marginTop: 24, borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
          <div style={{ marginBottom: 4, fontSize: 11.5, fontWeight: 700, color: "var(--teal)", letterSpacing: 0.4, textTransform: "uppercase" }}>Step 2 of 2</div>
          <h3 className="serif" style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 600 }}>Upload Master Document</h3>
          <p style={{ fontSize: 13, color: "var(--slate)", margin: "0 0 20px" }}>
            Upload a single unified PDF containing all required compliance documents (PAN, GSTIN, CIN, Udyam, EPFO, etc.).
          </p>

          {stage === "select" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              
              {!file ? (
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragging ? "var(--teal)" : "var(--border)"}`,
                    borderRadius: 16,
                    padding: "40px 20px",
                    textAlign: "center",
                    background: isDragging ? "var(--teal-light)" : "var(--bg)",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <UploadCloud size={48} color={isDragging ? "var(--teal)" : "var(--slate-light)"} style={{ margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--navy)", marginBottom: 4 }}>
                    Click to upload or drag and drop
                  </div>
                  <div style={{ fontSize: 13, color: "var(--slate)" }}>
                    PDF, PNG, JPG (max. 10MB)
                  </div>
                  <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" />
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--teal-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--teal)" }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)" }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: "var(--slate)" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setFile(null)}
                    className="btn" 
                    style={{ padding: 8, borderRadius: 8, background: "transparent", color: "var(--slate-light)" }}
                    onMouseOver={(e) => { e.currentTarget.style.color = "var(--risk)"; e.currentTarget.style.background = "var(--risk-bg)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = "var(--slate-light)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
              
              <button
                onClick={handleScan}
                disabled={!file}
                className="btn hover-lift"
                style={{ marginTop: 8, padding: "14px 20px", borderRadius: 10, border: "none", background: "var(--teal)", color: "#fff", fontSize: 14.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: !file ? 0.5 : 1, transition: "all 0.2s" }}
              >
                <ScanLine size={18} /> Extract Data with AI
              </button>
            </div>
          )}

          {stage === "scanning" && (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div className="skeleton-container" style={{ position: "relative", width: 220, height: 280, margin: "0 auto 24px", borderRadius: 12, background: "#fff", border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 12px 32px rgba(15,36,56,0.08)" }}>
                <div style={{ padding: 20 }}>
                  <div className="skeleton-line" style={{ height: 12, width: '40%', marginBottom: 24, borderRadius: 4 }} />
                  {[100, 85, 95, 70, 90, 60, 80].map((w, i) => (
                    <div key={i} className="skeleton-line" style={{ height: 8, width: `${w}%`, borderRadius: 4, marginBottom: 14 }} />
                  ))}
                </div>
                <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: "linear-gradient(90deg, rgba(28, 110, 140, 0), var(--teal), rgba(28, 110, 140, 0))", animation: "scanline 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite", boxShadow: "0 0 16px var(--teal)" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--teal)", fontWeight: 600, fontSize: 15 }}>
                <ScanLine size={20} className="animate-pulse" /> {progress.status || "Analyzing master document"}…
              </div>
              <div style={{ fontSize: 13, color: "var(--slate)", marginTop: 8, fontWeight: 500 }}>{Math.round((progress.progress || 0) * 100)}% complete</div>
            </div>
          )}

          {(stage === "extracted" || stage === "verifying") && fields && (
            <div className="fade-in">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, padding: "14px 18px", background: "var(--safe-bg)", borderRadius: 10, color: "var(--safe)", fontSize: 13.5, fontWeight: 600, border: "1px solid rgba(30, 142, 90, 0.2)" }}>
                <CheckCircle2 size={18} /> Extraction complete. Please review and correct any fields.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  ["Company Name", "companyName"],
                  ["PAN", "pan"],
                  ["GSTIN", "gstin"],
                  ["Udyam / MSME Number", "udyam_msme_number"],
                  ["CIN", "cin"],
                  ["EPFO Code", "epfo_code"],
                  ["Local Content %", "local_content_percentage"],
                  ["Startup India / DPIIT No.", "startup_india_dpiit_no"]
                ].map(([label, key]) => (
                  <div key={key} style={{ gridColumn: key === "companyName" ? "1 / -1" : "auto" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--navy)", marginBottom: 6, display: "block" }}>{label}</label>
                    <input
                      value={fields[key] || ""}
                      onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
                      disabled={stage === "verifying"}
                      className="mono focus-ring"
                      placeholder="Not detected — enter manually"
                      style={{ width: "100%", padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: stage === "verifying" ? "#f9fafb" : "#fff", outline: "none", transition: "all 0.2s" }}
                    />
                  </div>
                ))}
              </div>

              <details style={{ marginTop: 24, padding: 12, border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)" }}>
                <summary style={{ fontSize: 13, color: "var(--navy)", cursor: "pointer", fontWeight: 600, outline: "none" }}>View raw OCR text</summary>
                <pre className="mono" style={{ fontSize: 11.5, color: "var(--slate)", padding: "16px 0 0", margin: 0, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>{rawText}</pre>
              </details>

              <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                <button
                  onClick={() => { setStage("select"); setFields(null); setRawText(""); setFile(null); }}
                  disabled={stage === "verifying"}
                  className="btn"
                  style={{ padding: "14px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", fontSize: 14, fontWeight: 600, color: "var(--slate)" }}
                >
                  Start over
                </button>
                <button
                  onClick={confirmAndVerify}
                  disabled={stage === "verifying"}
                  className="btn hover-lift"
                  style={{ flex: 1, padding: "14px 20px", borderRadius: 10, border: "none", background: "var(--teal)", color: "#fff", fontSize: 14.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: stage === "verifying" ? 0.7 : 1 }}
                >
                  {stage === "verifying" ? (
                    <><ScanLine size={18} className="animate-pulse" /> Verifying against Registry...</>
                  ) : (
                    <><FileCheck2 size={18} /> Submit & Run Verification</>
                  )}
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {showThanks && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 36, 56, 0.6)", backdropFilter: "blur(4px)" }}>
          <Card style={{ padding: "40px 60px", textAlign: "center", animation: "popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
            <CheckCircle2 size={64} color="var(--safe)" style={{ margin: "0 auto 20px" }} />
            <h2 className="serif" style={{ margin: "0 0 12px", fontSize: 28, color: "var(--navy)" }}>Thank You!</h2>
            <p style={{ fontSize: 15, color: "var(--slate)", margin: 0 }}>Your documents have been successfully submitted.</p>
          </Card>
        </div>
      )}
    </Shell>
  );
}
