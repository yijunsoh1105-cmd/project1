import { AlertTriangle, CheckCircle2, Clock, MinusCircle, RotateCcw } from 'lucide-react';
import {
  CarbonGrade,
  HourlyElectricityRecord,
  formatHourLabel,
  getCurrentStatusCopy,
} from '../utils/electricity';

interface CurrentStatusBannerProps {
  currentRecord: HourlyElectricityRecord;
  currentGrade: CarbonGrade;
  bestHourRecord: HourlyElectricityRecord;
  currentHour: number;
  realCurrentHour: number;
  isSimulatedHour: boolean;
  dataSourceLabel: string;
  onChangeHour: (hour: number) => void;
  onResetToRealHour: () => void;
}

const GRADE_VISUALS: Record<
  CarbonGrade,
  {
    textClass: string;
    surfaceTint: string;
    Icon: typeof CheckCircle2;
  }
> = {
  good: {
    textClass: 'text-emerald-700',
    surfaceTint: 'bg-emerald-50/70 border-emerald-200',
    Icon: CheckCircle2,
  },
  moderate: {
    textClass: 'text-amber-700',
    surfaceTint: 'bg-amber-50/70 border-amber-200',
    Icon: MinusCircle,
  },
  bad: {
    textClass: 'text-rose-700',
    surfaceTint: 'bg-rose-50/70 border-rose-200',
    Icon: AlertTriangle,
  },
};

export function CurrentStatusBanner({
  currentRecord,
  currentGrade,
  bestHourRecord,
  currentHour,
  realCurrentHour,
  isSimulatedHour,
  dataSourceLabel,
  onChangeHour,
  onResetToRealHour,
}: CurrentStatusBannerProps) {
  const copy = getCurrentStatusCopy(currentRecord, currentGrade, bestHourRecord);
  const visual = GRADE_VISUALS[currentGrade];
  const StatusIcon = visual.Icon;

  return (
    <section
      aria-labelledby="current-status-heading"
      className={`rounded-2xl border p-4 sm:p-5 md:p-6 transition-colors ${visual.surfaceTint}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium min-w-0">
          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap shrink-0">
            {isSimulatedHour ? '선택 시각' : '현재 시각'}
          </span>
          <span aria-hidden="true" className="shrink-0">·</span>
          <span className="font-mono-tabular whitespace-nowrap shrink-0">
            {formatHourLabel(currentHour)}
          </span>
          <span aria-hidden="true" className="hidden sm:inline shrink-0">·</span>
          <span className="hidden sm:inline truncate max-w-[180px]">
            {dataSourceLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <label htmlFor="hour-simulator" className="sr-only">
            기준 시각 선택
          </label>
          <select
            id="hour-simulator"
            value={currentHour}
            onChange={(e) => onChangeHour(Number(e.target.value))}
            className="min-h-[44px] sm:min-h-[38px] px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer tabular-nums"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {formatHourLabel(h)}
                {h === realCurrentHour ? ' (현재)' : ''}
              </option>
            ))}
          </select>

          {isSimulatedHour && (
            <button
              type="button"
              onClick={onResetToRealHour}
              className="inline-flex items-center gap-1 min-h-[44px] sm:min-h-[38px] px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>현재 시각</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2.5 sm:gap-3">
        <StatusIcon
          className={`w-6 h-6 sm:w-7 sm:h-7 mt-0.5 shrink-0 ${visual.textClass}`}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h1
            id="current-status-heading"
            className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 [text-wrap:balance]"
          >
            <span className={visual.textClass}>{copy.headline}</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm md:text-[15px] leading-relaxed text-slate-700">
            {copy.detail}
          </p>
        </div>
      </div>

      <dl className="mt-4 pt-3.5 border-t border-slate-900/10 grid grid-cols-3 gap-3 sm:gap-4">
        <div>
          <dt className="text-xs text-slate-600">탄소배출계수</dt>
          <dd className="mt-0.5 text-lg md:text-xl font-bold text-slate-900 font-mono-tabular">
            {Math.round(currentRecord.carbonGPerKwh)}
            <span className="text-xs font-medium text-slate-600 ml-0.5">g/kWh</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">신재생 비중</dt>
          <dd className="mt-0.5 text-lg md:text-xl font-bold text-slate-900 font-mono-tabular">
            {currentRecord.renewablePct.toFixed(1)}
            <span className="text-xs font-medium text-slate-600 ml-0.5">%</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">전기요금</dt>
          <dd className="mt-0.5 text-lg md:text-xl font-bold text-slate-900 font-mono-tabular">
            {Math.round(currentRecord.tariffKrwPerKwh)}
            <span className="text-xs font-medium text-slate-600 ml-0.5">원/kWh</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
