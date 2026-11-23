import { BarChart3, FileSpreadsheet, PlugZap } from 'lucide-react';

export type MobileTab = 'overview' | 'appliances' | 'data';

interface BottomTabBarProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
}

const TABS: readonly {
  id: MobileTab;
  label: string;
  Icon: typeof BarChart3;
}[] = [
  { id: 'overview', label: '오늘 현황', Icon: BarChart3 },
  { id: 'appliances', label: '가전 추천', Icon: PlugZap },
  { id: 'data', label: '데이터·CSV', Icon: FileSpreadsheet },
];

export function BottomTabBar({ activeTab, onSelectTab }: BottomTabBarProps) {
  return (
    <nav
      aria-label="모바일 하단 탐색"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
    >
      <div className="grid grid-cols-3 h-[60px]">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center min-h-[44px] text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 ${
                isActive
                  ? 'text-emerald-700 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-6 right-6 h-0.5 bg-emerald-600 rounded-b"
                />
              )}
              <Icon className="w-5 h-5 mb-0.5 shrink-0" aria-hidden="true" />
              <span className="tracking-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
