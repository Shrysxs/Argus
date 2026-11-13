import { ImageResponse } from "next/og";

export const alt = "Argus — an auditable AI investment committee";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const agents = ["Value", "Momentum", "Macro", "On-chain", "Risk"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0A0B0D", color: "#F3F4F6", padding: 72, fontFamily: "serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#B08D57", fontSize: 28, letterSpacing: 8 }}>
          <svg width="44" height="44" viewBox="0 0 32 32">
            <path d="M5 16c3.2-5.4 6.9-8 11-8s7.8 2.6 11 8c-3.2 5.4-6.9 8-11 8s-7.8-2.6-11-8Z" fill="none" stroke="#B08D57" strokeWidth="2.2" />
            <circle cx="16" cy="16" r="3.6" fill="#B08D57" />
          </svg>
          ARGUS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>An AI investment committee you can audit.</div>
          <div style={{ fontSize: 30, color: "#9CA3AF" }}>Five independent analysts · weighted consensus · sealed on-chain</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {agents.map((a) => (
            <div key={a} style={{ display: "flex", border: "1px solid #1E222A", background: "#12141A", padding: "10px 18px", fontSize: 22, color: "#D1D5DB", borderRadius: 4 }}>
              {a}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
