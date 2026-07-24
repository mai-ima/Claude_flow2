"use client";

/**
 * ルートレイアウト自体が失敗したときの最終フォールバック。
 * この段階では Providers も CSS 変数も利用できない前提のため、
 * 依存を持たず素の HTML とインラインスタイルのみで描画する。
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          fontFamily:
            "system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', sans-serif",
          background: "#f5f5f7",
          color: "#1c1c1e",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>
            問題が発生しました
          </h1>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "#6b6b70" }}>
            一時的なエラーの可能性があります。もう一度お試しください。
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "24px",
              minHeight: "44px",
              padding: "0 20px",
              fontSize: "15px",
              fontWeight: 600,
              color: "#fff",
              background: "#007aff",
              border: "none",
              borderRadius: "14px",
              cursor: "pointer",
            }}
          >
            再読み込み
          </button>
        </div>
      </body>
    </html>
  );
}
