"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Upload, FileStack, LogOut, Landmark, ChevronRight, ListChecks,
} from "lucide-react";

export function Shell({ role, user, title, subtitle, crumbs, children }) {
  const router = useRouter();
  const pathname = usePathname();

  const bidderNav = [
    { href: "/bidder/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { href: "/bidder/submit", label: "Submit Bid", Icon: Upload },
    { href: "/bidder/history", label: "Bid History", Icon: FileStack },
  ];
  const adminNav = [
    { href: "/admin/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { href: "/admin/bids", label: "All Bids", Icon: FileStack },
    { href: "/admin/registry", label: "Verification Registry", Icon: ListChecks },
  ];
  const nav = role === "bidder" ? bidderNav : adminNav;

  const logout = () => {
    localStorage.removeItem("bidverify_auth");
    router.push("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <div className="glass-dark" style={{ width: 260, color: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ padding: "28px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, var(--teal), #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(15, 23, 42, 0.4)" }}>
              <Landmark size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.01em" }}>BidVerify</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: 0.5, fontWeight: 500, marginTop: 2 }}>PROCUREMENT SUITE</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px 16px", flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.8, padding: "0 12px 12px", textTransform: "uppercase" }}>
            {role === "bidder" ? "Bidder Portal" : "Admin Portal"}
          </div>
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                className="btn"
                onClick={() => router.push(item.href)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  borderRadius: 10, marginBottom: 4, background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.65)", fontSize: 14, fontWeight: active ? 600 : 500, textAlign: "left",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => { if(!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseOut={(e) => { if(!active) e.currentTarget.style.background = "transparent"; }}
              >
                <item.Icon size={18} opacity={active ? 1 : 0.8} /> {item.label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 8px 16px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
              {user?.[0]?.toUpperCase() || "U"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{role === "bidder" ? "Bidder" : "Administrator"}</div>
            </div>
          </div>
          <button onClick={logout} className="btn" style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)", fontSize: 13.5, fontWeight: 600 }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div className="glass" style={{ padding: "24px 40px", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
          {crumbs && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--slate)", marginBottom: 8, fontWeight: 500 }}>
              {crumbs.map((c, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i > 0 && <ChevronRight size={12} opacity={0.6} />}
                  {c}
                </span>
              ))}
            </div>
          )}
          <h1 className="serif" style={{ fontSize: 28, margin: 0, fontWeight: 600, color: "var(--navy)", letterSpacing: "-0.02em" }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 14, color: "var(--slate)", margin: "6px 0 0", maxWidth: 700, lineHeight: 1.5 }}>{subtitle}</p>}
        </div>
        <div style={{ flex: 1, padding: "20px 8px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
