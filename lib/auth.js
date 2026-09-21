"use client";

// Lightweight demo auth stored in localStorage. This is intentionally simple
// so the prototype runs without configuring Supabase Auth. To make this
// production-real, swap getAuth/setAuth for supabase.auth.signInWithPassword
// and supabase.auth.getSession().

export function setAuth(role, email) {
  localStorage.setItem("bidverify_auth", JSON.stringify({ role, email }));
}

export function getAuth() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("bidverify_auth");
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem("bidverify_auth");
}
