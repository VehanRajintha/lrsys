/**
 * LRSYS - Production VPS Record & Historical Seed Synchronizer
 * Automatically merges Nov 16 & Nov 17 CusDec records into data/records.json
 * without overwriting or deleting any newer (Nov 18+) records on the VPS.
 * Also verifies ASC and DC role seed accounts in data/users.json.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(process.cwd(), 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const HISTORICAL_SEED_FILE = path.join(process.cwd(), 'scripts', 'historical_records_nov16_nov17.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log('[Sync VPS]: Starting historical records check...');

// 1. Sync Records
if (fs.existsSync(HISTORICAL_SEED_FILE)) {
  let existingRecords = [];
  if (fs.existsSync(RECORDS_FILE)) {
    try {
      existingRecords = JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf8'));
    } catch (e) {
      console.warn('[Sync VPS]: Could not parse existing records.json, initializing fresh.');
      existingRecords = [];
    }
  }

  let historicalRecords = [];
  try {
    historicalRecords = JSON.parse(fs.readFileSync(HISTORICAL_SEED_FILE, 'utf8'));
  } catch (e) {
    console.error('[Sync VPS]: Error reading historical seed file:', e.message);
  }

  const existingIds = new Set(existingRecords.map(r => r.id));
  const existingRefs = new Set(existingRecords.map(r => `${r.customsRefNumber || ''}_${r.greenStampNumber || ''}_${(r.createdAt || '').slice(0, 10)}`));

  let addedCount = 0;
  for (const rec of historicalRecords) {
    const refKey = `${rec.customsRefNumber || ''}_${rec.greenStampNumber || ''}_${(rec.createdAt || '').slice(0, 10)}`;
    if (!existingIds.has(rec.id) && !existingRefs.has(refKey)) {
      existingRecords.push(rec);
      existingIds.add(rec.id);
      addedCount++;
    }
  }

  if (addedCount > 0) {
    // Sort descending by createdAt (newest records first)
    existingRecords.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(existingRecords, null, 2), 'utf8');
    console.log(`[Sync VPS]: Successfully merged ${addedCount} historical records into data/records.json. Total count: ${existingRecords.length}`);
  } else {
    console.log(`[Sync VPS]: All ${historicalRecords.length} historical records are already present in data/records.json. Total count: ${existingRecords.length}`);
  }
} else {
  console.warn('[Sync VPS]: Historical seed file not found at:', HISTORICAL_SEED_FILE);
}

// 2. Ensure ASC and DC accounts in data/users.json
if (fs.existsSync(USERS_FILE)) {
  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    function hashPassword(password) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
      return { hash, salt };
    }

    const now = new Date().toISOString();
    let usersUpdated = false;

    if (!users.some(u => u.role === 'ASC' || u.username === 'asc_officer')) {
      const asc = hashPassword('Asc@LRSYS2026!');
      users.push({
        id: 'usr-asc-01',
        email: 'asc@lrsys.gov.lk',
        username: 'asc_officer',
        fullName: 'Assistant Superintendent of Customs (ASC)',
        role: 'ASC',
        passwordHash: asc.hash,
        salt: asc.salt,
        isActive: true,
        createdAt: now,
        updatedAt: now
      });
      usersUpdated = true;
      console.log('[Sync VPS]: Added missing ASC officer account to users.json');
    }

    if (!users.some(u => u.role === 'DC' || u.username === 'dc_director')) {
      const dc = hashPassword('Dc@LRSYS2026!');
      users.push({
        id: 'usr-dc-01',
        email: 'dc@lrsys.gov.lk',
        username: 'dc_director',
        fullName: 'Director of Customs (DC)',
        role: 'DC',
        passwordHash: dc.hash,
        salt: dc.salt,
        isActive: true,
        createdAt: now,
        updatedAt: now
      });
      usersUpdated = true;
      console.log('[Sync VPS]: Added missing DC director account to users.json');
    }

    if (usersUpdated) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    }
  } catch (e) {
    console.warn('[Sync VPS]: User check warning:', e.message);
  }
}

const ORG_REGISTRY_FILE = path.join(DATA_DIR, 'registered_organizations.json');
const ORG_SEED_FILE = path.join(process.cwd(), 'scripts', 'registered_organizations_seed.json');

if (!fs.existsSync(ORG_REGISTRY_FILE) && fs.existsSync(ORG_SEED_FILE)) {
  try {
    const rawOrgSeed = fs.readFileSync(ORG_SEED_FILE, 'utf8');
    fs.writeFileSync(ORG_REGISTRY_FILE, rawOrgSeed, 'utf8');
    console.log('[Sync VPS]: Seeded registered_organizations.json into data/ for local/memory Tally flagging.');
  } catch (e) {
    console.warn('[Sync VPS]: Organization registry seed warning:', e.message);
  }
}

console.log('[Sync VPS]: Verification complete.');
