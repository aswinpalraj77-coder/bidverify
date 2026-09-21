"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Lock, UserRound, ShieldCheck } from "lucide-react";
import { setAuth } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState("bidder");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const demoCreds =
    role === "bidder" ? { email: "bidder@unitech.co.in", pw: "demo1234" } : { email: "admin@procure.gov.in", pw: "admin1234" };

  const submit = (e) => {
    e.preventDefault();
    if (!email || !pw) {
      setErr("Enter both email and password.");
      return;
    }
    setErr("");
    setAuth(role, email);
    router.push(role === "bidder" ? "/bidder/dashboard" : "/admin/dashboard");
  };

  const fillDemo = () => {
    setEmail(demoCreds.email);
    setPw(demoCreds.pw);
    setErr("");
  };

  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #0F2438 0%, #16324B 55%, #1C6E8C 130%)", padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 920, display: "grid", gridTemplateColumns: "1.05fr 1fr", borderRadius: 16, overflow: "hidden", boxShadow: "0 30px 70px rgba(0,0,0,0.35)" }}>
        <div style={{ background: "linear-gradient(165deg, #0F2438, #163854)", padding: "48px 40px", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)" }} />
          <div style={{ position: "absolute", right: -20, top: -20, width: 140, height: 140, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 34 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Landmark size={18} />
              </div>
              <span style={{ fontSize: 13, letterSpacing: 0.4, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Procurement Integrity Suite</span>
            </div>
            <h1 className="serif" style={{ fontSize: 34, lineHeight: 1.2, margin: 0, fontWeight: 600 }}>
              Bid Compliance
              <br />
              Verification Platform
            </h1>
            <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.7)", marginTop: 16, lineHeight: 1.6, maxWidth: 340 }}>
              Real OCR document extraction and live Supabase cross-registry verification for PAN, GSTIN, Udyam and CIN eligibility records.
            </p>
          </div>
          <div style={{ position: "relative", display: "flex", gap: 22, marginTop: 40, flexWrap: "wrap" }}>
            {[["OCR", "Tesseract.js"], ["Registry", "Live Supabase"], ["Scoring", "Weighted risk"]].map(([a, b]) => (
              <div key={a}>
                <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>{a}</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)" }}>{b}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", background: "var(--bg)", padding: 4, borderRadius: 9, marginBottom: 28 }}>
            {[["bidder", "Bidder Login", UserRound], ["admin", "Admin Login", ShieldCheck]].map(([val, label, Icon]) => (
              <button
                key={val}
                className="btn"
                onClick={() => {
                  setRole(val);
                  setEmail("");
                  setPw("");
                  setErr("");
                }}
                style={{
                  flex: 1, padding: "9px 10px", borderRadius: 7, fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  background: role === val ? "var(--navy)" : "transparent", color: role === val ? "#fff" : "var(--slate)",
                }}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <h2 className="serif" style={{ fontSize: 22, margin: "0 0 4px", fontWeight: 600 }}>
            {role === "bidder" ? "Sign in to submit a bid" : "Sign in to the admin console"}
          </h2>
          <p style={{ fontSize: 13, color: "var(--slate)", margin: "0 0 24px" }}>
            {role === "bidder" ? "Access your submissions and verification history." : "Monitor bids and review compliance across all submissions."}
          </p>

          <form onSubmit={submit}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--slate)" }}>Email address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={demoCreds.email}
              style={{ width: "100%", padding: "11px 13px", marginTop: 6, marginBottom: 16, border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, fontFamily: "inherit" }}
            />
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--slate)" }}>Password</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%", padding: "11px 13px", marginTop: 6, marginBottom: 8, border: "1px solid var(--border)", borderRadius: 8, fontSize: 14, fontFamily: "inherit" }}
            />
            {err && <div style={{ color: "var(--risk)", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

            <button
              type="submit"
              className="btn"
              style={{ width: "100%", background: "var(--teal)", color: "#fff", padding: "12px", borderRadius: 8, fontSize: 14, fontWeight: 600, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
            >
              <Lock size={14} /> {role === "bidder" ? "Sign in as Bidder" : "Sign in as Admin"}
            </button>
          </form>

          <button onClick={fillDemo} className="btn" style={{ marginTop: 16, background: "none", color: "var(--teal)", fontSize: 12.5, fontWeight: 600, textAlign: "left", padding: 0 }}>
            Use demo credentials →
          </button>
        </div>
      </div>
    </div>
  );
}
