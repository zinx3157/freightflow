'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { getAllUsers, ROLE_LABEL } from '@/lib/auth';
import { Button, Card, Badge } from './ui';
import { Plane, Ship, Truck, FileCheck, Shield, ArrowRight, KeyRound, User as UserIcon } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);

  const users = getAllUsers();

  const roleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'operations': return <Ship className="w-4 h-4" />;
      case 'sales': return <UserIcon className="w-4 h-4" />;
      case 'customs': return <FileCheck className="w-4 h-4" />;
      case 'driver': return <Truck className="w-4 h-4" />;
      default: return <UserIcon className="w-4 h-4" />;
    }
  };

  const roleColor = (role: string): any => {
    switch (role) {
      case 'admin': return 'violet';
      case 'operations': return 'blue';
      case 'sales': return 'amber';
      case 'customs': return 'indigo';
      case 'driver': return 'emerald';
      default: return 'slate';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-5xl grid md:grid-cols-5 gap-8 items-center">
        {/* Brand side */}
        <div className="md:col-span-2 text-slate-900 dark:text-white space-y-6 md:pr-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-brand to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
              <Ship className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">FreightFlow</h1>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Logistics Operations Suite</div>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            The modern <span className="text-brand">CargoWise alternative</span> for African & Indian Ocean freight forwarders.
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Air & sea bookings, customs clearance, trucking, e-docs, AI co-pilot — all in one.
            Sign in below to explore a pre-seeded demo workspace.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <FeatureBadge icon={<Plane className="w-4 h-4" />} label="Air freight MAWB/HAWB" />
            <FeatureBadge icon={<Ship className="w-4 h-4" />} label="Sea FCL/LCL + eBL" />
            <FeatureBadge icon={<FileCheck className="w-4 h-4" />} label="Customs clearance" />
            <FeatureBadge icon={<Truck className="w-4 h-4" />} label="Inland dispatch" />
          </div>
        </div>

        {/* Login card */}
        <Card className="md:col-span-3 p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-5 h-5 text-brand" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Sign in to your workspace</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Demo environment — choose a role to explore the permission-aware UI.
            No password required in demo mode.
          </p>
          <div className="space-y-3">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  selected === u.id
                    ? 'border-brand bg-brand/5 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
                }`}
              >
                <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${u.avatarColor} text-white font-semibold flex items-center justify-center shrink-0`}>
                  {u.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 dark:text-white">{u.name}</span>
                    <Badge color={roleColor(u.role) as any}>
                      {roleIcon(u.role)}
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{u.email}</div>
                </div>
                <ArrowRight className={`w-5 h-5 transition-all ${selected === u.id ? 'text-brand translate-x-0' : 'text-slate-300 dark:text-slate-600 -translate-x-2 opacity-0'}`} />
              </button>
            ))}
          </div>
          <Button
            size="lg"
            className="w-full mt-6"
            disabled={!selected}
            onClick={() => selected && login(selected)}
          >
            Enter FreightFlow <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
            In production this integrates with your SSO (Clerk / Auth0 / Azure AD). Roles are enforced server-side.
          </p>
        </Card>
      </div>
    </div>
  );
}

function FeatureBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 backdrop-blur px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
      <span className="text-brand">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}
