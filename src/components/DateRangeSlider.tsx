"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  min: number;   // timestamp ms
  max: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}

function fmtDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function DateRangeSlider({ min, max, start, end, onChange }: Props) {
  const rangeRef = useRef<HTMLDivElement>(null);

  const toPercent = (val: number) =>
    max === min ? 0 : ((val - min) / (max - min)) * 100;

  const clamp = (val: number) => Math.max(min, Math.min(max, val));

  function handleStartChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = clamp(Number(e.target.value));
    onChange(Math.min(val, end), end);
  }

  function handleEndChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = clamp(Number(e.target.value));
    onChange(start, Math.max(val, start));
  }

  const leftPct  = toPercent(start);
  const rightPct = toPercent(end);

  return (
    <div className="px-1">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{fmtDate(start)}</span>
        <span>{fmtDate(end)}</span>
      </div>

      <div ref={rangeRef} className="relative h-5 flex items-center">
        {/* 트랙 배경 */}
        <div className="absolute w-full h-1.5 rounded-full bg-gray-200" />

        {/* 선택 구간 강조 */}
        <div
          className="absolute h-1.5 rounded-full bg-indigo-400"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />

        {/* Start thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={86400000} // 1일
          value={start}
          onChange={handleStartChange}
          className="absolute w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: leftPct > 90 ? 5 : 3 }}
        />

        {/* End thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={86400000}
          value={end}
          onChange={handleEndChange}
          className="absolute w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: 4 }}
        />

        {/* 시각적 thumb: start */}
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow pointer-events-none"
          style={{ left: `calc(${leftPct}% - 8px)`, zIndex: 6 }}
        />
        {/* 시각적 thumb: end */}
        <div
          className="absolute w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow pointer-events-none"
          style={{ left: `calc(${rightPct}% - 8px)`, zIndex: 6 }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{fmtDate(min)}</span>
        <span>{fmtDate(max)}</span>
      </div>
    </div>
  );
}
