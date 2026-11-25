import ExcelJS from 'exceljs';
import { DateBasis, parseRecordDate } from './dateUtils';
import {
  DatePreset,
  PieMode,
  TrajectoryViewMode,
  computeStatisticsSummary,
  formatStatsDateDisplay,
  formatStatsDayLabel,
  getCommodityCategory,
} from './statisticsAnalytics';
import { OoxmlChartSpec, injectOoxmlCharts } from './ooxmlCharts';
import { CusDecRecord } from './types';

export interface GenerateStatisticsExcelOptions {
  records: CusDecRecord[];
  dateBasis: DateBasis;
  activePreset: DatePreset;
  customStartDate?: string;
  customEndDate?: string;
  trajectoryMode: TrajectoryViewMode;
  pieMode: PieMode;
}

const FONT_NAME = 'Segoe UI';

const PRESET_LABELS: Record<DatePreset, string> = {
  all: 'All Time',
  today: 'Today',
  '7d': 'Last 7 Days',
  '14d': 'Last 14 Days',
  '30d': 'Last 30 Days',
  month: 'This Month',
};

const PALETTE_MULTI = [
  '06B6D4', // Cyan
  '0284C7', // Sky Blue
  '6366F1', // Indigo
  '8B5CF6', // Violet
  '10B981', // Emerald
  'F59E0B', // Amber
  'EC4899', // Pink
  '14B8A6', // Teal
  '3B82F6', // Royal Blue
  '64748B', // Slate
];

function shortenChartLabel(label: string, maxLen = 30): string {
  const clean = String(label || '').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1).trimEnd() + '…';
}

const DOUGHNUT_CATEGORY_COLORS: Record<string, string> = {
  'Machinery & Tech': '06B6D4',
  'Chemicals & Pharma': '0284C7',
  'Automotive & Tyres': '6366F1',
  'Construction Materials': 'A855F7',
  'Textiles & Apparel': 'F59E0B',
  'General Cargo': '14B8A6',
};

function thinBorder(argb = 'FFE2E8F0'): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin', color: { argb } },
    bottom: { style: 'thin', color: { argb } },
    left: { style: 'thin', color: { argb } },
    right: { style: 'thin', color: { argb } },
  };
}

function styleBanner(
  ws: ExcelJS.Worksheet,
  startCol: number,
  endCol: number,
  title: string,
  subtitle: string,
  accentHex = 'FF06B6D4'
) {
  ws.mergeCells(1, startCol, 1, endCol);
  const titleCell = ws.getCell(1, startCol);
  titleCell.value = title;
  titleCell.font = { name: FONT_NAME, size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1528' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 34;

  ws.mergeCells(2, startCol, 2, endCol);
  const subCell = ws.getCell(2, startCol);
  subCell.value = subtitle;
  subCell.font = { name: FONT_NAME, size: 9.5, italic: false, color: { argb: 'FFCBD5E1' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 22;

  for (let c = startCol; c <= endCol; c++) {
    const accentCell = ws.getCell(3, c);
    accentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentHex } };
  }
  ws.getRow(3).height = 4;
}

/**
 * Generates an executive, colorful multi-sheet Analytics & Telemetry Excel Report (.xlsx)
 * containing real native editable OOXML Line, Column/Bar, Doughnut, and Pie charts.
 */
export async function generateStatisticsExcel(
  options: GenerateStatisticsExcelOptions
): Promise<Buffer> {
  const {
    records,
    dateBasis,
    activePreset,
    customStartDate,
    customEndDate,
    trajectoryMode,
    pieMode,
  } = options;

  const summary = computeStatisticsSummary({
    records,
    dateBasis,
    activePreset,
    customStartDate,
    customEndDate,
    topLimit: 10,
  });

  const {
    startDate,
    endDate,
    filteredRecords,
    dailyData,
    monthlyTelemetry,
    metrics,
    topConsignees,
    topDeclarants,
    commodityBreakdown,
    fidelityBreakdown,
  } = summary;

  const basisLabel = dateBasis === 'created' ? 'System Ingestion Date' : 'Box 54 Customs Date';
  const presetLabel = PRESET_LABELS[activePreset] || 'Custom Range';
  const generatedStamp = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LRSYS Sri Lanka Customs Long Room';
  workbook.lastModifiedBy = 'LRSYS Analytics Engine';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ============================================================================
  // SHEET 1: EXECUTIVE REPORT (Visual KPI Dashboard + Native Interactive Charts)
  // ============================================================================
  const wsExec = workbook.addWorksheet('Executive Report', {
    properties: { tabColor: { argb: 'FF06B6D4' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3, showGridLines: false }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      paperSize: 9, // A4
      margins: { left: 0.25, right: 0.25, top: 0.3, bottom: 0.3, header: 0.15, footer: 0.15 },
    },
  });

  // 15-Column symmetrical grid: A margin, 5 pairs of card cols separated by 4 narrow gutters, P margin
  const execColWidths = [
    2.5, // A: margin
    13, 13, // B-C: Card 1 (26)
    2, // D: gutter
    13, 13, // E-F: Card 2 (26)
    2, // G: gutter
    13, 13, // H-I: Card 3 (26)
    2, // J: gutter
    13, 13, // K-L: Card 4 (26)
    2, // M: gutter
    13, 13, // N-O: Card 5 (26)
    2.5, // P: margin
  ];
  execColWidths.forEach((w, idx) => {
    wsExec.getColumn(idx + 1).width = w;
  });

  styleBanner(
    wsExec,
    2,
    15,
    'SRI LANKA CUSTOMS (CUSDEC) — ENTRY VELOCITY & GROWTH ANALYTICS REPORT',
    `Basis: ${basisLabel}   |   Timeframe: ${startDate} to ${endDate} (${presetLabel})   |   Volume: ${metrics.total} / ${records.length} Declarations   |   Generated: ${generatedStamp}`,
    'FF06B6D4'
  );

  wsExec.getRow(4).height = 10;

  // 5 KPI Scorecard Cards across Row 5..9
  const kpiCards = [
    {
      startCol: 2,
      endCol: 3,
      accentArgb: 'FF06B6D4',
      bgArgb: 'FFECFEFF',
      borderArgb: 'FFA5F3FC',
      valueColorArgb: 'FF0E7490',
      label: 'TOTAL CUSDEC VOLUME',
      valueText: `${metrics.total} docs`,
      subText: `${metrics.totalDelta >= 0 ? `+${metrics.totalDelta}%` : `${metrics.totalDelta}%`} vs prior period`,
      subColorArgb: metrics.totalDelta >= 0 ? 'FF059669' : 'FFE11D48',
    },
    {
      startCol: 5,
      endCol: 6,
      accentArgb: 'FF10B981',
      bgArgb: 'FFECFDF5',
      borderArgb: 'FFA7F3D0',
      valueColorArgb: 'FF047857',
      label: 'MONTHLY GROWTH (MoM)',
      valueText: metrics.latestMonth
        ? `${metrics.latestMonth.isPositive ? '+' : ''}${metrics.latestMonth.deltaPct}%`
        : '+0.0%',
      subText: metrics.latestMonth
        ? `${metrics.latestMonth.deltaDocs >= 0 ? '+' : ''}${metrics.latestMonth.deltaDocs} docs (${metrics.latestMonth.label})`
        : 'Baseline month',
      subColorArgb: 'FF059669',
    },
    {
      startCol: 8,
      endCol: 9,
      accentArgb: 'FF0EA5E9',
      bgArgb: 'FFF0F9FF',
      borderArgb: 'FFBAE6FD',
      valueColorArgb: 'FF0369A1',
      label: 'DAILY INGESTION RATE',
      valueText: `~${metrics.avgDailyVolume} /day`,
      subText: `Across ${metrics.activeDaysCount} active intake ${metrics.activeDaysCount === 1 ? 'day' : 'days'}`,
      subColorArgb: 'FF0284C7',
    },
    {
      startCol: 11,
      endCol: 12,
      accentArgb: 'FF6366F1',
      bgArgb: 'FFEEF2FF',
      borderArgb: 'FFC7D2FE',
      valueColorArgb: 'FF4338CA',
      label: 'PEAK DAY INTAKE',
      valueText: `${metrics.peakDay.total} docs`,
      subText: metrics.peakDay.date ? formatStatsDateDisplay(metrics.peakDay.date) : 'N/A',
      subColorArgb: 'FF4F46E5',
    },
    {
      startCol: 14,
      endCol: 15,
      accentArgb: 'FF8B5CF6',
      bgArgb: 'FFF5F3FF',
      borderArgb: 'FFDDD6FE',
      valueColorArgb: 'FF6D28D9',
      label: 'MEAN OCR ACCURACY',
      valueText: `${metrics.avgConfidence}%`,
      subText: metrics.avgConfidence >= 95 ? 'High Precision Multi-Pass' : 'Standard OCR Audit Tier',
      subColorArgb: 'FF7C3AED',
    },
  ];

  wsExec.getRow(5).height = 5;
  wsExec.getRow(6).height = 19;
  wsExec.getRow(7).height = 30;
  wsExec.getRow(8).height = 19;
  wsExec.getRow(9).height = 6;

  for (const card of kpiCards) {
    // Row 5: Top Accent Strip
    for (let c = card.startCol; c <= card.endCol; c++) {
      wsExec.getCell(5, c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: card.accentArgb },
      };
    }

    // Row 6: Label
    wsExec.mergeCells(6, card.startCol, 6, card.endCol);
    const lblCell = wsExec.getCell(6, card.startCol);
    lblCell.value = card.label;
    lblCell.font = { name: FONT_NAME, size: 8.5, bold: true, color: { argb: 'FF475569' } };
    lblCell.alignment = { vertical: 'bottom', horizontal: 'left', indent: 1 };

    // Row 7: KPI Big Value
    wsExec.mergeCells(7, card.startCol, 7, card.endCol);
    const valCell = wsExec.getCell(7, card.startCol);
    valCell.value = card.valueText;
    valCell.font = { name: FONT_NAME, size: 19, bold: true, color: { argb: card.valueColorArgb } };
    valCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // Row 8: Sub-caption
    wsExec.mergeCells(8, card.startCol, 8, card.endCol);
    const subCell = wsExec.getCell(8, card.startCol);
    subCell.value = card.subText;
    subCell.font = { name: FONT_NAME, size: 8.5, bold: true, color: { argb: card.subColorArgb } };
    subCell.alignment = { vertical: 'top', horizontal: 'left', indent: 1 };

    // Fill & outline card cells (rows 6..9)
    for (let r = 6; r <= 9; r++) {
      for (let c = card.startCol; c <= card.endCol; c++) {
        const cell = wsExec.getCell(r, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.bgArgb } };
        cell.border = {
          left: c === card.startCol ? { style: 'thin', color: { argb: card.borderArgb } } : undefined,
          right: c === card.endCol ? { style: 'thin', color: { argb: card.borderArgb } } : undefined,
          bottom: r === 9 ? { style: 'medium', color: { argb: card.borderArgb } } : undefined,
        };
      }
    }
  }

  wsExec.getRow(10).height = 12;

  // Chart Grid canvas rows (rows 11..59 sized uniformly so anchored charts look crisp)
  for (let r = 11; r <= 60; r++) {
    wsExec.getRow(r).height = 18;
  }
  wsExec.getRow(26).height = 12;
  wsExec.getRow(43).height = 12;
  wsExec.getRow(60).height = 12;

  // Empty fallback notice if 0 filtered records
  if (filteredRecords.length === 0) {
    wsExec.mergeCells('B12:O16');
    const emptyNotice = wsExec.getCell('B12');
    emptyNotice.value = `No CusDec declarations recorded within the selected window (${startDate} to ${endDate}). Adjust filters and re-export.`;
    emptyNotice.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: 'FF64748B' } };
    emptyNotice.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  // Executive Operational Key Insights Strip (Rows 61..67)
  wsExec.mergeCells('B61:O61');
  const insHeader = wsExec.getCell('B61');
  insHeader.value = 'EXECUTIVE OPERATIONAL HIGHLIGHTS & REPORT SUMMARY';
  insHeader.font = { name: FONT_NAME, size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  insHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  insHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsExec.getRow(61).height = 24;

  const topCommodity = commodityBreakdown[0];
  const topConsignee = topConsignees[0];
  const topDeclarant = topDeclarants[0];
  const insightRows: { tag: string; tagBg: string; tagColor: string; text: string }[] = [
    {
      tag: 'PEAK VELOCITY',
      tagBg: 'FFE0F2FE',
      tagColor: 'FF0369A1',
      text: metrics.peakDay.date
        ? `Highest ingestion occurred on ${formatStatsDateDisplay(metrics.peakDay.date)} with ${metrics.peakDay.total} CusDec filings (Avg: ${metrics.avgDailyVolume} docs/day across ${metrics.activeDaysCount} active day(s)).`
        : 'No active intake days in window.',
    },
    {
      tag: 'DOMINANT CARGO',
      tagBg: 'FFECFEFF',
      tagColor: 'FF0E7490',
      text: topCommodity
        ? `${topCommodity.label} leads cargo intake at ${topCommodity.count} filings (${topCommodity.percent}% share, ${topCommodity.avgConfidence}% mean accuracy).`
        : 'No commodity classifications recorded.',
    },
    {
      tag: 'TOP CONSIGNEE',
      tagBg: 'FFEEF2FF',
      tagColor: 'FF4338CA',
      text: topConsignee
        ? `${topConsignee.name} ranks #1 among importers with ${topConsignee.count} declarations (${topConsignee.percent}% of filtered volume).`
        : 'No consignee records found.',
    },
    {
      tag: 'TOP DECLARANT',
      tagBg: 'FFECFDF5',
      tagColor: 'FF047857',
      text: topDeclarant
        ? `${topDeclarant.name} is the leading clearing agent with ${topDeclarant.count} submissions (${topDeclarant.percent}% share, ${topDeclarant.avgConfidence}% accuracy).`
        : 'No declarant records found.',
    },
    {
      tag: 'WORKBOOK GUIDE',
      tagBg: 'FFF8FAFC',
      tagColor: 'FF334155',
      text: 'All charts above link dynamically to source tables in Tabs 2 & 3 ("Daily Telemetry" & "Category Leaders"), while Tab 4 ("Declarations Ledger") lists all individual records.',
    },
  ];

  insightRows.forEach((item, idx) => {
    const r = 62 + idx;
    wsExec.getRow(r).height = 20;
    wsExec.mergeCells(r, 2, r, 3);
    const tagCell = wsExec.getCell(r, 2);
    tagCell.value = item.tag;
    tagCell.font = { name: FONT_NAME, size: 8.5, bold: true, color: { argb: item.tagColor } };
    tagCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.tagBg } };
    tagCell.alignment = { vertical: 'middle', horizontal: 'center' };

    wsExec.mergeCells(r, 4, r, 15);
    const textCell = wsExec.getCell(r, 4);
    textCell.value = item.text;
    textCell.font = { name: FONT_NAME, size: 9.5, color: { argb: 'FF1E293B' } };
    textCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' },
    };
    textCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    for (let c = 2; c <= 15; c++) {
      wsExec.getCell(r, c).border = thinBorder('FFE2E8F0');
    }
  });

  // ============================================================================
  // SHEET 2: DAILY TELEMETRY (Daily Ledger + Monthly Progression + Monthly Chart)
  // ============================================================================
  const wsDaily = workbook.addWorksheet('Daily Telemetry', {
    properties: { tabColor: { argb: 'FFF59E0B' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 5 }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      margins: { left: 0.35, right: 0.35, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  const dailyColWidths = [6, 14, 24, 18, 20, 18, 20, 18, 24];
  dailyColWidths.forEach((w, i) => {
    wsDaily.getColumn(i + 1).width = w;
  });

  styleBanner(
    wsDaily,
    1,
    9,
    'DAILY & MONTHLY CUSDEC TELEMETRY LEDGER',
    `Date Basis: ${basisLabel}   |   Range: ${startDate} to ${endDate}   |   Source Data for Intake Trendline, Daily Volume & Monthly Charts`,
    'FFF59E0B'
  );
  wsDaily.getRow(4).height = 10;

  const dailyHeaders = [
    '#',
    'Short Date',
    'Calendar Date',
    'Daily Ingested',
    'Cumulative Total',
    'Day Delta',
    'Day Delta (%)',
    'Volume Intensity',
    'Mean OCR Accuracy',
  ];
  const dailyHdrRow = wsDaily.getRow(5);
  dailyHdrRow.height = 26;
  dailyHeaders.forEach((h, idx) => {
    const cell = dailyHdrRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 2 ? 'left' : 'center' };
    cell.border = thinBorder('FF94A3B8');
  });

  const dailyStartRow = 6;
  const safeDailyRows =
    dailyData.length > 0
      ? dailyData
      : [
          {
            date: startDate,
            total: 0,
            confidenceSum: 0,
            avgConfidence: 0,
            cumulative: 0,
            dayDelta: 0,
            dayDeltaPct: 0,
          },
        ];

  safeDailyRows.forEach((d, idx) => {
    const rNum = dailyStartRow + idx;
    const row = wsDaily.getRow(rNum);
    row.height = 22;
    const isPeak = d.total > 0 && d.total === metrics.peakDay.total;
    const bgArgb = isPeak ? 'FFFEF3C7' : idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(2).value = formatStatsDayLabel(d.date);
    row.getCell(2).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF0F172A' } };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(3).value = formatStatsDateDisplay(d.date) + (isPeak ? '  ★ Peak' : '');
    row.getCell(3).font = { name: FONT_NAME, size: 10, bold: isPeak, color: { argb: isPeak ? 'FFB45309' : 'FF1E293B' } };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };

    const cDaily = row.getCell(4);
    cDaily.value = d.total;
    cDaily.numFmt = '#,##0';
    cDaily.font = { name: FONT_NAME, size: 10.5, bold: true, color: { argb: 'FF0369A1' } };
    cDaily.alignment = { horizontal: 'center', vertical: 'middle' };

    const cCum = row.getCell(5);
    cCum.value = d.cumulative;
    cCum.numFmt = '#,##0';
    cCum.font = { name: FONT_NAME, size: 10.5, bold: true, color: { argb: 'FFB45309' } };
    cCum.alignment = { horizontal: 'center', vertical: 'middle' };

    const cDelta = row.getCell(6);
    cDelta.value = d.dayDelta;
    cDelta.numFmt = '+#,##0;-#,##0;0';
    cDelta.font = {
      name: FONT_NAME,
      size: 10,
      bold: true,
      color: { argb: d.dayDelta >= 0 ? 'FF059669' : 'FFE11D48' },
    };
    cDelta.alignment = { horizontal: 'center', vertical: 'middle' };

    const cDeltaPct = row.getCell(7);
    cDeltaPct.value = d.dayDeltaPct / 100;
    cDeltaPct.numFmt = '+0.0%;-0.0%;0.0%';
    cDeltaPct.font = {
      name: FONT_NAME,
      size: 10,
      bold: true,
      color: { argb: d.dayDeltaPct >= 0 ? 'FF059669' : 'FFE11D48' },
    };
    cDeltaPct.alignment = { horizontal: 'center', vertical: 'middle' };

    const intensity = metrics.peakDay.total > 0 ? d.total / metrics.peakDay.total : 0;
    const cInt = row.getCell(8);
    cInt.value = intensity;
    cInt.numFmt = '0.0%';
    cInt.alignment = { horizontal: 'center', vertical: 'middle' };

    const cAcc = row.getCell(9);
    cAcc.value = d.avgConfidence / 100;
    cAcc.numFmt = '0%';
    cAcc.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF047857' } };
    cAcc.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let c = 1; c <= 9; c++) {
      const cell = row.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = thinBorder('FFE2E8F0');
    }
  });

  const dailyEndRow = dailyStartRow + safeDailyRows.length - 1;
  const totalRowNum = dailyEndRow + 1;
  const totalRow = wsDaily.getRow(totalRowNum);
  totalRow.height = 24;

  wsDaily.mergeCells(totalRowNum, 1, totalRowNum, 3);
  totalRow.getCell(1).value = `TOTAL / AVERAGE (${safeDailyRows.length} Days)`;
  totalRow.getCell(1).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  totalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  totalRow.getCell(4).value = { formula: `SUM(D${dailyStartRow}:D${dailyEndRow})`, result: metrics.total };
  totalRow.getCell(4).numFmt = '#,##0';

  totalRow.getCell(5).value = {
    formula: `MAX(E${dailyStartRow}:E${dailyEndRow})`,
    result: safeDailyRows[safeDailyRows.length - 1]?.cumulative || 0,
  };
  totalRow.getCell(5).numFmt = '#,##0';

  totalRow.getCell(6).value = { formula: `AVERAGE(D${dailyStartRow}:D${dailyEndRow})`, result: metrics.avgDailyNum };
  totalRow.getCell(6).numFmt = '"Avg "0.0';

  totalRow.getCell(7).value = '—';
  totalRow.getCell(8).value = { formula: `AVERAGE(H${dailyStartRow}:H${dailyEndRow})`, result: 1 };
  totalRow.getCell(8).numFmt = '0.0%';

  totalRow.getCell(9).value = {
    formula: `AVERAGE(I${dailyStartRow}:I${dailyEndRow})`,
    result: metrics.avgConfidence / 100,
  };
  totalRow.getCell(9).numFmt = '0.0%';

  for (let c = 1; c <= 9; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder('FF0F172A');
  }

  // Monthly Progression Table below Daily Table
  const monthSectionRow = totalRowNum + 3;
  wsDaily.mergeCells(monthSectionRow, 1, monthSectionRow, 9);
  const mBanner = wsDaily.getCell(monthSectionRow, 1);
  mBanner.value = 'MONTHLY INCREMENT / DECREMENT PROGRESSION TELEMETRY';
  mBanner.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  mBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1528' } };
  mBanner.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsDaily.getRow(monthSectionRow).height = 24;

  const mHdrRowNum = monthSectionRow + 1;
  const mHdrRow = wsDaily.getRow(mHdrRowNum);
  mHdrRow.height = 24;
  const mHeaders = ['#', 'Month', 'Declarations', 'Share of Total', 'MoM Delta', 'MoM Growth %', 'Mean OCR Accuracy', 'Trend Status', 'Notes'];
  mHeaders.forEach((h, idx) => {
    const cell = mHdrRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    cell.alignment = { vertical: 'middle', horizontal: idx === 1 || idx === 8 ? 'left' : 'center' };
    cell.border = thinBorder('FF94A3B8');
  });

  const safeMonths =
    monthlyTelemetry.length > 0
      ? monthlyTelemetry
      : [
          {
            monthKey: startDate.slice(0, 7),
            label: startDate.slice(0, 7),
            count: 0,
            deltaDocs: 0,
            deltaPct: 0,
            isPositive: true,
            avgConfidence: 0,
          },
        ];

  const monthStartRow = mHdrRowNum + 1;
  const totalAllRecords = Math.max(records.length, 1);

  safeMonths.forEach((m, idx) => {
    const rNum = monthStartRow + idx;
    const row = wsDaily.getRow(rNum);
    row.height = 22;
    const bgArgb = idx === safeMonths.length - 1 ? 'FFE0F2FE' : idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(2).value = m.label;
    row.getCell(2).font = { name: FONT_NAME, size: 10, bold: true };
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

    row.getCell(3).value = m.count;
    row.getCell(3).numFmt = '#,##0';
    row.getCell(3).font = { name: FONT_NAME, size: 10.5, bold: true, color: { argb: 'FF1D4ED8' } };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(4).value = m.count / totalAllRecords;
    row.getCell(4).numFmt = '0.0%';
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(5).value = idx === 0 ? 0 : m.deltaDocs;
    row.getCell(5).numFmt = '+#,##0;-#,##0;0';
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(6).value = idx === 0 ? 0 : m.deltaPct / 100;
    row.getCell(6).numFmt = '+0.0%;-0.0%;0.0%';
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(7).value = m.avgConfidence / 100;
    row.getCell(7).numFmt = '0%';
    row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(8).value = idx === 0 ? 'BASELINE' : m.isPositive ? 'ASCENDING' : 'DECLINING';
    row.getCell(8).font = {
      name: FONT_NAME,
      size: 9,
      bold: true,
      color: { argb: idx === 0 ? 'FF475569' : m.isPositive ? 'FF047857' : 'FFBE123C' },
    };
    row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(9).value =
      idx === 0
        ? 'Initial observation month'
        : m.isPositive
        ? `+${m.deltaDocs} declarations increment`
        : `${m.deltaDocs} declarations decrement`;
    row.getCell(9).alignment = { horizontal: 'left', vertical: 'middle' };

    for (let c = 1; c <= 9; c++) {
      row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      row.getCell(c).border = thinBorder('FFE2E8F0');
    }
  });
  const monthEndRow = monthStartRow + safeMonths.length - 1;

  // ============================================================================
  // SHEET 3: CATEGORY LEADERS (Commodities, OCR Fidelity, Top Consignees & Declarants)
  // ============================================================================
  const wsLeaders = workbook.addWorksheet('Category Leaders', {
    properties: { tabColor: { argb: 'FF6366F1' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      margins: { left: 0.35, right: 0.35, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  const leaderColWidths = [6, 36, 30, 15, 14, 16, 4, 38, 30, 15, 14, 16];
  leaderColWidths.forEach((w, i) => {
    wsLeaders.getColumn(i + 1).width = w;
  });

  styleBanner(
    wsLeaders,
    1,
    12,
    'CARGO CATEGORIES, OCR PRECISION TIERS & ENTITY VOLUME LEADERBOARDS',
    `Analyzed Volume: ${metrics.total} Declarations   |   Window: ${startDate} to ${endDate}   |   Source Tables for Pie, Doughnut & Leaderboard Bar Charts`,
    'FF6366F1'
  );
  wsLeaders.getRow(4).height = 10;

  // Section 3A (Left, Cols A..F): Cargo Commodity Categories
  wsLeaders.mergeCells('A5:F5');
  const catSecTitle = wsLeaders.getCell('A5');
  catSecTitle.value = 'CARGO COMMODITY SHARE DISTRIBUTION';
  catSecTitle.font = { name: FONT_NAME, size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  catSecTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } };
  catSecTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsLeaders.getRow(5).height = 24;

  const catHeaders = ['#', 'Cargo Commodity Class', 'Chart Label', 'Declarations', 'Share (%)', 'Mean OCR %'];
  const catHdrRow = wsLeaders.getRow(6);
  catHdrRow.height = 23;
  catHeaders.forEach((h, i) => {
    const cell = catHdrRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: FONT_NAME, size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF155E75' } };
    cell.alignment = { vertical: 'middle', horizontal: i === 1 || i === 2 ? 'left' : 'center' };
    cell.border = thinBorder('FF94A3B8');
  });

  const safeCommodities =
    commodityBreakdown.length > 0
      ? commodityBreakdown
      : [{ label: 'No Data', count: 0, percent: 0, color: '#64748b', bgClass: '', avgConfidence: 0 }];

  const catStartRow = 7;
  safeCommodities.forEach((item, idx) => {
    const r = catStartRow + idx;
    const row = wsLeaders.getRow(r);
    row.height = 21;
    const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(2).value = item.label;
    row.getCell(2).font = { name: FONT_NAME, size: 10, bold: true };

    row.getCell(3).value = item.label;
    row.getCell(3).font = { name: FONT_NAME, size: 9.5, color: { argb: 'FF475569' } };

    row.getCell(4).value = item.count;
    row.getCell(4).numFmt = '#,##0';
    row.getCell(4).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF0E7490' } };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(5).value = item.percent / 100;
    row.getCell(5).numFmt = '0.0%';
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(6).value = item.avgConfidence / 100;
    row.getCell(6).numFmt = '0%';
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

    for (let c = 1; c <= 6; c++) {
      row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      row.getCell(c).border = thinBorder('FFE2E8F0');
    }
  });
  const catEndRow = catStartRow + safeCommodities.length - 1;

  // Section 3B (Right, Cols H..L): OCR Precision Fidelity Tiers
  wsLeaders.mergeCells('H5:L5');
  const fidSecTitle = wsLeaders.getCell('H5');
  fidSecTitle.value = 'OCR EXTRACTION PRECISION TIERS';
  fidSecTitle.font = { name: FONT_NAME, size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  fidSecTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
  fidSecTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const fidHeaders = ['Precision Tier', 'Threshold Rule', 'Declarations', 'Share (%)', 'Mean OCR %'];
  fidHeaders.forEach((h, i) => {
    const cell = catHdrRow.getCell(8 + i);
    cell.value = h;
    cell.font = { name: FONT_NAME, size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
    cell.alignment = { vertical: 'middle', horizontal: i <= 1 ? 'left' : 'center' };
    cell.border = thinBorder('FF94A3B8');
  });

  const safeFidelity =
    fidelityBreakdown.length > 0
      ? fidelityBreakdown
      : [{ label: 'No Data', count: 0, percent: 0, color: '#64748b', bgClass: '', avgConfidence: 0 }];

  const fidStartRow = 7;
  safeFidelity.forEach((item, idx) => {
    const r = fidStartRow + idx;
    const row = wsLeaders.getRow(r);
    if (!row.height) row.height = 21;
    const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

    row.getCell(8).value = item.label;
    row.getCell(8).font = { name: FONT_NAME, size: 10, bold: true };

    row.getCell(9).value = item.label.includes('96')
      ? 'Auto-Verified Tier'
      : item.label.includes('90-95')
      ? 'Standard High Fidelity'
      : 'Manual Review Required';
    row.getCell(9).font = { name: FONT_NAME, size: 9.5, color: { argb: 'FF475569' } };

    row.getCell(10).value = item.count;
    row.getCell(10).numFmt = '#,##0';
    row.getCell(10).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF047857' } };
    row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(11).value = item.percent / 100;
    row.getCell(11).numFmt = '0.0%';
    row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(12).value = item.avgConfidence / 100;
    row.getCell(12).numFmt = '0%';
    row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };

    for (let c = 8; c <= 12; c++) {
      row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      row.getCell(c).border = thinBorder('FFE2E8F0');
    }
  });
  const fidEndRow = fidStartRow + safeFidelity.length - 1;

  // Section 3C & 3D: Top Consignees (Cols A..F) & Top Declarants (Cols H..L)
  const entityTitleRow = Math.max(catEndRow, fidEndRow) + 3;
  wsLeaders.getRow(entityTitleRow).height = 24;

  wsLeaders.mergeCells(entityTitleRow, 1, entityTitleRow, 6);
  const conTitle = wsLeaders.getCell(entityTitleRow, 1);
  conTitle.value = 'TOP 10 INGESTED CONSIGNEES (BOX 8 LEADERBOARD)';
  conTitle.font = { name: FONT_NAME, size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  conTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
  conTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  wsLeaders.mergeCells(entityTitleRow, 8, entityTitleRow, 12);
  const decTitle = wsLeaders.getCell(entityTitleRow, 8);
  decTitle.value = 'TOP 10 DECLARANT & CLEARING AGENTS (BOX 14)';
  decTitle.font = { name: FONT_NAME, size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  decTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
  decTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  const entityHdrRowNum = entityTitleRow + 1;
  const entityHdrRow = wsLeaders.getRow(entityHdrRowNum);
  entityHdrRow.height = 23;

  ['Rank', 'Consignee Name (Box 8)', 'Short Chart Label', 'Declarations', 'Share (%)', 'Mean OCR %'].forEach(
    (h, i) => {
      const cell = entityHdrRow.getCell(1 + i);
      cell.value = h;
      cell.font = { name: FONT_NAME, size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: i === 1 || i === 2 ? 'left' : 'center' };
      cell.border = thinBorder('FF94A3B8');
    }
  );

  ['Declarant Agent Name (Box 14)', 'Short Chart Label', 'Declarations', 'Share (%)', 'Mean OCR %'].forEach(
    (h, i) => {
      const cell = entityHdrRow.getCell(8 + i);
      cell.value = h;
      cell.font = { name: FONT_NAME, size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
      cell.alignment = { vertical: 'middle', horizontal: i <= 1 ? 'left' : 'center' };
      cell.border = thinBorder('FF94A3B8');
    }
  );

  const entityStartRow = entityHdrRowNum + 1;
  const safeConsignees =
    topConsignees.length > 0
      ? topConsignees
      : [{ name: 'No Consignee Data', count: 0, percent: 0, avgConfidence: 0 }];
  const safeDeclarants =
    topDeclarants.length > 0
      ? topDeclarants
      : [{ name: 'No Declarant Data', count: 0, percent: 0, avgConfidence: 0 }];

  const maxEntities = Math.max(safeConsignees.length, safeDeclarants.length);
  for (let idx = 0; idx < maxEntities; idx++) {
    const r = entityStartRow + idx;
    const row = wsLeaders.getRow(r);
    row.height = 22;
    const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

    const con = safeConsignees[idx];
    if (con) {
      row.getCell(1).value = idx + 1;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(2).value = con.name;
      row.getCell(2).font = { name: FONT_NAME, size: 10, bold: true };

      row.getCell(3).value = shortenChartLabel(con.name, 30);
      row.getCell(3).font = { name: FONT_NAME, size: 9, color: { argb: 'FF475569' } };

      row.getCell(4).value = con.count;
      row.getCell(4).numFmt = '#,##0';
      row.getCell(4).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF4338CA' } };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(5).value = con.percent / 100;
      row.getCell(5).numFmt = '0.0%';
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(6).value = con.avgConfidence / 100;
      row.getCell(6).numFmt = '0%';
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

      for (let c = 1; c <= 6; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        row.getCell(c).border = thinBorder('FFE2E8F0');
      }
    }

    const dec = safeDeclarants[idx];
    if (dec) {
      row.getCell(8).value = dec.name;
      row.getCell(8).font = { name: FONT_NAME, size: 10, bold: true };

      row.getCell(9).value = shortenChartLabel(dec.name, 30);
      row.getCell(9).font = { name: FONT_NAME, size: 9, color: { argb: 'FF475569' } };

      row.getCell(10).value = dec.count;
      row.getCell(10).numFmt = '#,##0';
      row.getCell(10).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF0369A1' } };
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(11).value = dec.percent / 100;
      row.getCell(11).numFmt = '0.0%';
      row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };

      row.getCell(12).value = dec.avgConfidence / 100;
      row.getCell(12).numFmt = '0%';
      row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };

      for (let c = 8; c <= 12; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        row.getCell(c).border = thinBorder('FFE2E8F0');
      }
    }
  }

  const conEndRow = entityStartRow + safeConsignees.length - 1;
  const decEndRow = entityStartRow + safeDeclarants.length - 1;

  // Give clean uniform row heights below entities for embedded Tab 3 Declarants chart
  const leadersChartStartRow = Math.max(conEndRow, decEndRow) + 2;
  for (let r = leadersChartStartRow; r <= leadersChartStartRow + 18; r++) {
    wsLeaders.getRow(r).height = 18;
  }

  // ============================================================================
  // SHEET 4: DECLARATIONS LEDGER (Full Filtered Declarations with @ leading zeros)
  // ============================================================================
  const wsLedger = workbook.addWorksheet('Declarations Ledger', {
    properties: { tabColor: { argb: 'FF10B981' } },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 5 }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      printTitlesRow: '1:5',
      margins: { left: 0.3, right: 0.3, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 },
    },
  });

  const ledgerCols = [
    { header: '#', width: 7 },
    { header: 'Counter Stamp', width: 16 },
    { header: 'Customs Ref No', width: 22 },
    { header: 'Customs Date', width: 15 },
    { header: 'Ingestion Date', width: 16 },
    { header: 'Consignee (Box 8)', width: 38 },
    { header: 'Declarant / Agent (Box 14)', width: 38 },
    { header: 'Cargo Category', width: 22 },
    { header: 'Goods Description', width: 44 },
    { header: 'OCR Confidence', width: 16 },
    { header: 'Status', width: 16 },
  ];
  ledgerCols.forEach((col, i) => {
    wsLedger.getColumn(i + 1).width = col.width;
  });

  styleBanner(
    wsLedger,
    1,
    ledgerCols.length,
    'FILTERED CUSTOMS DECLARATIONS (CUSDEC) AUDIT LEDGER',
    `Date Basis: ${basisLabel}   |   Window: ${startDate} to ${endDate}   |   Entries: ${filteredRecords.length}   |   Sorted: Counter Stamp (Ascending)`,
    'FF10B981'
  );
  wsLedger.getRow(4).height = 10;

  const lHdrRow = wsLedger.getRow(5);
  lHdrRow.height = 25;
  ledgerCols.forEach((col, idx) => {
    const cell = lHdrRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    cell.alignment = { vertical: 'middle', horizontal: idx >= 5 && idx <= 8 ? 'left' : 'center' };
    cell.border = thinBorder('FF94A3B8');
  });

  const sortedLedger = [...filteredRecords].sort((a, b) => {
    const numA = parseInt(String(a.greenStampNumber || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(String(b.greenStampNumber || '').replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;
    return String(a.greenStampNumber || '').localeCompare(String(b.greenStampNumber || ''));
  });

  sortedLedger.forEach((rec, idx) => {
    const row = wsLedger.getRow(6 + idx);
    row.height = 21;
    const bgZebra = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

    row.getCell(1).value = idx + 1;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const cStamp = row.getCell(2);
    cStamp.value = String(rec.greenStampNumber || '000000').padStart(6, '0');
    cStamp.numFmt = '@';
    cStamp.font = { name: 'Consolas', size: 10.5, bold: true, color: { argb: 'FF047857' } };
    cStamp.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
    cStamp.alignment = { horizontal: 'center', vertical: 'middle' };

    const cRef = row.getCell(3);
    cRef.value = String(rec.customsRefNumber || '');
    cRef.numFmt = '@';
    cRef.font = { name: FONT_NAME, size: 10, bold: true };
    cRef.alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(4).value = rec.customsDate || '—';
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(5).value = parseRecordDate(rec, 'created') || '—';
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(6).value = rec.consigneeName || '';
    row.getCell(6).font = { name: FONT_NAME, size: 10, bold: true };

    row.getCell(7).value = rec.declarantName || 'NOT SPECIFIED';

    row.getCell(8).value = getCommodityCategory(rec.goodsDescription);
    row.getCell(8).font = { name: FONT_NAME, size: 9.5, color: { argb: 'FF0E7490' }, bold: true };

    row.getCell(9).value = rec.goodsDescription || '';

    const cConf = row.getCell(10);
    cConf.value = Number(rec.confidence || 0) / 100;
    cConf.numFmt = '0%';
    cConf.font = {
      name: FONT_NAME,
      size: 10,
      bold: true,
      color: { argb: Number(rec.confidence || 0) >= 90 ? 'FF047857' : 'FFB45309' },
    };
    cConf.alignment = { horizontal: 'center', vertical: 'middle' };

    const cStatus = row.getCell(11);
    cStatus.value = rec.status || 'VERIFIED';
    const isVerified = rec.status === 'VERIFIED';
    const isCorrected = rec.status === 'CORRECTED';
    cStatus.font = {
      name: FONT_NAME,
      size: 9.5,
      bold: true,
      color: { argb: isVerified ? 'FF065F46' : isCorrected ? 'FF1D4ED8' : 'FFB45309' },
    };
    cStatus.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isVerified ? 'FFD1FAE5' : isCorrected ? 'FFDBEAFE' : 'FFFEF3C7' },
    };
    cStatus.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let c = 1; c <= ledgerCols.length; c++) {
      if (c !== 2 && c !== 11) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgZebra } };
      }
      row.getCell(c).border = thinBorder('FFE2E8F0');
    }
  });

  wsLedger.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: ledgerCols.length },
  };

  // Write initial ExcelJS buffer
  const rawUint8 = await workbook.xlsx.writeBuffer();
  const baseBuffer = Buffer.from(rawUint8);

  // ============================================================================
  // INJECT NATIVE INTERACTIVE OOXML CHARTS (LINE, COLUMN, DOUGHNUT, BAR, PIE)
  // ============================================================================
  if (filteredRecords.length === 0) {
    return baseBuffer;
  }

  const charts: OoxmlChartSpec[] = [];

  // Daily Chart Arrays
  const dayCats = safeDailyRows.map((d) => formatStatsDayLabel(d.date));
  const dayDailyVals = safeDailyRows.map((d) => d.total);
  const dayCumVals = safeDailyRows.map((d) => d.cumulative);
  const peakIdx = safeDailyRows.findIndex((d) => d.total === metrics.peakDay.total && d.total > 0);
  const dayBarColors = safeDailyRows.map((_, i) => (i === peakIdx ? '06B6D4' : '2563EB'));

  // CHART 1 (Sheet 1, Full-width Top): Smooth Line Chart (Trendline OR Cumulative Curve)
  const useCumulativeLine = trajectoryMode === 'cumulative';
  charts.push({
    sheetIndex: 1,
    type: 'line',
    title: useCumulativeLine
      ? 'Cumulative CusDec Intake Trajectory (Ascending Volume Curve)'
      : 'Daily CusDec Intake Trendline (Volume Velocity Trajectory)',
    anchor: { fromCol: 1, fromRow: 10, toCol: 15, toRow: 25 },
    categoriesFormula: `'Daily Telemetry'!$B$${dailyStartRow}:$B$${dailyEndRow}`,
    categories: dayCats,
    series: [
      {
        name: useCumulativeLine ? 'Cumulative Total' : 'Daily Ingested',
        nameFormula: useCumulativeLine ? `'Daily Telemetry'!$E$5` : `'Daily Telemetry'!$D$5`,
        valuesFormula: useCumulativeLine
          ? `'Daily Telemetry'!$E$${dailyStartRow}:$E$${dailyEndRow}`
          : `'Daily Telemetry'!$D$${dailyStartRow}:$D$${dailyEndRow}`,
        values: useCumulativeLine ? dayCumVals : dayDailyVals,
        color: 'F59E0B',
        smooth: true,
      },
    ],
    legendPos: 't',
    showValLabels: true,
    cardBorderColor: 'FCD34D',
    plotFillColor: 'FFFDF8',
  });

  // CHART 2 (Sheet 1, Row 2 Left): Vertical Column Bar Chart (Daily Volume Breakdown)
  charts.push({
    sheetIndex: 1,
    type: 'column',
    title: 'Daily CusDec Entry Volume Breakdown (Peak Day Highlighted)',
    anchor: { fromCol: 1, fromRow: 26, toCol: 9, toRow: 42 },
    categoriesFormula: `'Daily Telemetry'!$B$${dailyStartRow}:$B$${dailyEndRow}`,
    categories: dayCats,
    series: [
      {
        name: 'Daily Declarations',
        nameFormula: `'Daily Telemetry'!$D$5`,
        valuesFormula: `'Daily Telemetry'!$D$${dailyStartRow}:$D$${dailyEndRow}`,
        values: dayDailyVals,
        color: '0284C7',
        pointColors: dayBarColors,
      },
    ],
    legendPos: 'none',
    showValLabels: true,
    cardBorderColor: '7DD3FC',
    plotFillColor: 'F8FAFC',
  });

  // CHART 3 (Sheet 1, Row 2 Right): Colorful Doughnut Chart (Primary Distribution matching active toggle)
  const commodityCats = safeCommodities.map((c) => c.label);
  const commodityVals = safeCommodities.map((c) => c.count);
  const commodityColors = safeCommodities.map((c, i) =>
    DOUGHNUT_CATEGORY_COLORS[c.label] || c.color.replace(/^#/, '') || PALETTE_MULTI[i % PALETTE_MULTI.length]
  );

  const fidelityCats = safeFidelity.map((f) => f.label);
  const fidelityVals = safeFidelity.map((f) => f.count);
  const fidelityColors = safeFidelity.map((f, i) =>
    f.color.replace(/^#/, '') || PALETTE_MULTI[i % PALETTE_MULTI.length]
  );

  const isFidelityPrimary = pieMode === 'fidelity';
  charts.push({
    sheetIndex: 1,
    type: 'doughnut',
    title: isFidelityPrimary ? 'OCR Extraction Precision Share' : 'Cargo Commodity Share Distribution',
    anchor: { fromCol: 10, fromRow: 26, toCol: 15, toRow: 42 },
    categoriesFormula: isFidelityPrimary
      ? `'Category Leaders'!$H$${fidStartRow}:$H$${fidEndRow}`
      : `'Category Leaders'!$B$${catStartRow}:$B$${catEndRow}`,
    categories: isFidelityPrimary ? fidelityCats : commodityCats,
    series: [
      {
        name: isFidelityPrimary ? 'Precision Share' : 'Cargo Share',
        valuesFormula: isFidelityPrimary
          ? `'Category Leaders'!$J$${fidStartRow}:$J$${fidEndRow}`
          : `'Category Leaders'!$D$${catStartRow}:$D$${catEndRow}`,
        values: isFidelityPrimary ? fidelityVals : commodityVals,
        color: '06B6D4',
        pointColors: isFidelityPrimary ? fidelityColors : commodityColors,
      },
    ],
    legendPos: 'b',
    showValLabels: false,
    showPercentLabels: true,
    holeSize: 55,
    cardBorderColor: '67E8F9',
  });

  // CHART 4 (Sheet 1, Row 3 Left): Multi-Color Horizontal Bar Chart (Top Consignees Leaderboard)
  const conTopN = safeConsignees.slice(0, 7);
  const conChartEndRow = entityStartRow + conTopN.length - 1;
  charts.push({
    sheetIndex: 1,
    type: 'bar',
    title: 'Top Ingested Consignees Leaderboard (Box 8)',
    anchor: { fromCol: 1, fromRow: 43, toCol: 9, toRow: 59 },
    categoriesFormula: `'Category Leaders'!$C$${entityStartRow}:$C$${conChartEndRow}`,
    categories: conTopN.map((c) => shortenChartLabel(c.name, 30)),
    series: [
      {
        name: 'Declarations',
        nameFormula: `'Category Leaders'!$D$${entityHdrRowNum}`,
        valuesFormula: `'Category Leaders'!$D$${entityStartRow}:$D$${conChartEndRow}`,
        values: conTopN.map((c) => c.count),
        color: '4F46E5',
        pointColors: conTopN.map((_, i) => PALETTE_MULTI[i % PALETTE_MULTI.length]),
      },
    ],
    legendPos: 'none',
    showValLabels: true,
    cardBorderColor: 'A5B4FC',
    plotFillColor: 'F8FAFC',
  });

  // CHART 5 (Sheet 1, Row 3 Right): Colorful Pie Chart (Complementary Breakdown: Fidelity Tiers / Cargo Share)
  charts.push({
    sheetIndex: 1,
    type: 'pie',
    title: isFidelityPrimary ? 'Cargo Commodity Breakdown' : 'OCR Precision Fidelity Breakdown',
    anchor: { fromCol: 10, fromRow: 43, toCol: 15, toRow: 59 },
    categoriesFormula: isFidelityPrimary
      ? `'Category Leaders'!$B$${catStartRow}:$B$${catEndRow}`
      : `'Category Leaders'!$H$${fidStartRow}:$H$${fidEndRow}`,
    categories: isFidelityPrimary ? commodityCats : fidelityCats,
    series: [
      {
        name: isFidelityPrimary ? 'Cargo Share' : 'OCR Precision',
        valuesFormula: isFidelityPrimary
          ? `'Category Leaders'!$D$${catStartRow}:$D$${catEndRow}`
          : `'Category Leaders'!$J$${fidStartRow}:$J$${fidEndRow}`,
        values: isFidelityPrimary ? commodityVals : fidelityVals,
        color: '10B981',
        pointColors: isFidelityPrimary ? commodityColors : fidelityColors,
      },
    ],
    legendPos: 'b',
    showValLabels: true,
    showPercentLabels: true,
    cardBorderColor: '6EE7B7',
  });

  // CHART 6 (Sheet 2: Daily Telemetry): Monthly Comparison Column Chart right below Monthly Table
  const monthChartFromRow = monthEndRow + 2;
  for (let r = monthChartFromRow + 1; r <= monthChartFromRow + 17; r++) {
    wsDaily.getRow(r).height = 18;
  }
  charts.push({
    sheetIndex: 2,
    type: 'column',
    title: 'Monthly Declaration Volume Progression',
    anchor: { fromCol: 0, fromRow: monthChartFromRow, toCol: 9, toRow: monthChartFromRow + 16 },
    categoriesFormula: `'Daily Telemetry'!$B$${monthStartRow}:$B$${monthEndRow}`,
    categories: safeMonths.map((m) => m.label),
    series: [
      {
        name: 'Monthly Declarations',
        nameFormula: `'Daily Telemetry'!$C$${mHdrRowNum}`,
        valuesFormula: `'Daily Telemetry'!$C$${monthStartRow}:$C$${monthEndRow}`,
        values: safeMonths.map((m) => m.count),
        color: '1D4ED8',
        pointColors: safeMonths.map((_, i) => PALETTE_MULTI[i % PALETTE_MULTI.length]),
      },
    ],
    legendPos: 'none',
    showValLabels: true,
    cardBorderColor: '93C5FD',
    plotFillColor: 'F8FAFC',
  });

  // CHART 7 (Sheet 3: Category Leaders): Top Declarants & Clearing Agents Horizontal Bar Chart
  const decTopN = safeDeclarants.slice(0, 8);
  const decChartEndRow = entityStartRow + decTopN.length - 1;
  charts.push({
    sheetIndex: 3,
    type: 'bar',
    title: 'Top Declarant & Clearing Agents (Box 14)',
    anchor: { fromCol: 0, fromRow: leadersChartStartRow, toCol: 12, toRow: leadersChartStartRow + 17 },
    categoriesFormula: `'Category Leaders'!$I$${entityStartRow}:$I$${decChartEndRow}`,
    categories: decTopN.map((d) => shortenChartLabel(d.name, 30)),
    series: [
      {
        name: 'Submissions',
        nameFormula: `'Category Leaders'!$J$${entityHdrRowNum}`,
        valuesFormula: `'Category Leaders'!$J$${entityStartRow}:$J$${decChartEndRow}`,
        values: decTopN.map((d) => d.count),
        color: '0EA5E9',
        pointColors: decTopN.map((_, i) => PALETTE_MULTI[(i + 1) % PALETTE_MULTI.length]),
      },
    ],
    legendPos: 'none',
    showValLabels: true,
    cardBorderColor: '7DD3FC',
    plotFillColor: 'F8FAFC',
  });

  return injectOoxmlCharts(baseBuffer, charts);
}
