'use client';

import React, { useState } from 'react';
import { SafeUser } from '@/lib/authTypes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AppleOtpInput } from '@/components/AppleOtpInput';
import {
  ShieldCheck,
  KeyRound,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  RotateCcw
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SafeUser | null;
}

export function ChangePasswordModal({ isOpen, onClose, currentUser }: ChangePasswordModalProps) {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [currentPassword, setCurrentPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setErrorMessage('Please enter your current password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setDevOtpPreview(null);

    try {
      const res = await fetch('/api/auth/request-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification OTP.');
      }

      if (data.otpPreview) {
        setDevOtpPreview(data.otpPreview);
        setOtpCode(data.otpPreview); // Auto-fill for convenience in test/preview mode
      }

      setStep('verify');
      setSuccessMessage(data.message || 'OTP dispatched to your email.');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || !newPassword) {
      setErrorMessage('Both OTP passcode and new password are required.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/confirm-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode.trim(), newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setSuccessMessage('Password successfully updated! Your new password is now active.');
      setTimeout(() => {
        handleReset();
        onClose();
      }, 1600);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('request');
    setCurrentPassword('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setSuccessMessage('');
    setDevOtpPreview(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { handleReset(); onClose(); } }}>
      <DialogContent className="max-w-md bg-background border shadow-xl rounded-xl p-6">
        {/* Header */}
        <DialogHeader className="space-y-1.5 pb-2 border-b">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                Change Password
                <Badge variant="outline" className="text-[10px] font-mono">
                  Brevo OTP 2FA
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Authorized identity verification via Brevo transactional email OTP.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* User Context Strip */}
        {currentUser && (
          <div className="p-2.5 rounded-lg bg-muted/50 border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-[11px] text-primary shadow-xs">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="font-bold text-foreground">@{currentUser.username}</span>
                <span className="text-[11px] text-muted-foreground ml-1.5">({currentUser.email})</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {currentUser.role}
            </Badge>
          </div>
        )}

        {/* Feedback Alert Banners */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Dev OTP Preview Banner */}
        {devOtpPreview && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-foreground text-xs space-y-1 animate-in zoom-in-95">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5 text-primary">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Brevo Passcode (Ready for Verification)
              </span>
              <span className="font-mono text-xs bg-primary/20 px-2 py-0.5 rounded text-primary">
                {devOtpPreview}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Passcode has been sent/previewed. It has been auto-filled below for instant testing.
            </p>
          </div>
        )}

        {/* STEP 1: REQUEST OTP */}
        {step === 'request' && (
          <form onSubmit={handleRequestOtp} className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              To change your password, first enter your current credentials. A 6-digit confirmation passcode will be dispatched to your registered email via Brevo.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs">Current Security Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="pl-9 text-xs h-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 text-xs font-semibold gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Requesting Brevo Passcode...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Dispatch Verification OTP via Brevo
                </>
              )}
            </Button>
          </form>
        )}

        {/* STEP 2: VERIFY OTP & SET NEW PASSWORD */}
        {step === 'verify' && (
          <form onSubmit={handleConfirmOtp} className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">6-Digit Passcode (OTP)</Label>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Resend
                </button>
              </div>
              <div className="pt-2 pb-1 flex justify-center">
                <AppleOtpInput
                  value={otpCode}
                  onChange={setOtpCode}
                  length={6}
                  autoFocus={true}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">New Password</Label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="pl-9 pr-9 text-xs h-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Confirm New Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="pl-9 text-xs h-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="emerald"
              disabled={isLoading}
              className="w-full h-10 text-xs font-semibold gap-2 shadow-sm mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying OTP & Updating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm OTP & Update Password
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
