import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLIANCES,
  DEFAULT_ELECTRICITY_CSV,
  computeCarbonThresholds,
  evaluateApplianceWindow,
  getCarbonGrade,
  parseElectricityCsv,
  recommendAppliance,
  serializeElectricityCsv,
} from './electricity';

test('parseElectricityCsv parses default 24-hour CSV accurately', () => {
  const result = parseElectricityCsv(DEFAULT_ELECTRICITY_CSV);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.data.length, 24);
  assert.equal(result.data[0].hour, 0);
  assert.equal(result.data[12].carbonGPerKwh, 185);
  assert.equal(result.data[12].renewablePct, 42.6);
  assert.equal(result.data[19].tariffKrwPerKwh, 238);
});

test('parseElectricityCsv supports Korean headers and round-trips via serializeElectricityCsv', () => {
  const parsedDefault = parseElectricityCsv(DEFAULT_ELECTRICITY_CSV);
  assert.equal(parsedDefault.ok, true);
  if (!parsedDefault.ok) return;

  const serialized = serializeElectricityCsv(parsedDefault.data);
  const reparsed = parseElectricityCsv(serialized);
  assert.equal(reparsed.ok, true);
  if (!reparsed.ok) return;

  assert.deepEqual(reparsed.data, parsedDefault.data);

  const koreanHeaderCsv = [
    '시간,탄소배출계수,신재생비율,전기요금',
    ...parsedDefault.data.map(
      (r) => `${r.hour},${r.carbonGPerKwh},${r.renewablePct},${r.tariffKrwPerKwh}`,
    ),
  ].join('\n');
  const krParsed = parseElectricityCsv(koreanHeaderCsv);
  assert.equal(krParsed.ok, true);
});

test('parseElectricityCsv rejects incomplete or duplicate hours', () => {
  const shortCsv = `hour,carbon_g_per_kwh,renewable_pct,tariff_krw_per_kwh
0,400,5,100
1,410,5,100`;
  const shortRes = parseElectricityCsv(shortCsv);
  assert.equal(shortRes.ok, false);

  const lines = DEFAULT_ELECTRICITY_CSV.split('\n');
  lines[2] = lines[1]; // duplicate hour 0
  const dupRes = parseElectricityCsv(lines.join('\n'));
  assert.equal(dupRes.ok, false);
});

test('computeCarbonThresholds and getCarbonGrade classify midday solar as good and evening peak as bad', () => {
  const parsed = parseElectricityCsv(DEFAULT_ELECTRICITY_CSV);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const thresholds = computeCarbonThresholds(parsed.data);
  assert.equal(getCarbonGrade(parsed.data[12].carbonGPerKwh, thresholds), 'good');
  assert.equal(getCarbonGrade(parsed.data[8].carbonGPerKwh, thresholds), 'moderate');
  assert.equal(getCarbonGrade(parsed.data[19].carbonGPerKwh, thresholds), 'bad');
});

test('evaluateApplianceWindow handles fractional 1.5h dishwasher and wrap-around 4h EV windows', () => {
  const parsed = parseElectricityCsv(DEFAULT_ELECTRICITY_CSV);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const thresholds = computeCarbonThresholds(parsed.data);
  const dishwasher = APPLIANCES.find((a) => a.id === 'dishwasher')!;
  const win12 = evaluateApplianceWindow(parsed.data, dishwasher, 12, thresholds);

  // 1.2kW * (1h @ 185g + 0.5h @ 190g) = 1.2 * 280 = 336g
  assert.equal(win12.totalKwh, 1.8);
  assert.equal(Math.round(win12.totalCarbonG), 336);
  assert.equal(win12.rangeLabel, '12:00 ~ 13:30');
  assert.deepEqual(win12.coveredHours, [12, 13]);

  const ev = APPLIANCES.find((a) => a.id === 'ev-charger')!;
  const wrapWin = evaluateApplianceWindow(parsed.data, ev, 22, thresholds);
  assert.deepEqual(wrapWin.coveredHours, [22, 23, 0, 1]);
  assert.equal(wrapWin.totalKwh, 28);
  assert.equal(wrapWin.rangeLabel, '22:00 ~ 02:00');
});

test('recommendAppliance recommends lowest avgCarbonGPerKwh window and computes 1x and 30x savings', () => {
  const parsed = parseElectricityCsv(DEFAULT_ELECTRICITY_CSV);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const thresholds = computeCarbonThresholds(parsed.data);
  const ev = APPLIANCES.find((a) => a.id === 'ev-charger')!;
  const rec = recommendAppliance(parsed.data, ev, 19, thresholds);

  // Best 4-hour block for avg carbon is 11:00~15:00 ((200+185+190+210)/4 = 196.25 g/kWh)
  assert.equal(rec.bestCarbonWindow.startHour, 11);
  assert.equal(rec.bestCarbonWindow.rangeLabel, '11:00 ~ 15:00');
  assert.equal(rec.bestCarbonWindow.grade, 'good');
  assert.equal(rec.bestCarbonWindow.avgCarbonGPerKwh, 196.25);

  // Usual 19:00~23:00 avg carbon = (545+530+485+420)/4 = 495 g/kWh
  // Saved once = 7 * 4 * (495 - 196.25) = 28 * 298.75 = 8365g
  assert.equal(Math.round(rec.carbonSavedOnceG), 8365);
  assert.equal(Math.round(rec.carbonSavedMonthlyG), 8365 * 30);

  // Usual 19:00~23:00 avg tariff = (238+232+205+142)/4 = 204.25
  // Best 11:00~15:00 avg tariff = (176+165+178+182)/4 = 175.25
  // Cost saved once = 28 * (204.25 - 175.25) = 28 * 29 = 812 KRW
  assert.equal(Math.round(rec.costSavedOnceKrw), 812);
  assert.equal(Math.round(rec.costSavedMonthlyKrw), 812 * 30);
});

test('parseElectricityCsv handles quoted fields and hour labels while rejecting empty cells', () => {
  const quotedCsv = [
    'hour,carbon_g_per_kwh,renewable_pct,tariff_krw_per_kwh',
    ...Array.from(
      { length: 24 },
      (_, h) => `"${String(h).padStart(2, '0')}:00","${300 + h}","${10 + h}%","${120 + h}원"`,
    ),
  ].join('\n');
  const okRes = parseElectricityCsv(quotedCsv);
  assert.equal(okRes.ok, true);
  if (okRes.ok) {
    assert.equal(okRes.data[0].hour, 0);
    assert.equal(okRes.data[23].tariffKrwPerKwh, 143);
  }

  const emptyCellCsv = [
    'hour,carbon_g_per_kwh,renewable_pct,tariff_krw_per_kwh',
    '0,,5.0,100',
    ...Array.from({ length: 23 }, (_, i) => `${i + 1},400,5.0,100`),
  ].join('\n');
  const emptyRes = parseElectricityCsv(emptyCellCsv);
  assert.equal(emptyRes.ok, false);
});

