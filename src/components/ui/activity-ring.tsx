"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

interface RingTrack {
  /** 0–1 を超える場合は 1+ でオーバー表現（100%超は先端が重なり影を落とす） */
  value: number;
  color: string;
}

/**
 * アクティビティリング（純 SVG）。
 * - リング同色の薄トラック（color-mix）
 * - 明→濃のグラデーションで艶
 * - 100%超で先端の丸キャップが開始位置に重なり、影を落とす（Fitness の象徴的表現）
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
  const uid = useId();
  const center = size / 2;
  const gap = 4;

  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} aria-hidden focusable="false" className="-rotate-90 overflow-visible">
        <defs>
          {tracks.map((t, i) => (
            <linearGradient key={i} id={`${uid}-g${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${t.color} 55%, white)` }} />
              <stop offset="100%" style={{ stopColor: t.color }} />
            </linearGradient>
          ))}
          <filter id={`${uid}-tip`} x="-75%" y="-75%" width="250%" height="250%">
            <feDropShadow dx="0" dy="0" stdDeviation={thickness * 0.28} floodOpacity="0.4" />
          </filter>
        </defs>

        {tracks.map((t, i) => {
          const r = center - thickness / 2 - i * (thickness + gap);
          if (r <= 0) return null;
          const circ = 2 * Math.PI * r;
          // 非有限値(NaN/Infinity)は 0 として扱い、不正な SVG 座標を防ぐ。
          const value = Number.isFinite(t.value) ? Math.max(t.value, 0) : 0;
          const pct = Math.min(value, 1);
          const over = value > 1;
          // 100%超の先端位置（開始＝回転後の真上）。1周分の剰余で重なりを表現。
          const tipAngle = 2 * Math.PI * ((value - 1) % 1);
          const tipX = center + r * Math.cos(tipAngle);
          const tipY = center + r * Math.sin(tipAngle);
          return (
            <g key={i}>
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                strokeWidth={thickness}
                style={{ stroke: `color-mix(in srgb, ${t.color} 16%, transparent)` }}
              />
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={`url(#${uid}-g${i})`}
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - pct)}
                className="[transition:stroke-dashoffset_0.7s_var(--ease-spring)] motion-reduce:transition-none"
              />
              {over && (
                <circle
                  cx={tipX}
                  cy={tipY}
                  r={thickness / 2}
                  filter={`url(#${uid}-tip)`}
                  style={{ fill: t.color }}
                />
              )}
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
