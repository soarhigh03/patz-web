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
        "block w-full rounded-full bg-ink py-4 text-center text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-50",
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
      <div aria-hidden className="h-24" />
      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 mx-auto w-full max-w-mobile bg-gradient-to-t from-white via-white to-transparent px-6 pb-4 pt-6">
        <div className="pointer-events-auto">{content}</div>
      </div>
    </>
  );
}
