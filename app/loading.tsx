/**
 * Root loading boundary. Renders instantly during route transitions while the
 * server component for the new page does its data fetching, so the user sees
 * something immediately instead of a frozen screen.
 *
 * Per-route loading.tsx files (e.g. app/shops/[handle]/loading.tsx) can
 * override with skeletons that mirror the actual layout shape.
 */
export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <span
        aria-label="로딩 중"
        className="block h-6 w-6 animate-spin rounded-full border-2 border-line border-t-ink"
      />
    </div>
  );
}
