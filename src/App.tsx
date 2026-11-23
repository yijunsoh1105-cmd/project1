import { ArrowRight } from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ApplianceRecommender } from './components/ApplianceRecommender';
import { BottomTabBar, MobileTab } from './components/BottomTabBar';
import { CurrentStatusBanner } from './components/CurrentStatusBanner';
import { HourlyCarbonChart } from './components/HourlyCarbonChart';
import { HourlyDataCsvSection } from './components/HourlyDataCsvSection';
import { TopBar } from './components/TopBar';
import {
  APPLIANCES,
  DEFAULT_ELECTRICITY_CSV,
  HourlyElectricityRecord,
  computeCarbonThresholds,
  getCarbonGrade,
  parseElectricityCsv,
  recommendAppliance,
  serializeElectricityCsv,
} from './utils/electricity';

const STORAGE_CSV_KEY = 'eco_electricity_custom_csv_v1';
const STORAGE_NAME_KEY = 'eco_electricity_custom_name_v1';

function getInitialData(): HourlyElectricityRecord[] {
  const parsed = parseElectricityCsv(DEFAULT_ELECTRICITY_CSV);
  if (parsed.ok) return parsed.data;
  return [];
}

export default function App() {
  const [realCurrentHour, setRealCurrentHour] = useState<number>(() =>
    new Date().getHours(),
  );

  const [data, setData] = useState<HourlyElectricityRecord[]>(() => {
    try {
      const savedCsv = localStorage.getItem(STORAGE_CSV_KEY);
      if (savedCsv) {
        const parsed = parseElectricityCsv(savedCsv);
        if (parsed.ok) return parsed.data;
      }
    } catch {
      // Ignore storage errors
    }
    return getInitialData();
  });

  const [isCustomCsv, setIsCustomCsv] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_CSV_KEY));
    } catch {
      return false;
    }
  });

  const [dataSourceLabel, setDataSourceLabel] = useState<string>(() => {
    try {
      const savedName = localStorage.getItem(STORAGE_NAME_KEY);
      if (savedName) return savedName;
    } catch {
      // Ignore storage errors
    }
    return '기본 CSV (hourly_electricity.csv)';
  });

  const [csvError, setCsvError] = useState<string | null>(null);
  const [currentHour, setCurrentHour] = useState<number>(realCurrentHour);
  const [selectedHour, setSelectedHour] = useState<number>(realCurrentHour);
  const [usualStartHour, setUsualStartHour] = useState<number>(19);
  const [selectedApplianceId, setSelectedApplianceId] = useState<string>(
    APPLIANCES[0].id,
  );
  const [activeTab, setActiveTab] = useState<MobileTab>('overview');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch separated /data/hourly_electricity.csv on mount when not overridden by custom upload
  useEffect(() => {
    if (isCustomCsv) return;
    let cancelled = false;
    fetch('/data/hourly_electricity.csv', { cache: 'no-store' })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('fetch failed'))))
      .then((csvText) => {
        if (cancelled) return;
        const parsed = parseElectricityCsv(csvText);
        if (parsed.ok) {
          setData(parsed.data);
        }
      })
      .catch(() => {
        // Fallback to built-in default CSV silently
      });
    return () => {
      cancelled = true;
    };
  }, [isCustomCsv]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextHour = new Date().getHours();
      setRealCurrentHour((prev) => {
        if (prev !== nextHour) {
          setCurrentHour((curr) => (curr === prev ? nextHour : curr));
        }
        return nextHour;
      });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const thresholds = useMemo(() => computeCarbonThresholds(data), [data]);

  const currentRecord = useMemo(
    () => data.find((d) => d.hour === currentHour) ?? data[0],
    [data, currentHour],
  );

  const currentGrade = useMemo(
    () => getCarbonGrade(currentRecord.carbonGPerKwh, thresholds),
    [currentRecord, thresholds],
  );

  const bestHourRecord = useMemo(
    () =>
      [...data].sort((a, b) => a.carbonGPerKwh - b.carbonGPerKwh)[0] ??
      data[0],
    [data],
  );

  const selectedAppliance = useMemo(
    () =>
      APPLIANCES.find((a) => a.id === selectedApplianceId) ?? APPLIANCES[0],
    [selectedApplianceId],
  );

  const applianceRecommendation = useMemo(
    () =>
      recommendAppliance(data, selectedAppliance, usualStartHour, thresholds),
    [data, selectedAppliance, usualStartHour, thresholds],
  );

  const handleChangeHour = (hour: number) => {
    setCurrentHour(hour);
    setSelectedHour(hour);
  };

  const handleResetToRealHour = () => {
    setCurrentHour(realCurrentHour);
    setSelectedHour(realCurrentHour);
  };

  const handleInspectWindowOnChart = (startHour: number) => {
    setSelectedHour(startHour);
    setActiveTab('overview');
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      document
        .getElementById('overview')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavigateSection = (section: 'overview' | 'appliances' | 'data') => {
    setActiveTab(section);
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      document
        .getElementById(section)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleTriggerCsvUpload = () => {
    setActiveTab('data');
    fileInputRef.current?.click();
  };

  const handleUploadCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseElectricityCsv(text);
      if (!parsed.ok) {
        setCsvError(parsed.error);
        setActiveTab('data');
        return;
      }
      setCsvError(null);
      setData(parsed.data);
      setIsCustomCsv(true);
      setDataSourceLabel(file.name);
      try {
        localStorage.setItem(STORAGE_CSV_KEY, text);
        localStorage.setItem(STORAGE_NAME_KEY, file.name);
      } catch {
        // Ignore storage errors
      }
    };
    reader.onerror = () => {
      setCsvError('파일을 읽는 중 오류가 발생했습니다. UTF-8 CSV 파일인지 확인해주세요.');
      setActiveTab('data');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDownloadCsv = () => {
    const csvContent = serializeElectricityCsv(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hourly_electricity.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleResetCsv = () => {
    setCsvError(null);
    setIsCustomCsv(false);
    setDataSourceLabel('기본 CSV (hourly_electricity.csv)');
    try {
      localStorage.removeItem(STORAGE_CSV_KEY);
      localStorage.removeItem(STORAGE_NAME_KEY);
    } catch {
      // Ignore storage errors
    }
    fetch('/data/hourly_electricity.csv', { cache: 'no-store' })
      .then((res) => (res.ok ? res.text() : DEFAULT_ELECTRICITY_CSV))
      .then((text) => {
        const parsed = parseElectricityCsv(text);
        if (parsed.ok) {
          setData(parsed.data);
        } else {
          setData(getInitialData());
        }
      })
      .catch(() => {
        setData(getInitialData());
      });
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadCsvFile(file);
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 lg:pb-12">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileInputChange}
        className="sr-only"
        id="csv-file-upload"
        aria-hidden="true"
        tabIndex={-1}
      />
      <TopBar
        onNavigateSection={handleNavigateSection}
        onTriggerCsvUpload={handleTriggerCsvUpload}
      />

      <main className="max-w-6xl mx-auto px-4 md:px-6 pt-5 md:pt-7">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6 items-start">
          {/* Overview: Current Status + 24h Bar Chart */}
          <div
            id="overview"
            className={`lg:col-span-7 space-y-5 ${
              activeTab === 'overview' ? 'block' : 'hidden lg:block'
            }`}
          >
            <CurrentStatusBanner
              currentRecord={currentRecord}
              currentGrade={currentGrade}
              bestHourRecord={bestHourRecord}
              currentHour={currentHour}
              realCurrentHour={realCurrentHour}
              isSimulatedHour={currentHour !== realCurrentHour}
              dataSourceLabel={dataSourceLabel}
              onChangeHour={handleChangeHour}
              onResetToRealHour={handleResetToRealHour}
            />

            <HourlyCarbonChart
              data={data}
              thresholds={thresholds}
              currentHour={currentHour}
              selectedHour={selectedHour}
              recommendedHours={
                applianceRecommendation.bestCarbonWindow.coveredHours
              }
              recommendedLabel={`${selectedAppliance.name} 최적 (${applianceRecommendation.bestCarbonWindow.rangeLabel})`}
              onSelectHour={setSelectedHour}
            />

            {/* Mobile-only quick jump to Appliance Recommendations */}
            <div className="lg:hidden bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-slate-500">
                  {selectedAppliance.name} 추천 시간
                </div>
                <div className="text-sm font-bold text-slate-900 font-mono-tabular truncate">
                  {applianceRecommendation.bestCarbonWindow.rangeLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('appliances')}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                <span>가전 추천 보기</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Appliance Recommender */}
          <div
            className={`lg:col-span-5 ${
              activeTab === 'appliances' ? 'block' : 'hidden lg:block'
            }`}
          >
            <ApplianceRecommender
              selectedApplianceId={selectedApplianceId}
              usualStartHour={usualStartHour}
              currentHour={currentHour}
              recommendation={applianceRecommendation}
              onSelectAppliance={setSelectedApplianceId}
              onChangeUsualStartHour={setUsualStartHour}
              onInspectWindowOnChart={handleInspectWindowOnChart}
            />
          </div>
        </div>

        {/* 24h Hourly Table & CSV Data Management */}
        <div
          className={`mt-6 ${
            activeTab === 'data' ? 'block' : 'hidden lg:block'
          }`}
        >
          <HourlyDataCsvSection
            data={data}
            thresholds={thresholds}
            currentHour={currentHour}
            isCustomCsv={isCustomCsv}
            dataSourceLabel={dataSourceLabel}
            csvError={csvError}
            onOpenFilePicker={() => fileInputRef.current?.click()}
            onDownloadCsv={handleDownloadCsv}
            onResetCsv={handleResetCsv}
            onSelectHour={(hour) => {
              setSelectedHour(hour);
              setActiveTab('overview');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      </main>

      <footer className="hidden lg:flex max-w-6xl mx-auto px-6 mt-10 pt-6 border-t border-slate-200 text-xs text-slate-500 items-center justify-between">
        <span>시간대별 친환경 전기 사용 알리미</span>
        <span>데이터 파일 경로: public/data/hourly_electricity.csv</span>
      </footer>

      <BottomTabBar activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
}
