export interface HourlyElectricityRecord {
  hour: number;
  carbonGPerKwh: number;
  renewablePct: number;
  tariffKrwPerKwh: number;
}

export type CarbonGrade = 'good' | 'moderate' | 'bad';

export interface CarbonThresholds {
  goodMax: number;
  moderateMax: number;
}

export interface ApplianceSpec {
  id: string;
  name: string;
  powerKw: number;
  durationHours: number;
  durationLabel: string;
  description: string;
}

export interface WindowEvaluation {
  startHour: number;
  startLabel: string;
  endLabel: string;
  rangeLabel: string;
  coveredHours: number[];
  totalKwh: number;
  totalCarbonG: number;
  avgCarbonGPerKwh: number;
  avgRenewablePct: number;
  avgTariffKrwPerKwh: number;
  totalCostKrw: number;
  grade: CarbonGrade;
}

export interface ApplianceRecommendation {
  appliance: ApplianceSpec;
  bestCarbonWindow: WindowEvaluation;
  bestCostWindow: WindowEvaluation;
  usualWindow: WindowEvaluation;
  carbonSavedOnceG: number;
  carbonSavedMonthlyG: number;
  carbonSavedPct: number;
  costSavedOnceKrw: number;
  costSavedMonthlyKrw: number;
  topWindows: WindowEvaluation[];
}

export const APPLIANCES: readonly ApplianceSpec[] = [
  {
    id: 'washer',
    name: '세탁기',
    powerKw: 0.5,
    durationHours: 1,
    durationLabel: '1시간',
    description: '표준 코스 1회 기준 (0.5kW · 1시간)',
  },
  {
    id: 'dryer',
    name: '건조기',
    powerKw: 2.5,
    durationHours: 1,
    durationLabel: '1시간',
    description: '열풍/히트펌프 고출력 가동 (2.5kW · 1시간)',
  },
  {
    id: 'dishwasher',
    name: '식기세척기',
    powerKw: 1.2,
    durationHours: 1.5,
    durationLabel: '1시간 30분',
    description: '고온 살균 세척 코스 (1.2kW · 1시간 30분)',
  },
  {
    id: 'ev-charger',
    name: '전기차 충전',
    powerKw: 7,
    durationHours: 4,
    durationLabel: '4시간',
    description: '완속 홈충전기 28kWh 충전 (7kW · 4시간)',
  },
  {
    id: 'robot-vacuum',
    name: '로봇청소기',
    powerKw: 0.05,
    durationHours: 1,
    durationLabel: '1시간',
    description: '전체 청소 및 도킹 충전 (0.05kW · 1시간)',
  },
] as const;

export const DEFAULT_ELECTRICITY_CSV = `hour,carbon_g_per_kwh,renewable_pct,tariff_krw_per_kwh
0,405,5.4,102
1,412,4.9,98
2,420,4.5,95
3,425,4.3,94
4,418,4.7,96
5,402,5.6,105
6,385,8.2,128
7,362,12.1,148
8,335,17.8,162
9,288,25.4,168
10,235,33.2,172
11,200,39.1,176
12,185,42.6,165
13,190,41.8,178
14,210,38.0,182
15,255,30.8,180
16,325,21.4,174
17,465,11.2,195
18,515,6.3,228
19,545,4.1,238
20,530,4.4,232
21,485,5.0,205
22,420,5.3,142
23,402,5.4,115`;

export type CsvParseResult =
  | { ok: true; data: HourlyElectricityRecord[] }
  | { ok: false; error: string };

const HEADER_ALIASES = {
  hour: ['hour', 'hr', 'time', '시간', '시', '시간대'],
  carbon: [
    'carbon_g_per_kwh',
    'carbon',
    'co2',
    'co2_g_per_kwh',
    '탄소배출계수',
    '탄소배출',
    '이산화탄소',
  ],
  renewable: [
    'renewable_pct',
    'renewable',
    'renewable_ratio',
    '신재생비율',
    '신재생비중',
    '신재생',
    '재생에너지',
  ],
  tariff: [
    'tariff_krw_per_kwh',
    'tariff',
    'price',
    'cost',
    '요금',
    '전기요금',
  ],
};

function matchColumnIndex(headers: string[], candidates: string[]): number {
  return headers.findIndex((h) => {
    const normalized = h.trim().toLowerCase().replace(/\s+/g, '');
    return candidates.some((c) => normalized === c || normalized.includes(c));
  });
}

export function parseElectricityCsv(csvText: string): CsvParseResult {
  const cleaned = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    return { ok: false, error: 'CSV 파일 내용이 비어 있습니다.' };
  }

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length < 24) {
    return {
      ok: false,
      error: `0~23시까지 총 24개 시간대 데이터가 필요합니다. (현재 ${lines.length}줄)`,
    };
  }

  const firstCells = lines[0].split(',').map((c) => c.trim());
  const firstCellAsNum = Number(firstCells[0]);
  const hasHeader = Number.isNaN(firstCellAsNum) || firstCells[0] === '';

  let hourIdx = 0;
  let carbonIdx = 1;
  let renewableIdx = 2;
  let tariffIdx = 3;
  let startRow = 0;

  if (hasHeader) {
    const detectedHour = matchColumnIndex(firstCells, HEADER_ALIASES.hour);
    const detectedCarbon = matchColumnIndex(firstCells, HEADER_ALIASES.carbon);
    const detectedRenewable = matchColumnIndex(firstCells, HEADER_ALIASES.renewable);
    const detectedTariff = matchColumnIndex(firstCells, HEADER_ALIASES.tariff);

    if (
      detectedHour !== -1 &&
      detectedCarbon !== -1 &&
      detectedRenewable !== -1 &&
      detectedTariff !== -1
    ) {
      hourIdx = detectedHour;
      carbonIdx = detectedCarbon;
      renewableIdx = detectedRenewable;
      tariffIdx = detectedTariff;
    } else if (firstCells.length < 4) {
      return {
        ok: false,
        error:
          'CSV 열 구성이 올바르지 않습니다. (hour, carbon_g_per_kwh, renewable_pct, tariff_krw_per_kwh)',
      };
    }
    startRow = 1;
  }

  const seenHours = new Set<number>();
  const records: HourlyElectricityRecord[] = [];

  for (let i = startRow; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length < 4) {
      return {
        ok: false,
        error: `${i + 1}번째 줄에 열이 4개 미만입니다. (시간, 탄소배출, 신재생비율, 전기요금)`,
      };
    }

    const hour = Number(cols[hourIdx]);
    const carbonGPerKwh = Number(cols[carbonIdx]);
    const renewablePct = Number(cols[renewableIdx]);
    const tariffKrwPerKwh = Number(cols[tariffIdx]);

    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      return {
        ok: false,
        error: `${i + 1}번째 줄의 시간("${cols[hourIdx]}")은 0~23 사이의 정수여야 합니다.`,
      };
    }

    if (seenHours.has(hour)) {
      return {
        ok: false,
        error: `${hour}시 데이터가 중복되어 있습니다.`,
      };
    }

    if (
      Number.isNaN(carbonGPerKwh) ||
      carbonGPerKwh < 0 ||
      Number.isNaN(renewablePct) ||
      renewablePct < 0 ||
      renewablePct > 100 ||
      Number.isNaN(tariffKrwPerKwh) ||
      tariffKrwPerKwh < 0
    ) {
      return {
        ok: false,
        error: `${hour}시 행의 수치 형식이 올바르지 않습니다.`,
      };
    }

    seenHours.add(hour);
    records.push({
      hour,
      carbonGPerKwh,
      renewablePct,
      tariffKrwPerKwh,
    });
  }

  if (records.length !== 24) {
    const missing: number[] = [];
    for (let h = 0; h < 24; h += 1) {
      if (!seenHours.has(h)) missing.push(h);
    }
    return {
      ok: false,
      error: `0~23시 전체 24시간이 모두 포함되어야 합니다. (누락: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''})`,
    };
  }

  records.sort((a, b) => a.hour - b.hour);
  return { ok: true, data: records };
}

export function serializeElectricityCsv(data: HourlyElectricityRecord[]): string {
  const header = 'hour,carbon_g_per_kwh,renewable_pct,tariff_krw_per_kwh';
  const rows = [...data]
    .sort((a, b) => a.hour - b.hour)
    .map(
      (r) =>
        `${r.hour},${Number(r.carbonGPerKwh.toFixed(1))},${Number(r.renewablePct.toFixed(1))},${Number(r.tariffKrwPerKwh.toFixed(1))}`,
    );
  return [header, ...rows].join('\n');
}

export function computeCarbonThresholds(
  data: HourlyElectricityRecord[],
): CarbonThresholds {
  if (data.length === 0) {
    return { goodMax: 300, moderateMax: 450 };
  }
  const values = data.map((d) => d.carbonGPerKwh);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  if (span < 30) {
    return { goodMax: 300, moderateMax: 450 };
  }

  return {
    goodMax: Math.round(min + span * 0.35),
    moderateMax: Math.round(min + span * 0.72),
  };
}

export function getCarbonGrade(
  carbonGPerKwh: number,
  thresholds: CarbonThresholds,
): CarbonGrade {
  if (carbonGPerKwh <= thresholds.goodMax) return 'good';
  if (carbonGPerKwh <= thresholds.moderateMax) return 'moderate';
  return 'bad';
}

export function getGradeLabel(grade: CarbonGrade): string {
  switch (grade) {
    case 'good':
      return '좋음';
    case 'moderate':
      return '보통';
    case 'bad':
      return '나쁨';
  }
}

export function formatHourLabel(hour: number): string {
  const normalized = ((Math.floor(hour) % 24) + 24) % 24;
  return `${String(normalized).padStart(2, '0')}:00`;
}

export function formatDecimalHourLabel(decimalHour: number): string {
  const wrapped = ((decimalHour % 24) + 24) % 24;
  const h = Math.floor(wrapped);
  const m = Math.round((wrapped - h) * 60);
  if (m === 60) {
    return `${String((h + 1) % 24).padStart(2, '0')}:00`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getCurrentStatusCopy(
  record: HourlyElectricityRecord,
  grade: CarbonGrade,
  bestHour: HourlyElectricityRecord,
): { verdict: string; headline: string; detail: string } {
  const verdict = getGradeLabel(grade);
  if (grade === 'good') {
    return {
      verdict,
      headline: '지금 전기를 쓰면 좋음',
      detail: `태양광 등 신재생 비중이 ${record.renewablePct.toFixed(1)}%로 높아 탄소배출(${Math.round(record.carbonGPerKwh)}g/kWh)이 적은 친환경 시간대예요.`,
    };
  }
  if (grade === 'moderate') {
    return {
      verdict,
      headline: '지금 전기를 쓰면 보통',
      detail: `무난한 전력 상태지만, 가장 깨끗한 ${formatHourLabel(bestHour.hour)}(${Math.round(bestHour.carbonGPerKwh)}g/kWh)에 가전을 돌리면 탄소를 더 줄일 수 있어요.`,
    };
  }
  return {
    verdict,
    headline: '지금 전기를 쓰면 나쁨',
    detail: `화력발전 의존도가 높아 탄소배출(${Math.round(record.carbonGPerKwh)}g/kWh)이 많은 피크 시간대예요. 큰 가전은 ${formatHourLabel(bestHour.hour)} 무렵을 권장해요.`,
  };
}

export function evaluateApplianceWindow(
  data: HourlyElectricityRecord[],
  appliance: ApplianceSpec,
  startHour: number,
  thresholds: CarbonThresholds,
): WindowEvaluation {
  const byHour = new Map<number, HourlyElectricityRecord>();
  for (const row of data) {
    byHour.set(row.hour, row);
  }

  const coveredHours: number[] = [];
  let remaining = appliance.durationHours;
  let offset = 0;
  let weightedCarbon = 0;
  let weightedTariff = 0;
  let weightedRenewable = 0;

  while (remaining > 1e-6) {
    const h = (startHour + offset) % 24;
    const weight = Math.min(1, remaining);
    const record = byHour.get(h);
    if (!record) {
      throw new Error(`Missing hour ${h} in electricity data`);
    }
    coveredHours.push(h);
    weightedCarbon += weight * record.carbonGPerKwh;
    weightedTariff += weight * record.tariffKrwPerKwh;
    weightedRenewable += weight * record.renewablePct;
    remaining -= weight;
    offset += 1;
  }

  const totalKwh = Math.round(appliance.powerKw * appliance.durationHours * 1000) / 1000;
  const avgCarbonGPerKwh = weightedCarbon / appliance.durationHours;
  const avgTariffKrwPerKwh = weightedTariff / appliance.durationHours;
  const avgRenewablePct = weightedRenewable / appliance.durationHours;
  const totalCarbonG = totalKwh * avgCarbonGPerKwh;
  const totalCostKrw = totalKwh * avgTariffKrwPerKwh;
  const startLabel = formatDecimalHourLabel(startHour);
  const endLabel = formatDecimalHourLabel(startHour + appliance.durationHours);

  return {
    startHour,
    startLabel,
    endLabel,
    rangeLabel: `${startLabel} ~ ${endLabel}`,
    coveredHours,
    totalKwh,
    totalCarbonG,
    avgCarbonGPerKwh,
    avgRenewablePct,
    avgTariffKrwPerKwh,
    totalCostKrw,
    grade: getCarbonGrade(avgCarbonGPerKwh, thresholds),
  };
}

export function recommendAppliance(
  data: HourlyElectricityRecord[],
  appliance: ApplianceSpec,
  usualStartHour: number,
  thresholds: CarbonThresholds,
): ApplianceRecommendation {
  const windows: WindowEvaluation[] = [];
  for (let h = 0; h < 24; h += 1) {
    windows.push(evaluateApplianceWindow(data, appliance, h, thresholds));
  }

  const sortedByCarbon = [...windows].sort((a, b) => {
    if (Math.abs(a.avgCarbonGPerKwh - b.avgCarbonGPerKwh) > 0.001) {
      return a.avgCarbonGPerKwh - b.avgCarbonGPerKwh;
    }
    if (Math.abs(a.avgTariffKrwPerKwh - b.avgTariffKrwPerKwh) > 0.001) {
      return a.avgTariffKrwPerKwh - b.avgTariffKrwPerKwh;
    }
    return a.startHour - b.startHour;
  });

  const sortedByCost = [...windows].sort((a, b) => {
    if (Math.abs(a.totalCostKrw - b.totalCostKrw) > 0.01) {
      return a.totalCostKrw - b.totalCostKrw;
    }
    return a.avgCarbonGPerKwh - b.avgCarbonGPerKwh;
  });

  const bestCarbonWindow = sortedByCarbon[0];
  const bestCostWindow = sortedByCost[0];
  const usualWindow =
    windows.find((w) => w.startHour === usualStartHour) ?? windows[0];

  const totalKwh = appliance.powerKw * appliance.durationHours;
  const carbonSavedOnceG = Math.max(
    0,
    totalKwh * (usualWindow.avgCarbonGPerKwh - bestCarbonWindow.avgCarbonGPerKwh),
  );
  const carbonSavedMonthlyG = carbonSavedOnceG * 30;
  const carbonSavedPct =
    usualWindow.avgCarbonGPerKwh > 0
      ? ((usualWindow.avgCarbonGPerKwh - bestCarbonWindow.avgCarbonGPerKwh) /
          usualWindow.avgCarbonGPerKwh) *
        100
      : 0;

  const costSavedOnceKrw =
    totalKwh * (usualWindow.avgTariffKrwPerKwh - bestCarbonWindow.avgTariffKrwPerKwh);
  const costSavedMonthlyKrw = costSavedOnceKrw * 30;

  return {
    appliance,
    bestCarbonWindow,
    bestCostWindow,
    usualWindow,
    carbonSavedOnceG,
    carbonSavedMonthlyG,
    carbonSavedPct: Math.max(0, carbonSavedPct),
    costSavedOnceKrw,
    costSavedMonthlyKrw,
    topWindows: sortedByCarbon.slice(0, 3),
  };
}

export function formatCarbonAmount(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)}kg`;
  }
  return `${Math.round(grams).toLocaleString('ko-KR')}g`;
}

export function formatKrw(amount: number): string {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
}
