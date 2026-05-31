import { cn } from "@/lib/cn";

interface RingTrack {
  /** 0–1 を超える場合は 1+ でオーバー表現 */
  value: number;
  color: string;
}

/**
 * Apple フィットネス風アクティビティリング（純 SVG）。
 * コストタイム等で「稼いだ時間 vs 消費した時間」を多層リングで描画。
 */
export function ActivityRing({
  tracks,
  size = 160,
  thickness = 14,
  className,
  children,
}: {
  tracks: RingTrack[];
  size?: number;
  thickness?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const center = size / 2;
  const gap = 4;

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {tracks.map((t, i) => {
          const r = center - thickness / 2 - i * (thickness + gap);
          if (r <= 0) return null;
          const circ = 2 * Math.PI * r;
          const pct = Math.min(Math.max(t.value, 0), 1);
          return (
            <g key={i}>
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke="var(--color-surface-2)"
                strokeWidth={thickness}
                opacity={0.55}
              />
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={t.color}
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - pct)}
                style={{ transition: "stroke-dashoffset 0.7s var(--ease-spring)" }}
              />
            </g>
          );
        })}
      </svg>
      {children && (
        <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
      )}
    </div>
  );
}
