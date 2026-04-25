"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`${label} 복사`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — silently no-op */
        }
      }}
      className="inline-flex h-6 w-6 items-center justify-center text-muted hover:text-ink"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}
