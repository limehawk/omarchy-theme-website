import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0f",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              fontWeight: 700,
              color: "#e4e4e7",
              letterSpacing: "-0.02em",
            }}
          >
            omarchy themes
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#71717a",
            }}
          >
            Browse and install terminal color schemes for Omarchy
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "24px",
            }}
          >
            {["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#a855f7", "#ec4899"].map(
              (color) => (
                <div
                  key={color}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: color,
                  }}
                />
              )
            )}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
