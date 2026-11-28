import ExcelJS from 'exceljs';
import { CusDecRecord } from './types';
import { formatLongDateDisplay, parseRecordDate } from './dateUtils';
import { evaluateCusDecTallyFlag, getOrganizationRegistryMeta } from './organizationRegistry';

const FONT_NAME = 'Segoe UI';

function formatShortIsoDate(val?: string | null): string {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-GB');
}

function thinBorder(argb = 'FFE2E8F0'): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin', color: { argb } },
    bottom: { style: 'thin', color: { argb } },
    left: { style: 'thin', color: { argb } },
    right: { style: 'thin', color: { argb } },
  };
}

/**
 * Generate a styled, multi-sheet Excel report strictly containing Flagged CusDec entries
 * (Consignee Matched OR Consignee + Declarant Both Matched — Declarant-Only excluded).
 */
export async function generateFlaggedCusDecExcel(
  records: CusDecRecord[],
  options?: { dateLabel?: string; searchLabel?: string }
): Promise<Buffer> {
  // Always recompute / guarantee up-to-date flag state
  const enriched = records
    .map((r) => ({
      ...r,
      tallyFlag: evaluateCusDecTallyFlag(r.consigneeName, r.declarantName),
    }))
    .filter((r) => r.tallyFlag?.isFlagged);

  // Sort by Counter Stamp ascending (preserving leading zeros cleanly)
  const sorted = [...enriched].sort((a, b) => {
    const numA = parseInt(String(a.greenStampNumber || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(String(b.greenStampNumber || '').replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;
    return String(a.greenStampNumber || '').localeCompare(String(b.greenStampNumber || ''));
  });

  const meta = getOrganizationRegistryMeta();
  const bothCount = sorted.filter((r) => r.tallyFlag?.matchType === 'CONSIGNEE_AND_DECLARANT').length;
  const consigneeOnlyCount = sorted.filter((r) => r.tallyFlag?.matchType === 'CONSIGNEE_ONLY').length;
  const uniqueOrgs = new Set(sorted.map((r) => r.tallyFlag?.matchedConsigneeOrg || r.consigneeName)).size;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LRSYS Sri Lanka Customs Long Room';
  workbook.lastModifiedBy = 'LRSYS Tally Flag Engine';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ===========================================================================
  // SHEET 1: FLAGGED DECLARATIONS LEDGER
  // ===========================================================================
  const ws = workbook.addWorksheet('Flagged CusDec Entries', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 6 }],
  });

  const TOTAL_COLS = 13;

  // Row 1: Executive Title Banner
  ws.mergeCells(1, 1, 1, TOTAL_COLS);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = 'SRI LANKA CUSTOMS — FLAGGED CUSDEC TALLY REPORT';
  titleCell.font = { name: FONT_NAME, size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1528' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 34;

  // Row 2: Subtitle & Matching Policy
  ws.mergeCells(2, 1, 2, TOTAL_COLS);
  const subCell = ws.getCell(2, 1);
  const scopeText = options?.dateLabel ? `Date Scope: ${options.dateLabel}` : 'Date Scope: All Days';
  const searchText = options?.searchLabel ? `  |  Search Filter: "${options.searchLabel}"` : '';
  subCell.value = `${scopeText}${searchText}  |  Registry: ${meta.sourceFile} (${meta.uniqueOrganizations.toLocaleString()} orgs)  |  Rule: Consignee OR Consignee+Declarant Match (Declarant-Only Excluded)  |  Generated: ${new Date().toLocaleString('en-GB')}`;
  subCell.font = { name: FONT_NAME, size: 9.5, color: { argb: 'FFE2E8F0' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 22;

  // Row 3: Accent Divider Strip
  for (let c = 1; c <= TOTAL_COLS; c++) {
    ws.getCell(3, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } };
  }
  ws.getRow(3).height = 4;

  // Row 4: Summary KPI Strip
  ws.getRow(4).height = 28;
  const kpis = [
    { cols: [1, 3], label: `TOTAL FLAGGED: ${sorted.length}`, bg: 'FFFFF1F2', fg: 'FFBE123C', border: 'FFFDA4AF' },
    { cols: [4, 6], label: `CONSIGNEE + DECLARANT: ${bothCount}`, bg: 'FFF5F3FF', fg: 'FF6D28D9', border: 'FFC4B5FD' },
    { cols: [7, 9], label: `CONSIGNEE ONLY: ${consigneeOnlyCount}`, bg: 'FFFFF7ED', fg: 'FFC2410C', border: 'FFFDBA74' },
    { cols: [10, 11], label: `UNIQUE ORGS: ${uniqueOrgs}`, bg: 'FFECFEFF', fg: 'FF0E7490', border: 'FF67E8F9' },
    { cols: [12, 13], label: `CERTIFICATES IN DB: ${meta.totalCertificates.toLocaleString()}`, bg: 'FFF8FAFC', fg: 'FF334155', border: 'FFCBD5E1' },
  ];

  for (const kpi of kpis) {
    ws.mergeCells(4, kpi.cols[0], 4, kpi.cols[1]);
    const cell = ws.getCell(4, kpi.cols[0]);
    cell.value = kpi.label;
    cell.font = { name: FONT_NAME, size: 10.5, bold: true, color: { argb: kpi.fg } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.bg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let c = kpi.cols[0]; c <= kpi.cols[1]; c++) {
      ws.getCell(4, c).border = thinBorder(kpi.border);
    }
  }

  ws.getRow(5).height = 8;

  // Row 6: Table Column Headers
  const columns = [
    { header: '#', width: 6, align: 'center' as const },
    { header: 'Counter Stamp No', width: 18, align: 'center' as const },
    { header: 'Customs Ref No', width: 18, align: 'center' as const },
    { header: 'Upload Date', width: 15, align: 'center' as const },
    { header: 'Flag Match Tier', width: 24, align: 'center' as const },
    { header: 'CusDec Consignee (Box 8)', width: 34, align: 'left' as const },
    { header: 'Matched Registry Organization', width: 34, align: 'left' as const },
    { header: 'Certs Count', width: 12, align: 'center' as const },
    { header: 'Latest Cert Expiry', width: 16, align: 'center' as const },
    { header: 'CusDec Declarant / Agent', width: 32, align: 'left' as const },
    { header: 'Declarant Registry Match', width: 30, align: 'left' as const },
    { header: 'Status', width: 14, align: 'center' as const },
    { header: 'Confidence', width: 13, align: 'center' as const },
  ];

  const headerRow = ws.getRow(6);
  headerRow.height = 26;
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { vertical: 'middle', horizontal: col.align, wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FFE11D48' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    };
  });

  // Rows 7+: Flagged CusDec Data
  sorted.forEach((r, idx) => {
    const rowNum = 7 + idx;
    const row = ws.getRow(rowNum);
    row.height = 22;

    const isBoth = r.tallyFlag?.matchType === 'CONSIGNEE_AND_DECLARANT';
    const uploadDate = parseRecordDate(r, 'created');
    const formattedDate = uploadDate ? formatLongDateDisplay(uploadDate) : r.customsDate || '—';
    const bgZebra = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

    const vals = [
      idx + 1,
      String(r.greenStampNumber || '000000').padStart(6, '0'),
      String(r.customsRefNumber || '—'),
      formattedDate,
      isBoth ? 'CONSIGNEE + DECLARANT' : 'CONSIGNEE MATCHED',
      r.consigneeName || 'UNKNOWN',
      r.tallyFlag?.matchedConsigneeOrg || '—',
      r.tallyFlag?.consigneeCertCount ?? 1,
      formatShortIsoDate(r.tallyFlag?.consigneeLatestExpiry),
      r.declarantName || 'NOT SPECIFIED',
      isBoth && r.tallyFlag?.matchedDeclarantOrg
        ? r.tallyFlag.matchedDeclarantOrg
        : '— (Not Matched)',
      r.status || 'NEEDS_REVIEW',
      r.confidence ? `${r.confidence}%` : '—',
    ];

    vals.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: FONT_NAME, size: 10, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgZebra } };
      cell.alignment = { vertical: 'middle', horizontal: columns[colIdx].align };
      cell.border = thinBorder('FFE2E8F0');
    });

    // Preserve leading zeros & styling for Counter Stamp
    const stampCell = row.getCell(2);
    stampCell.numFmt = '@';
    stampCell.font = { name: 'Consolas', size: 10.5, bold: true, color: { argb: 'FF047857' } };
    stampCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };

    // Customs Ref as text
    row.getCell(3).numFmt = '@';
    row.getCell(3).font = { name: 'Consolas', size: 10, bold: true, color: { argb: 'FF1E293B' } };

    // Highlight Flag Match Tier pill column
    const tierCell = row.getCell(5);
    if (isBoth) {
      tierCell.font = { name: FONT_NAME, size: 9.5, bold: true, color: { argb: 'FF6D28D9' } };
      tierCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
    } else {
      tierCell.font = { name: FONT_NAME, size: 9.5, bold: true, color: { argb: 'FFBE123C' } };
      tierCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
    }

    // Highlight Consignee & Matched Org
    row.getCell(6).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF0F172A' } };
    row.getCell(7).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF0E7490' } };

    // Highlight Declarant if Both matched
    if (isBoth) {
      row.getCell(10).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF5B21B6' } };
      row.getCell(11).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF5B21B6' } };
      row.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF5FF' } };
    } else {
      row.getCell(11).font = { name: FONT_NAME, size: 9.5, italic: true, color: { argb: 'FF94A3B8' } };
    }
  });

  columns.forEach((col, idx) => {
    ws.getColumn(idx + 1).width = col.width;
  });

  ws.autoFilter = {
    from: { row: 6, column: 1 },
    to: { row: 6, column: TOTAL_COLS },
  };

  // ===========================================================================
  // SHEET 2: MATCHED ORGANIZATION SUMMARY
  // ===========================================================================
  const wsSummary = workbook.addWorksheet('Matched Organizations Summary', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }],
  });

  const SUM_COLS = 7;
  wsSummary.mergeCells(1, 1, 1, SUM_COLS);
  const sumTitle = wsSummary.getCell(1, 1);
  sumTitle.value = 'FLAGGED ORGANIZATIONS FREQUENCY SUMMARY';
  sumTitle.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  sumTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1528' } };
  sumTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsSummary.getRow(1).height = 30;

  wsSummary.mergeCells(2, 1, 2, SUM_COLS);
  const sumSub = wsSummary.getCell(2, 1);
  sumSub.value = `Grouped by Matched Registry Organization  |  ${uniqueOrgs} Unique Organizations Flagged across ${sorted.length} CusDecs`;
  sumSub.font = { name: FONT_NAME, size: 9.5, color: { argb: 'FFE2E8F0' } };
  sumSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  sumSub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsSummary.getRow(2).height = 20;

  wsSummary.getRow(3).height = 6;

  const summaryCols = [
    { header: '#', width: 6, align: 'center' as const },
    { header: 'Matched Registry Organization', width: 42, align: 'left' as const },
    { header: 'Flagged CusDecs', width: 16, align: 'center' as const },
    { header: 'Consignee Only', width: 16, align: 'center' as const },
    { header: 'Both Matched', width: 16, align: 'center' as const },
    { header: 'Registry Certs', width: 15, align: 'center' as const },
    { header: 'Sample Stamp Nos', width: 32, align: 'left' as const },
  ];

  const sumHeader = wsSummary.getRow(4);
  sumHeader.height = 25;
  summaryCols.forEach((col, idx) => {
    const cell = sumHeader.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    cell.alignment = { vertical: 'middle', horizontal: col.align };
    cell.border = thinBorder('FF94A3B8');
  });

  const orgAgg = new Map<
    string,
    { orgName: string; total: number; cOnly: number; both: number; certs: number; stamps: string[] }
  >();

  for (const r of sorted) {
    const key = r.tallyFlag?.matchedConsigneeOrg || r.consigneeName || 'UNKNOWN';
    const existing = orgAgg.get(key) || {
      orgName: key,
      total: 0,
      cOnly: 0,
      both: 0,
      certs: r.tallyFlag?.consigneeCertCount || 1,
      stamps: [],
    };
    existing.total += 1;
    if (r.tallyFlag?.matchType === 'CONSIGNEE_AND_DECLARANT') {
      existing.both += 1;
    } else {
      existing.cOnly += 1;
    }
    const stamp = String(r.greenStampNumber || '').padStart(6, '0');
    if (stamp && existing.stamps.length < 8 && !existing.stamps.includes(stamp)) {
      existing.stamps.push(stamp);
    }
    orgAgg.set(key, existing);
  }

  const orgRows = Array.from(orgAgg.values()).sort((a, b) =>
    b.total !== a.total ? b.total - a.total : a.orgName.localeCompare(b.orgName)
  );

  orgRows.forEach((item, idx) => {
    const row = wsSummary.getRow(5 + idx);
    row.height = 21;
    const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
    const vals = [
      idx + 1,
      item.orgName,
      item.total,
      item.cOnly,
      item.both,
      item.certs,
      item.stamps.join(', '),
    ];
    vals.forEach((v, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = v;
      cell.font = {
        name: FONT_NAME,
        size: 10,
        bold: cIdx === 1 || cIdx === 2,
        color: { argb: 'FF0F172A' },
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.alignment = { vertical: 'middle', horizontal: summaryCols[cIdx].align };
      cell.border = thinBorder('FFE2E8F0');
    });
  });

  summaryCols.forEach((col, idx) => {
    wsSummary.getColumn(idx + 1).width = col.width;
  });
  wsSummary.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: SUM_COLS },
  };

  const uint8 = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8);
}
