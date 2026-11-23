import {
  CarbonGrade,
  CarbonThresholds,
  HourlyElectricityRecord,
  formatHourLabel,
  getCarbonGrade,
  getGradeLabel,
} from '../utils/electricity';

interface HourlyCarbonChartProps {
  data: HourlyElectricityRecord[];
  thresholds: CarbonThresholds;
  currentHour: number;
  selectedHour: number;
  recommendedHours: number[];
  recommendedLabel: string | null;
  onSelectHour: (hour: number) => void;
}

const BAR_COLORS: Record<CarbonGrade, { bar: string; barSelected: string; text: string }> = {
  good: {
    bar: 'bg-emerald-500 hover:bg-emerald-600',
    barSelected: 'bg-emerald-600 ring-2 ring-emerald-900/30',
    text: 'text-emerald-700',
  },
  moderate: {
    bar: 'bg-amber-400 hover:bg-amber-500',
    barSelected: 'bg-amber-500 ring-2 ring-amber-900/30',
    text: 'text-amber-700',
  },
  bad: {
    bar: 'bg-rose-500 hover:bg-rose-600',
    barSelected: 'bg-rose-600 ring-2 ring-rose-900/30',
    text: 'text-rose-700',
  },
};

export function HourlyCarbonChart({
  data,
  thresholds,
  currentHour,
  selectedHour,
  recommendedHours,
  recommendedLabel,
  onSelectHour,
}: HourlyCarbonChartProps) {
  const maxCarbon = Math.max(...data.map((d) => d.carbonGPerKwh), 1);
  const selectedRecord = data.find((d) => d.hour === selectedHour) ?? data[0];
  const selectedGrade = getCarbonGrade(selectedRecord.carbonGPerKwh, thresholds);
  const recommendedSet = new Set(recommendedHours);

  return (
    <section
      aria-labelledby="hourly-chart-heading"
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 md:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-3">
        <div>
          <h2
            id="hourly-chart-heading"
            className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
          >
            24시간 탄소배출 추이
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            막대를 눌러 시간대별 탄소배출·신재생 비중·요금을 확인하세요 (낮을수록 친환경)
          </p>
        </div>

        <div
          aria-label="탄소배출 등급 기준"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-medium"
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" aria-hidden="true" />
            <span>좋음 ≤{thresholds.goodMax}g</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" aria-hidden="true" />
            <span>보통 ≤{thresholds.moderateMax}g</span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" aria-hidden="true" />
            <span>나쁨 &gt;{thresholds.moderateMax}g</span>
          </span>
        </div>
      </div>

      {recommendedLabel && (
        <div className="mt-2.5 flex items-center gap-2 text-xs font-medium text-emerald-800">
          <span className="w-3 h-1 rounded-full bg-emerald-700 inline-block shrink-0" aria-hidden="true" />
          <span>추천 표시 구간: {recommendedLabel}</span>
        </div>
      )}

      <div
        role="group"
        aria-label="0시부터 23시까지 시간대별 탄소배출 막대그래프"
        className="mt-3 pt-1"
        data-testid="carbon-bar-chart"
      >
        <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1 sm:gap-1.5 items-end h-36 sm:h-52 px-0.5">
          {data.map((record) => {
            const grade = getCarbonGrade(record.carbonGPerKwh, thresholds);
            const isCurrent = record.hour === currentHour;
            const isSelected = record.hour === selectedHour;
            const isRecommended = recommendedSet.has(record.hour);
            const heightPct = Math.max(
              14,
              Math.round((record.carbonGPerKwh / maxCarbon) * 100),
            );
            const palette = BAR_COLORS[grade];

            return (
              <div
                key={record.hour}
                className="h-full flex flex-col items-center justify-end"
              >
                <button
                  type="button"
                  onClick={() => onSelectHour(record.hour)}
                  aria-pressed={isSelected}
                  aria-label={`${record.hour}시, 탄소배출 ${Math.round(record.carbonGPerKwh)}g/kWh (${getGradeLabel(grade)}), 신재생 ${record.renewablePct.toFixed(1)}%, 요금 ${Math.round(record.tariffKrwPerKwh)}원${isCurrent ? ', 현재 시각' : ''}${isRecommended ? ', 추천 시간대' : ''}`}
                  className="group w-full h-[calc(100%-20px)] flex flex-col justify-end items-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded-sm"
                >
                  {isRecommended && (
                    <span
                      aria-hidden="true"
                      className="w-full h-1 mb-1 rounded-full bg-emerald-700 shrink-0"
                    />
                  )}
                  <span
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-sm transition-all duration-150 ${
                      isSelected ? palette.barSelected : palette.bar
                    } ${isCurrent ? 'outline-2 outline-offset-1 outline-slate-900' : ''}`}
                  />
                </button>
                <span
                  className={`mt-1.5 text-[10px] leading-none font-mono-tabular select-none ${
                    isCurrent
                      ? 'font-bold text-slate-900 underline decoration-2 underline-offset-2'
                      : isSelected
                        ? 'font-semibold text-slate-800'
                        : 'text-slate-400'
                  }`}
                >
                  {record.hour % 3 === 0 || isCurrent || isSelected
                    ? record.hour
                    : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        data-testid="selected-hour-detail"
        className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-slate-900 font-mono-tabular">
            {formatHourLabel(selectedRecord.hour)}
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className={`font-semibold ${BAR_COLORS[selectedGrade].text}`}>
            {getGradeLabel(selectedGrade)}
          </span>
          {selectedRecord.hour === currentHour && (
            <>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-xs font-medium text-slate-600">기준 시각</span>
            </>
          )}
          {recommendedSet.has(selectedRecord.hour) && (
            <>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-xs font-medium text-emerald-700">가전 추천 포함</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs sm:text-sm text-slate-700 font-mono-tabular">
          <span>
            탄소 <strong className="text-slate-900">{Math.round(selectedRecord.carbonGPerKwh)}g</strong>/kWh
          </span>
          <span>
            신재생 <strong className="text-slate-900">{selectedRecord.renewablePct.toFixed(1)}%</strong>
          </span>
          <span>
            요금 <strong className="text-slate-900">{Math.round(selectedRecord.tariffKrwPerKwh)}원</strong>/kWh
          </span>
        </div>
      </div>
    </section>
  );
}
