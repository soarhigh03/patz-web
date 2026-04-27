import { Footer } from "@/components/Footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-mobile flex-col bg-white">
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
