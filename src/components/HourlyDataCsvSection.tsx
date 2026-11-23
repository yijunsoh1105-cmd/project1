import { Download, RotateCcw, Upload } from 'lucide-react';
import {
  CarbonGrade,
  CarbonThresholds,
  HourlyElectricityRecord,
  formatHourLabel,
  getCarbonGrade,
  getGradeLabel,
} from '../utils/electricity';

interface HourlyDataCsvSectionProps {
  data: HourlyElectricityRecord[];
  thresholds: CarbonThresholds;
  currentHour: number;
  isCustomCsv: boolean;
  dataSourceLabel: string;
  csvError: string | null;
  onOpenFilePicker: () => void;
  onDownloadCsv: () => void;
  onResetCsv: () => void;
  onSelectHour: (hour: number) => void;
}

const GRADE_TEXT_CLASS: Record<CarbonGrade, string> = {
  good: 'text-emerald-700 font-semibold',
  moderate: 'text-amber-700 font-semibold',
  bad: 'text-rose-700 font-semibold',
};

export function HourlyDataCsvSection({
  data,
  thresholds,
  currentHour,
  isCustomCsv,
  dataSourceLabel,
  csvError,
  onOpenFilePicker,
  onDownloadCsv,
  onResetCsv,
  onSelectHour,
}: HourlyDataCsvSectionProps) {

  return (
    <section
      id="data"
      aria-labelledby="data-section-heading"
      className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2
            id="data-section-heading"
            className="text-lg font-bold text-slate-900 tracking-tight"
          >
            시간대별 전력 데이터 &amp; CSV 관리
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
            현재 적용 중: <strong className="text-slate-800">{dataSourceLabel}</strong> · 프로젝트의{' '}
            <code className="font-mono-tabular text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              public/data/hourly_electricity.csv
            </code>{' '}
            파일을 교체하거나, 아래 버튼으로 새 CSV를 바로 불러올 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenFilePicker}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <Upload className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>CSV 파일 업로드</span>
          </button>

          <button
            type="button"
            onClick={onDownloadCsv}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>CSV 다운로드</span>
          </button>

          {isCustomCsv && (
            <button
              type="button"
              onClick={onResetCsv}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>기본 CSV 복원</span>
            </button>
          )}
        </div>
      </div>

      {csvError && (
        <div
          role="alert"
          className="mt-4 p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-800"
        >
          {csvError}
        </div>
      )}

      <div className="mt-4 text-xs text-slate-500 leading-relaxed">
        CSV 열 형식:{' '}
        <code className="font-mono-tabular text-slate-700 break-all">
          hour,carbon_g_per_kwh,renewable_pct,tariff_krw_per_kwh
        </code>{' '}
        (0~23시 총 24행)
      </div>

      <div className="mt-4 overflow-x-auto border-t border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
              <th scope="col" className="py-3 pr-2 sm:pr-3 whitespace-nowrap">시간</th>
              <th scope="col" className="py-3 px-2 sm:px-3 whitespace-nowrap">등급</th>
              <th scope="col" className="py-3 px-2 sm:px-3 text-right whitespace-nowrap">
                탄소<span className="hidden sm:inline">배출 (g/kWh)</span>
              </th>
              <th scope="col" className="py-3 px-2 sm:px-3 text-right whitespace-nowrap">
                신재생<span className="hidden sm:inline"> (%)</span>
              </th>
              <th scope="col" className="py-3 pl-2 sm:pl-3 text-right whitespace-nowrap">
                요금<span className="hidden sm:inline"> (원/kWh)</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {data.map((row) => {
              const grade = getCarbonGrade(row.carbonGPerKwh, thresholds);
              const isCurrent = row.hour === currentHour;
              return (
                <tr
                  key={row.hour}
                  onClick={() => onSelectHour(row.hour)}
                  className={`transition-colors cursor-pointer ${
                    isCurrent ? 'bg-slate-100/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2 pr-2 sm:pr-3 font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectHour(row.hour);
                      }}
                      aria-label={`${formatHourLabel(row.hour)} 그래프에서 자세히 보기`}
                      className="inline-flex items-center min-h-[36px] text-left hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded cursor-pointer"
                    >
                      <span>{formatHourLabel(row.hour)}</span>
                      {isCurrent && (
                        <span className="ml-1 text-[11px] sm:text-xs font-sans font-medium text-emerald-700">
                          기준
                        </span>
                      )}
                    </button>
                  </td>
                  <td className={`py-2 px-2 sm:px-3 whitespace-nowrap ${GRADE_TEXT_CLASS[grade]}`}>
                    {getGradeLabel(grade)}
                  </td>
                  <td className="py-2 px-2 sm:px-3 text-right font-mono-tabular text-slate-800 whitespace-nowrap">
                    {Math.round(row.carbonGPerKwh)}g
                  </td>
                  <td className="py-2 px-2 sm:px-3 text-right font-mono-tabular text-slate-700 whitespace-nowrap">
                    {row.renewablePct.toFixed(1)}%
                  </td>
                  <td className="py-2 pl-2 sm:pl-3 text-right font-mono-tabular text-slate-800 whitespace-nowrap">
                    {Math.round(row.tariffKrwPerKwh).toLocaleString('ko-KR')}원
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
