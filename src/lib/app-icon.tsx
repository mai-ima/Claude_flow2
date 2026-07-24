import { ImageResponse } from "next/og";

/**
 * PWA 用アプリアイコンを生成する（apple-icon と同じ意匠）。
 * maskable は OS 側で円形などに切り抜かれるため、安全領域を確保して
 * 中央 80% にロゴが収まるよう余白を広くとる。
 */
export function renderAppIcon(size: number, maskable = false) {
  const pad = maskable ? size * 0.1 : 0;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #007aff 0%, #5856d6 100%)",
        }}
      >
        <div
          style={{
            width: size - pad * 2,
            height: size - pad * 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: (size - pad * 2) * 0.62,
            fontWeight: 700,
            fontFamily: "sans-serif",
          }}
        >
          T
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
