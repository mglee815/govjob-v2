"use client";

import { useRef, useState } from "react";

interface Props {
  min: number;
  max: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}

const DAY_MS = 86_400_000;

function fmtDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function DateRangeSlider({ min, max, start, end, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  const range = max - min || 1;
  const leftPct  = ((start - min) / range) * 100;
  const rightPct = ((end   - min) / range) * 100;

  function snapToDay(val: number) {
    return Math.round(val / DAY_MS) * DAY_MS;
  }

  function valueFromClientX(clientX: number): number {
    const rect = trackRef.current!.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snapToDay(min + pct * range);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const val = valueFromClientX(e.clientX);
    const toStart = Math.abs(val - start);
    const toEnd   = Math.abs(val - end);
    const thumb   = toStart <= toEnd ? "start" : "end";
    setDragging(thumb);
    if (thumb === "start") onChange(Math.min(val, end), end);
    else                   onChange(start, Math.max(val, start));
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const val = valueFromClientX(e.clientX);
    if (dragging === "start") onChange(Math.min(val, end), end);
    else                      onChange(start, Math.max(val, start));
  }

  function onPointerUp() {
    setDragging(null);
  }

  return (
    <div className="select-none">
      <div className="flex justify-between text-xs font-medium text-indigo-700 mb-2">
        <span>{fmtDate(start)}</span>
        <span>{fmtDate(end)}</span>
      </div>

      {/* 트랙 */}
      <div
        ref={trackRef}
        className="relative h-6 flex items-center cursor-pointer"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* 배경 */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200" />

        {/* 선택 구간 */}
        <div
          className="absolute h-1.5 rounded-full bg-indigo-400"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />

        {/* Start thumb */}
        <div
          className={`absolute w-5 h-5 -translate-x-1/2 rounded-full bg-white border-2 shadow transition-shadow ${
            dragging === "start" ? "border-indigo-700 shadow-md" : "border-indigo-500"
          }`}
          style={{ left: `${leftPct}%` }}
        />

        {/* End thumb */}
        <div
          className={`absolute w-5 h-5 -translate-x-1/2 rounded-full bg-white border-2 shadow transition-shadow ${
            dragging === "end" ? "border-indigo-700 shadow-md" : "border-indigo-500"
          }`}
          style={{ left: `${rightPct}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{fmtDate(min)}</span>
        <span>{fmtDate(max)}</span>
      </div>
    </div>
  );
}
