import { useState } from "react";
import { CreditCard, LayoutDashboard, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Reveal } from "../shared/Reveal";
import { cn } from "../../lib/utils";
import PaymentDemo from "./PaymentDemo";
import DashboardDemo from "./DashboardDemo";
import ParentPortalDemo from "./ParentPortalDemo";

const TABS = [
  { id: "payment", label: "Pembayaran QRIS", icon: CreditCard, component: PaymentDemo },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, component: DashboardDemo },
  { id: "parent", label: "Portal Orang Tua", icon: Smartphone, component: ParentPortalDemo },
] as const;

export default function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState<string>("payment");

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component ?? PaymentDemo;

  return (
    <section id="demo" className="py-20 px-4 bg-[#FAFAFA]">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-accent-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent-700 mb-4">
              Lihat Langsung
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Bukan janji — ini yang bisa Sinaloka lakukan.
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Klik tab di bawah untuk lihat bagaimana Sinaloka bekerja.
            </p>
          </div>
        </Reveal>

        {/* Tab switcher */}
        <Reveal delay={0.1}>
          <div className="flex justify-center mb-10">
            <div className="inline-flex rounded-xl bg-white border border-gray-200 p-1.5 shadow-sm">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-accent-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
