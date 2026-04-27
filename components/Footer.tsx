import Link from "next/link";

const links = [
  { href: "/legal/business-info", label: "사업자정보" },
  { href: "/legal/privacy", label: "개인정보처리방침" },
  { href: "/legal/terms", label: "이용약관" },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line px-6 py-8 text-xs leading-relaxed text-muted">
      <nav className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {links.map((link, i) => (
          <span key={link.href} className="flex items-center gap-x-3">
            {i > 0 && (
              <span aria-hidden className="text-line">
                ·
              </span>
            )}
            <Link href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          </span>
        ))}
      </nav>
      <p className="mt-3">© {new Date().getFullYear()} PATZ</p>
    </footer>
  );
}
