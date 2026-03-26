import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { WhatsAppIcon } from "./shared/WhatsAppIcon";
import { SinalokaLogo } from "./shared/SinalokaLogo";
import { WHATSAPP_URL, NAV_LINKS } from "../lib/constants";
import { cn } from "../lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/85 backdrop-blur-md border-b border-[#E5E5E5]"
          : "bg-transparent"
      )}
    >
      <nav aria-label="Navigasi utama">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <a
          href="#"
          className={cn(
            "flex items-center gap-2.5 text-xl font-bold transition-colors duration-300",
            scrolled ? "text-[#111]" : "text-white"
          )}
        >
          <SinalokaLogo size={28} />
          Sinaloka
        </a>

        <div
          className={cn(
            "hidden md:flex items-center gap-8 text-sm font-medium transition-colors duration-300",
            scrolled ? "text-[#666]" : "text-accent-200/70"
          )}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "transition-colors",
                scrolled
                  ? "hover:text-accent-600"
                  : "hover:text-white"
              )}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors",
              scrolled
                ? "bg-accent-600 hover:bg-accent-700 text-white"
                : "bg-accent-500 hover:bg-accent-400 text-accent-950"
            )}
          >
            <WhatsAppIcon className="w-4 h-4" />
            Hubungi Kami
          </a>
        </div>

        <button
          className={cn(
            "md:hidden p-2 transition-colors duration-300",
            scrolled ? "text-[#111]" : "text-white"
          )}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/98 backdrop-blur-md border-b border-[#E5E5E5] overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 space-y-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-sm font-medium text-[#333] py-3 border-b border-[#F0F0F0]"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-accent-600 text-white font-semibold text-sm px-5 py-3 rounded-lg mt-4"
                onClick={() => setMobileOpen(false)}
              >
                <WhatsAppIcon className="w-4 h-4" />
                Hubungi via WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </nav>
    </header>
  );
}
