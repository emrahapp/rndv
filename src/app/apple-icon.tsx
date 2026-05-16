import { ImageResponse } from "next/og";

// iOS / iPadOS home-screen + share-sheet icon. 180×180 is Apple's preferred
// touch-icon size. Same visual as the favicon, bigger canvas.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          // iOS clips to rounded square automatically, so a circle works fine
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
