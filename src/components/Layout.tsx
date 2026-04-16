import type { ReactNode } from "react";

export type LifeTab = "home" | "checks" | "summary" | "settings";

const tabs: { id: LifeTab; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "checks", label: "Dia", icon: "✅" },
  { id: "summary", label: "Resumo", icon: "📊" },
  { id: "settings", label: "Config", icon: "⚙️" },
];

export function Layout({
  tab,
  onTab,
  children,
}: {
  tab: LifeTab;
  onTab: (t: LifeTab) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0c0a14] text-[#ede9f7]">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-4">{children}</main>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1f1b2e] bg-[#13101e]/95 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-lg justify-around">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={`flex min-h-[52px] min-w-[72px] flex-col items-center justify-center gap-0.5 px-3 py-2 text-[10px] font-bold ${
                tab === t.id ? "text-[#a78bfa]" : "text-[#6b6280]"
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
