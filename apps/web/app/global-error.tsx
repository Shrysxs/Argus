"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#0A0B0D", color: "#F3F4F6", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24 }}>Argus is temporarily unavailable</h1>
          <p style={{ color: "#9CA3AF", fontSize: 14 }}>Please try again in a moment.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px", background: "#F3F4F6", color: "#0A0B0D", border: 0, borderRadius: 4, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
