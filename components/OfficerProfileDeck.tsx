'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SafeUser, ROLE_CONFIGS, UserRole } from '@/lib/authTypes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback, MessengerDefaultAvatar } from '@/components/ui/avatar';
import { AppleOtpInput } from '@/components/AppleOtpInput';
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  ShieldCheck,
  KeyRound,
  Camera,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Clock,
  Calendar,
  BadgeCheck,
  LogOut,
  Send,
  FileText,
  Check,
  Fingerprint,
  Copy,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Server,
  RefreshCw,
  Cpu,
  Radio,
  ExternalLink,
  ShieldAlert,
  Smartphone
} from 'lucide-react';

interface OfficerProfileDeckProps {
  currentUser: SafeUser;
  onUserUpdated: (updatedUser: SafeUser) => void;
  onNavigateToDeclarations?: () => void;
  activeTab?: 'profile' | 'security';
  onTabChange?: (tab: 'profile' | 'security') => void;
  showInnerTabs?: boolean;
  onShowToast?: (message: string, type?: 'success' | 'warning' | 'info' | 'error', subtext?: string) => void;
}

function OfficerProfileSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* 1. Header Title Skeleton */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-8 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-96 rounded" />
        </div>
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      {/* 2. Executive Hero Identity Card Skeleton */}
      <Card className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-cyan-500/20 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
          <div className="flex items-center gap-5">
            <Skeleton className="w-24 h-24 rounded-2xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-56 rounded-lg" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-44 rounded" />
              </div>
              <Skeleton className="h-3.5 w-64 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#070b14] space-y-2 min-w-[150px]">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-5 w-28 rounded" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 3. Subtab navigation pill skeleton */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 w-fit">
        <Skeleton className="h-8 w-28 rounded-xl" />
        <Skeleton className="h-8 w-36 rounded-xl" />
      </div>

      {/* 4. Two-column Dossier & Smart Card Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card Skeleton */}
        <Card className="lg:col-span-2 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-6 sm:p-7 shadow-sm space-y-6">
          <div className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Skeleton className="h-6 w-48 rounded" />
            <Skeleton className="h-3.5 w-80 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-3 w-40 rounded" />
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070b14] flex justify-between">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
          <div className="flex justify-end pt-2">
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </Card>

        {/* Digital Smart Card Skeleton */}
        <div className="space-y-4">
          <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
            <div className="flex items-center gap-4 py-4">
              <Skeleton className="w-14 h-14 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="h-3.5 w-24 rounded" />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function OfficerProfileDeck({
  currentUser,
  onUserUpdated,
  onNavigateToDeclarations,
  activeTab: controlledTab,
  onTabChange,
  showInnerTabs = true,
  onShowToast
}: OfficerProfileDeckProps) {
  // Global/Parent Toast Bridge
  const notify = (message: string, type: 'success' | 'warning' | 'info' | 'error' = 'info', subtext?: string) => {
    if (onShowToast) {
      onShowToast(message, type, subtext);
    }
  };

  // Navigation tab state (Controlled with local fallback)
  const [internalTab, setInternalTab] = useState<'profile' | 'security'>('profile');
  const activeTab = controlledTab ?? internalTab;
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsProfileLoading(false);
    }, 380);
    return () => clearTimeout(timer);
  }, []);

  const handleTabSelect = (tab: 'profile' | 'security') => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Avatar states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);

  // Profile Form States
  const [username, setUsername] = useState(currentUser.username || '');
  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [department, setDepartment] = useState(currentUser.department || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Security (Brevo OTP & Password Change) States
  const [securityStep, setSecurityStep] = useState<'request' | 'verify' | 'completed'>('request');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sync form state when currentUser prop changes
  useEffect(() => {
    setUsername(currentUser.username || '');
    setFullName(currentUser.fullName || '');
    setEmail(currentUser.email || '');
    setPhone(currentUser.phone || '');
    setDepartment(currentUser.department || '');
  }, [currentUser]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Copy handle action
  const handleCopyUsername = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(`@${currentUser.username}`);
      setCopiedHandle(true);
      setTimeout(() => setCopiedHandle(false), 2000);
    }
  };

  // Copy phone action
  const handleCopyPhone = () => {
    const val = currentUser.phone || '+94 11 243 4567';
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(val);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  // Avatar Upload Handler
  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setAvatarError('Profile image must be under 10 MB.');
      return;
    }

    setAvatarError(null);
    setAvatarSuccess(null);
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload profile picture.');
      }

      notify('Profile photo updated successfully!', 'success');
      if (data.user) {
        onUserUpdated(data.user);
      }
    } catch (err: any) {
      notify(err.message || 'Image upload failed.', 'error');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove Avatar Handler
  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your custom profile photo?')) {
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      const res = await fetch('/api/user/avatar', {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove profile picture.');
      }

      notify('Profile picture reset to default avatar.', 'info');
      if (data.user) {
        onUserUpdated(data.user);
      }
    } catch (err: any) {
      notify(err.message || 'Failed to remove photo.', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Save Profile Form Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    if (!cleanUsername || cleanUsername.length < 3) {
      notify('Username must be at least 3 characters long.', 'warning');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      notify('Username can only contain letters, numbers, and underscores.', 'warning');
      return;
    }

    if (!fullName.trim()) {
      notify('Full Name cannot be empty.', 'warning');
      return;
    }

    if (!email.trim()) {
      notify('Registered Gmail address is required for 2FA security.', 'warning');
      return;
    }

    setIsSavingProfile(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          department: department.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      notify('Officer dossier updated successfully.', 'success', 'All coordinates & handle synced to session.');
      if (data.user) {
        onUserUpdated(data.user);
      }
    } catch (err: any) {
      notify(err.message || 'Failed to save profile changes.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Request Password OTP
  const handleRequestPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);
    setDevOtpPreview(null);

    if (!currentPassword) {
      notify('Please enter your current password to authorize OTP delivery.', 'warning');
      return;
    }

    setIsSecurityLoading(true);

    try {
      const res = await fetch('/api/auth/request-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification OTP.');
      }

      if (data.otpPreview) {
        setDevOtpPreview(data.otpPreview);
        setOtpCode(data.otpPreview);
      }

      setSecurityStep('verify');
      setResendCooldown(60);
      notify(data.message || `A 6-digit passcode was dispatched to ${currentUser.email}.`, 'info', 'Check your Gmail');
    } catch (err: any) {
      notify(err.message || 'Failed to request OTP.', 'error');
    } finally {
      setIsSecurityLoading(false);
    }
  };

  // Confirm Password OTP
  const handleConfirmPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      notify('Please enter the 6-digit OTP passcode sent to your Gmail.', 'warning');
      return;
    }

    if (!newPassword) {
      notify('Please enter a new password.', 'warning');
      return;
    }

    if (newPassword.length < 8) {
      notify('New password must be at least 8 characters long.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      notify('New password and confirmation do not match.', 'warning');
      return;
    }

    setIsSecurityLoading(true);

    try {
      const res = await fetch('/api/auth/confirm-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp: cleanOtp,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to verify OTP or update password.');
      }

      setSecurityStep('completed');
      notify('Password successfully updated! Your new credentials are now live.', 'success');
      setCurrentPassword('');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      notify(err.message || 'Verification failed.', 'error');
    } finally {
      setIsSecurityLoading(false);
    }
  };

  // Role Configuration Helper
  const roleConfig = ROLE_CONFIGS[currentUser.role] || {
    label: currentUser.role,
    badgeClass: 'border-border text-foreground',
    borderClass: 'border-border',
    description: 'Standard customs officer profile.'
  };

  const hasCustomAvatar = !!(currentUser.avatarUrl && !currentUser.avatarUrl.includes('images.unsplash.com'));

  // Password Strength Score
  const passLength = newPassword.length >= 8;
  const passUpper = /[A-Z]/.test(newPassword);
  const passSpecial = /[0-9!@#$%^&*]/.test(newPassword);
  const passExtra = newPassword.length >= 12;
  const strengthScore = [passLength, passUpper, passSpecial, passExtra].filter(Boolean).length;

  if (isProfileLoading) {
    return <OfficerProfileSkeleton />;
  }

  return (
    <div className="relative w-full space-y-7 pb-16 animate-in fade-in duration-300">
      {/* ========================================================
          AMBIENT BACKGROUND GLOW ORBS (MATCHING APP THEME)
          ======================================================== */}
      <div className="absolute -top-24 -left-20 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-sky-500/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* ========================================================
          1. PAGE HEADER & EXECUTIVE STATUS BANNER
          ======================================================== */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Officer Profile & Settings
            </h1>
            <Badge
              variant="outline"
              className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25"
            >
              SLC-LR-{currentUser.role}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your official customs dossier, verified contact coordinates, and Brevo multi-factor authentication passcodes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-cyan-500" />
            <span className="text-slate-800 dark:text-slate-200">{roleConfig.label}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Station Duty Active</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. HERO CARD: EXECUTIVE OFFICER CREDENTIAL COCKPIT
          ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-white/90 dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] border border-slate-200/90 dark:border-cyan-500/25 shadow-[0_15px_45px_-12px_rgba(14,165,233,0.12)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_-10px_rgba(14,165,233,0.18)] p-6 sm:p-8 backdrop-blur-xl transition-all duration-300">
        {/* Subtle Decorative Background Lines */}
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-cyan-500/5 via-sky-500/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar & Identity Block */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Glowing Avatar with Status Ripple */}
            <div className="relative shrink-0 flex flex-col items-center">
              <div className="relative group">
                <Avatar className="w-28 h-28 sm:w-32 sm:h-32 ring-4 ring-cyan-500/25 dark:ring-cyan-500/40 ring-offset-2 dark:ring-offset-slate-900 shadow-2xl transition-all duration-300 group-hover:scale-[1.02]">
                  {hasCustomAvatar ? (
                    <AvatarImage
                      src={currentUser.avatarUrl!}
                      alt={currentUser.fullName}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="p-0 border-0 bg-transparent">
                    <MessengerDefaultAvatar className="w-full h-full" />
                  </AvatarFallback>
                </Avatar>

                {/* Live Online Dot Ripple */}
                <span className="absolute bottom-1.5 right-1.5 flex h-4 w-4 pointer-events-none">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-[#0d1527]" />
                </span>
              </div>

              {/* Upload & Reset Buttons */}
              <div className="flex items-center gap-1.5 mt-3.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="h-8 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 text-xs font-bold transition-all shadow-xs gap-1.5 cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  <span>Change Photo</span>
                </Button>

                {hasCustomAvatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
                    title="Reset to default Messenger avatar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarFileSelected}
              />
            </div>

            {/* Officer Details & Badges */}
            <div className="space-y-2.5 text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                  <span>{currentUser.fullName}</span>
                  <span title="Verified Customs Official Authority">
                    <BadgeCheck className="w-6 h-6 text-sky-500 shrink-0 fill-sky-500/20" />
                  </span>
                </h2>
              </div>

              {/* Interactive Metadata Chips */}
              <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap text-xs">
                <button
                  type="button"
                  onClick={handleCopyUsername}
                  className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 transition-all cursor-pointer shadow-2xs"
                  title="Click to copy system username"
                >
                  <User className="w-3.5 h-3.5 text-cyan-500" />
                  <span>@{currentUser.username}</span>
                  {copiedHandle ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                      <Check className="w-3 h-3" />
                      <span>Copied!</span>
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                  )}
                </button>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 font-medium">
                  <Mail className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="truncate max-w-[220px]">{currentUser.email}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span>Sri Lanka Customs — Long Room Division, Customs House Colombo</span>
              </p>
            </div>
          </div>
        </div>

        {/* 4 Hero Operational Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
          {/* Card 1: Assigned Division */}
          <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-sm flex items-center gap-3.5 shadow-2xs hover:border-cyan-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="truncate min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Department
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                {currentUser.department ? currentUser.department.split('/')[0].trim() : 'Long Room Division'}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Customs Directorate
              </div>
            </div>
          </div>

          {/* Card 2: Secure Direct Line */}
          <div
            onClick={handleCopyPhone}
            className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-sm flex items-center gap-3.5 shadow-2xs hover:border-blue-500/40 transition-colors cursor-pointer group"
            title="Click to copy telephone"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Phone className="w-5 h-5" />
            </div>
            <div className="truncate min-w-0 flex-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>Direct Line</span>
                {copiedPhone && <span className="text-emerald-500 font-bold lowercase text-[9px]">copied</span>}
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                {currentUser.phone || '+94 11 243 4567'}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Counter Ext 204
              </div>
            </div>
          </div>

          {/* Card 3: Clearance Authority */}
          <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-sm flex items-center gap-3.5 shadow-2xs hover:border-emerald-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="truncate min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Clearance Tier
              </div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                {roleConfig.label}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Level 2 Long Room Authority
              </div>
            </div>
          </div>

          {/* Card 4: Session Logged */}
          <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-sm flex items-center gap-3.5 shadow-2xs hover:border-amber-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="truncate min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Session Duty
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                {currentUser.lastLoginAt
                  ? new Date(currentUser.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '07:32 PM'}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                Active Station Duty
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. KINETIC PILL TAB SWITCHER (MATCHING DESIGN SYSTEM)
          ======================================================== */}
      {showInnerTabs && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
            <button
              type="button"
              onClick={() => handleTabSelect('profile')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer select-none",
                activeTab === 'profile'
                  ? "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 scale-[1.02]"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <User className="w-4 h-4" />
              <span>Official Officer Dossier</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSelect('security')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer select-none",
                activeTab === 'security'
                  ? "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 scale-[1.02]"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Fingerprint className="w-4 h-4" />
              <span>Security & Brevo OTP</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs backdrop-blur-md">
            <Lock className="w-3.5 h-3.5 text-cyan-500" />
            <span>AES-256 GCM Encrypted Session</span>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB CONTENT 1: OFFICIAL OFFICER DOSSIER (2-COLUMN GRID)
          ======================================================== */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          {/* Left Column: Coordinates Form (7 Cols) */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-white/90 dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] border border-slate-200/90 dark:border-slate-800/90 shadow-sm overflow-hidden">
              <div className="p-6 sm:p-7 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-cyan-500" />
                      <span>Official Officer Dossier</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Update your registered contact coordinates and Long Room assignment details.
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/5 hidden sm:inline-flex">
                    Live Record
                  </Badge>
                </div>
              </div>

              <div className="p-6 sm:p-7">
                <form id="dossier-form" onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* System Username */}
                    <div className="space-y-2">
                      <Label htmlFor="officer-username" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-cyan-500" />
                          <span>System Username (@handle)</span>
                        </div>
                        <span className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold">Editable Officer Tag</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-500 font-mono text-xs font-bold select-none">
                          @
                        </span>
                        <Input
                          id="officer-username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.replace(/^@/, '').toLowerCase())}
                          placeholder="ic_officer"
                          className="h-10 pl-8 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500"
                          required
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Officer sign-in identifier and messenger mention tag.
                      </p>
                    </div>

                    {/* Official Full Name */}
                    <div className="space-y-2">
                      <Label htmlFor="officer-name" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Official Full Name</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="officer-name"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Inspector of Customs (IC)"
                          className="h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500"
                          required
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Officer name on declarations and inspection ledger.
                      </p>
                    </div>

                    {/* Registered Gmail Address */}
                    <div className="space-y-2">
                      <Label htmlFor="officer-email" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Registered Gmail Address</span>
                        </div>
                        <span className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold">2FA Target</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="officer-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="vehanrajintha17@gmail.com"
                          className="h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500"
                          required
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Destination for Brevo OTP password reset passcodes.
                      </p>
                    </div>

                    {/* Long Room Direct Line / Extension */}
                    <div className="space-y-2">
                      <Label htmlFor="officer-phone" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Long Room Direct Line / Extension</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="officer-phone"
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+94 11 243 4567 / Ext 204"
                          className="h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Desk extension or official mobile contact.
                      </p>
                    </div>

                    {/* Customs Directorate / Division */}
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="officer-dept" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Customs Directorate / Division</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="officer-dept"
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Long Room Documentation / Counter 04"
                          className="h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Assigned Long Room desk or valuation division.
                      </p>
                    </div>
                  </div>
                </form>
              </div>

              {/* Form Footer */}
              <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>All records cryptographically signed to session ID & tamper-sealed</span>
                </div>

                <Button
                  type="submit"
                  form="dossier-form"
                  disabled={isSavingProfile}
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs gap-2 shadow-md shadow-cyan-500/25 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Holographic Digital Officer Credential Card (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Holographic Smart Card: Dual-Mode (Light & Dark) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-cyan-50/60 to-sky-100/70 dark:from-slate-950 dark:via-[#0a1122] dark:to-[#041a2f] p-6 text-slate-900 dark:text-white border border-cyan-500/30 shadow-[0_15px_35px_-10px_rgba(6,182,212,0.18)] dark:shadow-[0_20px_50px_-15px_rgba(6,182,212,0.25)] group transition-all duration-300">
              {/* Glass Sheen Watermark */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-400/15 dark:bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-400/15 dark:bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-6">
                {/* Card Top: Emblem & Smart Chip */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                    <div>
                      <div className="text-[11px] font-black tracking-widest uppercase text-slate-900 dark:text-cyan-300">
                        Sri Lanka Customs
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400 tracking-wider">
                        Long Room Division • Colombo
                      </div>
                    </div>
                  </div>

                  {/* Golden Smart Card Chip */}
                  <div className="w-9 h-7 rounded-md bg-gradient-to-tr from-amber-500 via-amber-300 to-amber-200 border border-amber-600/40 flex items-center justify-center shadow-xs">
                    <Cpu className="w-4 h-4 text-amber-900" />
                  </div>
                </div>

                {/* Card Middle: Portrait Thumbnail & Officer Name */}
                <div className="flex items-center gap-4 pt-2">
                  <Avatar className="w-14 h-14 ring-2 ring-cyan-500/40 dark:ring-cyan-400/40 shadow-lg shrink-0">
                    {hasCustomAvatar ? (
                      <AvatarImage
                        src={currentUser.avatarUrl!}
                        alt={currentUser.fullName}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="p-0 border-0 bg-transparent">
                      <MessengerDefaultAvatar className="w-full h-full" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="truncate min-w-0">
                    <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                      {currentUser.fullName}
                    </h4>
                    <p className="text-xs font-mono text-cyan-700 dark:text-cyan-300 truncate">
                      @{currentUser.username}
                    </p>
                    <div className="mt-1">
                      <Badge className="font-mono text-[9px] px-2 py-0 bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-500/30 dark:border-cyan-400/40">
                        {roleConfig.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Cryptographic Credentials & NFC Waves */}
                <div className="pt-4 border-t border-slate-200/90 dark:border-white/10 flex items-end justify-between">
                  <div className="space-y-0.5 font-mono text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400 uppercase text-[9px]">Document Authentication Key</span>
                    <div className="text-slate-800 dark:text-slate-200 font-bold tracking-wider">
                      SLC-{currentUser.role}-{currentUser.id ? currentUser.id.slice(0, 8).toUpperCase() : '0042'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400" title="Contactless Customs Seal">
                    <Radio className="w-4 h-4" />
                    <span className="text-[10px] font-bold font-mono">NFC ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Officer Metadata Audit Ledger */}
            <div className="rounded-3xl bg-white/90 dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] border border-slate-200/90 dark:border-slate-800/90 p-5 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Customs Account Ledger</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">ID #{currentUser.id?.slice(0, 6) || 'OFFICER'}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
                  <span className="text-muted-foreground">System Username</span>
                  <span className="font-mono font-bold text-foreground">@{currentUser.username}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
                  <span className="text-muted-foreground">Assigned Clearance</span>
                  <Badge variant="outline" className={roleConfig.badgeClass}>{currentUser.role}</Badge>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/50">
                  <span className="text-muted-foreground">Account Created</span>
                  <span className="font-mono text-foreground">{new Date(currentUser.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Cryptographic 2FA</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Brevo Gmail Active</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB CONTENT 2: SECURITY & BREVO GMAIL OTP (3-STEP WIZARD)
          ======================================================== */}
      {activeTab === 'security' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="rounded-3xl bg-white/90 dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] border border-slate-200/90 dark:border-slate-800/90 shadow-sm overflow-hidden">
            {/* Header & Multi-Step Progress Tracker */}
            <div className="p-6 sm:p-7 border-b border-slate-200/80 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-cyan-500" />
                    <span>Multi-Factor Password Management</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Secure credentials using Brevo Gmail One-Time Passcode (OTP) verification.
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5">
                  Brevo SMTP
                </Badge>
              </div>

              {/* Step Tracker Chips */}
              <div className="flex items-center gap-2 pt-2">
                <div className={cn(
                  "flex-1 p-2 rounded-xl text-center text-xs font-bold transition-all border",
                  securityStep === 'request'
                    ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 shadow-xs"
                    : "bg-slate-100/70 dark:bg-slate-800/50 text-slate-500 border-transparent"
                )}>
                  1. Current Passcode
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                <div className={cn(
                  "flex-1 p-2 rounded-xl text-center text-xs font-bold transition-all border",
                  securityStep === 'verify'
                    ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 shadow-xs"
                    : "bg-slate-100/70 dark:bg-slate-800/50 text-slate-500 border-transparent"
                )}>
                  2. 6-Digit Brevo OTP
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                <div className={cn(
                  "flex-1 p-2 rounded-xl text-center text-xs font-bold transition-all border",
                  securityStep === 'completed'
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-xs"
                    : "bg-slate-100/70 dark:bg-slate-800/50 text-slate-500 border-transparent"
                )}>
                  3. Committed
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {/* STEP 1: Request OTP Screen */}
              {securityStep === 'request' && (
                <form onSubmit={handleRequestPasswordOtp} className="space-y-5">
                  <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-xs space-y-1.5">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-cyan-500" />
                      <span>Two-Factor Authentication Requirement</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      To prevent unauthorized credential tampering, a 6-digit confirmation passcode will be dispatched to your registered officer address (<strong>{currentUser.email}</strong>) via Brevo SMTP.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current-pass" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Current System Password</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="current-pass"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        className="h-10 pr-10 font-mono text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSecurityLoading}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs gap-2 shadow-md shadow-cyan-500/25 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSecurityLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Dispatching Passcode via Brevo...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Authorize & Dispatch 6-Digit OTP</span>
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* STEP 2: Verify OTP & Submit New Password */}
              {securityStep === 'verify' && (
                <form onSubmit={handleConfirmPasswordOtp} className="space-y-6">
                  {/* Apple Style 6-Digit Passcode Input */}
                  <div className="space-y-2.5 text-center">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Enter 6-Digit Passcode Sent to Your Gmail
                    </Label>
                    <div className="flex justify-center py-2">
                      <AppleOtpInput
                        value={otpCode}
                        onChange={setOtpCode}
                        length={6}
                        autoFocus={true}
                      />
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="text-muted-foreground">Didn't receive email?</span>
                      <button
                        type="button"
                        onClick={handleRequestPasswordOtp}
                        disabled={resendCooldown > 0 || isSecurityLoading}
                        className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend Code'}
                      </button>
                    </div>
                  </div>

                  <Separator />

                  {/* New Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="new-pass" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-cyan-500" />
                      <span>New Secure Password</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-pass"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters with numbers & symbols"
                        className="h-10 pr-10 font-mono text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* 4-Level Strength Meter */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex gap-1 h-1.5">
                        <div className={cn('flex-1 rounded-full transition-all', strengthScore >= 1 ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-800')} />
                        <div className={cn('flex-1 rounded-full transition-all', strengthScore >= 2 ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800')} />
                        <div className={cn('flex-1 rounded-full transition-all', strengthScore >= 3 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800')} />
                        <div className={cn('flex-1 rounded-full transition-all', strengthScore >= 4 ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-800')} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Password Strength:</span>
                        <span className={cn('font-bold font-mono', {
                          'text-rose-500': strengthScore === 1,
                          'text-amber-500': strengthScore === 2,
                          'text-emerald-500': strengthScore === 3,
                          'text-cyan-500': strengthScore >= 4,
                        })}>
                          {strengthScore <= 1 ? 'Weak' : strengthScore === 2 ? 'Fair' : strengthScore === 3 ? 'Strong' : 'Enterprise Level'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-pass" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Confirm New Password</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-pass"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="h-10 pr-10 font-mono text-xs rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {confirmPassword && (
                      <p className={cn('text-[10px] font-bold flex items-center gap-1', newPassword === confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500')}>
                        {newPassword === confirmPassword ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        <span>{newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
                      </p>
                    )}
                  </div>

                  {/* Submit and Cancel Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSecurityStep('request')}
                      className="h-10 px-4 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold"
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      disabled={isSecurityLoading}
                      className="flex-1 h-10 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs gap-2 shadow-md shadow-cyan-500/25 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSecurityLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Committing Credentials...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verify OTP & Commit New Password</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* STEP 3: Completed Screen */}
              {securityStep === 'completed' && (
                <div className="p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center max-w-md space-y-4 mx-auto animate-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Password Successfully Updated
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      Your cryptographic credentials have been securely committed to the customs authentication database.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2.5 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSecurityStep('request')}
                      className="rounded-xl text-xs font-semibold"
                    >
                      Change Again
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST' });
                        window.location.href = `/login?username=${encodeURIComponent(currentUser.username)}`;
                      }}
                      className="rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white gap-1.5 shadow-sm shadow-cyan-500/25 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Test Login</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}