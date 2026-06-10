import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
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
          background: "#11100e",
          border: "1px solid #b89b45",
          boxSizing: "border-box",
          color: "#d8c38c",
          fontFamily: "Georgia, serif",
          fontSize: 18,
          lineHeight: 1,
          fontWeight: 500,
        }}
      >
        M
      </div>
    ),
    size
  );
}
