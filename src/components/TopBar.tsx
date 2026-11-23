import { Leaf, Upload } from 'lucide-react';

interface TopBarProps {
  onNavigateSection: (section: 'overview' | 'appliances' | 'data') => void;
  onTriggerCsvUpload: () => void;
}

export function TopBar({ onNavigateSection, onTriggerCsvUpload }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-13 md:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-8">
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            onNavigateSection('overview');
          }}
          className="flex items-center gap-2 text-base md:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-md"
        >
          <Leaf className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>친환경 전기 알리미</span>
        </a>

        <nav
          aria-label="주요 섹션 이동"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('overview');
            }}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
          >
            오늘 현황
          </a>
          <a
            href="#appliances"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('appliances');
            }}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
          >
            가전 추천
          </a>
          <a
            href="#data"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('data');
            }}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
          >
            시간별 데이터
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onTriggerCsvUpload}
            className="inline-flex items-center gap-1.5 min-h-[44px] md:min-h-[40px] px-3.5 py-2 text-xs md:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <Upload className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>CSV 교체</span>
          </button>
        </div>
      </div>
    </header>
  );
}
