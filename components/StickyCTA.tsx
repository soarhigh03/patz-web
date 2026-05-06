import { cn } from "@/lib/utils";
import Link from "next/link";

interface StickyCTAProps {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  /** When false, renders inline at the document end instead of fixed-bottom. */
  sticky?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Black pill button used across the reservation flow. Sticky to the viewport
 * bottom on screens 1–4; on screen 5 (the form), pass `sticky={false}` so it
 * sits where the form ends instead.
 */
export function StickyCTA({
  href,
  onClick,
  children,
  sticky = true,
  disabled,
  className,
}: StickyCTAProps) {
  const button = (
    <button
      type={href ? "button" : "submit"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Two-layer drop shadow for a clearly elevated feel: a tight inner
        // shadow defines the edge, a larger soft shadow projects depth.
        // Defaulting Tailwind's shadow-* utilities is too subtle on a black
        // button against a white column.
        "block w-full rounded-full bg-ink py-4 text-center text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-50",
        "shadow-[0_4px_10px_-3px_rgba(0,0,0,0.35),_0_14px_30px_-8px_rgba(0,0,0,0.4)]",
        className,
      )}
    >
      {children}
    </button>
  );

  const content = href ? (
    <Link href={href} aria-disabled={disabled} className="block">
      {button}
    </Link>
  ) : (
    button
  );

  if (!sticky) {
    return <div className="px-6 pb-6 pt-4">{content}</div>;
  }

  return (
    <>
      {/* Spacer so page content isn't hidden behind the fixed bar. */}
      <div aria-hidden className="h-28" />
      <div
        className={cn(
          // Floating bar — bottom inset (`bottom-6`) lifts the button off
          // the viewport edge so it reads as floating, and the soft white
          // gradient keeps content legible as it scrolls behind.
          "safe-bottom pointer-events-none fixed inset-x-0 bottom-6 z-20 mx-auto w-full max-w-mobile px-6",
          "before:pointer-events-none before:absolute before:inset-x-0 before:-top-8 before:bottom-0 before:bg-gradient-to-t before:from-white before:via-white/90 before:to-transparent before:content-['']",
        )}
      >
        <div className="pointer-events-auto relative">{content}</div>
      </div>
    </>
  );
}
