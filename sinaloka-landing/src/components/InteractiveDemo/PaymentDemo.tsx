import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

const STEPS = [
  { id: 1, admin: "Invoice menunggu pembayaran", parent: "Scan QR untuk bayar", label: "Admin kirim invoice" },
  { id: 2, admin: "Menunggu pembayaran...", parent: "Memproses pembayaran...", label: "Orang tua bayar via QRIS" },
  { id: 3, admin: "Pembayaran diterima ✓", parent: "Pembayaran berhasil ✓", label: "Otomatis tercatat" },
];

export default function PaymentDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const current = STEPS[step];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step indicators */}
      <div className="flex justify-center gap-3 mb-8">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(i)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all",
              i === step ? "bg-accent-600 text-white" : "bg-white text-gray-500 border border-gray-200"
            )}
          >
            <span className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
              i === step ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"
            )}>
              {s.id}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Split view: Admin + Parent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Admin dashboard frame */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
            </div>
            <span className="text-[11px] text-gray-400 ml-2">Dashboard Admin</span>
          </div>
          <div className="p-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pembayaran</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {/* Invoice row */}
                <div className={cn(
                  "flex items-center justify-between rounded-lg border p-3 transition-colors",
                  step === 2 ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
                )}>
                  <div>
                    <div className="text-sm font-medium text-gray-800">Ahmad Fauzi — Kelas 9</div>
                    <div className="text-xs text-gray-400">SPP Maret 2026</div>
                  </div>
                  <span className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-semibold",
                    step === 2
                      ? "bg-green-100 text-green-700"
                      : step === 1
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-orange-100 text-orange-700"
                  )}>
                    {current.admin}
                  </span>
                </div>
                {/* Static rows for context */}
                <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3 opacity-50">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Siti Rahmawati — Kelas 7</div>
                    <div className="text-xs text-gray-400">SPP Maret 2026</div>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-[11px] font-semibold text-green-700">Lunas</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Parent phone frame */}
        <div className="flex justify-center">
          <div className="w-[260px] rounded-[2rem] border-[6px] border-gray-800 bg-white overflow-hidden shadow-lg">
            {/* Phone notch */}
            <div className="bg-gray-800 h-6 flex justify-center">
              <div className="w-20 h-3 bg-gray-700 rounded-b-xl" />
            </div>
            <div className="p-4">
              <div className="text-xs font-semibold text-accent-700 mb-4">Sinaloka — Orang Tua</div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {step === 0 && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-800">Tagihan SPP</div>
                      <div className="rounded-lg border border-gray-200 p-3 text-center">
                        <div className="text-xs text-gray-400 mb-2">Scan QR untuk bayar</div>
                        {/* Fake QR placeholder — fixed pattern to avoid re-render flicker */}
                        <div className="w-28 h-28 mx-auto bg-gray-100 rounded-lg grid grid-cols-5 grid-rows-5 gap-[2px] p-2">
                          {[1,1,0,1,1, 0,1,1,0,1, 1,0,1,0,0, 1,1,0,1,1, 0,1,1,1,0].map((filled, i) => (
                            <div key={i} className={cn(
                              "rounded-[1px]",
                              filled ? "bg-gray-700" : "bg-gray-200"
                            )} />
                          ))}
                        </div>
                        <div className="text-lg font-bold text-gray-900 mt-2">Rp 199.000</div>
                      </div>
                    </div>
                  )}
                  {step === 1 && (
                    <div className="space-y-3 text-center py-6">
                      <div className="w-12 h-12 mx-auto rounded-full bg-yellow-50 flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                          className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full"
                        />
                      </div>
                      <div className="text-sm font-medium text-gray-700">Memproses...</div>
                    </div>
                  )}
                  {step === 2 && (
                    <div className="space-y-3 text-center py-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center"
                      >
                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                      <div className="text-sm font-medium text-green-700">Pembayaran Berhasil!</div>
                      <div className="text-xs text-gray-400">SPP Maret 2026 — Lunas</div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
