'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { UserRole } from '@/lib/authTypes';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  Terminal,
  KeyRound,
  CheckCircle2,
  Sun,
  Moon,
  Building2,
  BadgeCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successRole, setSuccessRole] = useState<string | null>(null);
  const [selectedDemoRole, setSelectedDemoRole] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // 3D Card Parallax Tilt using Framer Motion
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [8, -8]);
  const rotateY = useTransform(mouseX, [-300, 300], [-8, 8]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Sync theme with document & localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lrsys-theme') as 'dark' | 'light' | null;
      const isDark = document.documentElement.classList.contains('dark');
      const initial = saved || (isDark ? 'dark' : 'light');
      setTheme(initial);
      if (initial === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('lrsys-theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch {}
  };

  // Quick-fill credentials for role testing
  const demoAccounts = [
    {
      role: 'DEV' as UserRole,
      label: 'Developer',
      id: 'dev',
      pass: 'Dev@LRSYS2026!',
      desc: 'Root Administration & Core Pipelines',
    },
    {
      role: 'IC' as UserRole,
      label: 'IC Officer',
      id: 'ic_officer',
      pass: 'Ic@LRSYS2026!',
      desc: 'Inward Cargo Examination & Verification',
    },
    {
      role: 'APPRAISER' as UserRole,
      label: 'Appraiser',
      id: 'appraiser',
      pass: 'Appraiser@LRSYS2026!',
      desc: 'Declaration Valuation & Inspection Bay',
    },
    {
      role: 'DDC' as UserRole,
      label: 'DDC Director',
      id: 'ddc_director',
      pass: 'Ddc@LRSYS2026!',
      desc: 'Executive Customs Approval & Audit',
    },
    {
      role: 'LRS' as UserRole,
      label: 'LRS Staff',
      id: 'lrs_staff',
      pass: 'Lrs@LRSYS2026!',
      desc: 'Long Room Supervision & Tally Ledger',
    },
  ];

  const handleFillDemo = (acc: typeof demoAccounts[0]) => {
    setIdentifier(acc.id);
    setPassword(acc.pass);
    setSelectedDemoRole(acc.role);
    setErrorMessage('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both departmental officer ID and security passcode.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication rejected: Invalid departmental credentials.');
      }

      setSuccessRole(data.user?.role || 'OFFICER');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
      setIsLoading(false);
    }
  };

  const activeDemo = demoAccounts.find(d => d.role === selectedDemoRole);

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-6 bg-background text-foreground transition-colors duration-300 selection:bg-cyan-500/25 selection:text-cyan-600 dark:selection:text-cyan-300">
      
      {/* ========================================================
           BACKGROUND ATMOSPHERIC MOTION & AMBIENT ANIMATION
           ======================================================== */}
      {/* Subtle Noise Texture Overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-soft-light pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px'
        }}
      />

      {/* Cyber Architectural Grid Floor */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800c_1px,transparent_1px),linear-gradient(to_bottom,#8080800c_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none z-0" />

      {/* Animated Floating Orbital Rings (Maritime Radar Sweep) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-25 dark:opacity-15"
        animate={{ rotate: 360 }}
        transition={{ duration: 140, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-[500px] h-[500px] rounded-full border border-cyan-500/20 border-dashed" />
        <div className="absolute w-[750px] h-[750px] rounded-full border border-sky-500/15" />
        <div className="absolute w-[1000px] h-[1000px] rounded-full border border-blue-500/10 border-dashed" />
      </motion.div>

      {/* Top Breathing Glow Sphere */}
      <motion.div 
        className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[700px] sm:w-[950px] h-[500px] rounded-b-[50%] bg-gradient-to-b from-cyan-500/15 via-sky-500/10 to-transparent blur-[100px] pointer-events-none z-0"
        animate={{ 
          opacity: [0.2, 0.45, 0.2],
          scale: [0.95, 1.05, 0.95],
          y: [-15, 15, -15]
        }}
        transition={{ 
          duration: 9, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Bottom Counter-Breathing Glow Sphere */}
      <motion.div 
        className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[480px] rounded-t-[50%] bg-gradient-to-t from-blue-600/15 via-cyan-500/10 to-transparent blur-[110px] pointer-events-none z-0"
        animate={{ 
          opacity: [0.2, 0.4, 0.2],
          scale: [1, 1.08, 1],
          y: [15, -15, 15]
        }}
        transition={{ 
          duration: 11, 
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />

      {/* ========================================================
           TOP BAR: THEME TOGGLE (TOP RIGHT CORNER)
           ======================================================== */}
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-30">
        <button
          type="button"
          onClick={toggleTheme}
          className="h-10 w-10 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-zinc-900/70 hover:bg-white dark:hover:bg-zinc-800 backdrop-blur-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>

      {/* ========================================================
           CENTERED AUTHENTICATION COCKPIT (WITH 3D TILT & LIGHT BEAMS)
           ======================================================== */}
      <div className="w-full max-w-md mx-auto my-auto relative z-10 flex flex-col items-center">
        {/* 3D Parallax Motion Viewport */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full relative"
          style={{ perspective: 1200 }}
        >
          <motion.div
            className="relative"
            style={{ rotateX, rotateY }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ z: 8 }}
          >
            <div className="relative group">
              {/* Traveling Light Beam Perimeter Animation */}
              <div className="absolute -inset-[1px] rounded-3xl overflow-hidden pointer-events-none z-20">
                {/* Top light beam */}
                <motion.div 
                  className="absolute top-0 left-0 h-[2px] w-[50%] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75"
                  initial={{ filter: "blur(2px)" }}
                  animate={{ 
                    left: ["-50%", "100%"],
                    opacity: [0.3, 0.8, 0.3],
                    filter: ["blur(1px)", "blur(2px)", "blur(1px)"]
                  }}
                  transition={{ 
                    left: {
                      duration: 2.8, 
                      ease: "easeInOut", 
                      repeat: Infinity,
                      repeatDelay: 0.8
                    },
                    opacity: {
                      duration: 1.4,
                      repeat: Infinity,
                      repeatType: "mirror"
                    }
                  }}
                />
                
                {/* Right light beam */}
                <motion.div 
                  className="absolute top-0 right-0 h-[50%] w-[2px] bg-gradient-to-b from-transparent via-sky-400 to-transparent opacity-75"
                  initial={{ filter: "blur(2px)" }}
                  animate={{ 
                    top: ["-50%", "100%"],
                    opacity: [0.3, 0.8, 0.3],
                    filter: ["blur(1px)", "blur(2px)", "blur(1px)"]
                  }}
                  transition={{ 
                    top: {
                      duration: 2.8, 
                      ease: "easeInOut", 
                      repeat: Infinity,
                      repeatDelay: 0.8,
                      delay: 0.7
                    },
                    opacity: {
                      duration: 1.4,
                      repeat: Infinity,
                      repeatType: "mirror",
                      delay: 0.7
                    }
                  }}
                />
                
                {/* Bottom light beam */}
                <motion.div 
                  className="absolute bottom-0 right-0 h-[2px] w-[50%] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75"
                  initial={{ filter: "blur(2px)" }}
                  animate={{ 
                    right: ["-50%", "100%"],
                    opacity: [0.3, 0.8, 0.3],
                    filter: ["blur(1px)", "blur(2px)", "blur(1px)"]
                  }}
                  transition={{ 
                    right: {
                      duration: 2.8, 
                      ease: "easeInOut", 
                      repeat: Infinity,
                      repeatDelay: 0.8,
                      delay: 1.4
                    },
                    opacity: {
                      duration: 1.4,
                      repeat: Infinity,
                      repeatType: "mirror",
                      delay: 1.4
                    }
                  }}
                />
                
                {/* Left light beam */}
                <motion.div 
                  className="absolute bottom-0 left-0 h-[50%] w-[2px] bg-gradient-to-b from-transparent via-sky-400 to-transparent opacity-75"
                  initial={{ filter: "blur(2px)" }}
                  animate={{ 
                    bottom: ["-50%", "100%"],
                    opacity: [0.3, 0.8, 0.3],
                    filter: ["blur(1px)", "blur(2px)", "blur(1px)"]
                  }}
                  transition={{ 
                    bottom: {
                      duration: 2.8, 
                      ease: "easeInOut", 
                      repeat: Infinity,
                      repeatDelay: 0.8,
                      delay: 2.1
                    },
                    opacity: {
                      duration: 1.4,
                      repeat: Infinity,
                      repeatType: "mirror",
                      delay: 2.1
                    }
                  }}
                />

                {/* Corner Glow Micro-Nodes */}
                <div className="absolute top-0 left-0 h-1.5 w-1.5 rounded-full bg-cyan-400/50 blur-[1px]" />
                <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-sky-400/50 blur-[1px]" />
                <div className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-cyan-400/50 blur-[1px]" />
                <div className="absolute bottom-0 left-0 h-1.5 w-1.5 rounded-full bg-sky-400/50 blur-[1px]" />
              </div>

              {/* Elevated Frosted Glass Card Container */}
              <div className="relative rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-white/92 dark:bg-[#090d16]/92 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.7)] space-y-5">
                
                {/* Header */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-muted-foreground">
                      SINGLE SIGN-ON
                    </span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground pt-1">
                    Authorized Officer Sign In
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Enter your assigned departmental credentials to access the active Long Room system.
                  </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-3.5">
                  {/* Error Message Box */}
                  {errorMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-start gap-2.5"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{errorMessage}</span>
                    </motion.div>
                  )}

                  {/* Success Feedback Box */}
                  {successRole && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="font-medium">
                        Authenticated clearance confirmed: <strong>{successRole}</strong>. Entering Long Room...
                      </span>
                    </motion.div>
                  )}

                  {/* Officer ID / Username */}
                  <motion.div 
                    className="space-y-1 text-left"
                    whileFocus={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className="flex items-center justify-between">
                      <label htmlFor="officer-id" className="text-xs font-semibold text-foreground/85">
                        Username or Email
                      </label>
                      <span className="text-[10px] font-mono text-muted-foreground/60">Department ID</span>
                    </div>
                    <div className="relative">
                      <User className={cn(
                        "w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none",
                        focusedInput === "id" ? "text-cyan-500" : "text-muted-foreground/60"
                      )} />
                      <input
                        id="officer-id"
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        onFocus={() => setFocusedInput("id")}
                        onBlur={() => setFocusedInput(null)}
                        placeholder="e.g. dev or dev@lrsys.gov.lk"
                        disabled={isLoading || Boolean(successRole)}
                        className="w-full pl-10 pr-3.5 h-11 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10 text-foreground text-sm font-medium transition-all outline-none"
                        required
                      />
                    </div>
                  </motion.div>

                  {/* Security Passcode */}
                  <motion.div 
                    className="space-y-1 text-left"
                    whileFocus={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className="flex items-center justify-between">
                      <label htmlFor="officer-passcode" className="text-xs font-semibold text-foreground/85">
                        Security Password
                      </label>
                      <span className="text-[10px] font-mono text-muted-foreground/60">Protected</span>
                    </div>
                    <div className="relative">
                      <KeyRound className={cn(
                        "w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none",
                        focusedInput === "pass" ? "text-cyan-500" : "text-muted-foreground/60"
                      )} />
                      <input
                        id="officer-passcode"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedInput("pass")}
                        onBlur={() => setFocusedInput(null)}
                        placeholder="••••••••••••"
                        disabled={isLoading || Boolean(successRole)}
                        className="w-full pl-10 pr-10 h-11 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10 text-foreground text-sm font-mono transition-all outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                        title={showPassword ? 'Hide passcode' : 'Show passcode'}
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>

                  {/* Animated Submit Button with Shimmer */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={isLoading || Boolean(successRole)}
                    className="w-full relative group/btn mt-2 cursor-pointer outline-none"
                  >
                    <div className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold h-11 rounded-xl transition-all duration-300 flex items-center justify-center shadow-xs hover:shadow-md">
                      {/* Button shimmer light beam */}
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -z-10"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ 
                          duration: 2, 
                          ease: "easeInOut", 
                          repeat: Infinity,
                          repeatDelay: 1.5
                        }}
                      />
                      
                      <AnimatePresence mode="wait">
                        {isLoading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold"
                          >
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying Customs Credentials...</span>
                          </motion.div>
                        ) : (
                          <motion.span
                            key="submit-text"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold"
                          >
                            <span>Sign In to Long Room</span>
                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>
                </form>

                {/* Quick-Role Testing Fast-Switcher Deck */}
                <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-left">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                      Quick Role Testing Select:
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/60">1-Click Fill</span>
                  </div>

                  {/* Role Pills */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {demoAccounts.map((acc) => {
                      const isSelected = selectedDemoRole === acc.role;
                      return (
                        <button
                          key={acc.role}
                          type="button"
                          onClick={() => handleFillDemo(acc)}
                          disabled={isLoading}
                          className={cn(
                            "h-8 px-1 rounded-xl text-[11px] font-bold font-mono border transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95",
                            isSelected
                              ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-600 dark:text-cyan-400 shadow-xs"
                              : "bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
                          )}
                          title={`Click to fill ${acc.label} credentials (${acc.id})`}
                        >
                          {acc.role}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Selected Role Hint */}
                  {activeDemo && (
                    <motion.div 
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] text-left flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                          <BadgeCheck className="w-3.5 h-3.5 text-cyan-500" />
                          <span>{activeDemo.label}</span>
                          <span className="text-muted-foreground/60 font-mono text-[10px]">({activeDemo.id})</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          {activeDemo.desc}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Security Compliance Notice */}
        <div className="w-full max-w-md mx-auto pt-4 text-center space-y-1 relative z-10">
          <p className="text-[11px] text-muted-foreground/75 leading-relaxed">
            Internal Customs Network • Access is monitored and recorded per Sri Lanka Customs Ordinance (Cap. 235).
          </p>
        </div>
      </div>
    </div>
  );
}
