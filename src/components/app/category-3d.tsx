"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/money";

interface Datum {
  name: string;
  amount: number;
  color: string;
}

/** 立方体の1面。translate(-50%,-50%) で中心合わせしてから面ごとの変換を適用。 */
function Face({
  w,
  h,
  transform,
  color,
  overlay,
}: {
  w: number;
  h: number;
  transform: string;
  color: string;
  overlay?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: w,
        height: h,
        transform: `translate(-50%,-50%) ${transform}`,
        backgroundColor: color,
        backgroundImage: overlay,
        borderRadius: 2,
      }}
    />
  );
}

/** 支出量に応じた高さの立方体バーを、リング上の1点に立てる。 */
function Bar({ color, height, rotY, radius }: { color: string; height: number; rotY: number; radius: number }) {
  const W = 34;
  const D = 34;
  const dark = "linear-gradient(rgba(0,0,0,0.22),rgba(0,0,0,0.22))";
  const light = "linear-gradient(rgba(255,255,255,0.28),rgba(255,255,255,0.28))";
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transformStyle: "preserve-3d",
        // リング上へ移動し、バー中心を高さの半分だけ上げて底面を土台に接地。
        transform: `rotateY(${rotY}deg) translateZ(${radius}px) translateY(${-height / 2}px)`,
      }}
    >
      <Face w={W} h={height} transform={`translateZ(${D / 2}px)`} color={color} />
      <Face w={W} h={height} transform={`rotateY(180deg) translateZ(${D / 2}px)`} color={color} overlay={dark} />
      <Face w={D} h={height} transform={`rotateY(90deg) translateZ(${W / 2}px)`} color={color} overlay={dark} />
      <Face w={D} h={height} transform={`rotateY(-90deg) translateZ(${W / 2}px)`} color={color} overlay={dark} />
      <Face w={W} h={D} transform={`rotateX(90deg) translateZ(${height / 2}px)`} color={color} overlay={light} />
    </div>
  );
}

/**
 * カテゴリ支出の 3D ビュー（α機能・CSS 3D）。ドラッグで回転、
 * 未操作時はゆっくり自動回転（reduced-motion では停止）。
 */
export function Category3D({ data, currency = "JPY" }: { data: Datum[]; currency?: string }) {
  const [angle, setAngle] = useState(24);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const auto = useRef(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      if (auto.current && !drag.current) setAngle((a) => a + 0.22);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d.amount));
  const radius = Math.max(84, Math.round((n * 38) / (2 * Math.PI)) + 40);

  function onDown(e: React.PointerEvent) {
    auto.current = false;
    drag.current = { x: e.clientX, start: angle };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setAngle(drag.current.start + (e.clientX - drag.current.x) * 0.5);
  }
  function onUp() {
    drag.current = null;
    auto.current = true;
  }

  return (
    <div>
      <div
        className="relative mx-auto h-[260px] w-full max-w-sm cursor-grab touch-none select-none active:cursor-grabbing"
        style={{ perspective: "900px" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `translateY(40px) rotateX(-24deg) rotateY(${angle}deg)`,
          }}
        >
          {/* 土台の円盤 */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: radius * 2 + 60,
              height: radius * 2 + 60,
              transform: "translate(-50%,-50%) rotateX(90deg)",
              borderRadius: "9999px",
              background: "radial-gradient(closest-side, color-mix(in srgb, var(--accent) 12%, transparent), transparent)",
              border: "1px solid var(--border)",
            }}
          />
          {data.map((d, i) => (
            <Bar
              key={d.name}
              color={d.color}
              height={26 + Math.round((d.amount / max) * 130)}
              rotY={(i * 360) / n}
              radius={radius}
            />
          ))}
        </div>
      </div>
      <p className="mt-1 text-center text-[11px] text-text-tertiary">ドラッグで回転（α機能）</p>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-[12px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: d.color }} />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="tabular-nums text-text-tertiary">{formatMoney(d.amount, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
