"use client";

import { useState, FormEvent, useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function WaitlistModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => {
      onClose();
      setTimeout(() => {
        setStatus("idle");
        setEmail("");
      }, 300);
    }, 2000);
    return () => clearTimeout(t);
  }, [status, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const val = email.trim().toLowerCase();
    if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        const data = (await res.json()) as { error?: string };
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(12,12,13,0.45)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Stay in the loop"
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 401,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.14)",
          padding: "32px 28px 28px",
          width: "min(92vw, 420px)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 14, right: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28,
            background: "none", border: "none", borderRadius: "var(--radius)",
            cursor: "pointer", color: "var(--text-tertiary)", fontFamily: "inherit",
            transition: "background 0.12s, color 0.12s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "none";
            (e.currentTarget as HTMLElement).style.color = "var(--text-tertiary)";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {status === "success" ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "var(--safe-bg)", border: "1px solid #BBF7D0",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 10l5 5 7-8" stroke="var(--safe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ fontWeight: 600, fontSize: 16, color: "var(--text-primary)", marginBottom: 6 }}>
              You&apos;re in!
            </p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>We&apos;ll keep you posted.</p>
          </div>
        ) : (
          <>
            <h2 style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)", marginBottom: 8, letterSpacing: "-0.4px" }}>
              Stay in the loop
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 24 }}>
              Get notified when we find suspicious repos and release new features.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
                  placeholder="you@example.com"
                  disabled={status === "loading"}
                  autoFocus
                  style={{
                    flex: 1, padding: "9px 12px", fontSize: 13,
                    border: `1px solid ${errorMsg ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    background: "var(--bg-base)",
                    color: "var(--text-primary)",
                    fontFamily: "inherit",
                    outline: "none",
                    transition: "border-color 0.15s",
                    minWidth: 0,
                  }}
                  onFocus={(e) => { if (!errorMsg) (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
                  onBlur={(e) => { if (!errorMsg) (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  style={{
                    padding: "9px 16px", fontSize: 13, fontWeight: 600,
                    background: "var(--accent)", color: "#fff",
                    border: "none", borderRadius: "var(--radius)",
                    cursor: status === "loading" ? "not-allowed" : "pointer",
                    opacity: status === "loading" ? 0.7 : 1,
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (status !== "loading") (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--accent)";
                  }}
                >
                  {status === "loading" ? "..." : "Subscribe"}
                </button>
              </div>
              {errorMsg && (
                <p style={{ marginTop: 6, fontSize: 12, color: "var(--accent)" }}>{errorMsg}</p>
              )}
            </form>

            <p style={{ marginTop: 14, fontSize: 11, color: "var(--text-tertiary)" }}>
              No spam. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>
    </>
  );
}
