import {
  ArrowRight,
  Car,
  ChevronDown,
  Clock,
  Disc,
  Droplets,
  Sparkles,
  Wind,
} from 'lucide-react';
import { useState } from 'react';
import {
  APPLIANCES,
  ApplianceRecommendation,
  formatCarbonAmount,
  formatHourLabel,
  formatKrw,
  getGradeLabel,
} from '../utils/electricity';

interface ApplianceRecommenderProps {
  selectedApplianceId: string;
  usualStartHour: number;
  currentHour: number;
  recommendation: ApplianceRecommendation;
  onSelectAppliance: (id: string) => void;
  onChangeUsualStartHour: (hour: number) => void;
  onInspectWindowOnChart: (startHour: number) => void;
}

const APPLIANCE_ICONS: Record<string, typeof Droplets> = {
  washer: Droplets,
  dryer: Wind,
  dishwasher: Sparkles,
  'ev-charger': Car,
  'robot-vacuum': Disc,
};

function formatSignedKrw(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded > 0) return `${rounded.toLocaleString('ko-KR')}원 절감`;
  if (rounded < 0) return `${Math.abs(rounded).toLocaleString('ko-KR')}원 추가`;
  return '0원 (동일)';
}

function formatFormulaNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatFormulaKrw(amount: number): string {
  const rounded = Math.round(amount * 10) / 10;
  const formatted = Math.abs(rounded).toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  if (rounded < 0) return `-${formatted}원`;
  return `${formatted}원`;
}

export function ApplianceRecommender({
  selectedApplianceId,
  usualStartHour,
  currentHour,
  recommendation,
  onSelectAppliance,
  onChangeUsualStartHour,
  onInspectWindowOnChart,
}: ApplianceRecommenderProps) {
  const [showFormula, setShowFormula] = useState(false);

  const {
    appliance,
    bestCarbonWindow,
    usualWindow,
    carbonSavedOnceG,
    carbonSavedMonthlyG,
    carbonSavedPct,
    costSavedOnceKrw,
    costSavedMonthlyKrw,
    topWindows,
  } = recommendation;

  const isAlreadyOptimal =
    bestCarbonWindow.startHour === usualWindow.startHour || carbonSavedOnceG < 0.5;

  return (
    <section
      id="appliances"
      aria-labelledby="appliance-heading"
      className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6"
    >
      <div>
        <h2
          id="appliance-heading"
          className="text-lg font-bold text-slate-900 tracking-tight"
        >
          가전별 최적 사용 시간 추천
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          가전과 원래 쓰던 시간을 고르면 연속 사용 평균 배출계수가 가장 낮은 시간대를 찾아드려요
        </p>
      </div>

      {/* 1. Appliance Selection */}
      <div
        role="radiogroup"
        aria-label="가전제품 선택"
        className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2"
      >
        {APPLIANCES.map((item) => {
          const Icon = APPLIANCE_ICONS[item.id] ?? Droplets;
          const isSelected = item.id === selectedApplianceId;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectAppliance(item.id)}
              className={`w-full min-h-[50px] px-3.5 py-2 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/70 text-slate-900'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono-tabular truncate">
                    {item.powerKw}kW · {item.durationLabel}
                  </div>
                </div>
              </div>

              <span className="text-xs font-mono-tabular font-semibold text-slate-600 shrink-0">
                {Math.round(item.powerKw * item.durationHours * 100) / 100}kWh
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Usual Start Hour Selector */}
      <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
        <label
          htmlFor="usual-hour-select"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 whitespace-nowrap shrink-0"
        >
          <Clock className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          <span>원래 쓰던 시간</span>
        </label>

        <div className="flex items-center gap-2 shrink-0">
          <select
            id="usual-hour-select"
            value={usualStartHour}
            onChange={(e) => onChangeUsualStartHour(Number(e.target.value))}
            className="min-h-[44px] px-3 py-1.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer font-mono-tabular"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {formatHourLabel(h)} 시작
                {h === currentHour ? ' (현재)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Recommendation & Big Savings Summary */}
      <div
        data-testid="appliance-recommendation-summary"
        className="mt-4 pt-4 border-t border-slate-200"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold text-emerald-700">
            {appliance.name} 친환경 추천 시간
          </span>
          <span className="text-xs text-slate-500 font-mono-tabular">
            연속 {appliance.durationLabel} · 총 {bestCarbonWindow.totalKwh}kWh
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-2xl font-bold text-slate-900 font-mono-tabular">
            {bestCarbonWindow.rangeLabel}
          </div>
          <div className="text-xs font-medium text-slate-600">
            평균 {Math.round(bestCarbonWindow.avgCarbonGPerKwh)}g/kWh ·{' '}
            <span
              className={`font-semibold ${
                bestCarbonWindow.grade === 'good'
                  ? 'text-emerald-700'
                  : bestCarbonWindow.grade === 'moderate'
                    ? 'text-amber-700'
                    : 'text-rose-700'
              }`}
            >
              {getGradeLabel(bestCarbonWindow.grade)}
            </span>
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-700 leading-relaxed">
          {isAlreadyOptimal ? (
            <span>
              원래 쓰시던{' '}
              <strong className="text-slate-900 font-mono-tabular">
                {usualWindow.rangeLabel}
              </strong>
              이 이미 가장 탄소배출이 적은 시간대예요.
            </span>
          ) : (
            <span>
              원래 시간({usualWindow.rangeLabel})에서{' '}
              <strong className="text-slate-900 font-mono-tabular">
                {bestCarbonWindow.rangeLabel}
              </strong>
              으로 옮기면 탄소배출을{' '}
              <strong className="text-emerald-700 font-mono-tabular whitespace-nowrap">
                {Math.round(carbonSavedPct)}%
              </strong>{' '}
              줄일 수 있어요.
            </span>
          )}
        </p>

        {/* Big Prominent 1-Time & Monthly (30x) Savings */}
        <div
          data-testid="savings-highlight"
          className="mt-4 rounded-xl bg-emerald-50/70 border border-emerald-200 p-4"
        >
          <div className="grid grid-cols-2 divide-x divide-emerald-200">
            <div className="pr-3">
              <div className="text-xs font-medium text-slate-600">
                1회 이동 절감
              </div>
              <div className="mt-1 text-2xl sm:text-3xl font-bold text-emerald-700 font-mono-tabular leading-tight">
                {formatCarbonAmount(carbonSavedOnceG)}
              </div>
              <div className="mt-1 text-xs sm:text-sm font-semibold text-slate-700 font-mono-tabular">
                요금 {formatSignedKrw(costSavedOnceKrw)}
              </div>
            </div>

            <div className="pl-4">
              <div className="text-xs font-medium text-slate-600">
                한 달(30회) 절감
              </div>
              <div className="mt-1 text-2xl sm:text-3xl font-bold text-emerald-800 font-mono-tabular leading-tight">
                {formatCarbonAmount(carbonSavedMonthlyG)}
              </div>
              <div className="mt-1 text-xs sm:text-sm font-semibold text-slate-700 font-mono-tabular">
                요금 {formatSignedKrw(costSavedMonthlyKrw)}
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-expanded={showFormula}
            onClick={() => setShowFormula((prev) => !prev)}
            className="mt-3 pt-2.5 border-t border-emerald-200/80 w-full min-h-[44px] flex items-center justify-between text-xs font-semibold text-emerald-900 hover:text-emerald-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
          >
            <span>계산 방법 보기</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-150 ${
                showFormula ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {showFormula && (
            <div
              data-testid="savings-formula-panel"
              className="mt-2.5 pt-2.5 border-t border-emerald-200/70 text-xs text-slate-700 space-y-2 leading-relaxed"
            >
              <div>
                <div className="font-semibold text-slate-900">
                  탄소 절감량 계산식
                </div>
                <div className="text-slate-600">
                  소비전력(kW) × 사용시간(h) × (원래 평균 배출계수 − 추천 평균 배출계수)
                </div>
                <div className="mt-0.5 font-mono-tabular text-slate-900">
                  {appliance.powerKw}kW × {appliance.durationHours}h × (
                  {formatFormulaNumber(usualWindow.avgCarbonGPerKwh)} −{' '}
                  {formatFormulaNumber(bestCarbonWindow.avgCarbonGPerKwh)})g/kWh ={' '}
                  <strong>
                    {formatFormulaNumber(carbonSavedOnceG)}g
                  </strong>
                </div>
                <div className="font-mono-tabular text-slate-700">
                  한 달(30회): {formatFormulaNumber(carbonSavedOnceG)}g × 30 ={' '}
                  <strong>{formatCarbonAmount(carbonSavedMonthlyG)}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60">
                <div className="font-semibold text-slate-900">
                  전기요금 절감 계산식
                </div>
                <div className="text-slate-600">
                  소비전력(kW) × 사용시간(h) × (원래 평균 요금 − 추천 평균 요금)
                </div>
                <div className="mt-0.5 font-mono-tabular text-slate-900">
                  {appliance.powerKw}kW × {appliance.durationHours}h × (
                  {formatFormulaNumber(usualWindow.avgTariffKrwPerKwh)} −{' '}
                  {formatFormulaNumber(bestCarbonWindow.avgTariffKrwPerKwh)})원/kWh ={' '}
                  <strong>{formatFormulaKrw(costSavedOnceKrw)}</strong>
                </div>
                <div className="font-mono-tabular text-slate-700">
                  한 달(30회): {formatFormulaKrw(costSavedOnceKrw)} × 30 ={' '}
                  <strong>{formatFormulaKrw(costSavedMonthlyKrw)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Usual vs Recommended Window Breakdown */}
        <div className="mt-4 grid grid-cols-2 divide-x divide-slate-200 border-y border-slate-200 py-3">
          <div className="pr-3">
            <div className="text-xs text-slate-500 font-mono-tabular">
              원래 ({usualWindow.rangeLabel})
            </div>
            <div className="mt-1 text-base font-bold text-slate-900 font-mono-tabular">
              평균 {Math.round(usualWindow.avgCarbonGPerKwh)}g/kWh
            </div>
            <div className="text-xs text-slate-600 font-mono-tabular">
              총 {formatCarbonAmount(usualWindow.totalCarbonG)} ·{' '}
              {formatKrw(usualWindow.totalCostKrw)}
            </div>
          </div>

          <div className="pl-4">
            <div className="text-xs text-emerald-700 font-medium font-mono-tabular">
              추천 ({bestCarbonWindow.rangeLabel})
            </div>
            <div className="mt-1 text-base font-bold text-emerald-700 font-mono-tabular">
              평균 {Math.round(bestCarbonWindow.avgCarbonGPerKwh)}g/kWh
            </div>
            <div className="text-xs text-slate-600 font-mono-tabular">
              총 {formatCarbonAmount(bestCarbonWindow.totalCarbonG)} ·{' '}
              {formatKrw(bestCarbonWindow.totalCostKrw)}
            </div>
          </div>
        </div>

        {/* Top 3 Green Windows */}
        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-700 mb-1.5">
            평균 배출계수 최저 Top 3
          </div>
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {topWindows.map((win, idx) => (
              <button
                key={win.startHour}
                type="button"
                onClick={() => onInspectWindowOnChart(win.startHour)}
                className="w-full min-h-[44px] py-2 px-1 flex items-center justify-between gap-2 text-left hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-mono-tabular font-bold text-slate-400 w-4">
                    {idx + 1}.
                  </span>
                  <span className="text-sm font-semibold text-slate-900 font-mono-tabular">
                    {win.rangeLabel}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono-tabular text-slate-600 shrink-0">
                  <span className="text-emerald-700 font-semibold">
                    {Math.round(win.avgCarbonGPerKwh)}g/kWh
                  </span>
                  <span>{formatKrw(win.totalCostKrw)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onInspectWindowOnChart(bestCarbonWindow.startHour)}
          className="mt-4 w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          <span>24시간 그래프에서 추천 구간 보기</span>
          <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
