import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { isXlsxBuffer, parseCsvString } from './tally';
import {
  CusDecRecord,
  CusDecTallyFlag,
  OrganizationRegistryMeta,
  RegisteredOrganizationEntry,
} from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const REGISTRY_FILE = path.join(DATA_DIR, 'registered_organizations.json');
const SEED_FILE = path.join(process.cwd(), 'scripts', 'registered_organizations_seed.json');

interface PersistedOrganizationPayload {
  sourceFile: string;
  asOfLabel?: string;
  importedAt: string;
  totalCertificates: number;
  uniqueOrganizations: number;
  declaredUniqueCount?: number;
  totalRegisteredCompaniesNote?: number;
  organizations: RegisteredOrganizationEntry[];
}

interface OrganizationRegistryCache {
  meta: OrganizationRegistryMeta;
  organizations: RegisteredOrganizationEntry[];
  exactNormMap: Map<string, RegisteredOrganizationEntry>;
  compactMap: Map<string, RegisteredOrganizationEntry>;
  loadedAt: number;
}

const PLACEHOLDER_NAMES = new Set([
  'UNKNOWN',
  'UNKNOWN CONSIGNEE',
  'UNKNOWN DECLARANT',
  'NOT SPECIFIED',
  'N A',
  'NA',
  'NONE',
  'NIL',
]);

/**
 * Normalize a Sri Lanka Customs company / organization / declarant name for deterministic matching.
 * Handles `(Pvt) Ltd` vs `(Private) Limited` vs `Limited` vs `PLC`, `&` vs `AND`, `Int'l` vs `International`,
 * punctuation, extra spaces, and missing spacing around parentheses.
 */
export function normalizeOrgName(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .toUpperCase()
    .replace(/\u2019|\u2018/g, "'")
    .replace(/&/g, ' AND ')
    .replace(/\bINT'?L\b/g, 'INTERNATIONAL')
    .replace(/\(?\s*(?:PVT|PRIVATE)\.?\s*\)?\s*(?:LTD|LIMITED)\.?/g, ' ')
    .replace(/\b(LIMITED|LTD|PLC|INC|CORP|CORPORATION|LLC|CO|COMPANY)\b/g, ' ')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toCompactKey(norm: string): string {
  return norm.replace(/\s+/g, '');
}

function buildRegistryCache(payload: PersistedOrganizationPayload): OrganizationRegistryCache {
  const exactNormMap = new Map<string, RegisteredOrganizationEntry>();
  const compactMap = new Map<string, RegisteredOrganizationEntry>();
  const organizations = Array.isArray(payload.organizations) ? payload.organizations : [];

  for (const entry of organizations) {
    const primaryKey = entry.normalizedKey || normalizeOrgName(entry.organizationName);
    if (!primaryKey) continue;

    if (!exactNormMap.has(primaryKey)) {
      exactNormMap.set(primaryKey, entry);
    }
    const primaryCompact = toCompactKey(primaryKey);
    if (primaryCompact.length >= 6 && !compactMap.has(primaryCompact)) {
      compactMap.set(primaryCompact, entry);
    }

    if (Array.isArray(entry.aliases)) {
      for (const alias of entry.aliases) {
        const aliasKey = normalizeOrgName(alias);
        if (aliasKey && !exactNormMap.has(aliasKey)) {
          exactNormMap.set(aliasKey, entry);
        }
        const aliasCompact = toCompactKey(aliasKey);
        if (aliasCompact.length >= 6 && !compactMap.has(aliasCompact)) {
          compactMap.set(aliasCompact, entry);
        }
      }
    }
  }

  return {
    meta: {
      sourceFile: payload.sourceFile || 'registered_organizations_seed.json',
      asOfLabel: payload.asOfLabel || '',
      importedAt: payload.importedAt || new Date().toISOString(),
      totalCertificates: Number(payload.totalCertificates || 0),
      uniqueOrganizations: organizations.length,
      declaredUniqueCount: payload.declaredUniqueCount,
      totalRegisteredCompaniesNote: payload.totalRegisteredCompaniesNote,
      persistenceMode: 'memory+local-disk',
    },
    organizations,
    exactNormMap,
    compactMap,
    loadedAt: Date.now(),
  };
}

function ensureLocalDiskSeed(): PersistedOrganizationPayload | null {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err: any) {
    console.warn(`[OrgRegistry Directory Init]: ${err.message}`);
  }

  if (fs.existsSync(REGISTRY_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
      if (parsed && Array.isArray(parsed.organizations) && parsed.organizations.length > 0) {
        return parsed;
      }
    } catch (err: any) {
      console.error('[OrgRegistry]: Error reading disk cache, checking seed:', err.message);
    }
  }

  if (fs.existsSync(SEED_FILE)) {
    try {
      const rawSeed = fs.readFileSync(SEED_FILE, 'utf8');
      const parsedSeed: PersistedOrganizationPayload = JSON.parse(rawSeed);
      if (parsedSeed && Array.isArray(parsedSeed.organizations)) {
        const tempPath = `${REGISTRY_FILE}.tmp`;
        fs.writeFileSync(tempPath, rawSeed, 'utf8');
        fs.renameSync(tempPath, REGISTRY_FILE);
        console.log(
          `[OrgRegistry]: Seeded ${parsedSeed.organizations.length} organizations (${parsedSeed.totalCertificates} certs) into local storage & memory.`
        );
        return parsedSeed;
      }
    } catch (err: any) {
      console.error('[OrgRegistry]: Failed to load seed file:', err.message);
    }
  }

  return null;
}

function getCache(): OrganizationRegistryCache {
  const globalStore = globalThis as typeof globalThis & {
    __lrsys_org_registry_cache?: OrganizationRegistryCache;
  };

  if (globalStore.__lrsys_org_registry_cache) {
    return globalStore.__lrsys_org_registry_cache;
  }

  const payload = ensureLocalDiskSeed() || {
    sourceFile: 'Not Loaded',
    importedAt: new Date().toISOString(),
    totalCertificates: 0,
    uniqueOrganizations: 0,
    organizations: [],
  };

  const cache = buildRegistryCache(payload);
  globalStore.__lrsys_org_registry_cache = cache;
  return cache;
}

function saveRegistryPayload(payload: PersistedOrganizationPayload): OrganizationRegistryCache {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempPath = `${REGISTRY_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload), 'utf8');
  fs.renameSync(tempPath, REGISTRY_FILE);

  const cache = buildRegistryCache(payload);
  const globalStore = globalThis as typeof globalThis & {
    __lrsys_org_registry_cache?: OrganizationRegistryCache;
  };
  globalStore.__lrsys_org_registry_cache = cache;
  return cache;
}

/**
 * Look up an organization in memory using normalized exact & punctuation-free keys.
 */
export function lookupOrganization(rawName: string | null | undefined): RegisteredOrganizationEntry | null {
  const norm = normalizeOrgName(rawName);
  if (!norm || norm.length < 3 || PLACEHOLDER_NAMES.has(norm)) {
    return null;
  }

  const cache = getCache();
  const direct = cache.exactNormMap.get(norm);
  if (direct) return direct;

  const compact = toCompactKey(norm);
  if (compact.length >= 6) {
    const compactHit = cache.compactMap.get(compact);
    if (compactHit) return compactHit;
  }

  return null;
}

/**
 * Evaluate exact Tally flagging logic for a CusDec record:
 * - Consignee matches Organization Name only -> Flag (`CONSIGNEE_ONLY`)
 * - Consignee AND Declarant both match Organization Name -> Flag (`CONSIGNEE_AND_DECLARANT`)
 * - Declarant ONLY matches (Consignee does not) -> DO NOT FLAG (`NONE`)
 */
export function evaluateCusDecTallyFlag(
  consigneeName: string | null | undefined,
  declarantName: string | null | undefined
): CusDecTallyFlag {
  const consigneeEntry = lookupOrganization(consigneeName);
  const declarantEntry = lookupOrganization(declarantName);

  if (!consigneeEntry) {
    return {
      isFlagged: false,
      matchType: 'NONE',
      consigneeMatched: false,
      declarantMatched: Boolean(declarantEntry),
      matchedConsigneeOrg: null,
      matchedDeclarantOrg: null,
    };
  }

  if (declarantEntry) {
    return {
      isFlagged: true,
      matchType: 'CONSIGNEE_AND_DECLARANT',
      consigneeMatched: true,
      declarantMatched: true,
      matchedConsigneeOrg: consigneeEntry.organizationName,
      matchedDeclarantOrg: declarantEntry.organizationName,
      consigneeCertCount: consigneeEntry.certificateCount,
      consigneeLatestExpiry: consigneeEntry.latestExpirationDate,
      declarantCertCount: declarantEntry.certificateCount,
      declarantLatestExpiry: declarantEntry.latestExpirationDate,
    };
  }

  return {
    isFlagged: true,
    matchType: 'CONSIGNEE_ONLY',
    consigneeMatched: true,
    declarantMatched: false,
    matchedConsigneeOrg: consigneeEntry.organizationName,
    matchedDeclarantOrg: null,
    consigneeCertCount: consigneeEntry.certificateCount,
    consigneeLatestExpiry: consigneeEntry.latestExpirationDate,
  };
}

export function attachTallyFlagToRecord(record: CusDecRecord): CusDecRecord {
  return {
    ...record,
    tallyFlag: evaluateCusDecTallyFlag(record.consigneeName, record.declarantName),
  };
}

export function attachTallyFlags(records: CusDecRecord[]): CusDecRecord[] {
  // Warm cache once before loop
  getCache();
  return records.map((record) => attachTallyFlagToRecord(record));
}

export function getOrganizationRegistryMeta(): OrganizationRegistryMeta {
  return getCache().meta;
}

export function searchOrganizationRegistry(query = '', limit = 40): RegisteredOrganizationEntry[] {
  const cache = getCache();
  const q = query.trim().toLowerCase();
  const safeLimit = Math.max(1, Math.min(200, limit));

  if (!q) {
    return cache.organizations.slice(0, safeLimit);
  }

  const results: RegisteredOrganizationEntry[] = [];
  for (const org of cache.organizations) {
    if (
      org.organizationName.toLowerCase().includes(q) ||
      org.normalizedKey.toLowerCase().includes(q) ||
      (org.aliases && org.aliases.some((a) => a.toLowerCase().includes(q)))
    ) {
      results.push(org);
      if (results.length >= safeLimit) break;
    }
  }
  return results;
}

function cellToString(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString();
  }
  if (typeof val === 'object') {
    const anyVal = val as Record<string, any>;
    if (Array.isArray(anyVal.richText)) {
      return anyVal.richText.map((rt: any) => rt?.text || '').join('');
    }
    if ('result' in anyVal && anyVal.result !== undefined) {
      return cellToString(anyVal.result);
    }
    if ('text' in anyVal && anyVal.text !== undefined) {
      return String(anyVal.text);
    }
  }
  return String(val);
}

const SKIP_SUMMARY_NAMES = new Set([
  'GRAND TOTAL',
  'COMPANY NAME',
  'ORGANIZATION NAME',
  'TOTAL NUMBER OF ISSUED CERTIFICATES',
  'TOTAL NUMBER OF ISSUED CERTIFICATES(UNIQUE)',
  'TOTAL NUMBER OF REGISTERED COMPANY',
]);

/**
 * Parse and import an uploaded Excel (.xlsx/.xls) or CSV organization file,
 * persist to local disk (`data/registered_organizations.json`), and hot-swap memory cache.
 */
export async function importOrganizationsFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<OrganizationRegistryMeta> {
  const ext = path.extname(filename || '').toLowerCase();
  const isXlsx = isXlsxBuffer(buffer) || ext === '.xlsx' || ext === '.xls';

  let rows: string[][] = [];

  if (!isXlsx || ext === '.csv') {
    rows = parseCsvString(buffer.toString('utf8'));
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet =
      workbook.worksheets.find((ws) => ws.name.toLowerCase().includes('raw')) ||
      workbook.worksheets[0];

    if (!worksheet || worksheet.rowCount === 0) {
      throw new Error('Uploaded Excel workbook contains no readable rows.');
    }

    worksheet.eachRow((row) => {
      const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
      rows.push(vals.map((v) => cellToString(v)));
    });
  }

  if (rows.length === 0) {
    throw new Error('Uploaded file has no rows.');
  }

  // Locate header row and Organization Name column
  let headerRowIdx = 0;
  let orgCol = -1;
  let certTypeCol = -1;
  let serialCol = -1;
  let effCol = -1;
  let expCol = -1;
  let countCol = -1;

  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const h = String(row[c] || '').toLowerCase().replace(/\s+/g, ' ').trim();
      if (!h) continue;
      if (
        h === 'organization name' ||
        h === 'organisation name' ||
        h === 'organization' ||
        h === 'company name' ||
        h === 'company' ||
        h === 'consignee name' ||
        h === 'consignee' ||
        h === 'name'
      ) {
        headerRowIdx = r;
        orgCol = c;
      } else if (h.includes('certificate type') || h === 'type') {
        certTypeCol = c;
      } else if (h.includes('serial')) {
        serialCol = c;
      } else if (h.includes('effective')) {
        effCol = c;
      } else if (h.includes('expir')) {
        expCol = c;
      } else if (h.includes('count')) {
        countCol = c;
      }
    }
    if (orgCol >= 0) break;
  }

  if (orgCol < 0) {
    // Fallback to single-column list or standard column E (index 4) if 5+ columns
    orgCol = rows[0].length >= 5 ? 4 : 0;
    headerRowIdx = 0;
  }

  const orgEntries = new Map<string, RegisteredOrganizationEntry>();
  let totalCertificates = 0;

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    // Stop if reaching the appended pivot/summary footer in combined CSV exports
    const firstCol = String(row[0] || '').trim().toUpperCase();
    if (firstCol === 'COMPANY NAME' && String(row[1] || '').trim().toUpperCase().includes('COUNT')) {
      break;
    }

    const rawOrg = String(row[orgCol] || '').replace(/\s+/g, ' ').trim();
    if (!rawOrg) continue;
    const upperOrg = rawOrg.toUpperCase();
    if (SKIP_SUMMARY_NAMES.has(upperOrg) || upperOrg.startsWith('FIGURES AS OF')) continue;

    const normKey = normalizeOrgName(rawOrg);
    if (!normKey || normKey.length < 2) continue;

    const rowCountVal =
      countCol >= 0 && !isNaN(Number(row[countCol])) && Number(row[countCol]) > 0
        ? Math.round(Number(row[countCol]))
        : 1;
    totalCertificates += rowCountVal;

    const certType = certTypeCol >= 0 ? String(row[certTypeCol] || '').trim() || 'SL Customs' : 'SL Customs';
    const serial = serialCol >= 0 ? String(row[serialCol] || '').trim() : '';
    const effDate = effCol >= 0 ? String(row[effCol] || '').trim() : '';
    const expDate = expCol >= 0 ? String(row[expCol] || '').trim() : '';

    const existing = orgEntries.get(normKey);
    if (!existing) {
      orgEntries.set(normKey, {
        organizationName: rawOrg,
        normalizedKey: normKey,
        aliases: [rawOrg],
        certificateCount: rowCountVal,
        certificateType: certType,
        latestEffectiveDate: effDate,
        latestExpirationDate: expDate,
        latestSerialNumber: serial,
      });
    } else {
      existing.certificateCount += rowCountVal;
      if (existing.aliases && !existing.aliases.includes(rawOrg)) {
        existing.aliases.push(rawOrg);
      }
      if (expDate && (!existing.latestExpirationDate || expDate > existing.latestExpirationDate)) {
        existing.latestExpirationDate = expDate;
        if (effDate) existing.latestEffectiveDate = effDate;
        if (serial) existing.latestSerialNumber = serial;
      }
      if (rawOrg.length > existing.organizationName.length) {
        existing.organizationName = rawOrg;
      }
    }
  }

  if (orgEntries.size === 0) {
    throw new Error('No valid Organization Name entries were found in the uploaded file.');
  }

  const payload: PersistedOrganizationPayload = {
    sourceFile: filename || 'Uploaded Organization List',
    asOfLabel: `Imported ${new Date().toLocaleDateString('en-GB')}`,
    importedAt: new Date().toISOString(),
    totalCertificates,
    uniqueOrganizations: orgEntries.size,
    organizations: Array.from(orgEntries.values()).sort((a, b) =>
      a.organizationName.localeCompare(b.organizationName)
    ),
  };

  const cache = saveRegistryPayload(payload);
  return cache.meta;
}
