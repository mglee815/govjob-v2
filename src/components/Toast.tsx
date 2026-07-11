"use client";

import { useEffect } from "react";

interface Props {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 2500 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bg = type === "success" ? "bg-green-700" : "bg-red-600";

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${bg} text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-fade-in`}
      role="alert"
    >
      {message}
    </div>
  );
}
