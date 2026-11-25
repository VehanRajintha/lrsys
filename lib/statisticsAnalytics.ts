import { CusDecRecord } from './types';
import { DateBasis, parseRecordDate } from './dateUtils';

export type DatePreset = 'today' | '7d' | '14d' | '30d' | 'month' | 'all';
export type TrajectoryViewMode = 'cumulative' | 'velocity';
export type PieMode = 'commodity' | 'fidelity';

export interface DailyStatRow {
  date: string;
  total: number;
  confidenceSum: number;
  avgConfidence: number;
  cumulative: number;
  dayDelta: number;
  dayDeltaPct: number;
}

export interface MonthlyStatRow {
  monthKey: string;
  label: string;
  count: number;
  deltaDocs: number;
  deltaPct: number;
  isPositive: boolean;
  avgConfidence: number;
}

export interface EntityStatRow {
  name: string;
  count: number;
  percent: number;
  avgConfidence: number;
}

export interface PieSegmentRow {
  label: string;
  count: number;
  percent: number;
  color: string;
  bgClass: string;
  avgConfidence: number;
}

export interface StatisticsAggregateMetrics {
  total: number;
  avgConfidence: number;
  prevTotal: number;
  totalDelta: number;
  avgDailyVolume: string;
  avgDailyNum: number;
  activeDaysCount: number;
  peakDay: { date: string; total: number };
  latestMonth?: MonthlyStatRow;
  prevMonth: MonthlyStatRow | null;
}

export interface StatisticsSummary {
  startDate: string;
  endDate: string;
  minRecordDate: string;
  maxRecordDate: string;
  filteredRecords: CusDecRecord[];
  previousPeriodRecords: CusDecRecord[];
  dailyData: DailyStatRow[];
  monthlyTelemetry: MonthlyStatRow[];
  metrics: StatisticsAggregateMetrics;
  topConsignees: EntityStatRow[];
  topDeclarants: EntityStatRow[];
  commodityBreakdown: PieSegmentRow[];
  fidelityBreakdown: PieSegmentRow[];
}

export function formatStatsDateDisplay(isoDateStr: string): string {
  try {
    const [y, m, d] = isoDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoDateStr;
  }
}

export function formatStatsDayLabel(isoDateStr: string): string {
  if (!isoDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoDateStr)) {
    return isoDateStr || '—';
  }
  try {
    const [y, m, d] = isoDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return isoDateStr;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDateStr.slice(5);
  }
}

export function formatStatsMonthLabel(yearMonthStr: string): string {
  try {
    const [y, m] = yearMonthStr.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return yearMonthStr;
  }
}

export function getCommodityCategory(desc?: string): string {
  if (!desc) return 'General Cargo';
  const u = desc.toUpperCase();
  if (u.includes('TYRE') || u.includes('VEHICLE') || u.includes('AUTOMOTIVE')) return 'Automotive & Tyres';
  if (u.includes('MACHINERY') || u.includes('SOLAR') || u.includes('CIRCUIT') || u.includes('PCBA')) return 'Machinery & Tech';
  if (u.includes('PHARMACEUTICAL') || u.includes('RESIN') || u.includes('CITRIC') || u.includes('CHEMICAL')) return 'Chemicals & Pharma';
  if (u.includes('COTTON') || u.includes('FABRIC') || u.includes('TEXTILE')) return 'Textiles & Apparel';
  if (u.includes('TILE') || u.includes('CERAMIC') || u.includes('FASTENER') || u.includes('STEEL')) return 'Construction Materials';
  return 'General Cargo';
}

export const COMMODITY_COLOR_PALETTE: Record<string, { stroke: string; bg: string }> = {
  'Machinery & Tech': { stroke: '#06b6d4', bg: 'bg-cyan-500' },
  'Chemicals & Pharma': { stroke: '#0284c7', bg: 'bg-sky-600' },
  'Automotive & Tyres': { stroke: '#6366f1', bg: 'bg-indigo-500' },
  'Construction Materials': { stroke: '#a855f7', bg: 'bg-purple-500' },
  'Textiles & Apparel': { stroke: '#f59e0b', bg: 'bg-amber-500' },
  'General Cargo': { stroke: '#64748b', bg: 'bg-slate-500' },
};

export function resolveStatsDateWindow(
  records: CusDecRecord[],
  dateBasis: DateBasis,
  activePreset: DatePreset,
  customStartDate?: string,
  customEndDate?: string
): {
  startDate: string;
  endDate: string;
  minRecordDate: string;
  maxRecordDate: string;
} {
  const dateSet = new Set<string>();
  records.forEach((r) => {
    const d = parseRecordDate(r, dateBasis);
    if (d) dateSet.add(d);
  });
  const sortedDates = Array.from(dateSet).sort();
  const minRecordDate = sortedDates[0] || '2026-09-01';
  const maxRecordDate = sortedDates[sortedDates.length - 1] || '2026-11-30';

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const calcPastDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };

  let startDate = customStartDate || minRecordDate;
  let endDate = customEndDate || maxRecordDate;

  if (activePreset === 'today') {
    startDate = todayStr;
    endDate = todayStr;
  } else if (activePreset === '7d') {
    startDate = calcPastDays(7);
    endDate = todayStr;
  } else if (activePreset === '14d') {
    startDate = calcPastDays(14);
    endDate = todayStr;
  } else if (activePreset === '30d') {
    startDate = calcPastDays(30);
    endDate = todayStr;
  } else if (activePreset === 'month') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    endDate = todayStr;
  }

  return { startDate, endDate, minRecordDate, maxRecordDate };
}

export function computeStatisticsSummary(params: {
  records: CusDecRecord[];
  dateBasis: DateBasis;
  activePreset: DatePreset;
  customStartDate?: string;
  customEndDate?: string;
  topLimit?: number;
}): StatisticsSummary {
  const {
    records,
    dateBasis,
    activePreset,
    customStartDate,
    customEndDate,
    topLimit = 10,
  } = params;

  const { startDate, endDate, minRecordDate, maxRecordDate } = resolveStatsDateWindow(
    records,
    dateBasis,
    activePreset,
    customStartDate,
    customEndDate
  );

  const filteredRecords = records.filter((r) => {
    const d = parseRecordDate(r, dateBasis);
    if (!d) return true;
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  let previousPeriodRecords: CusDecRecord[] = [];
  if (startDate && endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - diffDays);

      const prevStartStr = prevStart.toISOString().slice(0, 10);
      const prevEndStr = prevEnd.toISOString().slice(0, 10);

      previousPeriodRecords = records.filter((r) => {
        const d = parseRecordDate(r, dateBasis);
        if (!d) return false;
        return d >= prevStartStr && d <= prevEndStr;
      });
    } catch {
      previousPeriodRecords = [];
    }
  }

  // Daily breakdown
  const dayMap = new Map<string, { date: string; total: number; confidenceSum: number }>();
  filteredRecords.forEach((r) => {
    const d = parseRecordDate(r, dateBasis);
    if (!d || d === 'Unassigned' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    if (!dayMap.has(d)) {
      dayMap.set(d, { date: d, total: 0, confidenceSum: 0 });
    }
    const item = dayMap.get(d)!;
    item.total++;
    item.confidenceSum += Number(r.confidence || 0);
  });

  const dayList = Array.from(dayMap.values())
    .map((item) => ({
      ...item,
      avgConfidence: item.total > 0 ? Math.round(item.confidenceSum / item.total) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  let runningTotal = 0;
  const dailyData: DailyStatRow[] = dayList.map((item, idx) => {
    runningTotal += item.total;
    const prevDayTotal = idx > 0 ? dayList[idx - 1].total : item.total;
    const dayDelta = item.total - prevDayTotal;
    const dayDeltaPct = prevDayTotal > 0 ? Math.round((dayDelta / prevDayTotal) * 100) : 0;
    return {
      ...item,
      cumulative: runningTotal,
      dayDelta,
      dayDeltaPct,
    };
  });

  // Monthly telemetry across full record set (matching UI StatisticsAnalyticsDeck)
  const monthMap = new Map<string, { monthKey: string; count: number; confidenceSum: number }>();
  records.forEach((r) => {
    const d = parseRecordDate(r, dateBasis);
    if (!d) return;
    const monthKey = d.slice(0, 7);
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { monthKey, count: 0, confidenceSum: 0 });
    }
    const mItem = monthMap.get(monthKey)!;
    mItem.count++;
    mItem.confidenceSum += Number(r.confidence || 0);
  });

  const sortedMonths = Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  const monthlyTelemetry: MonthlyStatRow[] = sortedMonths.map((m, idx) => {
    const prevCount = idx > 0 ? sortedMonths[idx - 1].count : m.count;
    const deltaDocs = m.count - prevCount;
    const deltaPct = prevCount > 0 ? Math.round(((m.count - prevCount) / prevCount) * 1000) / 10 : 0;
    const avgConfidence = m.count > 0 ? Math.round(m.confidenceSum / m.count) : 0;

    return {
      monthKey: m.monthKey,
      label: formatStatsMonthLabel(m.monthKey),
      count: m.count,
      deltaDocs,
      deltaPct,
      isPositive: deltaDocs >= 0,
      avgConfidence,
    };
  });

  // Aggregate metrics
  const total = filteredRecords.length;
  let totalConfidence = 0;
  filteredRecords.forEach((r) => {
    totalConfidence += Number(r.confidence || 0);
  });

  const avgConfidence = total > 0 ? Math.round(totalConfidence / total) : 0;
  const prevTotal = previousPeriodRecords.length;
  const totalDelta =
    prevTotal === 0 ? (total > 0 ? 100 : 0) : ((total - prevTotal) / prevTotal) * 100;

  const activeDaysCount = dailyData.length || 1;
  const avgDailyNum = total / activeDaysCount;
  const avgDailyVolume = avgDailyNum.toFixed(1);

  let peakDay = { date: '', total: 0 };
  dailyData.forEach((d) => {
    if (d.total > peakDay.total) {
      peakDay = { date: d.date, total: d.total };
    }
  });

  const latestMonth = monthlyTelemetry[monthlyTelemetry.length - 1];
  const prevMonth = monthlyTelemetry.length > 1 ? monthlyTelemetry[monthlyTelemetry.length - 2] : null;

  const metrics: StatisticsAggregateMetrics = {
    total,
    avgConfidence,
    prevTotal,
    totalDelta: Math.round(totalDelta * 10) / 10,
    avgDailyVolume,
    avgDailyNum,
    activeDaysCount,
    peakDay,
    latestMonth,
    prevMonth,
  };

  // Top Consignees & Declarants
  const consigneeMap = new Map<string, { count: number; confSum: number }>();
  const declarantMap = new Map<string, { count: number; confSum: number }>();

  filteredRecords.forEach((r) => {
    const c = (r.consigneeName || 'Unknown Consignee').trim();
    const d = (r.declarantName || 'Unknown Declarant').trim();
    const conf = Number(r.confidence || 0);
    if (c && c !== 'Unknown Consignee') {
      const prev = consigneeMap.get(c) || { count: 0, confSum: 0 };
      prev.count++;
      prev.confSum += conf;
      consigneeMap.set(c, prev);
    }
    if (d && d !== 'Unknown Declarant') {
      const prev = declarantMap.get(d) || { count: 0, confSum: 0 };
      prev.count++;
      prev.confSum += conf;
      declarantMap.set(d, prev);
    }
  });

  const topConsignees: EntityStatRow[] = Array.from(consigneeMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, topLimit)
    .map(([name, info]) => ({
      name,
      count: info.count,
      percent: total > 0 ? Math.round((info.count / total) * 1000) / 10 : 0,
      avgConfidence: info.count > 0 ? Math.round(info.confSum / info.count) : 0,
    }));

  const topDeclarants: EntityStatRow[] = Array.from(declarantMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, topLimit)
    .map(([name, info]) => ({
      name,
      count: info.count,
      percent: total > 0 ? Math.round((info.count / total) * 1000) / 10 : 0,
      avgConfidence: info.count > 0 ? Math.round(info.confSum / info.count) : 0,
    }));

  // Commodity distribution
  const commodityMap = new Map<string, { count: number; confSum: number }>();
  filteredRecords.forEach((r) => {
    const cat = getCommodityCategory(r.goodsDescription);
    const prev = commodityMap.get(cat) || { count: 0, confSum: 0 };
    prev.count++;
    prev.confSum += Number(r.confidence || 0);
    commodityMap.set(cat, prev);
  });

  const commodityBreakdown: PieSegmentRow[] =
    total === 0
      ? []
      : Array.from(commodityMap.entries())
          .map(([label, info]) => ({
            label,
            count: info.count,
            percent: Math.round((info.count / total) * 1000) / 10,
            color: COMMODITY_COLOR_PALETTE[label]?.stroke || '#06b6d4',
            bgClass: COMMODITY_COLOR_PALETTE[label]?.bg || 'bg-cyan-500',
            avgConfidence: info.count > 0 ? Math.round(info.confSum / info.count) : 0,
          }))
          .sort((a, b) => b.count - a.count);

  // Fidelity precision tiers
  let ultra = 0;
  let ultraConf = 0;
  let high = 0;
  let highConf = 0;
  let audit = 0;
  let auditConf = 0;

  filteredRecords.forEach((r) => {
    const c = Number(r.confidence || 0);
    if (c >= 96) {
      ultra++;
      ultraConf += c;
    } else if (c >= 90) {
      high++;
      highConf += c;
    } else {
      audit++;
      auditConf += c;
    }
  });

  const fidelityBreakdown: PieSegmentRow[] =
    total === 0
      ? []
      : [
          {
            label: 'Ultra High (>=96%)',
            count: ultra,
            percent: Math.round((ultra / total) * 1000) / 10,
            color: '#10b981',
            bgClass: 'bg-emerald-500',
            avgConfidence: ultra > 0 ? Math.round(ultraConf / ultra) : 0,
          },
          {
            label: 'High Precision (90-95%)',
            count: high,
            percent: Math.round((high / total) * 1000) / 10,
            color: '#06b6d4',
            bgClass: 'bg-cyan-500',
            avgConfidence: high > 0 ? Math.round(highConf / high) : 0,
          },
          {
            label: 'Audit Queue (<90%)',
            count: audit,
            percent: Math.round((audit / total) * 1000) / 10,
            color: '#f59e0b',
            bgClass: 'bg-amber-500',
            avgConfidence: audit > 0 ? Math.round(auditConf / audit) : 0,
          },
        ].filter((t) => t.count > 0);

  return {
    startDate,
    endDate,
    minRecordDate,
    maxRecordDate,
    filteredRecords,
    previousPeriodRecords,
    dailyData,
    monthlyTelemetry,
    metrics,
    topConsignees,
    topDeclarants,
    commodityBreakdown,
    fidelityBreakdown,
  };
}
