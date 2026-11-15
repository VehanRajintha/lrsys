'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SafeUser, UserRole, ROLE_CONFIGS } from '@/lib/authTypes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  ShieldAlert,
  UserPlus,
  Users,
  KeyRound,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mail,
  User,
  Shield,
  Server,
  Lock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Database,
  Send,
  X
} from 'lucide-react';

interface DevConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SafeUser | null;
}

export function DevConsoleModal({ isOpen, onClose, currentUser }: DevConsoleModalProps) {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'infra'>('users');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sub-dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<SafeUser | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('Customs@2026!');

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('APPRAISER');
  const [newPassword, setNewPassword] = useState('Customs@2026!');
  const [newDepartment, setNewDepartment] = useState('Entry Processing Unit');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          fullName: newFullName,
          email: newEmail,
          role: newRole,
          password: newPassword,
          department: newDepartment,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: 'success', text: `User ${data.user.username} created successfully!` });
        setIsAddOpen(false);
        // Reset form
        setNewUsername('');
        setNewFullName('');
        setNewEmail('');
        fetchUsers();
      } else {
        throw new Error(data.error || 'Failed to create user');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleToggleStatus = async (user: SafeUser) => {
    const newActive = !user.isActive;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newActive }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: `User ${user.username} is now ${newActive ? 'active' : 'suspended'}.`,
        });
        fetchUsers();
      } else {
        throw new Error(data.error || 'Failed to update user');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleExecuteResetPassword = async () => {
    if (!resetTargetUser) return;
    try {
      const res = await fetch(`/api/admin/users/${resetTargetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPasswordVal }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: `Password for ${resetTargetUser.username} reset to '${resetPasswordVal}'.`,
        });
        setResetTargetUser(null);
        fetchUsers();
      } else {
        throw new Error(data.error || 'Reset failed');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteUser = async (user: SafeUser) => {
    if (!confirm(`Are you sure you want to delete user '${user.username}'?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: 'success', text: `User ${user.username} deleted.` });
        fetchUsers();
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-background border shadow-xl rounded-xl">
        {/* Top Header Banner */}
        <div className="p-6 border-b bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                  Developer & Administrator Console
                  <Badge variant="outline" className="font-mono text-[10px]">
                    DEV ROOT
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Manage role credentials (IC, Appraiser, DDC, LRS, DEV) and infrastructure gateways.
                </DialogDescription>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="gap-1.5 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Role User</span>
            </Button>
          </div>

          {/* Status Message Banner */}
          {statusMessage && (
            <div
              className={`mt-4 p-3 rounded-md border text-xs flex items-center gap-2 animate-in fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-destructive/15 border-destructive/30 text-destructive'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Content Tabs (Standard Canonical shadcn/ui Tabs) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'users' | 'infra')} className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
              <TabsList className="grid grid-cols-2 w-full sm:w-[380px]">
                <TabsTrigger value="users" className="gap-2 text-xs">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Role Accounts ({users.length})</span>
                </TabsTrigger>
                <TabsTrigger value="infra" className="gap-2 text-xs">
                  <Server className="w-3.5 h-3.5 text-primary" />
                  <span>Infrastructure & Brevo</span>
                </TabsTrigger>
              </TabsList>

              {activeTab === 'users' && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search name, username, role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 text-xs w-60 rounded-md"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={fetchUsers}
                    className="h-9 w-9 rounded-md"
                    title="Refresh accounts"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              )}
            </div>

            {/* TAB 1: USERS TABLE */}
            <TabsContent value="users" className="space-y-4 m-0">
              <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold text-xs">User / Officer</TableHead>
                      <TableHead className="font-semibold text-xs">Username</TableHead>
                      <TableHead className="font-semibold text-xs">Role</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="font-semibold text-xs">Last Login</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                          {isLoading ? 'Loading accounts...' : 'No role accounts matched your query.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((u) => {
                        const roleCfg = ROLE_CONFIGS[u.role] || {
                          label: u.role,
                          badgeClass: 'bg-muted text-foreground',
                        };
                        const isSelf = currentUser?.id === u.id;

                        return (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-muted border flex items-center justify-center font-bold text-xs text-foreground shrink-0 overflow-hidden">
                                  {u.avatarUrl ? (
                                    <img src={u.avatarUrl} alt={u.fullName} className="w-full h-full object-cover" />
                                  ) : (
                                    u.fullName
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')
                                      .slice(0, 2)
                                      .toUpperCase()
                                  )}
                                </div>
                                <div className="truncate">
                                  <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                    <span className="truncate">{u.fullName}</span>
                                    {isSelf && (
                                      <Badge variant="secondary" className="text-[9px] py-0 px-1 font-mono">
                                        YOU
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="font-mono text-xs text-foreground">
                              @{u.username}
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline" className={`font-mono text-[10px] ${roleCfg.badgeClass}`}>
                                {u.role}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                disabled={isSelf}
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                                  u.isActive
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                    : 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20'
                                } ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={isSelf ? 'Cannot toggle yourself' : 'Click to toggle active/suspended'}
                              >
                                {u.isActive ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                                    Suspended
                                  </>
                                )}
                              </button>
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setResetTargetUser(u);
                                    setResetPasswordVal('Customs@2026!');
                                  }}
                                  className="h-7 px-2 text-[11px] gap-1"
                                  title="Reset password"
                                >
                                  <KeyRound className="w-3 h-3 text-amber-500" />
                                  <span>Reset</span>
                                </Button>

                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={isSelf}
                                  className="h-7 w-7 p-0"
                                  title={isSelf ? 'Cannot delete yourself' : 'Delete user'}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* TAB 2: INFRASTRUCTURE & BREVO GATEWAYS */}
            <TabsContent value="infra" className="space-y-4 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supabase Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-500" />
                        Supabase Cloud Database
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 font-mono">
                        SYNC READY
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Local persistent storage is active in <code className="text-foreground">data/users.json</code> and{' '}
                      <code className="text-foreground">data/records.json</code>. When you add your Supabase URL & Key into{' '}
                      <code className="text-foreground">.env</code>, all tables (<code className="text-emerald-500">app_users</code>,{' '}
                      <code className="text-emerald-500">cusdec_records</code>,{' '}
                      <code className="text-emerald-500">password_otps</code>) automatically sync.
                    </p>
                  </CardContent>
                </Card>

                {/* Brevo Email Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs flex items-center gap-2">
                        <Send className="w-4 h-4 text-sky-500" />
                        Brevo Transactional SMTP
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] text-sky-500 border-sky-500/30 font-mono">
                        OTP READY
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Brevo handles 2FA/Password Change OTP verification. When <code className="text-foreground">BREVO_API_KEY</code> is
                      configured, transactional emails are dispatched. In development mode, the OTP is previewed in console and UI
                      for instant verification.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Roles Architecture Overview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Customs Department Roles Hierarchy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                    {(['DEV', 'IC', 'APPRAISER', 'DDC', 'LRS'] as UserRole[]).map((r) => {
                      const cfg = ROLE_CONFIGS[r];
                      return (
                        <div key={r} className="p-2.5 rounded-lg border bg-muted/40 space-y-1">
                          <Badge variant="outline" className={`text-[10px] font-mono ${cfg.badgeClass}`}>
                            {r}
                          </Badge>
                          <div className="text-[11px] font-semibold text-foreground">{cfg.label}</div>
                          <p className="text-[10px] text-muted-foreground line-clamp-3">{cfg.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* CREATE USER SUB-DIALOG */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in">
            <div className="w-full max-w-md bg-background border rounded-xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground text-base">Create Department Account</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsAddOpen(false)}
                  className="h-8 w-8 rounded-md"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3.5">
                <div className="space-y-1">
                  <Label className="text-xs">Full Legal Name</Label>
                  <Input
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Ruwan Jayasuriya"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Official Customs Email</Label>
                  <Input
                    required
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="officer@customs.gov.lk"
                    className="text-xs h-9"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Username</Label>
                    <Input
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value.toLowerCase().trim())}
                      placeholder="r_jayasuriya"
                      className="text-xs h-9 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Department Role</Label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="APPRAISER">Appraiser</option>
                      <option value="IC">IC (Image Check)</option>
                      <option value="DDC">DDC (Deputy Director)</option>
                      <option value="LRS">LRS (Long Room)</option>
                      <option value="DEV">DEV (Administrator)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Division / Unit</Label>
                  <Input
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="Entry Processing Unit"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Initial Temporary Password</Label>
                  <Input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Customs@2026!"
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="text-xs"
                  >
                    Create Account
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RESET PASSWORD SUB-DIALOG */}
        {resetTargetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in">
            <div className="w-full max-w-sm bg-background border rounded-xl p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <h4 className="font-bold text-foreground text-sm">Force Password Reset</h4>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setResetTargetUser(null)}
                  className="h-7 w-7 rounded-md"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Set a new temporary password for <strong>{resetTargetUser.fullName}</strong> (@{resetTargetUser.username}).
              </p>

              <div className="space-y-1">
                <Label className="text-xs">New Password</Label>
                <Input
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResetTargetUser(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteResetPassword}
                  size="sm"
                  className="text-xs"
                >
                  Update Password
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
