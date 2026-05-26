"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QRShare({ url, filename }: { url: string; filename: string }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      color: { dark: "#0C0C0D", light: "#FFFFFF" },
    }).then(setDataUrl);
  }, [url]);

  function download() {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `truststar-qr-${filename}.png`;
    a.click();
  }

  return (
    <div
      style={{
        marginTop: 24,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        textAlign: "center",
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Share this report
      </span>

      {dataUrl ? (
        <img
          src={dataUrl}
          alt="QR code"
          width={120}
          height={120}
          style={{ borderRadius: 6, border: "1px solid var(--border-subtle)" }}
        />
      ) : (
        <div
          style={{
            width: 120,
            height: 120,
            background: "var(--bg-hover)",
            borderRadius: 6,
            border: "1px solid var(--border-subtle)",
          }}
        />
      )}

      <span
        style={{
          fontFamily: "var(--font-ibm-mono), monospace",
          fontSize: 11,
          color: "var(--text-tertiary)",
          wordBreak: "break-all",
          maxWidth: 220,
          userSelect: "text",
        }}
      >
        {url}
      </span>

      <button
        onClick={download}
        disabled={!dataUrl}
        style={{
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "inherit",
          padding: "6px 16px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "var(--bg-base)",
          color: "var(--text-secondary)",
          cursor: dataUrl ? "pointer" : "default",
          transition: "color 0.12s, border-color 0.12s",
          opacity: dataUrl ? 1 : 0.4,
        }}
        onMouseEnter={(e) => {
          if (!dataUrl) return;
          (e.currentTarget as HTMLElement).style.color = "var(--accent)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        }}
      >
        Download QR
      </button>
    </div>
  );
}
