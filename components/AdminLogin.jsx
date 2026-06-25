"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: "40px auto" }}>
      <h1 className="page-title">Admin sign in</h1>
      <p className="page-sub">Enter the admin password to view activity.</p>
      <form className="q-card" onSubmit={submit}>
        <input
          className="text-input"
          type="password"
          placeholder="Admin password"
          value={password}
          autoFocus
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <div style={{ color: "var(--red)", fontSize: 14, marginTop: 10 }}>
            {error}
          </div>
        )}
        <button
          className="btn"
          type="submit"
          disabled={busy || !password}
          style={{ marginTop: 14, width: "100%" }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
