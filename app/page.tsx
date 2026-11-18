'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue } from 'react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { CusDecRecord, Settings, QueueStatus, Stats, TallyResult, TallyRecord } from '@/lib/types';
import { cn } from '@/lib/utils';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';

// Lucide icons
import {
  Ship,
  FileText,
  Upload,
  FolderArchive,
  Sparkles,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Play,
  Pause,
  XCircle,
  Sun,
  Moon,
  QrCode,
  Settings as SettingsIcon,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Save,
  ArrowRight,
  ChevronRight,
  Activity,
  Check,
  X,
  FileCheck2,
  FileClock,
  Layers,
  Sliders,
  ExternalLink,
  Copy,
  ScanLine,
  ArrowUpRight,
  HardDrive,
  Lock,
  Key,
  Cpu,
  Zap,
  Clock,
  Loader2,
  Hourglass,
  ShieldCheck,
  Timer,
  ShieldAlert,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  UserCheck,
  KeyRound,
  Fingerprint,
  Menu,
  User,
  LayoutGrid,
  BarChart3,
  Users,
  Video,
  Radio,
  BookOpen,
  MessageCircle,
  Calendar as CalendarIcon,
  CalendarDays,
} from 'lucide-react';

import { SafeUser, UserRole, ROLE_CONFIGS } from '@/lib/authTypes';
import { DevConsoleModal } from '@/components/DevConsoleModal';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { RealtimeChatWidget } from '@/components/RealtimeChatWidget';
import { OfficerProfileDeck } from '@/components/OfficerProfileDeck';
import { StatisticsAnalyticsDeck } from '@/components/StatisticsAnalyticsDeck';
import { DefaultUserAvatar } from '@/components/ui/avatar';
import { FullScreenChatDeck } from '@/components/FullScreenChatDeck';
import { DeclarationCalendarBar } from '@/components/DeclarationCalendarBar';
import { parseRecordDate, formatLongDateDisplay, formatShortDateDisplay, formatDateDisplay, getTodayIso } from '@/lib/dateUtils';

export interface WorkerStreamState {
  id: number;
  status: 'idle' | 'extracting' | 'completed' | 'error';
  fileName?: string;
  step?: string;
  progress: number;
  completedInStream: number;
  lastRecord?: {
    stampNo?: string;
    customsRef?: string;
    consignee?: string;
    confidence?: number;
    isDuplicate?: boolean;
  };
}

interface Toast {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  message: string;
  subtext?: string;
}

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  description: string;
  highlightText?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'warning' | 'primary';
  icon?: 'trash' | 'alert' | 'refresh' | 'sparkles';
  onConfirm: () => Promise<void> | void;
  isProcessing?: boolean;
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function LrsysPortal() {
  // iOS Confirmation Sheet State
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Navigation: Statistics vs Declarations vs Tally vs Officer Profile vs Full Chat
  const [activeSection, setActiveSection] = useState<'stats' | 'ocr' | 'tally' | 'profile' | 'chat'>('ocr');
  const [profileSubTab, setProfileSubTab] = useState<'profile' | 'security'>('profile');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Role-Based Access Control (RBAC) & User Session
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // CusDec declarations management permission: LRS, IC, Appraiser, ASC, DC (plus DEV superadmin)
  const canManageCusDec = currentUser?.role === 'LRS' || 
                          currentUser?.role === 'IC' || 
                          currentUser?.role === 'APPRAISER' || 
                          currentUser?.role === 'ASC' || 
                          currentUser?.role === 'DC' || 
                          currentUser?.role === 'DEV';

  // Load authenticated user session
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch((err) => console.error('[Auth Session Load Error]:', err));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' | 'error' = 'info', subtext?: string) => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev.slice(-3), { id, type, message, subtext }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Drag and drop state
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounterRef = useRef(0);

  // Data State
  const [records, setRecords] = useState<CusDecRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<CusDecRecord | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'NEEDS_REVIEW' | 'VERIFIED' | 'CORRECTED' | 'DUPLICATES'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isStampAscending, setIsStampAscending] = useState(false);

  // Calendar & Day-by-Day Date State (Strictly upload / ingestion date)
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD or empty for all days

  // Ultra-responsive client pagination state for low-end office PCs
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(50); // Options: 25, 50, 100, 'all'

  // Skeleton Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isStorageLoading, setIsStorageLoading] = useState(false);
  const [isTallyLoading, setIsTallyLoading] = useState(false);

  const navigateToSection = (section: 'stats' | 'ocr' | 'tally' | 'profile' | 'chat') => {
    if (section === 'tally') {
      setIsTallyLoading(true);
      setTimeout(() => setIsTallyLoading(false), 380);
    }
    setActiveSection(section);
    setIsMobileSidebarOpen(false);
  };

  // Dynamic identification of duplicate records (Optimized O(N) hash-indexed clustering for low-end PCs)
  const duplicateIdSet = useMemo(() => {
    const dupIds = new Set<string>();
    const n = records.length;
    if (n <= 1) return dupIds;

    // 1. Single O(N) normalization and hash-bucket indexing pass
    const norm = new Array<{
      id: string;
      stamp: string | null;
      ref: string | null;
      consignee: string | null;
      declarant: string | null;
      date: string | null;
      fileHash: string | null;
    }>(n);

    const stampRefMap = new Map<string, number[]>();
    const hashMap = new Map<string, number[]>();

    for (let i = 0; i < n; i++) {
      const r = records[i];
      const stamp = r.greenStampNumber && r.greenStampNumber !== '000000' && r.greenStampNumber.length >= 4
        ? r.greenStampNumber.trim()
        : null;
      const ref = r.customsRefNumber && r.customsRefNumber !== 'UNKNOWN' && r.customsRefNumber.length >= 4
        ? r.customsRefNumber.replace(/\s+/g, '').toUpperCase()
        : null;
      const consignee = r.consigneeName && r.consigneeName !== 'UNKNOWN' && r.consigneeName.length >= 3
        ? r.consigneeName.trim().toUpperCase()
        : null;
      const declarant = r.declarantName && r.declarantName !== 'NOT SPECIFIED' && r.declarantName.length >= 3
        ? r.declarantName.trim().toUpperCase()
        : null;
      const date = r.customsDate && r.customsDate.trim().length >= 6
        ? r.customsDate.trim()
        : null;
      const fileHash = r.fileHash || null;

      norm[i] = { id: r.id, stamp, ref, consignee, declarant, date, fileHash };

      if (stamp && ref) {
        const key = stamp + '||' + ref;
        let arr = stampRefMap.get(key);
        if (!arr) { arr = []; stampRefMap.set(key, arr); }
        arr.push(i);
      }
      if (fileHash) {
        let arr = hashMap.get(fileHash);
        if (!arr) { arr = []; hashMap.set(fileHash, arr); }
        arr.push(i);
      }
    }

    const seenGroup = new Set<number>();

    for (let i = 0; i < n; i++) {
      if (seenGroup.has(i)) continue;
      const p = norm[i];

      // Collect only candidate records that share Stamp+Ref or FileHash
      const candidateIndices = new Set<number>();
      if (p.stamp && p.ref) {
        const arr = stampRefMap.get(p.stamp + '||' + p.ref);
        if (arr) {
          for (const idx of arr) {
            if (idx > i) candidateIndices.add(idx);
          }
        }
      }
      if (p.fileHash) {
        const arr = hashMap.get(p.fileHash);
        if (arr) {
          for (const idx of arr) {
            if (idx > i) candidateIndices.add(idx);
          }
        }
      }

      if (candidateIndices.size === 0) continue;

      let groupHasDuplicates = false;

      for (const j of candidateIndices) {
        if (seenGroup.has(j)) continue;
        const c = norm[j];

        let matchCount = 0;
        if (p.stamp && c.stamp && p.stamp === c.stamp) matchCount++;
        if (p.ref && c.ref && p.ref === c.ref) matchCount++;
        if (p.consignee && c.consignee && (p.consignee === c.consignee || p.consignee.includes(c.consignee) || c.consignee.includes(p.consignee))) matchCount++;
        if (p.declarant && c.declarant && (p.declarant === c.declarant || p.declarant.includes(c.declarant) || c.declarant.includes(p.declarant))) matchCount++;
        if (p.date && c.date && p.date === c.date) matchCount++;

        // Duplicate match: Must match primary identifiers (Stamp + Ref) AND at least one party/date (reaching >= 3 matching critical fields)
        const isMatch = (p.stamp && c.stamp && p.stamp === c.stamp && p.ref && c.ref && p.ref === c.ref && matchCount >= 3) ||
          (p.fileHash && c.fileHash && p.fileHash === c.fileHash && (p.stamp === c.stamp || p.ref === c.ref));

        if (isMatch) {
          dupIds.add(c.id);
          seenGroup.add(j);
          groupHasDuplicates = true;
        }
      }

      if (groupHasDuplicates) {
        seenGroup.add(i); // Primary declaration remains clean and valid
      }
    }

    return dupIds;
  }, [records]);

  // Derived live ledger metrics (guaranteed 100% in sync with actual table records)
  const ledgerStats = useMemo(() => {
    const total = records.length;
    const verified = records.filter(r => r.status === 'VERIFIED').length;
    const needsReview = records.filter(r => r.status === 'NEEDS_REVIEW').length;
    const corrected = records.filter(r => r.status === 'CORRECTED').length;
    const duplicates = duplicateIdSet.size;
    const totalValid = verified + corrected;
    const accuracyRate = total > 0 ? (((totalValid) / total) * 100).toFixed(1) : '100.0';

    return {
      total,
      verified,
      needsReview,
      corrected,
      duplicates,
      accuracyRate: parseFloat(accuracyRate)
    };
  }, [records, duplicateIdSet]);

  // Active scope statistics for the Declarations & Audit Ledger tab
  // Dynamically recalculates based on selected day (e.g. Nov 16, 17, 18) or Today
  const displayStats = useMemo(() => {
    const todayIso = getTodayIso();
    const effectiveDate = selectedDate;

    if (effectiveDate) {
      const dayRecords = records.filter(r => parseRecordDate(r, 'created') === effectiveDate);
      const total = dayRecords.length;
      const verified = dayRecords.filter(r => r.status === 'VERIFIED').length;
      const corrected = dayRecords.filter(r => r.status === 'CORRECTED').length;
      const needsReview = dayRecords.filter(r => r.status === 'NEEDS_REVIEW').length;
      const totalValid = verified + corrected;
      const accuracyRate = total > 0 ? (((totalValid) / total) * 100).toFixed(1) : '100.0';
      const isToday = effectiveDate === todayIso;

      return {
        total,
        verified: totalValid,
        needsReview,
        accuracyRate: parseFloat(accuracyRate),
        scopeLabel: isToday ? 'TODAY' : formatShortDateDisplay(effectiveDate).toUpperCase(),
        totalSubtitle: isToday ? 'Ingested today in port ledger' : `Ingested on ${formatDateDisplay(effectiveDate)}`,
        isFiltered: true
      };
    }

    // Default when no specific date is selected ("All Days")
    const total = records.length;
    const verified = records.filter(r => r.status === 'VERIFIED').length;
    const corrected = records.filter(r => r.status === 'CORRECTED').length;
    const needsReview = records.filter(r => r.status === 'NEEDS_REVIEW').length;
    const totalValid = verified + corrected;
    const accuracyRate = total > 0 ? (((totalValid) / total) * 100).toFixed(1) : '100.0';

    return {
      total,
      verified: totalValid,
      needsReview,
      accuracyRate: parseFloat(accuracyRate),
      scopeLabel: 'ALL DAYS',
      totalSubtitle: 'All-time port ledger entries',
      isFiltered: false
    };
  }, [records, selectedDate]);

  // Auto-select Today on initial load if declarations were uploaded today
  useEffect(() => {
    if (!selectedDate && records.length > 0) {
      const todayIso = getTodayIso();
      const hasToday = records.some(r => parseRecordDate(r, 'created') === todayIso);
      if (hasToday) {
        setSelectedDate(todayIso);
      }
    }
  }, [records]);

  // Remove all duplicate records from database & cache
  const handleRemoveDuplicates = () => {
    if (!canManageCusDec) {
      showToast('Action Restricted', 'warning', 'Deduplication is restricted to authorized customs clearance.');
      return;
    }
    if (duplicateIdSet.size === 0) {
      showToast('No duplicate declarations detected.', 'info');
      return;
    }
    const dupCount = duplicateIdSet.size;
    setConfirmModal({
      isOpen: true,
      title: 'Clean Duplicate Declarations?',
      description: `Identified ${dupCount} redundant duplicate declaration(s) matching primary entries. Clean them up and preserve only verified unique declarations?`,
      highlightText: 'Original primary declarations and master files will remain untouched.',
      confirmLabel: `Clean ${dupCount} Duplicate${dupCount > 1 ? 's' : ''}`,
      cancelLabel: 'Keep All Records',
      variant: 'warning',
      icon: 'sparkles',
      onConfirm: async () => {
        try {
          showToast('Removing duplicate records...', 'info');
          const res = await fetch('/api/records/delete-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(duplicateIdSet) })
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            showToast(data.message || `Removed ${dupCount} duplicate declaration(s)`, 'success');
            await fetchRecords();
            await fetchStorageStats();
          } else {
            const fb = await fetch('/api/records/deduplicate', { method: 'POST' });
            const fbData = await fb.json().catch(() => ({}));
            showToast(fbData.message || 'Duplicates cleaned up', 'success');
            await fetchRecords();
            await fetchStorageStats();
          }
        } catch (err: any) {
          showToast('Deduplication failed', 'error', err.message);
        }
      }
    });
  };

  // Quick edit form state
  const [editStamp, setEditStamp] = useState('');
  const [editRef, setEditRef] = useState('');
  const [editConsignee, setEditConsignee] = useState('');
  const [editDeclarant, setEditDeclarant] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Parallel Worker Stream States (Apple iOS Live Activity style)
  const [workerStreams, setWorkerStreams] = useState<WorkerStreamState[]>([]);
  const [processingTelemetry, setProcessingTelemetry] = useState<{
    startTime: number;
    elapsedSeconds: number;
    docsPerMinute: number;
    etaSeconds: number;
  }>({
    startTime: 0,
    elapsedSeconds: 0,
    docsPerMinute: 0,
    etaSeconds: 0
  });

  // Queue state
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    isProcessing: false,
    isPaused: false,
    pendingCount: 0,
    inFlightCount: 0,
    completedCount: 0,
    failedCount: 0,
    totalCount: 0,
    progressPercent: 0
  });

  // Canvas Pan, Zoom & Rotation
  const [zoomScale, setZoomScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPanRef = useRef({ x: 0, y: 0 });
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tally state
  const [tallySource, setTallySource] = useState<'db' | 'upload'>('db');
  const [tallyF1File, setTallyF1File] = useState<File | null>(null);
  const [tallyF2File, setTallyF2File] = useState<File | null>(null);
  const [tallyResult, setTallyResult] = useState<TallyResult | null>(null);
  const [tallyFilter, setTallyFilter] = useState<'MATCHED' | 'UNMATCHED_F1' | 'UNMATCHED_F2'>('MATCHED');
  const [isTallyRunning, setIsTallyRunning] = useState(false);
  const [tallyProgress, setTallyProgress] = useState({
    percent: 0,
    stage: 'Initializing reconciliation engine...',
    current: 0,
    total: 0,
    currentItem: '',
    elapsedSeconds: 0,
    etaSeconds: null as number | null,
    speed: 0
  });

  // Modals state
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [isRefreshingSystem, setIsRefreshingSystem] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [isPurgingStorage, setIsPurgingStorage] = useState(false);
  const [confirmPurgeAction, setConfirmPurgeAction] = useState<'all' | 'orphans' | null>(null);
  const [storageStats, setStorageStats] = useState({
    provider: 'local' as 'supabase' | 'local' | 'hybrid',
    bucketName: 'cusdec-documents',
    totalFiles: 0,
    totalBytes: 0,
    totalFormatted: '0.00 B',
    quotaBytes: 0,
    quotaFormatted: 'Calculating...',
    percentUsed: 0,
    cloudFiles: 0,
    cloudBytes: 0,
    cloudFormatted: '0.00 B',
    localFiles: 0,
    localBytes: 0,
    localFormatted: '0.00 B',
    diskFreeBytes: 0,
    diskFreeFormatted: '' as string | undefined,
    diskTotalBytes: 0,
    diskTotalFormatted: '' as string | undefined,
    diskUsedBytes: 0,
    diskUsedFormatted: '' as string | undefined,
    diskPercentUsed: 0
  });
  const [lanUrl, setLanUrl] = useState('http://localhost:5000');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Settings form
  const [settings, setSettings] = useState<Settings>({
    geminiApiKey: '',
    geminiBackupApiKey: '',
    geminiApiKey3: '',
    customApiKey: '',
    useCustomApiKey: false,
    geminiModel: 'gemini-3.5-flash-lite',
    autoVerifyThreshold: 90,
    workerConcurrency: 3,
    consignorConsigneeMode: 'both',
    preserveLeadingZeros: true
  });

  // Hidden inputs refs
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Client-side real-time processing refs
  const isClientProcessingRef = useRef(false);
  const isClientPausedRef = useRef(false);
  const isClientCancelledRef = useRef(false);

  // -------------------------------------------------------------
  // INITIALIZATION & THEME
  // -------------------------------------------------------------
  useEffect(() => {
    const savedTheme = (localStorage.getItem('lrsys-theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    applyTheme(savedTheme);

    fetchRecords();
    fetchSettings();
    fetchSystemInfo();
    fetchStorageStats();

    // Start queue telemetry polling (only monitors if client is not actively processing)
    let statsCounter = 0;
    const interval = setInterval(async () => {
      // Periodically refresh storage stats smoothly every 25s
      statsCounter++;
      if (statsCounter % 5 === 0) {
        fetchStorageStats();
      }

      if (isClientProcessingRef.current) return;

      try {
        const res = await fetch('/api/queue/status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.queue && data.queue.isProcessing) {
            setQueueStatus(data.queue);
            fetchRecords(false);
          }
        }
      } catch (err) { }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Background stream synthesizer & active queue telemetry
  useEffect(() => {
    if (queueStatus.isProcessing && workerStreams.length === 0) {
      const concurrency = Math.max(1, settings.workerConcurrency || 6);
      setWorkerStreams(
        Array.from({ length: concurrency }, (_, i) => ({
          id: i + 1,
          status: 'extracting',
          step: 'Multi-threaded Vision OCR...',
          progress: 50,
          completedInStream: Math.floor(queueStatus.completedCount / concurrency)
        }))
      );
    }
  }, [queueStatus.isProcessing, workerStreams.length, settings.workerConcurrency, queueStatus.completedCount]);

  useEffect(() => {
    if (!queueStatus.isProcessing || processingTelemetry.startTime === 0) return;
    const interval = setInterval(() => {
      setProcessingTelemetry(prev => {
        if (!prev.startTime) return prev;
        const elapsed = Math.max(1, Math.floor((Date.now() - prev.startTime) / 1000));
        const totalDone = queueStatus.completedCount + queueStatus.failedCount;
        const dpm = elapsed > 0 ? Math.round((totalDone / elapsed) * 60) : 0;
        const remaining = Math.max(0, queueStatus.totalCount - totalDone);
        const eta = dpm > 0 ? Math.round((remaining / dpm) * 60) : 0;
        return {
          ...prev,
          elapsedSeconds: elapsed,
          docsPerMinute: dpm,
          etaSeconds: eta
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [queueStatus.isProcessing, queueStatus.completedCount, queueStatus.failedCount, queueStatus.totalCount, processingTelemetry.startTime]);

  const applyTheme = (t: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-theme', t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    localStorage.setItem('lrsys-theme', nextTheme);
    showToast(`Switched to ${nextTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}`, 'info');
  };

  // Keyboard navigation & search shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }


      if (e.key === 'Escape') {
        if (confirmModal?.isOpen) {
          if (!confirmModal.isProcessing) {
            setConfirmModal(null);
          }
          return;
        }
        if (isInspectionModalOpen) {
          setIsInspectionModalOpen(false);
          return;
        }
        setIsMobileModalOpen(false);
        setIsSettingsModalOpen(false);
        setIsStorageModalOpen(false);
        setIsSystemModalOpen(false);
        return;
      }

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
        e.preventDefault();
        selectNextRecord();
      } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        selectPrevRecord();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // -------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------
  const fetchRecords = async (updateSelection = true, showTableLoading = false) => {
    if (showTableLoading) setIsTableLoading(true);
    try {
      const url = `/api/records?status=ALL`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.records)) {
          setRecords(prev => {
            // Guard against wiping newly-streamed items during active client ingestion
            if (isClientProcessingRef.current && prev.length > (data.records?.length || 0)) {
              return prev;
            }
            return data.records || [];
          });
        }

        if (updateSelection && data.records?.length > 0) {
          setSelectedRecord(prev => {
            if (!prev) return data.records[0];
            const updated = data.records.find((r: CusDecRecord) => r.id === prev.id);
            return updated || data.records[0];
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch records:', err);
    } finally {
      setIsInitialLoading(false);
      if (showTableLoading) setIsTableLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) { }
  };

  const fetchSystemInfo = async (showLoading = false) => {
    if (showLoading) setIsRefreshingSystem(true);
    try {
      const res = await fetch('/api/system/info');
      if (res.ok) {
        const data = await res.json();
        setSystemMetrics(data);
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          setLanUrl(window.location.origin);
        } else {
          setLanUrl(data.primaryLanUrl || `http://localhost:${data.port}`);
        }
      }
    } catch (err) { }
    finally {
      if (showLoading) setIsRefreshingSystem(false);
    }
  };

  // Dedicated Real-Time System Telemetry Polling (15s idle polling, 1.5s when modal is active)
  useEffect(() => {
    fetchSystemInfo();
    const intervalTime = isSystemModalOpen ? 1500 : 15000;
    const sysInterval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchSystemInfo();
      }
    }, intervalTime);

    return () => clearInterval(sysInterval);
  }, [isSystemModalOpen]);

  const fetchStorageStats = async (showLoading = false) => {
    if (showLoading) setIsStorageLoading(true);
    try {
      const res = await fetch('/api/storage/stats');
      if (res.ok) {
        const data = await res.json();
        setStorageStats(data);
      }
    } catch (err) {
    } finally {
      if (showLoading) setIsStorageLoading(false);
    }
  };

  const handlePurgeStorage = async (action: 'all' | 'orphans') => {
    try {
      setIsPurgingStorage(true);
      const res = await fetch('/api/storage/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Server returned status ${res.status}. Please ensure the server is running.`);
      }
      if (!res.ok) throw new Error(data.error || `Failed to purge storage (status ${res.status})`);
      showToast(data.message, 'success');
      if (data.stats) setStorageStats(data.stats);
      setConfirmPurgeAction(null);
      setIsStorageModalOpen(false);
      fetchRecords(false);
    } catch (err: any) {
      showToast('Storage purge failed', 'error', err.message);
    } finally {
      setIsPurgingStorage(false);
    }
  };

  // -------------------------------------------------------------
  // SELECTION & QUICK EDIT
  // -------------------------------------------------------------
  const selectRecord = (record: CusDecRecord) => {
    setSelectedRecord(record);
    setEditStamp(String(record.greenStampNumber || '').padStart(6, '0'));
    setEditRef(record.customsRefNumber || '');
    setEditConsignee(record.consigneeName || '');
    setEditDeclarant(record.declarantName || '');
    resetZoom();
  };

  const openInspectionModal = (record: CusDecRecord) => {
    setIsImageLoading(true);
    selectRecord(record);
    setIsInspectionModalOpen(true);
  };

  useEffect(() => {
    setIsImageLoading(true);
  }, [selectedRecord?.id, selectedRecord?.imageUrl]);

  useEffect(() => {
    if (selectedRecord) {
      setEditStamp(String(selectedRecord.greenStampNumber || '').padStart(6, '0'));
      setEditRef(selectedRecord.customsRefNumber || '');
      setEditConsignee(selectedRecord.consigneeName || '');
      setEditDeclarant(selectedRecord.declarantName || '');
    }
  }, [selectedRecord]);

  // Defer search term updates to keep input typing at 60fps on low-end hardware
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredRecords = useMemo(() => {
    const q = deferredSearchTerm.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

    const list = records.filter(r => {
      // 0. Calendar / Day-by-Day filter (strictly based on system upload date)
      if (selectedDate) {
        const recordDate = parseRecordDate(r, 'created');
        if (recordDate !== selectedDate) return false;
      }

      // 1. Tab Status filter
      if (filter === 'NEEDS_REVIEW' && r.status !== 'NEEDS_REVIEW') return false;
      if (filter === 'VERIFIED' && r.status !== 'VERIFIED') return false;
      if (filter === 'CORRECTED' && r.status !== 'CORRECTED') return false;
      if (filter === 'DUPLICATES' && !duplicateIdSet.has(r.id)) return false;

      // 2. Real-time instant search filter across all key declaration attributes
      if (tokens.length > 0) {
        const stamp = (r.greenStampNumber || '').toLowerCase();
        const ref = (r.customsRefNumber || '').toLowerCase();
        const consignee = (r.consigneeName || '').toLowerCase();
        const declarant = (r.declarantName || '').toLowerCase();
        const bl = (r.blNumber || '').toLowerCase();
        const goods = (r.goodsDescription || '').toLowerCase();
        const date = (r.customsDate || '').toLowerCase();
        const cTin = (r.consigneeTIN || '').toLowerCase();
        const dTin = (r.declarantTIN || '').toLowerCase();
        const filename = (r.filename || '').toLowerCase();
        const origName = (r.originalName || '').toLowerCase();

        const corpus = `${stamp} ${ref} ${consignee} ${declarant} ${bl} ${goods} ${date} ${cTin} ${dTin} ${filename} ${origName}`;
        const matchesAll = tokens.every(token => corpus.includes(token));
        if (!matchesAll) return false;
      }

      return true;
    });

    // 3. Smooth Stamp Duty Number Ascending Sort (when iOS toggle switch is enabled)
    if (isStampAscending) {
      return [...list].sort((a, b) => {
        const getNum = (s?: string) => {
          if (!s) return Infinity;
          const clean = s.replace(/\D/g, '');
          if (!clean) return Infinity;
          const n = parseInt(clean, 10);
          return isNaN(n) ? Infinity : n;
        };
        const numA = getNum(a.greenStampNumber);
        const numB = getNum(b.greenStampNumber);
        if (numA !== numB) return numA - numB;
        return (a.greenStampNumber || '').localeCompare(b.greenStampNumber || '');
      });
    }

    return list;
  }, [records, filter, deferredSearchTerm, duplicateIdSet, isStampAscending, selectedDate]);

  // Reset pagination to first page when search query, filter, date, or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, filter, selectedDate, isStampAscending]);

  // Total pages calculation
  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  }, [filteredRecords.length, pageSize]);

  // Ensure current page does not exceed total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Sliced paginated records for ultra-smooth table rendering
  const paginatedRecords = useMemo(() => {
    if (pageSize === 'all') return filteredRecords;
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const currentRecordIndex = selectedRecord
    ? filteredRecords.findIndex(r => r.id === selectedRecord.id)
    : -1;

  const selectNextRecord = () => {
    if (filteredRecords.length === 0) return;
    const nextIdx = currentRecordIndex < filteredRecords.length - 1 ? currentRecordIndex + 1 : 0;
    selectRecord(filteredRecords[nextIdx]);
  };

  const selectPrevRecord = () => {
    if (filteredRecords.length === 0) return;
    const prevIdx = currentRecordIndex > 0 ? currentRecordIndex - 1 : filteredRecords.length - 1;
    selectRecord(filteredRecords[prevIdx]);
  };

  const handleRowCheck = (id: string, checked: boolean) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(new Set(filteredRecords.map(r => r.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const saveQuickEdit = async () => {
    if (!selectedRecord) return;
    if (!canManageCusDec) {
      showToast('Action Restricted', 'warning', 'Editing declarations is restricted to authorized customs clearance.');
      return;
    }
    const updates = {
      greenStampNumber: editStamp.trim(),
      customsRefNumber: editRef.trim(),
      consigneeName: editConsignee.trim().toUpperCase(),
      declarantName: editDeclarant.trim().toUpperCase(),
      status: 'CORRECTED' as const,
      manualCorrection: true
    };

    try {
      const res = await fetch(`/api/records/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        await fetchRecords();
        showToast('Declaration saved successfully!', 'success', `#${editStamp} • ${editConsignee}`);
      }
    } catch (err: any) {
      showToast('Failed to save update', 'error', err.message);
    }
  };

  const saveQuickEditAndNext = async () => {
    if (!canManageCusDec) {
      selectNextRecord();
      return;
    }
    await saveQuickEdit();
    selectNextRecord();
  };

  // -------------------------------------------------------------
  // RECORD ACTIONS (INDIVIDUAL & BULK)
  // -------------------------------------------------------------
  const requestDeleteSingleRecord = (record: CusDecRecord) => {
    if (!canManageCusDec) {
      showToast('Action Restricted', 'warning', 'Deleting declarations is restricted to authorized customs clearance.');
      return;
    }
    const stampLabel = record.greenStampNumber && record.greenStampNumber !== '000000'
      ? `#${record.greenStampNumber}`
      : (record.customsRefNumber && record.customsRefNumber !== 'UNKNOWN' ? record.customsRefNumber : (record.filename || 'this record'));

    setConfirmModal({
      isOpen: true,
      title: `Delete Declaration ${stampLabel}?`,
      description: `Are you sure you want to permanently remove this declaration (${record.consigneeName || 'Unknown Consignee'} • ${record.customsRefNumber || record.filename}) from the active customs ledger?`,
      highlightText: 'The original uploaded document scan in server storage remains safe and intact.',
      confirmLabel: 'Yes, Delete Declaration',
      cancelLabel: 'Cancel',
      variant: 'destructive',
      icon: 'trash',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/records/${record.id}`, { method: 'DELETE' });
          if (res.ok) {
            setSelectedRowIds(prev => {
              const next = new Set(prev);
              next.delete(record.id);
              return next;
            });
            if (selectedRecord?.id === record.id) {
              setIsInspectionModalOpen(false);
              setSelectedRecord(null);
            }
            await fetchRecords();
            await fetchStorageStats();
            showToast(`Deleted declaration ${stampLabel}`, 'info');
          } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'Failed to delete record', 'error');
          }
        } catch (err: any) {
          showToast('Failed to delete declaration', 'error', err.message);
        }
      }
    });
  };

  const deleteSelectedRecords = () => {
    if (!canManageCusDec) {
      showToast('Action Restricted', 'warning', 'Bulk deletion is restricted to authorized customs clearance.');
      return;
    }
    const ids = Array.from(selectedRowIds);
    if (ids.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: `Delete ${ids.length} Declaration${ids.length > 1 ? 's' : ''}?`,
      description: `Are you sure you want to remove ${ids.length} selected declaration record(s) from the customs ledger? This action cannot be undone.`,
      highlightText: `${ids.length} declaration${ids.length > 1 ? 's' : ''} will be permanently removed from the active ledger.`,
      confirmLabel: `Delete ${ids.length} Declaration${ids.length > 1 ? 's' : ''}`,
      cancelLabel: 'Keep Declarations',
      variant: 'destructive',
      icon: 'trash',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/records/delete-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
          });
          if (res.ok) {
            setSelectedRowIds(new Set());
            await fetchRecords();
            await fetchStorageStats();
            showToast(`Deleted ${ids.length} declaration(s)`, 'info');
          } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'Bulk delete failed', 'error');
          }
        } catch (err: any) {
          showToast('Bulk delete failed', 'error', err.message);
        }
      }
    });
  };

  const clearAllRecords = () => {
    if (!canManageCusDec) {
      showToast('Action Restricted', 'warning', 'Clearing the ledger is restricted to authorized customs clearance.');
      return;
    }
    const recordCount = records.length;
    setConfirmModal({
      isOpen: true,
      title: 'Clear Long Room Declarations Ledger?',
      description: `Are you sure you want to clear all ${recordCount} extracted declaration(s) from the system? The active ledger and tally calculations will be reset.`,
      highlightText: 'Original uploaded document scans on your VPS storage remain completely safe and untouched.',
      confirmLabel: 'Yes, Clear Ledger',
      cancelLabel: 'Cancel',
      variant: 'destructive',
      icon: 'trash',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/records/clear', { method: 'POST' });
          if (res.ok) {
            setSelectedRecord(null);
            setSelectedRowIds(new Set());
            setRecords([]);
            await fetchRecords();
            await fetchStorageStats();
            showToast('System ledger cleared', 'info');
          } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'Failed to clear ledger', 'error');
          }
        } catch (err: any) {
          showToast('Clear failed', 'error', err.message);
        }
      }
    });
  };

  const reprocessAllWithAI = () => {
    if (!canManageCusDec) {
      showToast('Action Restricted', 'warning', 'Reprocessing declarations is restricted to authorized customs clearance.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Reprocess All with Gemini AI?',
      description: `This will reset current ledger entries and re-extract all uploaded images using Google Gemini Vision AI.`,
      highlightText: 'All uploaded document images stored on your VPS will be preserved and re-analyzed.',
      confirmLabel: 'Reprocess All Scans',
      cancelLabel: 'Cancel',
      variant: 'warning',
      icon: 'refresh',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/records/reprocess-all', { method: 'POST' });
          if (res.ok) {
            setSelectedRowIds(new Set());
            fetchRecords();
            showToast('Re-processing all declarations with AI...', 'info');
          } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'Failed to start reprocessing', 'error');
          }
        } catch (err: any) {
          showToast('Reprocess error', 'error', err.message);
        }
      }
    });
  };

  const reprocessUnknownsWithAI = async () => {
    if (!canManageCusDec) {
      showToast('Action Restricted', 'warning', 'Reprocessing unknown declarations is restricted to authorized customs clearance.');
      return;
    }
    try {
      const res = await fetch('/api/records/reprocess-unknowns', { method: 'POST' });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch {
        throw new Error(`Server returned status ${res.status}`);
      }
      if (res.ok) {
        showToast(data.message || `Queued ${data.count} items for re-extraction.`, 'success');
        setSelectedRowIds(new Set());
        fetchRecords();
      } else {
        showToast(data.error || data.message || 'Reprocess failed', 'error');
      }
    } catch (err: any) {
      showToast('Reprocess error', 'error', err.message);
    }
  };

  // -------------------------------------------------------------
  // UPLOADS & DRAG AND DROP (PARALLEL MULTI-THREADED WORKERS)
  // -------------------------------------------------------------
  const processFilesWithRealtimeProgress = async (files: File[]) => {
    if (!files || files.length === 0) return;
    if (!canManageCusDec) {
      showToast('Action Restricted', 'warning', 'Document ingestion is restricted to authorized customs clearance.');
      return;
    }

    isClientProcessingRef.current = true;
    isClientPausedRef.current = false;
    isClientCancelledRef.current = false;

    const totalCount = files.length;
    let completedCount = 0;
    let failedCount = 0;

    // Concurrency: use workerConcurrency setting (default 6)
    const concurrency = Math.min(totalCount, Math.max(1, settings.workerConcurrency || 6));
    const startTime = Date.now();

    setProcessingTelemetry({
      startTime,
      elapsedSeconds: 0,
      docsPerMinute: 0,
      etaSeconds: 0
    });

    // Initialize individual worker streams
    const initialWorkers: WorkerStreamState[] = Array.from({ length: concurrency }, (_, idx) => ({
      id: idx + 1,
      status: 'idle',
      step: 'Ready for batch...',
      progress: 0,
      completedInStream: 0
    }));
    setWorkerStreams(initialWorkers);

    // Immediately show real-time progress banner
    setQueueStatus({
      isProcessing: true,
      isPaused: false,
      pendingCount: totalCount,
      inFlightCount: concurrency,
      completedCount: 0,
      failedCount: 0,
      totalCount,
      progressPercent: 0
    });

    showToast(`Starting parallel extraction (${concurrency} streams) for ${totalCount} documents...`, 'info');

    let nextIndex = 0;

    const updateStream = (
      workerId: number,
      updater: Partial<WorkerStreamState> | ((prev: WorkerStreamState) => Partial<WorkerStreamState>)
    ) => {
      setWorkerStreams(prev =>
        prev.map(w => {
          if (w.id !== workerId) return w;
          const patch = typeof updater === 'function' ? updater(w) : updater;
          return { ...w, ...patch };
        })
      );
    };

    const runWorker = async (workerId: number) => {
      while (nextIndex < totalCount && !isClientCancelledRef.current) {
        // Pause loop
        while (isClientPausedRef.current && !isClientCancelledRef.current) {
          updateStream(workerId, { step: 'Paused' });
          await new Promise(res => setTimeout(res, 200));
        }

        if (isClientCancelledRef.current) {
          updateStream(workerId, { status: 'idle', step: 'Stream Cancelled' });
          break;
        }

        const currentIndex = nextIndex++;
        if (currentIndex >= totalCount) break;
        const currentFile = files[currentIndex];
        if (!currentFile) break;

        updateStream(workerId, {
          status: 'extracting',
          fileName: currentFile.name,
          step: 'Vision AI OCR Pass...',
          progress: 25
        });

        // Fast intermediate feedback
        const stepTimer = setTimeout(() => {
          updateStream(workerId, prev => {
            if (prev.status === 'extracting') {
              return { step: 'Extracting Boxes 8, 14 & Stamp...', progress: 65 };
            }
            return {};
          });
        }, 500);

        let fileProcessed = false;
        let attempt = 0;
        let lastUploadError = '';

        while (!fileProcessed && attempt < 3 && !isClientCancelledRef.current) {
          attempt++;
          try {
            const formData = new FormData();
            formData.append('documents', currentFile);

            const res = await fetch(`/api/upload?process=1&worker=${workerId}`, {
              method: 'POST',
              body: formData
            });

            clearTimeout(stepTimer);

            const text = await res.text();
            let data: any = {};
            try {
              data = text ? JSON.parse(text) : {};
            } catch {
              throw new Error(`Server returned status ${res.status}`);
            }

            if (!res.ok) {
              throw new Error(data.error || `Upload failed with status ${res.status}`);
            }

            if (data.record) {
              // Instantly append newly extracted record in ledger state without collapsing duplicates!
              setRecords(prev => {
                const idx = prev.findIndex(r => r.id === data.record.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = data.record;
                  return next;
                }
                return [data.record, ...prev];
              });
            }

            // Real-time smooth storage capacity update
            if (data.storageStats) {
              setStorageStats(data.storageStats);
            }

            completedCount++;
            fileProcessed = true;

            updateStream(workerId, prev => ({
              status: 'completed',
              step: `Verified #${data.record?.greenStampNumber || 'OK'} (${data.record?.confidence || 98}%)`,
              progress: 100,
              completedInStream: prev.completedInStream + 1,
              lastRecord: data.record ? {
                stampNo: data.record.greenStampNumber,
                customsRef: data.record.customsRefNumber,
                consignee: data.record.consigneeName,
                confidence: data.record.confidence,
                isDuplicate: data.record.isDuplicate
              } : undefined
            }));
          } catch (err: any) {
            lastUploadError = err.message || 'Processing failed';
            if (attempt < 3 && !isClientCancelledRef.current) {
              updateStream(workerId, {
                step: `Retrying (Attempt ${attempt + 1}/3)...`,
                progress: 40
              });
              await new Promise(r => setTimeout(r, 800 * attempt));
            }
          }
        }

        if (!fileProcessed) {
          clearTimeout(stepTimer);
          console.error(`Error processing ${currentFile.name}:`, lastUploadError);
          failedCount++;
          updateStream(workerId, prev => ({
            status: 'error',
            step: `Error: ${lastUploadError}`,
            progress: 0,
            completedInStream: prev.completedInStream
          }));
        }

        // Adaptive pacing between files
        await new Promise(r => setTimeout(r, 150));

        const totalDone = completedCount + failedCount;
        const progressPercent = Math.round((totalDone / totalCount) * 100);
        const elapsed = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
        const dpm = Math.round((totalDone / elapsed) * 60);
        const remaining = Math.max(0, totalCount - totalDone);
        const eta = dpm > 0 ? Math.round((remaining / dpm) * 60) : 0;

        setProcessingTelemetry({
          startTime,
          elapsedSeconds: elapsed,
          docsPerMinute: dpm,
          etaSeconds: eta
        });

        setQueueStatus(prev => ({
          ...prev,
          pendingCount: Math.max(0, totalCount - totalDone),
          completedCount,
          failedCount,
          progressPercent
        }));
      }

      updateStream(workerId, {
        status: 'idle',
        step: 'Standby / Complete',
        progress: 100
      });
    };

    const workers = Array.from({ length: concurrency }, async (_, idx) => {
      // Stagger worker start by 350ms to distribute stream initiation and prevent API bursts
      if (idx > 0) {
        await new Promise(r => setTimeout(r, idx * 350));
      }
      return runWorker(idx + 1);
    });
    await Promise.all(workers);

    isClientProcessingRef.current = false;

    if (isClientCancelledRef.current) {
      showToast(`Ingestion cancelled: ${completedCount} documents saved to ledger.`, 'warning');
    } else {
      showToast(`All ${completedCount} documents verified and saved to ledger!`, 'success');
    }

    setQueueStatus(prev => ({
      ...prev,
      isProcessing: false,
      progressPercent: 100
    }));

    await fetchRecords(false);
    await fetchStorageStats();
  };

  const handleZipFile = async (zipFile: File) => {
    if (!canManageCusDec) {
      showToast('Action Restricted', 'warning', 'ZIP import is restricted to authorized customs clearance.');
      return;
    }
    try {
      showToast(`Unpacking ZIP: ${zipFile.name}...`, 'info');
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(zipFile);
      const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

      const imageFiles: File[] = [];
      const filenames = Object.keys(loadedZip.files);

      for (const filename of filenames) {
        const entry = loadedZip.files[filename];
        if (entry.dir) continue;
        const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
        if (validExts.includes(ext)) {
          const blob = await entry.async('blob');
          const cleanName = filename.split('/').pop() || filename;
          const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.pdf' ? 'application/pdf' : 'image/jpeg';
          const file = new File([blob], cleanName, { type: mimeType });
          imageFiles.push(file);
        }
      }

      if (imageFiles.length === 0) {
        showToast('No valid images in ZIP', 'warning', 'ZIP must contain JPG, PNG, WEBP, or PDF files');
        return;
      }

      await processFilesWithRealtimeProgress(imageFiles);
    } catch (err: any) {
      showToast('ZIP Processing Failed', 'error', err.message);
    }
  };

  const handleFileUpload = async (files: FileList | null, endpoint: string, fieldName: string) => {
    if (!files || files.length === 0) return;
    if (!canManageCusDec) {
      showToast('Action Restricted', 'warning', 'Document ingestion is restricted to authorized customs clearance.');
      return;
    }

    if (fieldName === 'zipfile' || (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip'))) {
      await handleZipFile(files[0]);
      return;
    }

    if (fieldName === 'documents') {
      await processFilesWithRealtimeProgress(Array.from(files));
      return;
    }

    const formData = new FormData();
    formData.append(fieldName, files[0]);

    try {
      showToast(`Uploading ${files.length} file(s)...`, 'info');
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(text || `Server returned ${res.status} ${res.statusText}`);
      }

      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      showToast(`Upload complete!`, 'success');
      fetchRecords();
      fetchStorageStats();
    } catch (err: any) {
      showToast('Upload error', 'error', err.message);
    }
  };

  // Drag and Drop (Guarded so chat widget drops don't trigger declaration ingestion)
  const isInsideChatWidget = (e: React.DragEvent) => {
    const target = e.target as HTMLElement | null;
    return !!target?.closest('[data-chat-widget]');
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!canManageCusDec) return;
    if (isInsideChatWidget(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!canManageCusDec) return;
    if (isInsideChatWidget(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      setIsDraggingFile(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!canManageCusDec) return;
    if (isInsideChatWidget(e)) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    dragCounterRef.current = 0;

    // Defense-in-depth: Never ingest files dropped into the chat widget as declarations
    if (isInsideChatWidget(e)) return;

    if (!canManageCusDec) {
      showToast('Action Restricted', 'warning', 'Document ingestion is restricted to authorized customs clearance.');
      return;
    }

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const isZip = files[0].name.toLowerCase().endsWith('.zip');
    if (isZip) {
      await handleZipFile(files[0]);
    } else {
      await handleFileUpload(files, '/api/upload', 'documents');
    }
  };

  // -------------------------------------------------------------
  // CANVAS ZOOM, PAN & ROTATION
  // -------------------------------------------------------------
  const adjustZoom = (delta: number) => {
    setZoomScale(prev => Math.max(0.4, Math.min(5.0, Number((prev + delta).toFixed(2)))));
  };

  const resetZoom = () => {
    setZoomScale(1.0);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
  };

  const rotateImage = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => {
      setCopiedField(prev => (prev === label ? null : prev));
    }, 1500);
    showToast(`Copied ${label}`, 'success', text);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (confirmModal?.isOpen) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPanRef.current = { ...panOffset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: initialPanRef.current.x + dx,
      y: initialPanRef.current.y + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    adjustZoom(delta);
  };

  // -------------------------------------------------------------
  // TALLY RECONCILIATION
  // -------------------------------------------------------------
  const runTallyMatching = async () => {
    if (tallySource === 'upload' && !tallyF1File) {
      return showToast('Select File 1', 'warning', 'Please select Generated Excel / CSV File 1.');
    }
    if (!tallyF2File) {
      return showToast('Select File 2', 'warning', 'Please select Master Reference File 2.');
    }

    const formData = new FormData();
    if (tallySource === 'upload' && tallyF1File) {
      formData.append('file1', tallyF1File);
    }
    formData.append('file2', tallyF2File);

    const initialTotal = tallySource === 'db' ? records.length : 0;
    const startTime = Date.now();
    let currentProcessed = 0;
    let targetTotal = initialTotal;

    setTallyProgress({
      percent: 5,
      stage: 'Preparing declaration records and master reference...',
      current: 0,
      total: initialTotal,
      currentItem: '',
      elapsedSeconds: 0,
      etaSeconds: null,
      speed: 0
    });
    setIsTallyRunning(true);

    // Live elapsed timer & adaptive ETA interval (updates every 500ms)
    const timerInterval = setInterval(() => {
      const elapsed = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
      setTallyProgress(prev => {
        let eta: number | null = prev.etaSeconds;
        let speed = prev.speed;
        if (currentProcessed > 0 && elapsed > 0) {
          speed = parseFloat((currentProcessed / elapsed).toFixed(1));
          const remaining = Math.max(0, targetTotal - currentProcessed);
          if (speed > 0) {
            eta = Math.round(remaining / speed);
          }
        } else if (prev.percent > 10 && elapsed > 1) {
          const remainingPct = 100 - prev.percent;
          eta = Math.max(1, Math.round((remainingPct / prev.percent) * elapsed));
        }
        return {
          ...prev,
          elapsedSeconds: elapsed,
          etaSeconds: eta,
          speed
        };
      });
    }, 500);

    try {
      showToast('Reconciling declarations against master reference...', 'info');
      const res = await fetch('/api/tally/run?stream=1', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Tally failed');
      }

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult: TallyResult | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg = JSON.parse(line);
              if (msg.type === 'progress') {
                if (msg.current) currentProcessed = msg.current;
                if (msg.total && msg.total > 0) targetTotal = msg.total;

                const elapsed = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
                let speed = 0;
                let eta: number | null = null;
                if (currentProcessed > 0 && elapsed > 0) {
                  speed = parseFloat((currentProcessed / elapsed).toFixed(1));
                  const remaining = Math.max(0, targetTotal - currentProcessed);
                  if (speed > 0) eta = Math.round(remaining / speed);
                }

                setTallyProgress(prev => ({
                  ...prev,
                  percent: msg.percent ?? prev.percent,
                  stage: msg.stage || prev.stage,
                  current: msg.current ?? prev.current,
                  total: msg.total ?? prev.total,
                  currentItem: msg.currentItem || prev.currentItem,
                  speed: speed || prev.speed,
                  etaSeconds: eta ?? prev.etaSeconds
                }));
              } else if (msg.type === 'complete') {
                finalResult = msg.result;
              } else if (msg.type === 'error') {
                throw new Error(msg.error);
              }
            } catch (parseErr: any) {
              if (parseErr.message && !parseErr.message.includes('JSON')) {
                throw parseErr;
              }
            }
          }
        }

        if (finalResult) {
          setTallyProgress(prev => ({ ...prev, percent: 100, stage: 'Reconciliation complete!' }));
          setTallyResult(finalResult);
          showToast('Tally Complete!', 'success', `${finalResult.matched?.length || 0} items matched both Consignee and Declarant.`);
        } else {
          // Fallback fetch if stream ended without payload
          const lastRes = await fetch('/api/tally/run');
          if (lastRes.ok) {
            const data = await lastRes.json();
            setTallyResult(data);
          }
        }
      }
    } catch (err: any) {
      showToast('Tally Error', 'error', err.message);
    } finally {
      clearInterval(timerInterval);
      setTimeout(() => {
        setIsTallyRunning(false);
      }, 500);
    }
  };

  // Render QR Code in modal
  useEffect(() => {
    if (isMobileModalOpen && qrCanvasRef.current) {
      let targetUrl = lanUrl;
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        targetUrl = window.location.origin;
      }
      QRCode.toCanvas(qrCanvasRef.current, targetUrl, { width: 220, margin: 2 }, err => {
        if (err) console.error(err);
      });
    }
  }, [isMobileModalOpen, lanUrl]);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setIsSettingsModalOpen(false);
        showToast('Settings saved successfully!', 'success');
      }
    } catch (err: any) {
      showToast('Failed to save settings', 'error', err.message);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="min-h-screen flex bg-background text-foreground overflow-x-hidden relative"
    >
      {/* Ambient Cyber Mesh Glow for Dark Mode */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 hidden dark:block">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.08),transparent_70%)] blur-2xl" />
        <div className="absolute top-[25%] -right-40 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(6,182,212,0.05),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-40 left-20 w-[700px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_70%)] blur-3xl" />
      </div>
      {/* ========================================================
           FLOATING TOAST NOTIFICATIONS (Pinned Top-Right Corner)
           ======================================================== */}
      <div className="fixed top-5 right-5 sm:top-6 sm:right-6 z-[9999] flex flex-col items-end gap-2.5 pointer-events-none max-w-sm w-full sm:w-auto">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full border text-sm font-medium transition-all duration-300 cursor-pointer select-none group active:scale-95",
              "animate-in fade-in-0 slide-in-from-top-2 sm:slide-in-from-right-6",
              "bg-white/30 dark:bg-black/35 backdrop-blur-xl backdrop-saturate-150 border-slate-300/40 dark:border-white/10 text-slate-900 dark:text-slate-100 shadow-xl shadow-black/5 dark:shadow-black/50 hover:bg-white/40 dark:hover:bg-black/45 hover:border-slate-400/40 dark:hover:border-white/20 hover:scale-[1.02]"
            )}
          >
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
            {t.type === 'error' && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
            {t.type === 'info' && <Activity className="w-4 h-4 text-cyan-500 shrink-0" />}
            <div className="flex flex-col min-w-0 pr-1">
              <span className="font-semibold leading-tight text-xs sm:text-sm truncate">{t.message}</span>
              {t.subtext && <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{t.subtext}</span>}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setToasts(prev => prev.filter(item => item.id !== t.id));
              }}
              className="opacity-0 group-hover:opacity-100 -mr-1 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* ========================================================
           FULL-SCREEN DRAG & DROP OVERLAY
           ======================================================== */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md flex flex-col items-center justify-center gap-4 pointer-events-none animate-in fade-in-0">
          <div className="w-32 h-32 rounded-full border-4 border-dashed border-primary flex items-center justify-center animate-dropzone-spin bg-primary/10">
            <Upload className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Drop Customs Documents to Ingest</h2>
          <p className="text-muted-foreground text-sm">Accepts JPG, PNG, WEBP, PDF & Bulk ZIP Archives</p>
        </div>
      )}

      {/* ========================================================
           LEFT SIDEBAR NAVIGATION (Pure shadcn/ui & Precision Motion)
           ======================================================== */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#070b14] text-slate-900 dark:text-slate-100 shadow-xl shadow-slate-900/5 dark:shadow-black/40 transition-all duration-300 ease-in-out select-none backdrop-blur-xl w-64",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Top Brand Bar */}
        <div className="h-20 border-b border-slate-200/80 dark:border-slate-800/80 px-4 flex items-center justify-between gap-3 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/10 via-sky-500/15 to-blue-500/10 dark:from-cyan-950/40 dark:via-sky-900/30 dark:to-blue-950/40 border border-cyan-500/25 dark:border-cyan-500/30 flex items-center justify-center p-1.5 shadow-xs overflow-hidden shrink-0 group transition-all"
            >
              <img
                src="/logo.png"
                alt="Sri Lanka Customs Logo"
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
              />
              <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#070b14] animate-pulse" />
            </div>
            <div className="flex flex-col truncate">
              <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white uppercase leading-snug">
                SRI LANKA CUSTOMS
              </span>
              <span className="text-[10px] font-extrabold text-cyan-600 dark:text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block animate-ping" />
                CUSDEC • LONG ROOM
              </span>
            </div>
          </div>

          {/* Mobile Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 md:hidden flex rounded-xl transition-all duration-200 active:scale-95 cursor-pointer"
            title="Close navigation"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation Tab Links with Smooth Motion & Kinetic Elevation */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {/* Group 1: Customs Management */}
          <div className="space-y-1.5">
            {!isSidebarCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
                <span>CUSTOMS MANAGEMENT</span>
                <span className="w-1 h-1 rounded-full bg-cyan-500/60" />
              </div>
            )}

            {/* Statistics & Analytics Deck Tab (On top above Platform Overview) */}
            <button
              type="button"
              onClick={() => navigateToSection('stats')}
              className={cn(
                "group relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-300 ease-out cursor-pointer select-none",
                activeSection === 'stats'
                  ? "sidebar-tab-active sidebar-tab-active-glow text-white border border-white/25 scale-[1.01]"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/50 hover:translate-x-1.5 active:scale-[0.98]",
                isSidebarCollapsed && "justify-center px-0 py-2.5"
              )}
              title="Daily CusDec Entry Statistics & Volume Trends"
            >
              {activeSection === 'stats' && !isSidebarCollapsed && (
                <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.85)] animate-in fade-in-50 zoom-in-75 duration-200" />
              )}
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                  activeSection === 'stats'
                    ? "bg-white/20 text-white scale-105 shadow-inner"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:text-cyan-500 group-hover:bg-cyan-500/10 group-hover:scale-110"
                )}
              >
                <BarChart3 className="w-4 h-4" />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="font-bold text-xs truncate">Statistics</span>
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 transition-colors shrink-0",
                      activeSection === 'stats'
                        ? "bg-white/25 text-white"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
              )}
              {!isSidebarCollapsed && (
                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-all duration-200",
                    activeSection === 'stats'
                      ? "text-white/90 translate-x-0 opacity-100"
                      : "text-slate-300 dark:text-slate-600 group-hover:text-cyan-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                  )}
                />
              )}
            </button>

            {/* Platform Overview / Declarations Tab */}
            <button
              type="button"
              onClick={() => navigateToSection('ocr')}
              className={cn(
                "group relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-300 ease-out cursor-pointer select-none",
                activeSection === 'ocr'
                  ? "sidebar-tab-active sidebar-tab-active-glow text-white border border-white/25 scale-[1.01]"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/50 hover:translate-x-1.5 active:scale-[0.98]",
                isSidebarCollapsed && "justify-center px-0 py-2.5"
              )}
              title="Declarations & Audit Ledger"
            >
              {activeSection === 'ocr' && !isSidebarCollapsed && (
                <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.85)] animate-in fade-in-50 zoom-in-75 duration-200" />
              )}
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                  activeSection === 'ocr'
                    ? "bg-white/20 text-white scale-105 shadow-inner"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:text-cyan-500 group-hover:bg-cyan-500/10 group-hover:scale-110"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="font-bold text-xs truncate">Declarations</span>
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold transition-colors shrink-0",
                      activeSection === 'ocr'
                        ? "bg-white/25 text-white"
                        : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {records.length}
                  </span>
                </div>
              )}
              {!isSidebarCollapsed && (
                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-all duration-200",
                    activeSection === 'ocr'
                      ? "text-white/90 translate-x-0 opacity-100"
                      : "text-slate-300 dark:text-slate-600 group-hover:text-cyan-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                  )}
                />
              )}
            </button>

            {/* Manifests & Tally Reconciliation Tab */}
            <button
              type="button"
              onClick={() => navigateToSection('tally')}
              className={cn(
                "group relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-300 ease-out cursor-pointer select-none",
                activeSection === 'tally'
                  ? "sidebar-tab-active sidebar-tab-active-glow text-white border border-white/25 scale-[1.01]"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/50 hover:translate-x-1.5 active:scale-[0.98]",
                isSidebarCollapsed && "justify-center px-0 py-2.5"
              )}
              title="Tally Engine & Manifest Reconciliation"
            >
              {activeSection === 'tally' && !isSidebarCollapsed && (
                <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.85)] animate-in fade-in-50 zoom-in-75 duration-200" />
              )}
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                  activeSection === 'tally'
                    ? "bg-white/20 text-white scale-105 shadow-inner"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:text-cyan-500 group-hover:bg-cyan-500/10 group-hover:scale-110"
                )}
              >
                <Layers className="w-4 h-4" />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="font-bold text-xs truncate">Tally Engine</span>
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold transition-colors shrink-0",
                      activeSection === 'tally'
                        ? "bg-white/25 text-white"
                        : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                    )}
                  >
                    AUDIT
                  </span>
                </div>
              )}
              {!isSidebarCollapsed && (
                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-all duration-200",
                    activeSection === 'tally'
                      ? "text-white/90 translate-x-0 opacity-100"
                      : "text-slate-300 dark:text-slate-600 group-hover:text-cyan-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                  )}
                />
              )}
            </button>

            {/* Officer Identity / Profile Tab */}
            <button
              type="button"
              onClick={() => {
                if (activeSection !== 'profile') {
                  navigateToSection('profile');
                  setIsProfileMenuOpen(true);
                } else {
                  setIsProfileMenuOpen(!isProfileMenuOpen);
                }
              }}
              className={cn(
                "group relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-300 ease-out cursor-pointer select-none",
                activeSection === 'profile'
                  ? "sidebar-tab-active sidebar-tab-active-glow text-white border border-white/25 scale-[1.01]"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/50 hover:translate-x-1.5 active:scale-[0.98]",
                isSidebarCollapsed && "justify-center px-0 py-2.5"
              )}
              title="Officer Profile & Security"
            >
              {activeSection === 'profile' && !isSidebarCollapsed && (
                <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.85)] animate-in fade-in-50 zoom-in-75 duration-200" />
              )}
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                  activeSection === 'profile'
                    ? "bg-white/20 text-white scale-105 shadow-inner"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:text-cyan-500 group-hover:bg-cyan-500/10 group-hover:scale-110"
                )}
              >
                <User className="w-4 h-4" />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="font-bold text-xs truncate">Profile</span>
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold transition-colors shrink-0",
                      activeSection === 'profile'
                        ? "bg-white/25 text-white"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    )}
                  >
                    SEALED
                  </span>
                </div>
              )}
              {!isSidebarCollapsed && (
                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-all duration-200",
                    activeSection === 'profile'
                      ? cn("text-white/90 translate-x-0 opacity-100", isProfileMenuOpen && "rotate-90")
                      : "text-slate-300 dark:text-slate-600 group-hover:text-cyan-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                  )}
                />
              )}
            </button>

            {/* Sub-tabs under Profile: Dossier, Security & OTP */}
            {!isSidebarCollapsed && activeSection === 'profile' && isProfileMenuOpen && (
              <div className="ml-5 pl-3 border-l-2 border-cyan-500/30 dark:border-cyan-500/20 space-y-1 py-1 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                {/* Dossier */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSection('profile');
                    setProfileSubTab('profile');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={cn(
                    "group relative w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-200 cursor-pointer select-none",
                    profileSubTab === 'profile'
                      ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30 shadow-xs shadow-cyan-500/10"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border border-transparent font-medium"
                  )}
                  title="Official Officer Dossier"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <User
                      className={cn(
                        "w-3.5 h-3.5 shrink-0 transition-colors",
                        profileSubTab === 'profile'
                          ? "text-cyan-600 dark:text-cyan-400"
                          : "text-slate-400 dark:text-slate-500 group-hover:text-cyan-500"
                      )}
                    />
                    <span className="truncate">Dossier</span>
                  </div>
                  {profileSubTab === 'profile' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.8)] animate-pulse shrink-0" />
                  )}
                </button>

                {/* Security & OTP */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSection('profile');
                    setProfileSubTab('security');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={cn(
                    "group relative w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-200 cursor-pointer select-none",
                    profileSubTab === 'security'
                      ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30 shadow-xs shadow-cyan-500/10"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border border-transparent font-medium"
                  )}
                  title="Security Passcodes & Brevo Gmail OTP"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Fingerprint
                      className={cn(
                        "w-3.5 h-3.5 shrink-0 transition-colors",
                        profileSubTab === 'security'
                          ? "text-cyan-600 dark:text-cyan-400"
                          : "text-slate-400 dark:text-slate-500 group-hover:text-cyan-500"
                      )}
                    />
                    <span className="truncate">Security & OTP</span>
                  </div>
                  {profileSubTab === 'security' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.8)] animate-pulse shrink-0" />
                  )}
                </button>
              </div>
            )}

            {/* Full-Screen Officer Messenger Tab */}
            <button
              type="button"
              onClick={() => navigateToSection('chat')}
              className={cn(
                "group relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-300 ease-out cursor-pointer select-none",
                activeSection === 'chat'
                  ? "sidebar-tab-active sidebar-tab-active-glow text-white border border-white/25 scale-[1.01]"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/50 hover:translate-x-1.5 active:scale-[0.98]",
                isSidebarCollapsed && "justify-center px-0 py-2.5"
              )}
              title="Full-Screen Officer Messages & Chat"
            >
              {activeSection === 'chat' && !isSidebarCollapsed && (
                <span className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.85)] animate-in fade-in-50 zoom-in-75 duration-200" />
              )}
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                  activeSection === 'chat'
                    ? "bg-white/20 text-white scale-105 shadow-inner"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:text-cyan-500 group-hover:bg-cyan-500/10 group-hover:scale-110"
                )}
              >
                <MessageCircle className="w-4 h-4" />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="font-bold text-xs truncate">Messages</span>
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold transition-colors flex items-center gap-1 shrink-0",
                      activeSection === 'chat'
                        ? "bg-white/25 text-white"
                        : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    LIVE
                  </span>
                </div>
              )}
              {!isSidebarCollapsed && (
                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-all duration-200",
                    activeSection === 'chat'
                      ? "text-white/90 translate-x-0 opacity-100"
                      : "text-slate-300 dark:text-slate-600 group-hover:text-cyan-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                  )}
                />
              )}
            </button>
          </div>

          {/* Group 2: System & Administration */}
          <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/60">
            {!isSidebarCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
                <span>System &amp; Admin</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>
            )}

            {/* DEV Super Admin Console */}
            {currentUser?.role === 'DEV' && (
              <button
                type="button"
                onClick={() => {
                  setIsDevModalOpen(true);
                  setIsMobileSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 bg-purple-500/10 dark:bg-purple-950/30 hover:bg-purple-500/20 border border-purple-500/30 transition-all duration-200 hover:translate-x-1 active:scale-[0.98] group shadow-xs cursor-pointer",
                  isSidebarCollapsed && "justify-center px-0 py-2.5"
                )}
                title="Developer Super Admin Console"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex items-center justify-between flex-1 truncate">
                    <span className="font-bold truncate">Dev Console</span>
                    <Badge variant="outline" className="text-[9px] font-mono border-purple-500/40 text-purple-400 px-1.5 py-0 bg-purple-500/10 font-bold">
                      ROOT
                    </Badge>
                  </div>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsSettingsModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all duration-200 hover:translate-x-1 active:scale-[0.98] group cursor-pointer",
                isSidebarCollapsed && "justify-center px-0 py-2.5"
              )}
              title="System AI & Concurrency Settings"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-200/60 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 flex items-center justify-center shrink-0">
                <SettingsIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 group-hover:rotate-45 transition-transform duration-300" />
              </div>
              {!isSidebarCollapsed && <span className="font-semibold truncate">Settings</span>}
            </button>

            {systemMetrics && (
              <button
                type="button"
                onClick={() => {
                  fetchSystemInfo(true);
                  setIsSystemModalOpen(true);
                  setIsMobileSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all duration-200 hover:translate-x-1 active:scale-[0.98] group cursor-pointer",
                  isSidebarCollapsed && "justify-center px-0 py-2.5"
                )}
                title="Hardware Telemetry & Server Specs"
              >
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                  <Cpu className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform duration-200" />
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex items-center justify-between flex-1 text-[11px] font-mono">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Server CPU</span>
                    <span className="text-sky-500 font-bold">{systemMetrics.cpu.percent}%</span>
                  </div>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Bottom: Motion Theme Switcher & User Profile Card */}
        <div className="border-t border-slate-200/80 dark:border-slate-800/80 p-3.5 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md space-y-3">
          {/* Motion Segmented Dual Pill Theme Switcher */}
          {!isSidebarCollapsed ? (
            <div className="relative p-1 rounded-2xl bg-slate-100/90 dark:bg-[#050811] border border-slate-200/80 dark:border-slate-800/80 flex items-center select-none shadow-inner">
              {/* Animated Sliding Capsule with Spring Easing */}
              <div
                className={cn(
                  "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-sm",
                  theme === 'dark'
                    ? "left-[calc(50%+2px)] bg-gradient-to-r from-cyan-950/80 to-slate-900 border border-cyan-500/50 shadow-cyan-500/20"
                    : "left-1 bg-white border border-amber-300/80 shadow-amber-500/15"
                )}
              />

              {/* Light Mode Button */}
              <button
                type="button"
                onClick={() => {
                  if (theme !== 'light') toggleTheme();
                }}
                className={cn(
                  "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer active:scale-95",
                  theme === 'light'
                    ? "text-amber-600 dark:text-amber-400 font-extrabold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
                title="Switch to Light Crystal Mode"
              >
                <Sun
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-500",
                    theme === 'light' ? "rotate-180 scale-110 text-amber-500" : "rotate-0 text-slate-400"
                  )}
                />
                <span>Light</span>
              </button>

              {/* Dark Mode Button */}
              <button
                type="button"
                onClick={() => {
                  if (theme !== 'dark') toggleTheme();
                }}
                className={cn(
                  "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer active:scale-95",
                  theme === 'dark'
                    ? "text-cyan-400 font-extrabold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
                title="Switch to Dark Obsidian Mode"
              >
                <Moon
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-500",
                    theme === 'dark' ? "rotate-0 scale-110 text-cyan-400" : "-rotate-90 text-slate-400"
                  )}
                />
                <span>Dark</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={toggleTheme}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 cursor-pointer group active:scale-90 hover:scale-105 shadow-sm",
                  theme === 'dark'
                    ? "bg-[#050914] border-cyan-500/40 shadow-cyan-500/20 text-cyan-400"
                    : "bg-amber-50 border-amber-200 shadow-amber-400/20 text-amber-500"
                )}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <Sun
                    className={cn(
                      "w-5 h-5 text-amber-500 absolute transition-all duration-500 transform",
                      theme === 'dark' ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100 group-hover:rotate-45"
                    )}
                  />
                  <Moon
                    className={cn(
                      "w-5 h-5 text-cyan-400 absolute transition-all duration-500 transform",
                      theme === 'dark' ? "rotate-0 scale-100 opacity-100 group-hover:-rotate-12" : "rotate-90 scale-0 opacity-0"
                    )}
                  />
                </div>
              </button>
            </div>
          )}

          {currentUser ? (
            <div className={cn("flex flex-col gap-2.5", isSidebarCollapsed && "items-center")}>
              {!isSidebarCollapsed ? (
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/90 dark:bg-[#0c1322] border border-slate-200/70 dark:border-slate-800/80 shadow-xs">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {/* Avatar with online status */}
                    <div className="relative w-8 h-8 shrink-0">
                      {currentUser.avatarUrl && !currentUser.avatarUrl.includes('images.unsplash.com') ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs ring-2 ring-cyan-500/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={currentUser.avatarUrl}
                            alt={currentUser.fullName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <DefaultUserAvatar className="w-8 h-8 border border-slate-200/80 dark:border-slate-700/80 shadow-xs ring-2 ring-cyan-500/30" />
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0c1322] animate-pulse" />
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                        {currentUser.fullName || 'Vehan Rajintha'}
                      </span>
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1">
                        <span>• Superintendent / Admin</span>
                      </span>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-[9px] font-mono border-cyan-500/30 text-cyan-600 dark:text-cyan-400 px-1.5 py-0 font-bold">
                    ONLINE
                  </Badge>
                </div>
              ) : (
                <div
                  className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-600 to-sky-400 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/25 ring-2 ring-cyan-500/30 cursor-pointer"
                  title={`${currentUser.fullName || 'Vehan Rajintha'} (Admin Active)`}
                  onClick={() => setActiveSection('profile')}
                >
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'V'}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#070b14] animate-pulse" />
                </div>
              )}

              {/* Prominent Coral Pink Sign Out Button with Interactive Slide Motion */}
              <button
                type="button"
                onClick={handleLogout}
                className={cn(
                  "py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100/90 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/40 font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-md hover:shadow-rose-500/10 active:scale-[0.98] cursor-pointer shadow-xs group",
                  isSidebarCollapsed && "w-10 h-10 p-0 rounded-xl"
                )}
                title="Sign Out of Long Room"
              >
                <LogOut className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                {!isSidebarCollapsed && <span>Sign Out</span>}
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.href = '/login';
              }}
              className="w-full text-xs font-semibold rounded-xl"
            >
              Sign In
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ========================================================
           RIGHT MAIN VIEWPORT WRAPPER (Responsive with sidebar)
           ======================================================== */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
        isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
      )}>
        {/* ========================================================
           STICKY TOP BAR: ACTIVE TAB BREADCRUMB & TELEMETRY
           ======================================================== */}
        <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#070b14]/85 backdrop-blur-3xl shadow-[0_4px_25px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)] h-16 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="h-9 w-9 md:hidden text-foreground rounded-full hover:bg-white/60 dark:hover:bg-zinc-800"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Active Tab Breadcrumb & Title */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-blue-600/20 border border-sky-500/30 flex items-center justify-center text-primary shadow-xs">
                {activeSection === "stats" ? (
                  <BarChart3 className="w-4.5 h-4.5 text-cyan-500" />
                ) : activeSection === "ocr" ? (
                  <FileText className="w-4.5 h-4.5 text-sky-500" />
                ) : activeSection === "tally" ? (
                  <ScanLine className="w-4.5 h-4.5 text-emerald-500" />
                ) : activeSection === "chat" ? (
                  <MessageCircle className="w-4.5 h-4.5 text-blue-500" />
                ) : (
                  <User className="w-4.5 h-4.5 text-indigo-500" />
                )}
              </div>
              <div>
                <div className="font-extrabold text-sm tracking-tight text-foreground flex items-center gap-2">
                  <span>
                    {activeSection === "stats"
                      ? "Statistics & CusDec Analytics"
                      : activeSection === "ocr"
                        ? "Declarations Cockpit"
                        : activeSection === "tally"
                          ? "Tally Reconciliation Station"
                          : activeSection === "chat"
                            ? "Officer Messenger & Network"
                            : profileSubTab === "security"
                              ? "Officer Security & Passcodes"
                              : "Officer Profile & Dossier"}
                  </span>
                  <Badge variant="outline" className="font-mono text-[9px] text-muted-foreground border-white/60 dark:border-white/10 hidden sm:inline-flex rounded-full bg-muted/40">
                    {activeSection === "stats"
                      ? "Live Analytics"
                      : activeSection === "ocr"
                        ? `${records.length} Scans`
                        : activeSection === "tally"
                          ? "Cross-Recon"
                          : activeSection === "chat"
                            ? "Encrypted 1-on-1"
                            : profileSubTab === "security"
                              ? "Brevo Gmail OTP"
                              : "Official Dossier"}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground hidden sm:block">
                  {activeSection === "stats"
                    ? "Daily CusDec Entry Counts, Declaration Manifest Trends & Long Room Clearance Velocity"
                    : activeSection === "ocr"
                      ? "Customs Goods Declarations (CusDec-53) & Long Room Ledger"
                      : activeSection === "tally"
                        ? "Manifest Cross-Reconciliation & Master Registry Auto-Match"
                        : activeSection === "chat"
                          ? "Full-Screen Resizable Officer Messenger & Direct Messaging Station"
                          : profileSubTab === "security"
                            ? "Manage Account Passcodes & Brevo Multi-Factor Gmail OTP Security"
                            : "Officer Dossier, Contact Coordinates & Long Room Assignment"}
                </div>
              </div>
            </div>
          </div>

          {/* System Telemetry Bar (Pure shadcn/ui) */}
          {systemMetrics && (
            <div
              onClick={() => {
                fetchSystemInfo(true);
                setIsSystemModalOpen(true);
              }}
              className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg border bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer select-none"
              title="Click to view detailed Server Hardware Health & Specs"
            >
              {/* CPU */}
              <div className="flex items-center gap-1.5 text-xs">
                <Cpu className="w-3.5 h-3.5 text-sky-500" />
                <span className="text-[11px] font-semibold text-muted-foreground">CPU</span>
                <span className={`font-mono text-xs font-bold ${systemMetrics.cpu.percent > 80 ? "text-destructive" : systemMetrics.cpu.percent > 50 ? "text-amber-500" : "text-sky-600 dark:text-sky-400"}`}>
                  {systemMetrics.cpu.percent}%
                </span>
                <div className="w-8 h-1.5 rounded-full bg-muted overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${systemMetrics.cpu.percent > 80 ? "bg-destructive" : systemMetrics.cpu.percent > 50 ? "bg-amber-500" : "bg-sky-500"}`}
                    style={{ width: `${Math.max(10, systemMetrics.cpu.percent)}%` }}
                  />
                </div>
              </div>

              <div className="h-3 w-px bg-border" />

              {/* RAM */}
              <div className="flex items-center gap-1.5 text-xs">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-semibold text-muted-foreground">RAM</span>
                <span className={`font-mono text-xs font-bold ${systemMetrics.ram.percent > 85 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {systemMetrics.ram.usedFormatted}
                </span>
              </div>
            </div>
          )}

          {/* Quick Header Right Actions (Pure shadcn/ui) */}
          <div className="flex items-center gap-2">
            {canManageCusDec && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMobileModalOpen(true)}
                className="h-9 px-3 gap-1.5 text-xs hidden sm:inline-flex"
              >
                <QrCode className="w-3.5 h-3.5 text-sky-500" />
                <span>Mobile Scanner</span>
              </Button>
            )}

            {currentUser?.role === "DEV" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDevModalOpen(true)}
                className="h-9 px-3 border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 gap-1.5 text-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-purple-500" />
                <span className="hidden sm:inline">Dev Console</span>
              </Button>
            )}

            {currentUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSection('profile')}
                className="h-9 px-2 gap-2 rounded-lg border hover:bg-accent cursor-pointer group select-none"
                title="Open Officer Profile & Security"
              >
                {/* Profile Avatar */}
                {currentUser.avatarUrl && !currentUser.avatarUrl.includes('images.unsplash.com') ? (
                  <div className="w-6 h-6 rounded-full overflow-hidden border shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="w-full h-full object-cover rounded-full" />
                  </div>
                ) : (
                  <DefaultUserAvatar className="w-6 h-6 border shrink-0" />
                )}
                <span className="text-xs font-semibold text-foreground hidden sm:inline max-w-[120px] truncate">
                  {currentUser.fullName ? currentUser.fullName.split(' ')[0] : currentUser.username}
                </span>
                <Badge
                  variant="outline"
                  className={`font-mono text-[9px] px-1.5 py-0.5 ${ROLE_CONFIGS[currentUser.role]?.badgeClass}`}
                >
                  {currentUser.role}
                </Badge>
              </Button>
            )}
          </div>
        </header>

        {/* ========================================================
           MAIN VIEWPORT CONTAINER
           ======================================================== */}
        <main
          className={cn(
            "w-full flex flex-col flex-1",
            activeSection === 'chat'
              ? "p-0 max-w-none gap-0 h-[calc(100dvh-4rem)] sm:h-[calc(100vh-5rem)] overflow-hidden pb-16 md:pb-0"
              : "max-w-[1760px] mx-auto p-3 sm:p-6 pb-24 md:pb-6 gap-6"
          )}
        >
          {/* ========================================================
             ACTIVE BATCH PROGRESS: DUAL-MODE (LIGHT & DARK) LIVE ACTIVITY
             ======================================================== */}
          {queueStatus.isProcessing && (
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] border border-slate-200/90 dark:border-cyan-500/25 shadow-[0_15px_45px_-12px_rgba(14,165,233,0.15)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_-10px_rgba(14,165,233,0.18)] p-5 sm:p-6 transition-all duration-300">
              {/* Ambient Background Glow */}
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-400/15 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-400/15 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col gap-5">
                {/* Top Dynamic Island Bar: Status, Stream Count, Speed & Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                  {/* Dynamic Island Capsule Pill */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50/90 dark:bg-zinc-900/90 border border-cyan-200/70 dark:border-white/10 text-xs font-semibold text-cyan-800 dark:text-zinc-200 shadow-xs">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="tracking-wide">AI Extraction Pipeline</span>
                    </div>

                    {/* Parallel Concurrency Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-cyan-500/10 border border-sky-200/80 dark:border-cyan-500/20 text-sky-700 dark:text-cyan-400 text-xs font-mono font-medium">
                      <Cpu className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
                      <span>{workerStreams.length || settings.workerConcurrency || 6} Parallel Streams</span>
                    </div>

                    {/* Speed & ETA Badges */}
                    {processingTelemetry.docsPerMinute > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-mono">
                        <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        <span>~{processingTelemetry.docsPerMinute} docs/min</span>
                      </div>
                    )}

                    {processingTelemetry.etaSeconds > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-zinc-300 text-xs font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                        <span>ETA: {Math.floor(processingTelemetry.etaSeconds / 60)}m {processingTelemetry.etaSeconds % 60}s</span>
                      </div>
                    )}
                  </div>

                  {/* Tactile Pill Action Buttons */}
                  <div className="flex items-center gap-2">
                    {queueStatus.isPaused ? (
                      <button
                        onClick={() => {
                          if (isClientProcessingRef.current) {
                            isClientPausedRef.current = false;
                            setQueueStatus(prev => ({ ...prev, isPaused: false }));
                          } else {
                            fetch('/api/queue/resume', { method: 'POST' });
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold text-emerald-700 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/90 dark:border-white/10 dark:text-emerald-400 shadow-xs active:scale-95 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (isClientProcessingRef.current) {
                            isClientPausedRef.current = true;
                            setQueueStatus(prev => ({ ...prev, isPaused: true }));
                          } else {
                            fetch('/api/queue/pause', { method: 'POST' });
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/90 dark:border-white/10 dark:text-zinc-200 shadow-xs active:scale-95 transition-all"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (isClientProcessingRef.current) {
                          isClientCancelledRef.current = true;
                          setQueueStatus(prev => ({ ...prev, isProcessing: false }));
                          showToast('Batch processing cancelled.', 'warning');
                        } else {
                          fetch('/api/queue/cancel', { method: 'POST' });
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold text-rose-600 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 dark:border-rose-500/30 dark:text-rose-300 shadow-xs active:scale-95 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>

                {/* Master Headline & Progress Track */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Processing Customs Declarations</span>
                        {queueStatus.isPaused && (
                          <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-300 dark:text-amber-400 dark:bg-transparent dark:border-amber-500/30 text-[10px]">
                            PAUSED
                          </Badge>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Ingesting {queueStatus.completedCount} of {queueStatus.totalCount} documents • {queueStatus.pendingCount} in queue
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 dark:from-white dark:via-cyan-100 dark:to-emerald-200 bg-clip-text text-transparent">
                        {queueStatus.progressPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Capsule Progress Track with Shimmer */}
                  <div className="relative h-3 w-full bg-slate-100 dark:bg-zinc-900/90 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-white/10 shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 dark:from-cyan-500 dark:via-sky-400 dark:to-emerald-400 transition-all duration-300 ease-out shadow-[0_0_16px_rgba(56,189,248,0.35)] relative overflow-hidden"
                      style={{ width: `${Math.max(2, queueStatus.progressPercent)}%` }}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-shimmer" />
                    </div>
                  </div>
                </div>

                {/* Parallel Worker Streams Section */}
                {workerStreams.length > 0 && (
                  <div className="flex flex-col gap-2.5 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                      <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-zinc-400">
                        Active Parallel Worker Streams
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 dark:text-zinc-500">
                        Concurrency: {workerStreams.length}x Multi-Threaded
                      </span>
                    </div>

                    <div className={`grid grid-cols-1 ${workerStreams.length === 1 ? 'sm:grid-cols-1' :
                      workerStreams.length === 2 ? 'sm:grid-cols-2' :
                        workerStreams.length === 3 ? 'sm:grid-cols-3' :
                          'sm:grid-cols-2 lg:grid-cols-4'
                      } gap-3`}>
                      {workerStreams.map(w => {
                        const isExtracting = w.status === 'extracting';
                        const isCompleted = w.status === 'completed';
                        const isError = w.status === 'error';

                        return (
                          <div
                            key={w.id}
                            className={`relative overflow-hidden rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-300 backdrop-blur-md ${isExtracting
                              ? 'bg-cyan-50/60 dark:bg-[#0e172a] border border-cyan-300 dark:border-cyan-500/40 shadow-sm shadow-cyan-500/10 dark:shadow-[0_0_18px_-3px_rgba(6,182,212,0.25)]'
                              : isError
                                ? 'bg-rose-50/60 dark:bg-[#1a0f14] border border-rose-300 dark:border-rose-500/40'
                                : isCompleted
                                  ? 'bg-emerald-50/60 dark:bg-[#0a1820] border border-emerald-300 dark:border-emerald-500/30'
                                  : 'bg-slate-50 dark:bg-[#090e1a] border border-slate-200/90 dark:border-slate-800/80'
                              }`}
                          >
                            {/* Card Header: Stream tag & Completed badge */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5">
                                {isExtracting ? (
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                                  </span>
                                ) : isError ? (
                                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                                ) : isCompleted ? (
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                ) : (
                                  <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-zinc-600" />
                                )}
                                <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-slate-800 dark:text-zinc-300">
                                  STREAM {String(w.id).padStart(2, '0')}
                                </span>
                              </div>

                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-zinc-400 shadow-2xs">
                                {w.completedInStream} done
                              </span>
                            </div>

                            {/* Card Body: Active File Name */}
                            <div className="min-h-[44px] flex flex-col justify-center">
                              {w.fileName ? (
                                <div className="flex items-center gap-1.5" title={w.fileName}>
                                  <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                                  <span className="font-mono text-xs text-slate-900 dark:text-zinc-100 truncate font-semibold">
                                    {w.fileName}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500 text-xs">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Stream in standby</span>
                                </div>
                              )}

                              {/* Live Sub-step Indicator */}
                              <div className="flex items-center gap-1 text-[11px] mt-1 truncate">
                                {isExtracting ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin text-cyan-600 dark:text-cyan-400 shrink-0" />
                                    <span className="truncate text-cyan-700 dark:text-cyan-300/90 font-medium">{w.step || 'Processing...'}</span>
                                  </>
                                ) : (
                                  <span className="truncate text-slate-400 dark:text-zinc-400">{w.step || 'Idle'}</span>
                                )}
                              </div>
                            </div>

                            {/* Micro Progress Bar */}
                            <div className="mt-2.5">
                              <div className="h-1.5 w-full bg-slate-200/80 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${isExtracting
                                    ? 'bg-gradient-to-r from-cyan-500 to-sky-400'
                                    : isError
                                      ? 'bg-rose-500'
                                      : isCompleted
                                        ? 'bg-emerald-400'
                                        : 'bg-slate-300 dark:bg-zinc-700'
                                    }`}
                                  style={{
                                    width: `${isExtracting ? (w.progress || 50) : isCompleted ? 100 : 0}%`
                                  }}
                                />
                              </div>
                            </div>

                            {/* Last Result Micro-Pill */}
                            {w.lastRecord && (
                              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-mono">
                                <span className="text-cyan-700 dark:text-emerald-400 truncate font-bold">
                                  #{w.lastRecord.stampNo || 'OK'}
                                </span>
                                <span className="text-slate-400 dark:text-zinc-500">
                                  {w.lastRecord.confidence ? `${w.lastRecord.confidence}%` : 'Extracted'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -----------------------------------------------------
             SECTION 0: STATISTICS & ANALYTICS TERMINAL (Pure shadcn/ui)
             ----------------------------------------------------- */}
          {activeSection === 'stats' && (
            <StatisticsAnalyticsDeck
              records={records}
              stats={ledgerStats}
              onNavigateToDeclarations={() => setActiveSection('ocr')}
            />
          )}

          {/* -----------------------------------------------------
             SECTION 1: DECLARATIONS & AUDIT LEDGER (Pure shadcn/ui)
             ----------------------------------------------------- */}
          {activeSection === 'ocr' && (
            <div className="space-y-6">
              {/* ========================================================
                 DEDASMA EXECUTIVE COCKPIT HERO BANNER
                 ======================================================== */}
              <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] border border-slate-200/90 dark:border-cyan-500/20 p-6 sm:p-8 shadow-[0_12px_40px_-15px_rgba(14,165,233,0.12)] dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85),0_0_35px_-10px_rgba(14,165,233,0.15)]">
                {/* Ambient Cyber Glow Orbs for Dark Mode */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-600/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

                {/* Subtle Orbital Concentric Rings in top right (exact match to screenshot) */}
                <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none overflow-hidden opacity-30 dark:opacity-25 hidden md:block">
                  <svg className="absolute -right-20 -top-20 w-[500px] h-[500px]" viewBox="0 0 400 400" fill="none">
                    <circle cx="200" cy="200" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-cyan-400" />
                    <circle cx="200" cy="200" r="130" stroke="currentColor" strokeWidth="1.2" className="text-sky-300" />
                    <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="0.8" strokeDasharray="6 6" className="text-blue-300" />
                    <circle cx="200" cy="200" r="230" stroke="currentColor" strokeWidth="1" className="text-cyan-200" />
                  </svg>
                </div>

                {/* Ingestion & ZIP Inputs (hidden) */}
                <input
                  type="file"
                  ref={uploadInputRef}
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={e => handleFileUpload(e.target.files, '/api/upload', 'documents')}
                />
                <input
                  type="file"
                  ref={zipInputRef}
                  accept=".zip"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleZipFile(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />

                <div className="relative z-10 flex flex-col gap-4">
                  {/* Hero Title & Subtitle */}
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                      Customs Platform{' '}
                      <span className="bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 bg-clip-text text-transparent">
                        Overview & Metrics
                      </span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl mt-2 leading-relaxed">
                      Real-time operational overview covering registered CUSDEC entries across Long Room manifests,
                      optical extraction OCR streams, automated tariff audits, and customs clearance distribution.
                    </p>
                  </div>

                  {/* Primary Ingestion Pill Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {canManageCusDec && (
                      <Button
                        type="button"
                        variant="cyanGradient"
                        size="pill"
                        onClick={() => uploadInputRef.current?.click()}
                        className="shadow-md shadow-cyan-500/25 dark:shadow-[0_0_20px_rgba(14,165,233,0.35)] gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Images</span>
                      </Button>
                    )}

                    {canManageCusDec && (
                      <Button
                        type="button"
                        variant="tealGradient"
                        size="pill"
                        onClick={() => zipInputRef.current?.click()}
                        className="shadow-md shadow-teal-500/20 dark:shadow-[0_0_20px_rgba(20,184,166,0.3)] gap-2"
                      >
                        <FolderArchive className="w-4 h-4" />
                        <span>Import ZIP</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* ========================================================
                 TELEMETRY METRIC STAT CARDS
                 ======================================================== */}
              {isInitialLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={`cockpit-kpi-skeleton-${i}`}
                      className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-5 shadow-xs flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <Skeleton className="w-9 h-9 rounded-xl" />
                        <Skeleton className="h-3 w-28 rounded" />
                      </div>
                      <div className="mt-4 space-y-2">
                        <Skeleton className="h-8 w-20 rounded-md" />
                        <Skeleton className="h-3.5 w-32 rounded" />
                        <Skeleton className="h-3 w-40 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                  {/* Card 1: TOTAL DECLARATIONS */}
                  <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-5 shadow-[0_4px_20px_-4px_rgba(14,165,233,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] dark:hover:border-cyan-500/40 dark:hover:shadow-[0_0_25px_-5px_rgba(14,165,233,0.2)] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 dark:border dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 dark:shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-400">
                        {selectedDate ? (selectedDate === getTodayIso() ? 'TODAY DECLARATIONS' : `${formatShortDateDisplay(selectedDate).toUpperCase()} DECLARATIONS`) : 'TOTAL DECLARATIONS'}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {displayStats.total}
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                        {selectedDate ? (selectedDate === getTodayIso() ? "Today's Declarations" : `${formatShortDateDisplay(selectedDate)} Declarations`) : 'Total Declarations'}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {displayStats.totalSubtitle}
                      </p>
                    </div>
                  </div>

                  {/* Card 2: VERIFIED DOCUMENTS */}
                  <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-5 shadow-[0_4px_20px_-4px_rgba(14,165,233,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] dark:hover:border-emerald-500/40 dark:hover:shadow-[0_0_25px_-5px_rgba(16,185,129,0.2)] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 dark:border dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 dark:shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-400">VERIFIED DOCUMENTS</span>
                    </div>

                    <div className="mt-4">
                      <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {displayStats.verified}
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">Verified Documents</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Ready for port clearance</p>
                    </div>
                  </div>

                  {/* Card 3: NEEDS REVIEW */}
                  <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-5 shadow-[0_4px_20px_-4px_rgba(14,165,233,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] dark:hover:border-amber-500/40 dark:hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.2)] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 dark:border dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 dark:shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-400">NEEDS REVIEW</span>
                    </div>

                    <div className="mt-4">
                      <div className={`text-3xl font-extrabold tracking-tight ${displayStats.needsReview > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                        {displayStats.needsReview}
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">Needs Review</p>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Flagged for manual inspection</p>
                    </div>
                  </div>

                  {/* Card 4: EXTRACTION ACCURACY */}
                  <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-5 shadow-[0_4px_20px_-4px_rgba(14,165,233,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] dark:hover:border-sky-500/40 dark:hover:shadow-[0_0_25px_-5px_rgba(14,165,233,0.2)] hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 dark:border dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 dark:shadow-[0_0_12px_rgba(14,165,233,0.2)]">
                        <Activity className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-400">EXTRACTION ACCURACY</span>
                    </div>

                    <div className="mt-4">
                      <div className="text-3xl font-extrabold text-sky-600 dark:text-sky-400 tracking-tight">
                        {displayStats.accuracyRate}%
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">Extraction Accuracy</p>
                      <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">Multi-pass OCR confidence</p>
                    </div>
                  </div>

                  {/* Card 5: VPS NVMe STORAGE */}
                  <div
                    onClick={() => { setIsStorageModalOpen(true); fetchStorageStats(true); }}
                    className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] p-5 shadow-[0_4px_20px_-4px_rgba(14,165,233,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] dark:hover:border-purple-500/40 dark:hover:shadow-[0_0_25px_-5px_rgba(168,85,247,0.2)] hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer group select-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 dark:border dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 dark:shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                        <HardDrive className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                      </div>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-400">NVMe STORAGE</span>
                    </div>

                    <div className="mt-4">
                      <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight">
                        {storageStats.diskFreeFormatted ? `${storageStats.diskFreeFormatted} Free` : storageStats.totalFormatted}
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">VPS NVMe Storage</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {storageStats.diskTotalFormatted ? (
                          <>of {storageStats.diskTotalFormatted} SSD · {storageStats.totalFiles} scans</>
                        ) : (
                          <>{storageStats.totalFiles} files · {storageStats.percentUsed}% used</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                 DECLARATIONS & AUDIT LEDGER
                 ======================================================== */}
              <div className="flex flex-col gap-4">
                {/* Header with Title and Filter Capsule Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                      Declarations & Audit Ledger
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Real-time port ledger of optical extractions, verification states, and automated customs audits.
                    </p>
                  </div>

                  {/* Sub-Filter Capsule Tabs */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFilter('ALL')}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === 'ALL'
                        ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-sm shadow-cyan-500/25'
                        : 'bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 dark:hover:border-slate-700'
                        }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>All Declarations</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${filter === 'ALL' ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {displayStats.total}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilter('VERIFIED')}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === 'VERIFIED'
                        ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-sm shadow-cyan-500/25'
                        : 'bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 dark:hover:border-slate-700'
                        }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified Documents</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${filter === 'VERIFIED' ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {displayStats.verified}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilter('NEEDS_REVIEW')}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === 'NEEDS_REVIEW'
                        ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-sm shadow-cyan-500/25'
                        : 'bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 dark:hover:border-slate-700'
                        }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Needs Review</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${filter === 'NEEDS_REVIEW' ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {displayStats.needsReview}
                      </span>
                    </button>

                    {duplicateIdSet.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilter('DUPLICATES')}
                        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === 'DUPLICATES'
                          ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-sm shadow-cyan-500/25'
                          : 'bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 dark:hover:border-slate-700'
                          }`}
                      >
                        <Copy className="w-3.5 h-3.5 text-amber-500" />
                        <span>Duplicates</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${filter === 'DUPLICATES' ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          {duplicateIdSet.size}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Operations Toolbar - Quick Actions under Declarations & Audit Ledger */}
                {canManageCusDec && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4 sm:py-2.5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200/90 dark:border-slate-800 shadow-sm dark:shadow-md">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Customs Operations
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden md:inline">
                        • Optical extraction triggers &amp; ledger maintenance
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Mobile Scanner */}
                      <button
                        type="button"
                        onClick={() => setIsMobileModalOpen(true)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-sky-50/80 dark:bg-slate-900/80 dark:hover:bg-sky-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-sky-500/40 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs active:scale-95 group"
                        title="Mobile Scanner & CFS Pairing"
                      >
                        <div className="w-5.5 h-5.5 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 group-hover:bg-sky-500/20 transition-colors">
                          <QrCode className="w-3.5 h-3.5 text-sky-500 group-hover:rotate-6 group-hover:scale-110 transition-transform duration-200" />
                        </div>
                        <span>Mobile Scanner</span>
                      </button>

                      {/* Fix Unknowns */}
                      <button
                        type="button"
                        onClick={reprocessUnknownsWithAI}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-amber-50/80 dark:bg-slate-900/80 dark:hover:bg-amber-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/40 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs active:scale-95 group"
                        title="Reprocess records with unknown values using AI"
                      >
                        <div className="w-5.5 h-5.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                          <RotateCcw className="w-3.5 h-3.5 text-amber-500 group-hover:-rotate-180 transition-transform duration-500" />
                        </div>
                        <span>Fix Unknowns</span>
                      </button>

                      {/* Remove Duplicates */}
                      <button
                        type="button"
                        onClick={handleRemoveDuplicates}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-purple-50/80 dark:bg-slate-900/80 dark:hover:bg-purple-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-purple-500/40 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs active:scale-95 group"
                        title="Clean and purge duplicate declarations"
                      >
                        <div className="w-5.5 h-5.5 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                          <Copy className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform duration-200" />
                        </div>
                        <span>Remove Duplicates</span>
                        {duplicateIdSet.size > 0 && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold border border-purple-500/30 animate-pulse">
                            {duplicateIdSet.size}
                          </span>
                        )}
                      </button>

                      {/* Reprocess All */}
                      <button
                        type="button"
                        onClick={reprocessAllWithAI}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/60 hover:border-rose-500/50 text-rose-700 dark:text-rose-400 text-xs font-bold transition-all duration-200 cursor-pointer shadow-xs active:scale-95 group"
                        title="Wipe and re-extract all documents"
                      >
                        <div className="w-5.5 h-5.5 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 group-hover:bg-rose-500/25 transition-colors">
                          <RefreshCw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 group-hover:rotate-180 transition-transform duration-700" />
                        </div>
                        <span>Reprocess All</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================
                 DAY-BY-DAY CALENDAR & MANIFEST INSPECTION BAR
                 ======================================================== */}
              <DeclarationCalendarBar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                records={records}
                totalFilteredRecordsCount={filteredRecords.length}
              />

              {/* Cargo Ledger Full-Width Table Card */}
              <Card className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] shadow-sm dark:shadow-[0_15px_45px_-12px_rgba(0,0,0,0.8)]">
                <div className="p-4 sm:p-6 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Table Toolbar Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" asChild className="gap-1.5 h-9 rounded-lg border-slate-200 dark:border-slate-800 dark:bg-[#070b14]/60 dark:hover:bg-slate-800 dark:text-slate-300 text-xs">
                        <a
                          href={selectedDate ? `/api/export/excel?date=${encodeURIComponent(selectedDate)}` : '/api/export/excel'}
                          download
                          title={selectedDate ? `Export Excel for ${formatLongDateDisplay(selectedDate)}` : 'Export all declarations to Excel'}
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Export Excel{selectedDate ? ` (${filteredRecords.length})` : ''}</span>
                        </a>
                      </Button>

                      <Button variant="outline" size="sm" asChild className="gap-1.5 h-9 rounded-lg border-slate-200 dark:border-slate-800 dark:bg-[#070b14]/60 dark:hover:bg-slate-800 dark:text-slate-300 text-xs">
                        <a
                          href={selectedDate ? `/api/export/csv?date=${encodeURIComponent(selectedDate)}` : '/api/export/csv'}
                          download
                          title={selectedDate ? `Export CSV for ${formatLongDateDisplay(selectedDate)}` : 'Export all declarations to CSV'}
                        >
                          <Download className="w-3.5 h-3.5 text-sky-500" />
                          <span>Export CSV{selectedDate ? ` (${filteredRecords.length})` : ''}</span>
                        </a>
                      </Button>

                      {selectedRowIds.size > 0 && canManageCusDec && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={deleteSelectedRecords}
                          className="gap-1.5 h-9 rounded-lg text-xs shadow-md shadow-rose-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Selected ({selectedRowIds.size})</span>
                        </Button>
                      )}

                      {canManageCusDec && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearAllRecords}
                          className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 h-9"
                        >
                          Clear Ledger
                        </Button>
                      )}

                      {/* Active Day Indicator Pill */}
                      {selectedDate && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-medium shadow-2xs">
                          <CalendarIcon className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Day: <strong className="font-semibold">{formatLongDateDisplay(selectedDate)}</strong></span>
                          <span className="text-muted-foreground/60">•</span>
                          <span className="font-mono text-[11px] font-bold">{filteredRecords.length} found</span>
                          <button
                            type="button"
                            onClick={() => setSelectedDate('')}
                            className="ml-1 p-0.5 rounded-full hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 cursor-pointer transition-colors"
                            title="Clear day filter to view all declarations"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Search Bar with Instant Real-Time Filtering */}
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        ref={searchInputRef}
                        placeholder="Search stamp, ref, consignee..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Escape' && searchTerm) {
                            e.stopPropagation();
                            setSearchTerm('');
                          }
                        }}
                        className="pl-9 pr-14 h-9 text-xs rounded-md bg-background dark:bg-[#070b14] dark:border-slate-800 dark:text-white dark:placeholder:text-slate-500 shadow-xs focus:ring-1 focus:ring-cyan-500"
                      />
                      {searchTerm ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            searchInputRef.current?.focus();
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground bg-muted/70 hover:bg-muted active:scale-90 transition-all cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      ) : (
                        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-muted/70 border border-border/60 rounded-md select-none pointer-events-none">
                          ⌘K
                        </kbd>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Table Body */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredRecords.length > 0 && selectedRowIds.size === filteredRecords.length}
                            onChange={e => handleSelectAll(e.target.checked)}
                            className="rounded border-border cursor-pointer"
                          />
                        </TableHead>
                        <TableHead className="w-48 select-none">
                          <div className="flex items-center gap-2.5">
                            <span className="font-semibold text-foreground whitespace-nowrap">Stamp Duty No</span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isStampAscending}
                              onClick={() => setIsStampAscending(prev => !prev)}
                              className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none shadow-sm select-none",
                                isStampAscending
                                  ? "bg-[#34c759] hover:bg-[#30b753]"
                                  : "bg-[#39393d] hover:bg-[#48484a]"
                              )}
                              title={isStampAscending ? "Sorted Ascending (1 → 9). Click to reset order." : "Click to sort by Stamp Duty No (Ascending order)"}
                            >
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out",
                                  isStampAscending ? "translate-x-4" : "translate-x-0"
                                )}
                              />
                            </button>
                          </div>
                        </TableHead>
                        <TableHead className="w-36">Customs Ref</TableHead>
                        <TableHead>Consignee (Box 8)</TableHead>
                        <TableHead>Declarant / Agent</TableHead>
                        <TableHead className="w-28 text-center">Status</TableHead>
                        <TableHead className="w-24 text-center">Confidence</TableHead>
                        <TableHead className="w-32">Upload Date</TableHead>
                        <TableHead className="w-32 text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(isInitialLoading || isTableLoading) ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={`skeleton-row-${i}`} className="hover:bg-transparent animate-in fade-in duration-200">
                            <TableCell className="text-center py-4">
                              <Skeleton className="h-4 w-4 mx-auto rounded" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-6 w-20 rounded-full" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24 rounded" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-44 rounded" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-36 rounded" />
                            </TableCell>
                            <TableCell className="text-center">
                              <Skeleton className="h-5 w-16 mx-auto rounded-full" />
                            </TableCell>
                            <TableCell className="text-center">
                              <Skeleton className="h-4 w-10 mx-auto rounded" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-20 rounded" />
                            </TableCell>
                            <TableCell className="text-center">
                              <Skeleton className="h-7 w-16 mx-auto rounded-lg" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filteredRecords.length === 0 ? (
                        <TableRow className="animate-in fade-in-50 duration-200">
                          <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                            {searchTerm.trim() ? (
                              <div className="space-y-2 max-w-sm mx-auto">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                                <p className="font-semibold text-foreground">No declarations matching &ldquo;{searchTerm}&rdquo;</p>
                                <p className="text-xs text-muted-foreground">
                                  Try searching by stamp duty number, ref, consignee, declarant, or bill of lading.
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSearchTerm('');
                                    searchInputRef.current?.focus();
                                  }}
                                  className="mt-2 text-xs rounded-xl"
                                >
                                  Clear Search Filter
                                </Button>
                              </div>
                            ) : selectedDate ? (
                              <div className="space-y-3 max-w-sm mx-auto py-2">
                                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50 text-cyan-500" />
                                <p className="font-semibold text-foreground">
                                  No declarations recorded on {formatLongDateDisplay(selectedDate)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  There are no {filter !== 'ALL' ? filter.toLowerCase().replace('_', ' ') : ''} customs declarations logged for this day.
                                </p>
                                <div className="flex items-center justify-center gap-2 pt-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedDate('')}
                                    className="text-xs rounded-xl"
                                  >
                                    Show All Days
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="font-medium">No customs declarations found</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Upload document images or import a ZIP archive above.
                                </p>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedRecords.map(r => {
                          const isSelected = selectedRowIds.has(r.id);
                          return (
                            <TableRow
                              key={r.id}
                              onClick={() => openInspectionModal(r)}
                              className="cursor-pointer hover:bg-muted/50 data-[state=selected]:bg-muted/70 transition-all duration-150 animate-in fade-in-50"
                            >
                              <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={e => handleRowCheck(r.id, e.target.checked)}
                                  className="rounded border-border cursor-pointer"
                                />
                              </TableCell>

                              <TableCell className="font-mono font-semibold">
                                <Badge variant="success" className="font-mono text-xs">
                                  {String(r.greenStampNumber || '—').padStart(6, '0')}
                                </Badge>
                              </TableCell>

                              <TableCell className="font-mono text-xs">
                                {r.customsRefNumber || '—'}
                              </TableCell>

                              <TableCell className="font-medium text-xs max-w-xs truncate">
                                {r.consigneeName || 'UNKNOWN'}
                              </TableCell>

                              <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                                {r.declarantName || 'UNKNOWN'}
                              </TableCell>

                              <TableCell className="text-center">
                                <div className="flex flex-wrap items-center justify-center gap-1">
                                  {r.status === 'VERIFIED' && (
                                    <Badge variant="success" className="text-[11px] font-medium">
                                      Verified
                                    </Badge>
                                  )}
                                  {r.status === 'NEEDS_REVIEW' && (
                                    <Badge variant="warning" className="text-[11px] font-medium">
                                      Review
                                    </Badge>
                                  )}
                                  {r.status === 'CORRECTED' && (
                                    <Badge variant="info" className="text-[11px] font-medium">
                                      Corrected
                                    </Badge>
                                  )}
                                  {duplicateIdSet.has(r.id) && (
                                    <Badge variant="outline" className="text-[10px] font-medium bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30 gap-1 px-1.5 py-0">
                                      <Copy className="w-2.5 h-2.5" />
                                      <span>Duplicate</span>
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell className="text-center font-mono text-xs">
                                <span className={r.confidence && r.confidence >= 90 ? 'text-emerald-500 font-semibold' : 'text-amber-500'}>
                                  {r.confidence ? `${r.confidence}%` : '—'}
                                </span>
                              </TableCell>

                              <TableCell className="text-xs text-muted-foreground">
                                {(() => {
                                  const upDate = parseRecordDate(r, 'created');
                                  const isMatch = selectedDate && upDate === selectedDate;
                                  const formatted = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB') : r.customsDate || '—';
                                  return isMatch ? (
                                    <span className="font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 font-mono">
                                      {formatted}
                                    </span>
                                  ) : (
                                    formatted
                                  );
                                })()}
                              </TableCell>

                              <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openInspectionModal(r)}
                                    className="h-7 px-2.5 gap-1 text-xs rounded-lg hover:border-primary/50 transition-all"
                                    title={canManageCusDec ? "Inspect & Edit Declaration" : "View Declaration (Read-Only)"}
                                  >
                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                    <span>{canManageCusDec ? "Inspect" : "View"}</span>
                                  </Button>
                                  {canManageCusDec && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => requestDeleteSingleRecord(r)}
                                      className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                                      title={`Delete declaration #${r.greenStampNumber || r.customsRefNumber || r.id}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Ultra-Responsive Low-End PC Pagination Toolbar */}
                {filteredRecords.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#090e1a]/80 text-xs select-none">
                    {/* Left: Range Counter & Selected Badge */}
                    <div className="flex flex-wrap items-center gap-2.5 text-muted-foreground">
                      <span>
                        Showing{' '}
                        <strong className="text-foreground font-semibold">
                          {pageSize === 'all'
                            ? `1–${filteredRecords.length}`
                            : `${Math.min((currentPage - 1) * pageSize + 1, filteredRecords.length)}–${Math.min(currentPage * pageSize, filteredRecords.length)}`}
                        </strong>{' '}
                        of <strong className="text-foreground font-semibold">{filteredRecords.length}</strong> declarations
                      </span>

                      {selectedRowIds.size > 0 && (
                        <div className="flex items-center gap-1.5 ml-1">
                          <Badge variant="outline" className="text-[11px] bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30">
                            {selectedRowIds.size} selected
                          </Badge>
                          <button
                            type="button"
                            onClick={() => setSelectedRowIds(new Set())}
                            className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right: Page Size & Stepper Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Page Size Selector */}
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-[11px] mr-1">Rows:</span>
                        {([25, 50, 100, 'all'] as const).map(size => {
                          const isActive = pageSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                setPageSize(size);
                                setCurrentPage(1);
                              }}
                              className={cn(
                                "px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                                isActive
                                  ? "bg-cyan-600 text-white shadow-2xs font-semibold"
                                  : "text-muted-foreground hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-foreground"
                              )}
                            >
                              {size === 'all' ? 'All' : size}
                            </button>
                          );
                        })}
                      </div>

                      {pageSize !== 'all' && totalPages > 1 && (
                        <>
                          <Separator orientation="vertical" className="h-4 hidden sm:block" />

                          {/* Page Stepper */}
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={currentPage <= 1}
                              onClick={() => setCurrentPage(1)}
                              className="h-7 w-7 p-0 text-xs rounded-md"
                              title="First page"
                            >
                              <ChevronsLeft className="w-3.5 h-3.5" />
                              <span className="sr-only">First</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={currentPage <= 1}
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className="h-7 w-7 p-0 text-xs rounded-md"
                              title="Previous page"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              <span className="sr-only">Previous</span>
                            </Button>

                            <div className="flex items-center gap-1 px-2 text-xs">
                              <span className="text-muted-foreground">Page</span>
                              <span className="font-mono font-bold text-foreground">{currentPage}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="font-mono text-muted-foreground">{totalPages}</span>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={currentPage >= totalPages}
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              className="h-7 w-7 p-0 text-xs rounded-md"
                              title="Next page"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                              <span className="sr-only">Next</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={currentPage >= totalPages}
                              onClick={() => setCurrentPage(totalPages)}
                              className="h-7 w-7 p-0 text-xs rounded-md"
                              title="Last page"
                            >
                              <ChevronsRight className="w-3.5 h-3.5" />
                              <span className="sr-only">Last</span>
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* -----------------------------------------------------
             SECTION 2: LONG ROOM TALLY ENGINE (Pure shadcn/ui)
             ----------------------------------------------------- */}
          {activeSection === 'tally' && (
            isTallyLoading ? (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                <Card className="shadow-sm border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] rounded-2xl overflow-hidden p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-6 w-72 rounded-lg" />
                      <Skeleton className="h-3.5 w-96 rounded" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#070b14] space-y-3">
                      <Skeleton className="h-4 w-44 rounded" />
                      <Skeleton className="h-8 w-full rounded-lg" />
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                    <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#070b14] space-y-3">
                      <Skeleton className="h-4 w-52 rounded" />
                      <Skeleton className="h-3.5 w-full rounded" />
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Skeleton className="h-10 w-48 rounded-xl" />
                  </div>
                </Card>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] space-y-2">
                      <Skeleton className="h-3.5 w-28 rounded" />
                      <Skeleton className="h-8 w-20 rounded" />
                      <Skeleton className="h-3 w-36 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
            <div className="flex flex-col gap-6">
              <Card className="shadow-sm border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-gradient-to-b dark:from-[#0d1527] dark:to-[#080d19] dark:shadow-[0_15px_45px_-12px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden">
                <CardContent className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
                      <ScanLine className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold tracking-tight text-foreground">
                        CusDec Port Manifest Tally Engine
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Reconcile scanned Green Stamp duty declarations against master port manifest files to ensure 100% consignment delivery integrity.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* File 1 Source */}
                      <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#070b14] space-y-3 shadow-xs">
                        <div className="text-xs font-semibold text-foreground">File 1 (Source Declarations)</div>
                        <Tabs value={tallySource} onValueChange={(val) => setTallySource(val as any)} className="w-full">
                          <TabsList className="grid grid-cols-2 w-full h-8">
                            <TabsTrigger value="db" className="text-xs">Database ({records.length})</TabsTrigger>
                            <TabsTrigger value="upload" className="text-xs">Upload File 1</TabsTrigger>
                          </TabsList>
                        </Tabs>

                        {tallySource === 'upload' && (
                          <div>
                            <Input
                              type="file"
                              accept=".xlsx,.csv"
                              onChange={e => setTallyF1File(e.target.files?.[0] || null)}
                              className="text-xs bg-background"
                            />
                          </div>
                        )}
                      </div>

                      {/* File 2 Source */}
                      <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#070b14] space-y-3 shadow-xs">
                        <div className="text-xs font-semibold text-foreground">File 2 (Master Manifest Reference)</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Select the official carrier master spreadsheet containing approved consignee & declarant manifests.
                        </p>
                        <Input
                          type="file"
                          accept=".xlsx,.csv"
                          onChange={e => setTallyF2File(e.target.files?.[0] || null)}
                          className="text-xs bg-background"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        variant="emerald"
                        size="lg"
                        disabled={isTallyRunning}
                        onClick={runTallyMatching}
                        className="gap-2 font-bold shadow-sm"
                      >
                        <Activity className={`w-4 h-4 ${isTallyRunning ? 'animate-spin' : ''}`} />
                        <span>{isTallyRunning ? 'Reconciling Manifest...' : 'Run Tally Reconciliation'}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tally Live Progress Dashboard */}
              {isTallyRunning && (
                <Card className="shadow-xl border-emerald-500/30 bg-gradient-to-br from-card via-card/95 to-emerald-500/[0.04] backdrop-blur-xl animate-in fade-in zoom-in-[0.99] duration-200 relative overflow-hidden">
                  {/* Glowing Top Ambient Line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse" />

                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shadow-sm">
                          <Activity className="w-5 h-5 animate-spin" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-bold text-foreground tracking-tight">
                              Tally Manifest Reconciliation in Progress
                            </CardTitle>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              RECONCILING
                            </span>
                          </div>
                          <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            {tallyProgress.stage}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight bg-gradient-to-r from-foreground via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                          {tallyProgress.percent}%
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* iOS Capsule Progress Track with Shimmer */}
                    <div className="space-y-1.5">
                      <div className="relative h-3.5 w-full bg-muted/60 dark:bg-zinc-900/90 rounded-full overflow-hidden p-0.5 border border-border/60 shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300 ease-out shadow-[0_0_16px_rgba(16,185,129,0.4)] relative overflow-hidden"
                          style={{ width: `${Math.max(3, tallyProgress.percent)}%` }}
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.45)_50%,transparent_100%)] animate-shimmer" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
                        <span>
                          {tallyProgress.total > 0
                            ? `Processed ${tallyProgress.current} of ${tallyProgress.total} declarations`
                            : 'Processing declaration stream...'}
                        </span>
                        {tallyProgress.total > 0 && tallyProgress.current < tallyProgress.total && (
                          <span className="font-mono text-[11px] text-emerald-500 font-medium">
                            {tallyProgress.total - tallyProgress.current} remaining
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4 Telemetry HUD Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      {/* Elapsed Time */}
                      <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                        <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sky-500" />
                          <span>Elapsed Time</span>
                        </div>
                        <div className="text-base font-bold text-foreground font-mono mt-0.5">
                          {formatSeconds(tallyProgress.elapsedSeconds)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Active runtime</div>
                      </div>

                      {/* Estimated Time Remaining (ETA) */}
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                          <Hourglass className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                          <span>Est. Remaining</span>
                        </div>
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                          {tallyProgress.etaSeconds !== null
                            ? (tallyProgress.etaSeconds <= 1 ? '< 1s' : `~${tallyProgress.etaSeconds}s`)
                            : 'Calculating...'}
                        </div>
                        <div className="text-[10px] text-emerald-500">Estimated completion</div>
                      </div>

                      {/* Processing Speed */}
                      <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                        <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Throughput</span>
                        </div>
                        <div className="text-base font-bold text-foreground font-mono mt-0.5">
                          {tallyProgress.speed > 0 ? `${tallyProgress.speed} rec/s` : 'Analyzing...'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Fuzzy cross-match rate</div>
                      </div>

                      {/* Strict Verification */}
                      <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                        <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                          <span>Verification Rule</span>
                        </div>
                        <div className="text-xs font-bold text-foreground mt-0.5 truncate">
                          Consignee & Declarant
                        </div>
                        <div className="text-[10px] text-muted-foreground">Both Box 8 & Box 14</div>
                      </div>
                    </div>

                    {/* Live Item Ticker */}
                    {tallyProgress.currentItem && (
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                        <span className="text-muted-foreground flex-shrink-0">Comparing:</span>
                        <span className="font-semibold text-foreground truncate font-mono">
                          {tallyProgress.currentItem}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Tally Results View (Pure shadcn/ui Card) */}
              {tallyResult && (
                <Card className="overflow-hidden shadow-sm">
                  <div className="p-6 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-foreground">Tally Reconciliation Results</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Audit completion timestamp: {new Date().toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild className="gap-1.5">
                          <a href="/api/tally/export/excel" download>
                            <Download className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Export Tally Excel</span>
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild className="gap-1.5">
                          <a href="/api/tally/export/csv" download>
                            <Download className="w-3.5 h-3.5 text-sky-500" />
                            <span>Export Tally CSV</span>
                          </a>
                        </Button>
                      </div>
                    </div>

                    {/* Tally Filter Tabs (Pure shadcn/ui) */}
                    <div className="pt-4">
                      <Tabs value={tallyFilter} onValueChange={(f) => setTallyFilter(f as any)}>
                        <TabsList className="h-9">
                          <TabsTrigger value="MATCHED" className="gap-1.5 text-xs">
                            <span>Matched</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                              {tallyResult.matched?.length || 0}
                            </span>
                          </TabsTrigger>
                          <TabsTrigger value="UNMATCHED_F1" className="gap-1.5 text-xs">
                            <span>Unmatched in F1</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold">
                              {tallyResult.unmatchedFile1?.length || 0}
                            </span>
                          </TabsTrigger>
                          <TabsTrigger value="UNMATCHED_F2" className="gap-1.5 text-xs">
                            <span>Missing from Manifest (F2)</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold">
                              {tallyResult.unmatchedFile2?.length || 0}
                            </span>
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Stamp Duty No</TableHead>
                          <TableHead>Customs Ref</TableHead>
                          <TableHead>Consignee Name</TableHead>
                          <TableHead>Declarant Name</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tallyFilter === 'MATCHED' && tallyResult.matched.map((m, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono font-semibold">
                              <Badge variant="success" className="font-mono text-xs">
                                {m.counterStamp || '—'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{m.customsRef || '—'}</TableCell>
                            <TableCell className="font-medium text-xs">{m.consigneeName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{m.declarantName}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="success" className="text-[10px]">MATCHED</Badge>
                            </TableCell>
                          </TableRow>
                        ))}

                        {tallyFilter === 'UNMATCHED_F1' && tallyResult.unmatchedFile1.map((u, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono font-semibold">
                              <Badge variant="warning" className="font-mono text-xs">
                                {u.counterStamp || '—'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{u.customsRef || '—'}</TableCell>
                            <TableCell className="font-medium text-xs">{u.consigneeName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{u.declarantName}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="warning" className="text-[10px]">UNMATCHED F1</Badge>
                            </TableCell>
                          </TableRow>
                        ))}

                        {tallyFilter === 'UNMATCHED_F2' && tallyResult.unmatchedFile2.map((u, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs text-muted-foreground">—</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">—</TableCell>
                            <TableCell className="font-medium text-xs">{u.consigneeName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{u.declarantName}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="destructive" className="text-[10px]">MISSING IN F2</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </div>
            )
          )}

          {/* ========================================================
             WORKSPACE 3: OFFICER PROFILE & SECURITY (BREVO OTP)
             ======================================================== */}
          {activeSection === 'profile' && currentUser && (
            <div className="w-full max-w-7xl mx-auto px-1 sm:px-2">
              <OfficerProfileDeck
                currentUser={currentUser}
                onUserUpdated={(updated) => {
                  setCurrentUser(updated);
                }}
                onNavigateToDeclarations={() => setActiveSection('ocr')}
                activeTab={profileSubTab}
                onTabChange={setProfileSubTab}
                onShowToast={showToast}
              />
            </div>
          )}

          {/* ========================================================
             WORKSPACE 4: FULL SCREEN SYNCHRONIZED OFFICER MESSENGER
             ======================================================== */}
          {activeSection === 'chat' && currentUser && (
            <FullScreenChatDeck currentUser={currentUser} />
          )}
        </main>

        {/* ========================================================
           ENTERPRISE TERMINAL FOOTER & CREDITS
           ======================================================== */}
        {activeSection !== 'chat' && (
          <footer className="w-full border-t border-border/40 bg-background/95 mt-auto">
            <div className="max-w-[1760px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div>
                © 2026 LRSYS - Sri Lanka Customs (CusDec) Long Room Division. All Rights Reserved.
              </div>
              <a
                href="https://vehan.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <span>dev by</span>
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors inline-flex items-center gap-0.5 underline-offset-4 group-hover:underline">
                  Vehan Rajintha
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                </span>
              </a>
            </div>
          </footer>
        )}

        {/* ========================================================
             PREMIUM APPLE-STYLE MOBILE BOTTOM NAVIGATION BAR
             ======================================================== */}
        <nav
          aria-label="Mobile Bottom Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden mobile-bottom-dock pb-safe transition-transform duration-300 select-none"
        >
          <div className="grid grid-cols-5 h-16 items-center px-1">
            {/* 1. Stats Tab */}
            <button
              type="button"
              onClick={() => navigateToSection('stats')}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95",
                activeSection === 'stats'
                  ? "text-cyan-600 dark:text-cyan-400 font-extrabold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className="relative">
                <BarChart3 className={cn("w-5 h-5 transition-transform duration-200", activeSection === 'stats' && "scale-110 text-cyan-500")} />
                {activeSection === 'stats' && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">Stats</span>
            </button>

            {/* 2. OCR / Declarations Tab */}
            <button
              type="button"
              onClick={() => navigateToSection('ocr')}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95",
                activeSection === 'ocr'
                  ? "text-sky-600 dark:text-sky-400 font-extrabold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className="relative">
                <FileText className={cn("w-5 h-5 transition-transform duration-200", activeSection === 'ocr' && "scale-110 text-sky-500")} />
                {records.length > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-3.5 h-3.5 rounded-full bg-sky-500 text-white text-[8px] font-mono font-bold flex items-center justify-center">
                    {records.length > 99 ? '99+' : records.length}
                  </span>
                )}
                {activeSection === 'ocr' && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">CusDec</span>
            </button>

            {/* 3. Tally Recon Tab */}
            <button
              type="button"
              onClick={() => navigateToSection('tally')}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95",
                activeSection === 'tally'
                  ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className="relative">
                <ScanLine className={cn("w-5 h-5 transition-transform duration-200", activeSection === 'tally' && "scale-110 text-emerald-500")} />
                {activeSection === 'tally' && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">Tally</span>
            </button>

            {/* 4. Chat Tab */}
            <button
              type="button"
              onClick={() => navigateToSection('chat')}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95",
                activeSection === 'chat'
                  ? "text-blue-600 dark:text-blue-400 font-extrabold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className="relative">
                <MessageCircle className={cn("w-5 h-5 transition-transform duration-200", activeSection === 'chat' && "scale-110 text-blue-500")} />
                {activeSection === 'chat' && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">Chat</span>
            </button>

            {/* 5. Profile Tab */}
            <button
              type="button"
              onClick={() => navigateToSection('profile')}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95",
                activeSection === 'profile'
                  ? "text-indigo-600 dark:text-indigo-400 font-extrabold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className="relative">
                {currentUser?.avatarUrl && !currentUser.avatarUrl.includes('images.unsplash.com') ? (
                  <div className={cn("w-5 h-5 rounded-full overflow-hidden border border-border shrink-0 transition-transform duration-200", activeSection === 'profile' && "ring-2 ring-indigo-500 scale-110")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                  </div>
                ) : (
                  <User className={cn("w-5 h-5 transition-transform duration-200", activeSection === 'profile' && "scale-110 text-indigo-500")} />
                )}
                {activeSection === 'profile' && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">Profile</span>
            </button>
          </div>
        </nav>
      </div>

      {/* ========================================================
           VISIONOS / CYBER-LUXURY FROSTED GLASS INSPECTION MODAL
           ======================================================== */}
      <Dialog open={isInspectionModalOpen} onOpenChange={setIsInspectionModalOpen}>
        <DialogContent
          onPointerDownOutside={(e) => {
            if (confirmModal?.isOpen) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            if (confirmModal?.isOpen) {
              e.preventDefault();
            }
          }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-6xl w-[96vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[32px] border border-black/[0.08] dark:border-white/[0.08] bg-white/92 dark:bg-[#0b0f19]/92 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.2)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.8)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Subtle Document Backdrop (No neon aura blobs) */}
          {selectedRecord?.filename && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
              <img
                src={selectedRecord.imageUrl || `/api/images/${encodeURIComponent(selectedRecord.filename)}`}
                alt=""
                aria-hidden="true"
                className={`w-full h-full object-cover blur-[60px] scale-105 transition-all duration-700 ${
                  isImageLoading ? 'opacity-0' : 'opacity-20 dark:opacity-10'
                }`}
              />
              {/* Soft Scrim */}
              <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-xl" />
            </div>
          )}

          {/* Dialog Header: Clean Cockpit */}
          <div className="p-4 sm:p-5 pr-14 sm:pr-16 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-3 bg-black/[0.02] dark:bg-white/[0.02] backdrop-blur-md relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Declaration Inspection & Audit Bay</span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    <Sparkles className="w-2.5 h-2.5" />
                    AI OCR ACTIVE
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs font-mono text-muted-foreground flex items-center gap-2 mt-0.5 truncate">
                  <span className="truncate max-w-[200px] sm:max-w-xs md:max-w-sm text-foreground/80 font-medium">
                    {selectedRecord?.originalName || selectedRecord?.filename || 'Document Viewport'}
                  </span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/[0.04] dark:bg-white/[0.06] text-cyan-600 dark:text-cyan-400 border border-black/[0.06] dark:border-white/[0.08] whitespace-nowrap">
                    Record {currentRecordIndex + 1} of {filteredRecords.length}
                  </span>
                </DialogDescription>
              </div>
            </div>

            {selectedRecord && (
              <div className="flex items-center gap-2 shrink-0">
                {!canManageCusDec && (
                  <Badge variant="outline" className="text-xs font-mono bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30 gap-1.5 py-1 px-2.5 rounded-xl">
                    <Lock className="w-3 h-3" />
                    <span>View Only</span>
                  </Badge>
                )}
                {canManageCusDec && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => requestDeleteSingleRecord(selectedRecord)}
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 gap-1.5 rounded-xl transition-all cursor-pointer"
                    title="Delete this declaration"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-mono font-bold tracking-wider uppercase px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-none",
                    selectedRecord.status === 'VERIFIED'
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : selectedRecord.status === 'CORRECTED'
                      ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  )}
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    selectedRecord.status === 'VERIFIED' ? "bg-emerald-500" : selectedRecord.status === 'CORRECTED' ? "bg-cyan-500" : "bg-amber-500"
                  )} />
                  {selectedRecord.status}
                </Badge>

                {/* Prominent Frosted Glass Close Action Button */}
                <button
                  type="button"
                  onClick={() => setIsInspectionModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer shadow-xs active:scale-90 group ml-1"
                  title="Close Inspection Bay (Esc)"
                  aria-label="Close Inspection Bay"
                >
                  <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90 text-foreground/70 group-hover:text-foreground" />
                </button>
              </div>
            )}
          </div>

          {/* Dialog Body (Seamless Frosted Glass Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 sm:p-6 overflow-y-auto flex-1 relative z-10">
            {/* Left Column: High-Res Interactive Optical Canvas */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              {/* Canvas Controls Header & Floating Pills */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span className="text-xs font-bold tracking-wider uppercase text-foreground/85 font-mono">
                    Optical Document Canvas
                  </span>
                </div>

                {/* Clean Floating Glass Toolbar */}
                <div className="flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.04] backdrop-blur-md border border-black/[0.06] dark:border-white/[0.08] p-1 rounded-2xl">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => adjustZoom(0.25)}
                    className="h-7 w-7 rounded-xl hover:bg-cyan-500/15 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
                    title="Zoom in (Wheel up)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => adjustZoom(-0.25)}
                    className="h-7 w-7 rounded-xl hover:bg-cyan-500/15 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
                    title="Zoom out (Wheel down)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                  <div className="h-4 w-px bg-border/40 mx-0.5" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={rotateImage}
                    className="h-7 w-7 rounded-xl hover:bg-cyan-500/15 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
                    title="Rotate 90° clockwise"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetZoom}
                    className="h-7 px-2.5 text-xs font-medium rounded-xl hover:bg-cyan-500/15 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
                    title="Reset zoom & rotation"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                  <div className="h-4 w-px bg-border/40 mx-0.5" />
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                    {Math.round(zoomScale * 100)}%
                  </span>
                </div>
              </div>

              {/* Viewport Stage with Clean Subtle Backdrop */}
              <div
                className={`w-full h-[500px] lg:h-[540px] rounded-3xl border border-black/[0.06] dark:border-white/[0.08] relative flex items-center justify-center overflow-hidden viewport-canvas select-none bg-black/[0.02] dark:bg-black/50 backdrop-blur-md group ${
                  confirmModal?.isOpen ? 'pointer-events-none' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                {/* Local Canvas Ambient Backdrop Layer (Clean, no saturated neon) */}
                {selectedRecord?.filename && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
                    <img
                      src={selectedRecord.imageUrl || `/api/images/${encodeURIComponent(selectedRecord.filename)}`}
                      alt=""
                      aria-hidden="true"
                      className={`w-full h-full object-cover blur-2xl scale-110 transition-all duration-700 ${
                        isImageLoading ? 'opacity-0' : 'opacity-20 dark:opacity-10'
                      }`}
                    />
                    {/* Soft neutral scrim */}
                    <div className="absolute inset-0 bg-white/20 dark:bg-black/60" />
                  </div>
                )}

                {/* HUD Pill: Scanning / Format Mode */}
                <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-black/[0.06] dark:border-white/10 text-[10px] font-mono font-semibold text-cyan-700 dark:text-cyan-300 pointer-events-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  <span>OPTICAL SCAN • CUSDEC</span>
                </div>

                {/* HUD Pill: Interaction Tips */}
                <div className="absolute bottom-3.5 right-3.5 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-black/[0.06] dark:border-white/10 text-[10px] font-mono text-muted-foreground pointer-events-none">
                  <span>Scroll to zoom • Drag to pan</span>
                </div>

                {/* Optical Scanning Skeleton Loader */}
                {isImageLoading && selectedRecord?.filename && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/80 dark:bg-black/85 backdrop-blur-md p-6 animate-in fade-in duration-200">
                    <div className="relative w-52 h-72 sm:w-64 sm:h-80 border-2 border-dashed border-cyan-500/40 rounded-3xl bg-white/60 dark:bg-zinc-950/80 p-4 flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-md">
                      {/* Animated Laser Scanning Line */}
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-scan-laser pointer-events-none" />

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Skeleton className="h-4 w-24 rounded-lg" />
                          <Skeleton className="h-6 w-16 rounded-full bg-emerald-500/20" />
                        </div>
                        <Skeleton className="h-3 w-36 rounded-lg" />
                      </div>

                      <div className="space-y-2.5 my-auto">
                        <div className="grid grid-cols-2 gap-2">
                          <Skeleton className="h-10 rounded-xl bg-muted/60" />
                          <Skeleton className="h-10 rounded-xl bg-muted/60" />
                        </div>
                        <Skeleton className="h-3 w-full rounded-lg" />
                        <Skeleton className="h-3 w-5/6 rounded-lg" />
                        <Skeleton className="h-3 w-4/6 rounded-lg" />
                      </div>

                      <div className="pt-2 border-t border-border/40 flex justify-between items-center">
                        <Skeleton className="h-3 w-20 rounded-lg" />
                        <Skeleton className="h-3 w-14 rounded-lg" />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs font-mono text-cyan-600 dark:text-cyan-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span className="tracking-wider font-semibold">STREAMING HIGH-RES CUSDEC SCAN...</span>
                    </div>
                  </div>
                )}

                {/* Foreground Sharp Document Image Floating with 3D Depth */}
                {selectedRecord?.filename ? (
                  <img
                    ref={node => {
                      if (node && node.complete && node.naturalWidth > 0 && isImageLoading) {
                        setIsImageLoading(false);
                      }
                    }}
                    src={selectedRecord.imageUrl || `/api/images/${encodeURIComponent(selectedRecord.filename)}`}
                    alt="Customs Declaration Document"
                    draggable={false}
                    onLoad={() => setIsImageLoading(false)}
                    onError={() => setIsImageLoading(false)}
                    className={`relative z-10 max-w-full max-h-full object-contain pointer-events-none select-none transition-all duration-300 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.12)] ${
                      isImageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    }`}
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale}) rotate(${rotation}deg)`,
                      transition: isDragging ? 'none' : 'transform 0.15s ease-out'
                    }}
                  />
                ) : (
                  <div className="relative z-10 text-center text-muted-foreground p-6">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-30 text-cyan-400" />
                    <p className="text-sm font-medium">No preview document available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Clean Audit & Verification Cockpit */}
            <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] backdrop-blur-md p-5 sm:p-6 space-y-4 relative z-10">
              {/* Cockpit Top Header */}
              <div className="pb-3 border-b border-black/[0.06] dark:border-white/[0.06] flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-500" />
                    <h3 className="text-sm font-bold text-foreground tracking-tight">
                      {canManageCusDec ? 'Quick Audit & Verification' : 'Declaration Inspection (View Only)'}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {canManageCusDec
                      ? 'Review and verify extracted OCR values from Box 40, Box 14, and Box 8.'
                      : 'Audit and inspect extracted declaration values (Read-Only clearance).'}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-lg shrink-0",
                    canManageCusDec
                      ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                      : "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20"
                  )}
                >
                  {canManageCusDec ? 'CusDec Form' : 'Read-Only'}
                </Badge>
              </div>

              {/* Form Audit Tiles */}
              <div className="space-y-3 flex-1">
                {/* Stamp Duty No */}
                <div className="group relative p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] hover:border-black/15 dark:hover:border-white/15 focus-within:border-cyan-500/50 focus-within:bg-transparent transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        BOX 40
                      </span>
                      <Label htmlFor="stamp" className="text-xs font-bold text-foreground/85 tracking-wider uppercase">
                        Stamp Duty Number
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(editStamp, 'Stamp Number')}
                      className={cn(
                        "h-6 px-2.5 text-[11px] font-mono rounded-lg border transition-all flex items-center gap-1 active:scale-95 cursor-pointer",
                        copiedField === 'Stamp Number'
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-muted-foreground hover:text-foreground border-transparent"
                      )}
                      title="Copy stamp duty number"
                    >
                      {copiedField === 'Stamp Number' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    id="stamp"
                    type="text"
                    value={editStamp}
                    onChange={e => setEditStamp(e.target.value)}
                    readOnly={!canManageCusDec}
                    disabled={!canManageCusDec}
                    className={cn(
                      "w-full bg-transparent font-mono text-base font-bold text-foreground tracking-wider outline-none border-none p-0 focus:ring-0 placeholder:text-muted-foreground/30",
                      !canManageCusDec && "cursor-not-allowed opacity-80"
                    )}
                    placeholder="000000"
                  />
                </div>

                {/* Customs Ref */}
                <div className="group relative p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] hover:border-black/15 dark:hover:border-white/15 focus-within:border-cyan-500/50 focus-within:bg-transparent transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        BOX 14
                      </span>
                      <Label htmlFor="ref" className="text-xs font-bold text-foreground/85 tracking-wider uppercase">
                        Customs Reference
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(editRef, 'Customs Ref')}
                      className={cn(
                        "h-6 px-2.5 text-[11px] font-mono rounded-lg border transition-all flex items-center gap-1 active:scale-95 cursor-pointer",
                        copiedField === 'Customs Ref'
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-muted-foreground hover:text-foreground border-transparent"
                      )}
                      title="Copy customs reference"
                    >
                      {copiedField === 'Customs Ref' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    id="ref"
                    type="text"
                    value={editRef}
                    onChange={e => setEditRef(e.target.value)}
                    readOnly={!canManageCusDec}
                    disabled={!canManageCusDec}
                    className={cn(
                      "w-full bg-transparent font-mono text-base font-semibold text-foreground tracking-wide outline-none border-none p-0 focus:ring-0 placeholder:text-muted-foreground/30",
                      !canManageCusDec && "cursor-not-allowed opacity-80"
                    )}
                    placeholder="CUSTOMS-REF-NUMBER"
                  />
                </div>

                {/* Consignee */}
                <div className="group relative p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] hover:border-black/15 dark:hover:border-white/15 focus-within:border-cyan-500/50 focus-within:bg-transparent transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        BOX 8
                      </span>
                      <Label htmlFor="consignee" className="text-xs font-bold text-foreground/85 tracking-wider uppercase">
                        Consignee Name
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(editConsignee, 'Consignee')}
                      className={cn(
                        "h-6 px-2.5 text-[11px] font-mono rounded-lg border transition-all flex items-center gap-1 active:scale-95 cursor-pointer",
                        copiedField === 'Consignee'
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-muted-foreground hover:text-foreground border-transparent"
                      )}
                      title="Copy consignee name"
                    >
                      {copiedField === 'Consignee' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    id="consignee"
                    type="text"
                    value={editConsignee}
                    onChange={e => setEditConsignee(e.target.value)}
                    readOnly={!canManageCusDec}
                    disabled={!canManageCusDec}
                    className={cn(
                      "w-full bg-transparent text-sm font-semibold uppercase text-foreground outline-none border-none p-0 focus:ring-0 placeholder:text-muted-foreground/30",
                      !canManageCusDec && "cursor-not-allowed opacity-80"
                    )}
                    placeholder="CONSIGNEE NAME"
                  />
                </div>

                {/* Declarant */}
                <div className="group relative p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] hover:border-black/15 dark:hover:border-white/15 focus-within:border-cyan-500/50 focus-within:bg-transparent transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        BOX 14
                      </span>
                      <Label htmlFor="declarant" className="text-xs font-bold text-foreground/85 tracking-wider uppercase">
                        Declarant / Agent
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(editDeclarant, 'Declarant')}
                      className={cn(
                        "h-6 px-2.5 text-[11px] font-mono rounded-lg border transition-all flex items-center gap-1 active:scale-95 cursor-pointer",
                        copiedField === 'Declarant'
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-muted-foreground hover:text-foreground border-transparent"
                      )}
                      title="Copy declarant / agent"
                    >
                      {copiedField === 'Declarant' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    id="declarant"
                    type="text"
                    value={editDeclarant}
                    onChange={e => setEditDeclarant(e.target.value)}
                    readOnly={!canManageCusDec}
                    disabled={!canManageCusDec}
                    className={cn(
                      "w-full bg-transparent text-sm font-semibold uppercase text-foreground outline-none border-none p-0 focus:ring-0 placeholder:text-muted-foreground/30",
                      !canManageCusDec && "cursor-not-allowed opacity-80"
                    )}
                    placeholder="DECLARANT NAME"
                  />
                </div>
              </div>

              {/* Action Buttons & Dock Footer */}
              <div className="pt-2 space-y-3">
                {canManageCusDec ? (
                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    <Button
                      variant="default"
                      onClick={saveQuickEdit}
                      className="w-full gap-2 text-xs font-semibold h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Record</span>
                    </Button>
                    <Button
                      variant="default"
                      onClick={saveQuickEditAndNext}
                      className="w-full gap-2 text-xs font-semibold h-11 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <span>Save & Next</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-500 dark:text-amber-400 text-xs w-full shadow-xs">
                    <Lock className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-semibold">Read-Only Viewport</p>
                      <p className="text-[11px] opacity-80">Editing and saving declaration fields is restricted to authorized customs clearance.</p>
                    </div>
                  </div>
                )}

                {/* Floating Dock Navigation */}
                <div className="flex items-center justify-between w-full pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectPrevRecord}
                    disabled={currentRecordIndex <= 0}
                    className="text-xs h-9 px-3.5 rounded-xl border-border/60 hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/30 transition-all cursor-pointer disabled:opacity-40 shadow-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Previous
                  </Button>
                  <div className="px-3.5 py-1.5 rounded-xl bg-white/60 dark:bg-white/[0.06] backdrop-blur-md border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 shadow-xs">
                    {currentRecordIndex + 1} <span className="text-muted-foreground font-normal">/</span> {filteredRecords.length}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectNextRecord}
                    disabled={currentRecordIndex >= filteredRecords.length - 1}
                    className="text-xs h-9 px-3.5 rounded-xl border-border/60 hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/30 transition-all cursor-pointer disabled:opacity-40 shadow-xs"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>

                {/* Danger Zone: ID & Delete Declaration */}
                {canManageCusDec && selectedRecord && (
                  <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08] w-full flex justify-between items-center text-xs text-muted-foreground">
                    <span className="text-[11px] font-mono text-muted-foreground/70">ID #{selectedRecord.id?.slice(0, 8)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => requestDeleteSingleRecord(selectedRecord)}
                      className="text-xs text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 gap-1.5 h-7 px-2.5 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500/70" />
                      <span>Delete Declaration</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================
           iOS-STYLE SYSTEM SETTINGS ACTION SHEET MODAL
           ======================================================== */}
      {isSettingsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsSettingsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-card/95 border border-border/70 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Right Close Button */}
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute right-4 top-4 z-20 w-8 h-8 rounded-full flex items-center justify-center bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition-all duration-200 active:scale-95 cursor-pointer shadow-sm group"
              title="Close Settings (Esc)"
            >
              <X className="w-4 h-4 transition-transform group-hover:scale-110" />
            </button>

            {/* iOS Pull Indicator Pill */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="px-6 pt-2 pb-4 text-center border-b border-border/40">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-2.5 shadow-sm">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground tracking-tight">System & AI Configuration</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure Google Gemini Vision AI parameters and cloud ingestion
              </p>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveSettings} className="p-6 space-y-4 overflow-y-auto">
              {/* Group 1: Gemini Vision AI Credentials */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-3.5">
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Gemini Vision Credentials</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-border/60 text-muted-foreground">
                    Multi-Pass Engine
                  </Badge>
                </div>

                {/* Custom API Key Override with iOS Toggle Switch */}
                <div className="p-3.5 rounded-2xl bg-background/50 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <Key className={cn("w-3.5 h-3.5 transition-colors", settings.useCustomApiKey ? "text-emerald-500" : "text-muted-foreground")} />
                        <span className="text-xs font-semibold text-foreground">
                          Custom API Key Override
                        </span>
                        {settings.useCustomApiKey ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/40">
                            Pre-configured System Keys Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {settings.useCustomApiKey
                          ? 'Override active: The system will use your custom key for extraction.'
                          : 'Using high-speed pre-configured system keys from server environment.'}
                      </p>
                    </div>

                    {/* iOS-Style Toggle Switch (Right Side) */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(settings.useCustomApiKey)}
                      onClick={() => setSettings({ ...settings, useCustomApiKey: !settings.useCustomApiKey })}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 shadow-inner select-none",
                        settings.useCustomApiKey
                          ? "bg-emerald-500 hover:bg-emerald-600"
                          : "bg-muted-foreground/30 dark:bg-zinc-700/70 hover:bg-muted-foreground/40"
                      )}
                      title={settings.useCustomApiKey ? "Turn OFF custom key override" : "Turn ON custom key override"}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                          settings.useCustomApiKey ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Custom API Key Input (Shown smoothly when enabled) */}
                  {settings.useCustomApiKey ? (
                    <div className="space-y-1.5 pt-2 border-t border-border/40 animate-in fade-in-50 slide-in-from-top-1 duration-200">
                      <Label htmlFor="customApiKey" className="text-[11px] font-medium text-muted-foreground">
                        Enter Custom Gemini API Key
                      </Label>
                      <div className="relative">
                        <Input
                          id="customApiKey"
                          type="password"
                          placeholder="Enter custom Gemini API key (AIzaSy...)"
                          value={settings.customApiKey || ''}
                          onChange={e => setSettings({ ...settings, customApiKey: e.target.value })}
                          className="text-xs font-mono rounded-xl bg-background border-emerald-500/50 focus:border-emerald-500 pr-10 shadow-sm"
                          autoFocus
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                          <Key className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                      </div>
                      <p className="text-[10px] text-emerald-400 font-medium">
                        ✓ Override active: The system will use exactly this custom key instead of the pre-configured system keys.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-muted/20 border border-border/30 text-[11px] text-muted-foreground flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Pre-configured System Keys active & ready (Multi-Stream Failover)</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground/70">Protected</span>
                    </div>
                  )}
                </div>

                {/* Gemini Vision Model */}
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <Label htmlFor="model" className="text-xs font-medium text-foreground">
                    Gemini Vision Model
                  </Label>
                  <Input
                    id="model"
                    value={settings.geminiModel || 'gemini-3.5-flash-lite'}
                    onChange={e => setSettings({ ...settings, geminiModel: e.target.value })}
                    className="text-xs font-mono rounded-xl bg-background border-border/60"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSettings({ ...settings, geminiModel: m })}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-mono transition-all ${settings.geminiModel === m
                          ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                          }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Group 2: Automation & Performance */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-3">
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Pipeline Automation</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="threshold" className="text-xs font-medium text-foreground">
                      Auto-Verification Confidence
                    </Label>
                    <span className="text-xs font-bold text-emerald-500 font-mono">
                      {settings.autoVerifyThreshold}%
                    </span>
                  </div>
                  <Input
                    id="threshold"
                    type="number"
                    min="50"
                    max="100"
                    value={settings.autoVerifyThreshold}
                    onChange={e => setSettings({ ...settings, autoVerifyThreshold: Number(e.target.value) })}
                    className="text-xs rounded-xl bg-background border-border/60"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Declarations scored above this threshold are automatically marked Verified.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="concurrency" className="text-xs font-medium text-foreground">
                      Parallel Workers
                    </Label>
                    <span className="text-xs font-bold text-primary font-mono">
                      {settings.workerConcurrency} concurrent
                    </span>
                  </div>
                  <Input
                    id="concurrency"
                    type="number"
                    min="1"
                    max="12"
                    value={settings.workerConcurrency}
                    onChange={e => setSettings({ ...settings, workerConcurrency: Number(e.target.value) })}
                    className="text-xs rounded-xl bg-background border-border/60"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Number of declarations processed simultaneously in parallel.
                  </p>
                </div>
              </div>

              {/* iOS Action Buttons */}
              <div className="pt-2 space-y-2">
                <Button
                  type="submit"
                  className="w-full py-3 rounded-2xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md"
                >
                  Save Settings
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-2.5 rounded-2xl font-semibold border-border/60 hover:bg-muted active:scale-[0.98] transition-all"
                  onClick={() => setIsSettingsModalOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
           iOS-STYLE MOBILE SCANNER QR CODE ACTION SHEET MODAL
           ======================================================== */}
      {isMobileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsMobileModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-card/95 border border-border/70 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            {/* iOS Pull Indicator Pill */}
            <div className="pb-3 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-2.5 shadow-sm">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-foreground tracking-tight">Mobile Port Scanner</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Scan with your phone camera to open and upload CusDec photos instantly
            </p>

            <div className="my-5 flex flex-col items-center gap-3">
              <div className="p-3.5 bg-white rounded-2xl shadow-md border">
                <canvas ref={qrCanvasRef} />
              </div>

              <a
                href={lanUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono font-semibold text-primary hover:underline flex items-center gap-1.5 bg-primary/10 px-3.5 py-1.5 rounded-full border border-primary/20 active:scale-95 transition-all max-w-[280px] truncate"
              >
                <span className="truncate">{lanUrl}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full py-2.5 rounded-2xl font-semibold border-border/60 hover:bg-muted active:scale-[0.98] transition-all"
              onClick={() => setIsMobileModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================
           iOS-STYLE STORAGE MANAGEMENT ACTION SHEET MODAL
           ======================================================== */}
      {isStorageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            if (!isPurgingStorage) {
              setConfirmPurgeAction(null);
              setIsStorageModalOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-md bg-card/95 border border-border/70 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Right Close Button */}
            <button
              type="button"
              disabled={isPurgingStorage}
              onClick={() => {
                setConfirmPurgeAction(null);
                setIsStorageModalOpen(false);
              }}
              className="absolute right-4 top-4 z-20 w-8 h-8 rounded-full flex items-center justify-center bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition-all duration-200 active:scale-95 cursor-pointer shadow-sm group disabled:opacity-40"
              title="Close Storage (Esc)"
            >
              <X className="w-4 h-4 transition-transform group-hover:scale-110" />
            </button>

            {/* iOS Pull Indicator Pill */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="p-6 pt-2 text-center">
              {isStorageLoading ? (
                <div className="space-y-4 my-4 animate-in fade-in duration-200">
                  <Skeleton className="w-24 h-24 rounded-full mx-auto" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-6 w-48 rounded mx-auto" />
                    <Skeleton className="h-3.5 w-60 rounded mx-auto" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4 text-left">
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                  </div>
                </div>
              ) : (
                <>
                  {/* Circular Storage Visualizer */}
                  <div className="relative w-28 h-28 mx-auto my-3 flex items-center justify-center">
                    <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-sky-500/15"
                        strokeWidth="3"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-sky-500 transition-all duration-1000 ease-out"
                        strokeDasharray={`${Math.max(5, storageStats.diskPercentUsed || storageStats.percentUsed)}, 100`}
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <HardDrive className="w-5 h-5 text-sky-500 mb-0.5" />
                      <span className="text-base font-bold text-foreground">
                        {storageStats.diskPercentUsed || storageStats.percentUsed}%
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        SSD Used
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-foreground tracking-tight">
                    {storageStats.diskFreeFormatted ? (
                      <>{storageStats.diskFreeFormatted} Available of {storageStats.diskTotalFormatted || storageStats.quotaFormatted}</>
                    ) : (
                      <>{storageStats.totalFormatted} of {storageStats.quotaFormatted} Used</>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {storageStats.totalFiles} documents ({storageStats.totalFormatted}) stored on {storageStats.provider === 'supabase' ? 'Supabase Storage' : 'Hosted VPS NVMe SSD'}
                  </p>

                  {/* Breakdown Grid (4 iOS Cards) */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-left">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                      <div className="text-[11px] text-muted-foreground font-medium">VPS Full Capacity</div>
                      <div className="text-sm font-semibold text-foreground mt-0.5 font-mono">
                        {storageStats.diskTotalFormatted || storageStats.quotaFormatted}
                      </div>
                      <div className="text-[10px] text-sky-500">Hardware NVMe SSD</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Actual Available Free</div>
                      <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                        {storageStats.diskFreeFormatted || 'Calculating...'}
                      </div>
                      <div className="text-[10px] text-emerald-500">Free space for scans</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                      <div className="text-[11px] text-muted-foreground font-medium">Document Scans</div>
                      <div className="text-sm font-semibold text-foreground mt-0.5 font-mono">
                        {storageStats.localFormatted || storageStats.totalFormatted}
                      </div>
                      <div className="text-[10px] text-sky-500">{storageStats.localFiles || storageStats.totalFiles} files in /uploads</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                      <div className="text-[11px] text-muted-foreground font-medium">System & OS Used</div>
                      <div className="text-sm font-semibold text-foreground mt-0.5 font-mono">
                        {storageStats.diskUsedFormatted || 'Active'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{storageStats.diskPercentUsed || storageStats.percentUsed}% disk utilized</div>
                    </div>
                  </div>

                  {storageStats.cloudFiles > 0 && (
                    <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 text-left">
                      <span>Supabase Cloud Sync</span>
                      <span className="font-semibold font-mono">{storageStats.cloudFormatted} ({storageStats.cloudFiles} remote files)</span>
                    </div>
                  )}
                </>
              )}

              {/* iOS Action Menu List */}
              <div className="mt-5 space-y-2 text-left">
                {confirmPurgeAction ? (
                  <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-destructive">
                          {confirmPurgeAction === 'all'
                            ? (storageStats.provider === 'local' ? 'Purge All VPS Scans?' : 'Purge Entire Storage Bucket?')
                            : 'Clean Unlinked Orphan Images?'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {confirmPurgeAction === 'all'
                            ? (storageStats.provider === 'local'
                              ? 'This permanently deletes all declaration images from your VPS uploads folder. Declaration ledger metadata will remain.'
                              : 'This permanently deletes all declaration images from your Supabase bucket and local uploads. Declaration ledger metadata will remain.')
                            : 'This permanently deletes images that do not match any active record in the cargo ledger.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 rounded-xl text-xs font-semibold"
                        disabled={isPurgingStorage}
                        onClick={() => handlePurgeStorage(confirmPurgeAction)}
                      >
                        {isPurgingStorage ? 'Deleting...' : 'Yes, Delete Files'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs"
                        disabled={isPurgingStorage}
                        onClick={() => setConfirmPurgeAction(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmPurgeAction('orphans')}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 hover:bg-muted/60 active:scale-[0.98] transition-all border border-border/40 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">Clean Orphan Images</div>
                          <div className="text-[11px] text-muted-foreground">Free space by deleting unlinked scans</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmPurgeAction('all')}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-destructive/[0.04] hover:bg-destructive/10 active:scale-[0.98] transition-all border border-border/40 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive group-hover:scale-110 transition-transform">
                          <Trash2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-destructive">
                            {storageStats.provider === 'local' ? 'Purge All Local Image Files' : 'Purge All Storage Bucket Files'}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {storageStats.provider === 'local' ? 'Wipe all document scans from VPS disk' : 'Wipe all images from Supabase & disk'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-destructive group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        fetchStorageStats();
                        showToast('Storage refreshed', 'info');
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 hover:bg-muted/60 active:scale-[0.98] transition-all border border-border/40 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500 group-hover:scale-110 transition-transform">
                          <RefreshCw className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">Refresh Telemetry</div>
                          <div className="text-[11px] text-muted-foreground">Recalculate bucket bytes and quota</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </>
                )}
              </div>

              {/* iOS Dismiss Button */}
              <div className="mt-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-2.5 rounded-2xl font-semibold border-border/60 hover:bg-muted active:scale-[0.98] transition-all"
                  onClick={() => {
                    setConfirmPurgeAction(null);
                    setIsStorageModalOpen(false);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
           iOS-STYLE HARDWARE & SYSTEM HEALTH TELEMETRY MODAL
           ======================================================== */}
      {isSystemModalOpen && systemMetrics && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none"
          onClick={() => setIsSystemModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-card/95 border border-border/70 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Right Close Button */}
            <button
              type="button"
              onClick={() => setIsSystemModalOpen(false)}
              className="absolute right-4 top-4 z-20 w-8 h-8 rounded-full flex items-center justify-center bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition-all duration-200 active:scale-95 cursor-pointer shadow-sm group"
              title="Close System Health (Esc)"
            >
              <X className="w-4 h-4 transition-transform group-hover:scale-110" />
            </button>

            {/* iOS Pull Indicator Pill */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="p-6 pt-2 text-center">
              {/* Header Icon & Title */}
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 mx-auto mb-2 shadow-sm">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <h3 className="text-lg font-bold text-foreground tracking-tight">
                  Server & Hardware Health
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  LIVE (1.2s)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {systemMetrics.system.hostname} • {systemMetrics.system.platform === 'win32' ? 'Windows' : 'Ubuntu Linux'} ({systemMetrics.system.arch})
              </p>

              {/* Dual Activity Gauge Cards (iOS Style) */}
              <div className="grid grid-cols-2 gap-3 mt-4 text-left">
                {/* CPU Gauge Card */}
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                      <Cpu className="w-4 h-4 text-sky-500" />
                      <span>CPU Load</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-foreground">
                      {systemMetrics.cpu.percent}%
                    </span>
                  </div>

                  <div className="w-full bg-muted-foreground/15 h-2 rounded-full overflow-hidden mt-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${systemMetrics.cpu.percent > 80 ? 'bg-destructive' : systemMetrics.cpu.percent > 50 ? 'bg-amber-500' : 'bg-sky-500'
                        }`}
                      style={{ width: `${Math.max(6, systemMetrics.cpu.percent)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
                    <span>{systemMetrics.cpu.cores} Cores</span>
                    <span className="font-mono">Load: {systemMetrics.cpu.loadAvg.join(', ')}</span>
                  </div>
                </div>

                {/* RAM Gauge Card */}
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <Activity className="w-4 h-4 text-emerald-500" />
                      <span>RAM Memory</span>
                    </div>
                    <span className="text-lg font-bold font-mono text-foreground">
                      {systemMetrics.ram.percent}%
                    </span>
                  </div>

                  <div className="w-full bg-muted-foreground/15 h-2 rounded-full overflow-hidden mt-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${systemMetrics.ram.percent > 85 ? 'bg-destructive' : systemMetrics.ram.percent > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      style={{ width: `${Math.max(6, systemMetrics.ram.percent)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
                    <span>Used: {systemMetrics.ram.usedFormatted}</span>
                    <span>Total: {systemMetrics.ram.totalFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Hardware & Process Specs List */}
              <div className="mt-3.5 rounded-2xl bg-muted/20 border border-border/40 divide-y divide-border/40 text-left text-xs">
                {systemMetrics.disk && (
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-muted-foreground">VPS NVMe SSD</span>
                    <span className="font-medium text-emerald-500 font-mono">
                      {systemMetrics.disk.freeFormatted} Free <span className="text-muted-foreground font-normal">of {systemMetrics.disk.totalFormatted} ({systemMetrics.disk.percent}% used)</span>
                    </span>
                  </div>
                )}
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground">Processor</span>
                  <span className="font-medium text-foreground truncate max-w-[220px]" title={systemMetrics.cpu.model}>
                    {systemMetrics.cpu.model}
                  </span>
                </div>
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground">System Uptime</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-mono font-medium text-foreground">{systemMetrics.system.uptimeFormatted}</span>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground">Node.js Process Uptime</span>
                  <span className="font-mono font-medium text-foreground">{systemMetrics.process.uptimeFormatted}</span>
                </div>
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground">Process RSS / Heap</span>
                  <span className="font-mono font-medium text-foreground">
                    {systemMetrics.process.rss} / {systemMetrics.process.heapUsed}
                  </span>
                </div>
                <div className="p-2.5 flex items-center justify-between">
                  <span className="text-muted-foreground">Runtime Environment</span>
                  <span className="font-mono font-medium text-foreground">{systemMetrics.system.nodeVersion} (Port {lanUrl.split(':').pop()})</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 rounded-2xl gap-2 text-xs"
                  disabled={isRefreshingSystem}
                  onClick={() => fetchSystemInfo(true)}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingSystem ? 'animate-spin' : ''}`} />
                  {isRefreshingSystem ? 'Updating...' : 'Live Auto-Sync (1.2s)'}
                </Button>
                <Button
                  variant="default"
                  className="rounded-2xl px-6 text-xs font-semibold"
                  onClick={() => setIsSystemModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
           VISIONOS / CYBER-LUXURY CONFIRMATION ACTION MODAL (RADIX PORTAL z-[80])
           ======================================================== */}
      <DialogPrimitive.Root
        open={!!confirmModal?.isOpen}
        onOpenChange={(open) => {
          if (!open && !confirmModal?.isProcessing) {
            setConfirmModal(null);
          }
        }}
      >
        <DialogPrimitive.Portal>
          {/* Frosted VisionOS Scrim Backdrop strictly above Inspection Modal (z-[80]) */}
          <DialogPrimitive.Overlay
            className="fixed inset-0 z-[80] bg-black/40 dark:bg-black/60 backdrop-blur-md transition-all duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 pointer-events-auto"
          />

          {/* Clean Floating Action Card (No neon glare) */}
          <DialogPrimitive.Content
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] w-[92vw] max-w-sm sm:max-w-md rounded-[32px] border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden p-6 sm:p-7 text-center select-none duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 pointer-events-auto focus:outline-none"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Close Action Button */}
            <button
              type="button"
              disabled={confirmModal?.isProcessing}
              onClick={() => {
                if (!confirmModal?.isProcessing) {
                  setConfirmModal(null);
                }
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer shadow-xs active:scale-90 group z-20 pointer-events-auto disabled:opacity-40"
              title="Close (Esc)"
              aria-label="Close confirmation dialog"
            >
              <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90 text-foreground/70 group-hover:text-foreground" />
            </button>

            {/* Pull / Status Pill */}
            <div className="pb-2 flex justify-center">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Icon Capsule (Clean, no harsh neon shadow) */}
            <div
              className={cn(
                "w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 border transition-all duration-200 relative z-10",
                confirmModal?.variant === 'destructive'
                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  : confirmModal?.variant === 'warning'
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : "bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
              )}
            >
              {confirmModal?.icon === 'trash' && <Trash2 className="w-8 h-8" />}
              {confirmModal?.icon === 'alert' && <AlertTriangle className="w-8 h-8" />}
              {confirmModal?.icon === 'refresh' && <RefreshCw className={cn("w-8 h-8", confirmModal?.isProcessing && "animate-spin")} />}
              {confirmModal?.icon === 'sparkles' && <Sparkles className="w-8 h-8" />}
              {!confirmModal?.icon && <AlertTriangle className="w-8 h-8" />}
            </div>

            <DialogPrimitive.Title className="text-lg sm:text-xl font-bold text-foreground tracking-tight relative z-10">
              {confirmModal?.title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed px-1 relative z-10">
              {confirmModal?.description}
            </DialogPrimitive.Description>

            {/* Safe Storage Banner */}
            {confirmModal?.highlightText && (
              <div className="mt-4 mx-0.5 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] text-xs text-muted-foreground flex items-center gap-3 text-left relative z-10">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    confirmModal?.variant === 'destructive' ? "bg-rose-500" :
                      confirmModal?.variant === 'warning' ? "bg-amber-500" : "bg-cyan-500"
                  )}
                />
                <span className="leading-snug text-foreground/85 font-medium">{confirmModal.highlightText}</span>
              </div>
            )}

            {/* Action Buttons with Guaranteed Pointer Events */}
            <div className="mt-6 space-y-2.5 relative z-10 pointer-events-auto">
              <Button
                type="button"
                disabled={confirmModal?.isProcessing}
                className={cn(
                  "w-full h-12 rounded-2xl font-bold text-xs sm:text-sm tracking-wide text-white shadow-xs hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer pointer-events-auto",
                  confirmModal?.variant === 'destructive'
                    ? "bg-rose-600 hover:bg-rose-500"
                    : confirmModal?.variant === 'warning'
                      ? "bg-amber-600 hover:bg-amber-500"
                      : "bg-cyan-600 hover:bg-cyan-500"
                )}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirmModal) return;
                  try {
                    setConfirmModal(prev => prev ? { ...prev, isProcessing: true } : null);
                    await confirmModal.onConfirm();
                    setConfirmModal(null);
                  } catch {
                    setConfirmModal(prev => prev ? { ...prev, isProcessing: false } : null);
                  }
                }}
              >
                {confirmModal?.isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{confirmModal?.confirmLabel}</span>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={confirmModal?.isProcessing}
                className="w-full h-12 rounded-2xl font-semibold border border-black/[0.08] dark:border-white/[0.1] bg-white/40 dark:bg-white/[0.05] hover:bg-white/60 dark:hover:bg-white/[0.1] backdrop-blur-xl active:scale-[0.98] transition-all text-xs sm:text-sm text-muted-foreground hover:text-foreground cursor-pointer shadow-xs pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmModal(null);
                }}
              >
                {confirmModal?.cancelLabel || 'Cancel'}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* ========================================================
           DEV SUPER-ADMIN USER MANAGEMENT MODAL (RBAC)
           ======================================================== */}
      {currentUser?.role === 'DEV' && (
        <DevConsoleModal
          isOpen={isDevModalOpen}
          onClose={() => setIsDevModalOpen(false)}
          currentUser={currentUser}
        />
      )}

      {/* ========================================================
           CHANGE PASSWORD VIA BREVO OTP VERIFICATION MODAL
           ======================================================== */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentUser={currentUser}
      />

      {/* ========================================================
           REALTIME MESSENGER CHAT WIDGET (Zero Delay VPS Storage)
           ======================================================== */}
      {activeSection !== 'chat' && <RealtimeChatWidget currentUser={currentUser} />}
    </div>
  );
}
