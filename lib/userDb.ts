import fs from 'fs';
import path from 'path';
import { AppUser, SafeUser, UserRole, PasswordOtpRecord } from './authTypes';
import { hashPassword, verifyPassword, hashOtp, verifyOtpHash } from './cryptoUtils';
import { getSupabase, isSupabaseConfigured } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const OTPS_FILE = path.join(DATA_DIR, 'otps.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn(`[User DB Init]: ${err.message}`);
}

function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err: any) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  return defaultValue;
}

function writeJson<T>(filePath: string, data: T): void {
  try {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err: any) {
    console.error(`Error writing ${filePath}:`, err.message);
  }
}

/**
 * Default Seed Users for all 5 roles
 */
function createSeedUsers(): AppUser[] {
  const now = new Date().toISOString();

  const devCred = hashPassword('Dev@LRSYS2026!');
  const icCred = hashPassword('Ic@LRSYS2026!');
  const appraiserCred = hashPassword('Appraiser@LRSYS2026!');
  const ddcCred = hashPassword('Ddc@LRSYS2026!');
  const lrsCred = hashPassword('Lrs@LRSYS2026!');

  return [
    {
      id: 'usr-dev-root',
      email: 'dev@lrsys.gov.lk',
      username: 'dev',
      fullName: 'System Developer & Super Admin',
      role: 'DEV',
      passwordHash: devCred.hash,
      salt: devCred.salt,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-ic-01',
      email: 'ic@lrsys.gov.lk',
      username: 'ic_officer',
      fullName: 'Inspector of Customs (IC)',
      role: 'IC',
      passwordHash: icCred.hash,
      salt: icCred.salt,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-appraiser-01',
      email: 'appraiser@lrsys.gov.lk',
      username: 'appraiser',
      fullName: 'Chief Customs Appraiser',
      role: 'APPRAISER',
      passwordHash: appraiserCred.hash,
      salt: appraiserCred.salt,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-ddc-01',
      email: 'ddc@lrsys.gov.lk',
      username: 'ddc_director',
      fullName: 'Deputy Director of Customs (DDC)',
      role: 'DDC',
      passwordHash: ddcCred.hash,
      salt: ddcCred.salt,
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-lrs-01',
      email: 'lrs@lrsys.gov.lk',
      username: 'lrs_staff',
      fullName: 'Long Room Supervisor (LRS)',
      role: 'LRS',
      passwordHash: lrsCred.hash,
      salt: lrsCred.salt,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }
  ];
}

export const DEFAULT_OFFICER_AVATARS: Record<string, string> = {};

export function getOfficerAvatar(userId?: string, role?: string, currentUrl?: string | null): string | null {
  if (currentUrl && currentUrl.trim() !== '' && !currentUrl.includes('images.unsplash.com')) {
    return currentUrl;
  }
  return null;
}

// In-memory cache initialization
let usersCache: AppUser[] = readJson<AppUser[]>(USERS_FILE, []).map((u) => ({
  ...u,
  avatarUrl: getOfficerAvatar(u.id, u.role, u.avatarUrl) || undefined,
}));
let otpsCache: PasswordOtpRecord[] = readJson<PasswordOtpRecord[]>(OTPS_FILE, []);

if (usersCache.length === 0) {
  usersCache = createSeedUsers();
  writeJson(USERS_FILE, usersCache);
  console.log('[User DB]: Initialized 5 role-based seed accounts in data/users.json');
}

export function toSafeUser(user: AppUser): SafeUser {
  const { passwordHash, salt, ...safe } = user;
  safe.avatarUrl = getOfficerAvatar(safe.id, safe.role, safe.avatarUrl) || undefined;
  return safe;
}

/**
 * Synchronize users with Supabase if configured
 */
export async function syncUsersWithSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { data, error } = await supabase.from('app_users').select('*');
    if (error) {
      console.warn('[Supabase Users Sync Warning]:', error.message);
      return;
    }
    if (data && data.length > 0) {
      // Map supabase rows to AppUser
      usersCache = data.map((row: any) => {
        const existing = usersCache.find((u) => u.id === row.id);
        const avatar = row.avatar_url || row.avatarUrl || existing?.avatarUrl || getOfficerAvatar(row.id, row.role);
        return {
          id: row.id,
          email: row.email,
          username: row.username,
          fullName: row.full_name || row.fullName,
          role: row.role as UserRole,
          passwordHash: row.password_hash || row.passwordHash,
          salt: row.salt,
          isActive: row.is_active ?? row.isActive ?? true,
          avatarUrl: avatar,
          phone: row.phone || null,
          department: row.department || null,
          lastLoginAt: row.last_login_at || row.lastLoginAt || null,
          createdAt: row.created_at || row.createdAt,
          updatedAt: row.updated_at || row.updatedAt
        };
      });
      writeJson(USERS_FILE, usersCache);
    } else {
      // Seed supabase with existing local users
      for (const u of usersCache) {
        await supabase.from('app_users').upsert({
          id: u.id,
          email: u.email,
          username: u.username,
          full_name: u.fullName,
          role: u.role,
          password_hash: u.passwordHash,
          salt: u.salt,
          is_active: u.isActive,
          created_at: u.createdAt,
          updated_at: u.updatedAt
        });
      }
    }
  } catch (err: any) {
    console.warn('[Supabase Users Sync Exception]:', err.message);
  }
}

/**
 * Find user by username or email
 */
export async function findUserByIdentifier(identifier: string): Promise<AppUser | null> {
  const clean = identifier.trim().toLowerCase();
  
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .or(`email.ilike.${clean},username.ilike.${clean}`)
          .limit(1)
          .single();

        if (data && !error) {
          return {
            id: data.id,
            email: data.email,
            username: data.username,
            fullName: data.full_name || data.fullName,
            role: data.role as UserRole,
            passwordHash: data.password_hash || data.passwordHash,
            salt: data.salt,
            isActive: data.is_active ?? data.isActive ?? true,
            avatarUrl: data.avatar_url || data.avatarUrl || null,
            phone: data.phone || null,
            department: data.department || null,
            lastLoginAt: data.last_login_at || data.lastLoginAt || null,
            createdAt: data.created_at || data.createdAt,
            updatedAt: data.updated_at || data.updatedAt
          };
        }
      } catch (err: any) {
        // Fall back to local cache
      }
    }
  }

  const found = usersCache.find(
    u => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
  );
  return found || null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<AppUser | null> {
  const found = usersCache.find(u => u.id === id);
  if (found) return found;

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data } = await supabase.from('app_users').select('*').eq('id', id).single();
        if (data) {
          return {
            id: data.id,
            email: data.email,
            username: data.username,
            fullName: data.full_name || data.fullName,
            role: data.role as UserRole,
            passwordHash: data.password_hash || data.passwordHash,
            salt: data.salt,
            isActive: data.is_active ?? true,
            avatarUrl: data.avatar_url || data.avatarUrl || null,
            phone: data.phone || null,
            department: data.department || null,
            lastLoginAt: data.last_login_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
        }
      } catch {}
    }
  }
  return null;
}

/**
 * Get all users as SafeUser (no hashes)
 */
export async function getAllUsers(): Promise<SafeUser[]> {
  await syncUsersWithSupabase();
  return usersCache.map(toSafeUser);
}

/**
 * Create a new user (Only DEV can trigger this)
 */
export async function createUser(data: {
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  password: string;
}): Promise<SafeUser> {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanUsername = data.username.trim().toLowerCase();

  // Validate uniqueness
  const existing = usersCache.find(
    u => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername
  );
  if (existing) {
    throw new Error('A user with that email or username already exists.');
  }

  const { hash, salt } = hashPassword(data.password);
  const now = new Date().toISOString();
  const newUser: AppUser = {
    id: `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    email: cleanEmail,
    username: cleanUsername,
    fullName: data.fullName.trim(),
    role: data.role,
    passwordHash: hash,
    salt,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  usersCache.push(newUser);
  writeJson(USERS_FILE, usersCache);

  // Sync to Supabase
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('app_users').insert({
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          full_name: newUser.fullName,
          role: newUser.role,
          password_hash: newUser.passwordHash,
          salt: newUser.salt,
          is_active: newUser.isActive,
          created_at: newUser.createdAt,
          updated_at: newUser.updatedAt
        });
      } catch (err: any) {
        console.warn('[Supabase User Insert Error]:', err.message);
      }
    }
  }

  return toSafeUser(newUser);
}

/**
 * Update user fields (role, isActive, fullName, email, avatarUrl, phone, department, or reset password)
 */
export async function updateUser(
  id: string,
  updates: {
    role?: UserRole;
    isActive?: boolean;
    username?: string;
    fullName?: string;
    email?: string;
    avatarUrl?: string | null;
    phone?: string | null;
    department?: string | null;
    newPassword?: string;
  }
): Promise<SafeUser | null> {
  const index = usersCache.findIndex(u => u.id === id);
  if (index === -1) return null;

  const user = usersCache[index];
  const now = new Date().toISOString();

  if (updates.role) user.role = updates.role;
  if (typeof updates.isActive === 'boolean') user.isActive = updates.isActive;
  if (updates.username !== undefined && updates.username.trim()) {
    user.username = updates.username.trim().toLowerCase().replace(/^@/, '');
  }
  if (updates.fullName !== undefined) user.fullName = updates.fullName.trim();
  if (updates.email !== undefined) user.email = updates.email.trim().toLowerCase();
  if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;
  if (updates.phone !== undefined) user.phone = updates.phone ? updates.phone.trim() : null;
  if (updates.department !== undefined) user.department = updates.department ? updates.department.trim() : null;
  if (updates.newPassword && updates.newPassword.trim()) {
    const cred = hashPassword(updates.newPassword.trim());
    user.passwordHash = cred.hash;
    user.salt = cred.salt;
  }
  user.updatedAt = now;

  usersCache[index] = user;
  writeJson(USERS_FILE, usersCache);

  // Sync to Supabase
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const payload: Record<string, any> = {
          full_name: user.fullName,
          role: user.role,
          is_active: user.isActive,
          password_hash: user.passwordHash,
          salt: user.salt,
          updated_at: user.updatedAt
        };
        if (user.username) payload.username = user.username;
        if (user.email) payload.email = user.email;
        if (user.avatarUrl !== undefined) payload.avatar_url = user.avatarUrl;
        if (user.phone !== undefined) payload.phone = user.phone;
        if (user.department !== undefined) payload.department = user.department;

        await supabase
          .from('app_users')
          .update(payload)
          .eq('id', id);
      } catch (err: any) {
        console.warn('[Supabase User Update Error]:', err.message);
      }
    }
  }

  return toSafeUser(user);
}

/**
 * Update user's last login timestamp
 */
export async function recordUserLogin(id: string): Promise<void> {
  const user = usersCache.find(u => u.id === id);
  if (!user) return;
  const now = new Date().toISOString();
  user.lastLoginAt = now;
  writeJson(USERS_FILE, usersCache);

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('app_users').update({ last_login_at: now }).eq('id', id);
      } catch {}
    }
  }
}

/**
 * Delete a user (Cannot delete root DEV)
 */
export async function deleteUser(id: string): Promise<boolean> {
  const user = usersCache.find(u => u.id === id);
  if (!user) return false;

  // Protect root DEV
  if (user.id === 'usr-dev-root') {
    throw new Error('Cannot delete primary root developer account.');
  }

  usersCache = usersCache.filter(u => u.id !== id);
  writeJson(USERS_FILE, usersCache);

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('app_users').delete().eq('id', id);
      } catch (err: any) {
        console.warn('[Supabase User Delete Error]:', err.message);
      }
    }
  }

  return true;
}

/**
 * Save an OTP record for password change confirmation
 */
export async function savePasswordOtp(userId: string, email: string, otp: string, minutesValid = 10): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + minutesValid * 60 * 1000).toISOString();
  const otpHash = hashOtp(otp);

  const record: PasswordOtpRecord = {
    id: `otp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    email: email.toLowerCase(),
    otpHash,
    expiresAt,
    used: false,
    createdAt: now.toISOString()
  };

  // Invalidate any old unused OTPs for this user
  otpsCache = otpsCache.filter(o => o.userId !== userId && !o.used && new Date(o.expiresAt) > now);
  otpsCache.push(record);
  writeJson(OTPS_FILE, otpsCache);

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('password_otps').insert({
          id: record.id,
          user_id: record.userId,
          email: record.email,
          otp_hash: record.otpHash,
          expires_at: record.expiresAt,
          used: false,
          created_at: record.createdAt
        });
      } catch (err: any) {
        console.warn('[Supabase OTP Insert Error]:', err.message);
      }
    }
  }
}

/**
 * Verify an OTP and mark it as used
 */
export async function verifyAndConsumeOtp(userId: string, otp: string): Promise<boolean> {
  const now = new Date();

  // Try memory/local cache first
  const matchIndex = otpsCache.findIndex(
    o => o.userId === userId && !o.used && new Date(o.expiresAt) > now && verifyOtpHash(otp, o.otpHash)
  );

  if (matchIndex !== -1) {
    otpsCache[matchIndex].used = true;
    writeJson(OTPS_FILE, otpsCache);

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          await supabase
            .from('password_otps')
            .update({ used: true })
            .eq('id', otpsCache[matchIndex].id);
        } catch {}
      }
    }
    return true;
  }

  // If not found in cache and Supabase is configured, check Supabase directly
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('password_otps')
          .select('*')
          .eq('user_id', userId)
          .eq('used', false)
          .gt('expires_at', now.toISOString());

        if (data && data.length > 0) {
          for (const row of data) {
            if (verifyOtpHash(otp, row.otp_hash)) {
              await supabase.from('password_otps').update({ used: true }).eq('id', row.id);
              return true;
            }
          }
        }
      } catch {}
    }
  }

  return false;
}

/**
 * Update user password after OTP verification
 */
export async function updatePasswordWithVerifiedOtp(userId: string, newPassword: string): Promise<boolean> {
  const user = usersCache.find(u => u.id === id(userId));
  if (!user) return false;

  const cred = hashPassword(newPassword);
  user.passwordHash = cred.hash;
  user.salt = cred.salt;
  user.updatedAt = new Date().toISOString();

  writeJson(USERS_FILE, usersCache);

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('app_users')
          .update({
            password_hash: user.passwordHash,
            salt: user.salt,
            updated_at: user.updatedAt
          })
          .eq('id', user.id);
      } catch {}
    }
  }

  return true;
}

function id(val: string): string {
  return val;
}

export const getUserById = findUserById;

