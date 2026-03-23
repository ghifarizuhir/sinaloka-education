import { FOOTER_LINKS, SOCIAL_LINKS } from "../lib/constants";
import { SinalokaLogo } from "./shared/SinalokaLogo";

export function Footer() {
  const columns = [
    { title: "Produk", links: FOOTER_LINKS.produk },
    { title: "Kontak", links: FOOTER_LINKS.kontak },
  ];

  return (
    <footer className="bg-[#FAFAFA] border-t border-[#E5E5E5] py-16">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-10 md:gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <SinalokaLogo size={28} />
              <span className="text-xl font-bold text-[#111]">Sinaloka</span>
            </div>
            <p className="mt-3 text-sm text-[#999] leading-relaxed max-w-xs">
              Platform manajemen bimbingan belajar.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-4">
                {col.title}
              </p>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[#666] hover:text-[#111] transition-colors"
                      {...(link.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-[#E5E5E5] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#BBB]">
            &copy; {new Date().getFullYear()} Sinaloka. Hak cipta dilindungi.
          </p>
          <div className="flex items-center gap-6 text-xs text-[#BBB]">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-[#666] transition-colors"
                {...("external" in link && link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
