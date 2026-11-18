export type UserRole = 'DEV' | 'IC' | 'APPRAISER' | 'DDC' | 'LRS' | 'ASC' | 'DC';

export interface AppUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  lastLoginAt?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  department?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<AppUser, 'passwordHash' | 'salt'>;

export interface SessionPayload {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string | null;
  exp: number;
}

export interface PasswordOtpRecord {
  id: string;
  userId: string;
  email: string;
  otpHash: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface RoleConfig {
  label: string;
  badgeClass: string;
  borderClass: string;
  description: string;
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  DEV: {
    label: 'Developer & Super Admin',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.25)]',
    borderClass: 'border-purple-500/40',
    description: 'Full root access to system internals, user credentials, AI extraction pipelines, and storage.'
  },
  IC: {
    label: 'Inspector of Customs (IC)',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    borderClass: 'border-amber-500/40',
    description: 'Inspector of Customs: inward document verification, declaration examination, and cargo intake inspections.'
  },
  APPRAISER: {
    label: 'Customs Appraiser',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30 shadow-[0_0_12px_rgba(14,165,233,0.25)]',
    borderClass: 'border-sky-500/40',
    description: 'Declaration inspection bay: field validation, manual corrections, and declaration verification.'
  },
  DDC: {
    label: 'Deputy Director (DDC)',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
    borderClass: 'border-emerald-500/40',
    description: 'Executive customs oversight: final verification, batch re-processing approval, and audit reconciliation.'
  },
  LRS: {
    label: 'Long Room Supervisor (LRS)',
    badgeClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30 shadow-[0_0_12px_rgba(20,184,166,0.25)]',
    borderClass: 'border-teal-500/40',
    description: 'Long Room Supervisor: customs clearance supervision, manifest tally reconciliation, and ledger administration.'
  },
  ASC: {
    label: 'Assistant Superintendent (ASC)',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.25)]',
    borderClass: 'border-blue-500/40',
    description: 'Assistant Superintendent of Customs: operational cargo examination, document verification, and clearance valuation.'
  },
  DC: {
    label: 'Director of Customs (DC)',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.25)]',
    borderClass: 'border-rose-500/40',
    description: 'Director of Customs: high-level clearance authorization, departmental oversight, and customs administration.'
  }
};

