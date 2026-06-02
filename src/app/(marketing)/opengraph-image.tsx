import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo";

export const runtime = "edge";
export const alt = `${SITE.name} — ${SITE.tagline}`;
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
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #007aff 0%, #5856d6 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
              fontWeight: 700,
            }}
          >
            T
          </div>
          <div style={{ fontSize: 40, fontWeight: 600, opacity: 0.95 }}>{SITE.name}</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 68, fontWeight: 800, lineHeight: 1.1 }}>
          お金の全体像を、
          <br />
          美しく積み上げる。
        </div>
        <div style={{ marginTop: 28, fontSize: 30, opacity: 0.9 }}>
          家計簿 + サブスク管理アプリ
        </div>
      </div>
    ),
    { ...size },
  );
}
