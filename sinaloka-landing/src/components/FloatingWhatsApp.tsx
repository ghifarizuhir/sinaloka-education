import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WhatsAppIcon } from "./shared/WhatsAppIcon";
import { WHATSAPP_URL } from "../lib/constants";

export function FloatingWhatsApp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent-600 hover:bg-accent-700 flex items-center justify-center text-white shadow-lg transition-colors"
          aria-label="Chat via WhatsApp"
        >
          <WhatsAppIcon className="w-7 h-7" />
        </motion.a>
      )}
    </AnimatePresence>
  );
}
