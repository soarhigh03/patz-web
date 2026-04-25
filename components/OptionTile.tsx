import Link from "next/link";

/**
 * Single tile in the option-select grid (Image #2). Light-gray rounded square
 * with the service label centered.
 */
export function OptionTile({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex aspect-[1/1.05] items-center justify-center rounded-2xl bg-neutral-200 text-base font-medium text-ink transition hover:bg-neutral-300 active:scale-[0.99]"
    >
      {label}
    </Link>
  );
}
