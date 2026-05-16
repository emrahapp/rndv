import { ImageResponse } from "next/og";

// Browser tab favicon — runtime-generated, matches the Logo component
// (green circle with black checkmark, link.com style).
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#00d66f",
          borderRadius: "50%",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="64%"
          height="64%"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0a0a0a"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 11 10 15 18 7" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
