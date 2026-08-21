'use client';

import type { User, UserRole } from './types';

const KEY = 'freightflow_auth_v1';

// Demo accounts — in production this would be a real auth provider (Clerk/Auth.js/etc)
const DEMO_USERS: User[] = [
  {
    id: 'u_admin',
    name: 'Andry Rakoto',
    email: 'andry@freightflow.mg',
    role: 'admin',
    avatarColor: 'from-brand to-indigo-600',
    initials: 'AR',
  },
  {
    id: 'u_ops',
    name: 'Voahangy R.',
    email: 'voahangy@freightflow.mg',
    role: 'operations',
    avatarColor: 'from-emerald-500 to-teal-600',
    initials: 'VR',
  },
  {
    id: 'u_sales',
    name: 'Hery Lalao',
    email: 'hery@freightflow.mg',
    role: 'sales',
    avatarColor: 'from-amber-500 to-orange-600',
    initials: 'HL',
  },
  {
    id: 'u_customs',
    name: 'Lina Ratsimba',
    email: 'lina@freightflow.mg',
    role: 'customs',
    avatarColor: 'from-violet-500 to-purple-600',
    initials: 'LR',
  },
  {
    id: 'u_driver',
    name: 'Rivo A.',
    email: 'rivo@freightflow.mg',
    role: 'driver',
    avatarColor: 'from-slate-500 to-slate-700',
    initials: 'RA',
  },
];

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrator',
  operations: 'Operations Manager',
  sales: 'Sales / Customer',
  customs: 'Customs Broker',
  driver: 'Truck Driver',
};

export const ROLE_HOMEPAGE: Record<UserRole, string> = {
  admin: '/',
  operations: '/',
  sales: '/quotes',
  customs: '/customs',
  driver: '/driver',
};

// Role-based permissions matrix
// Each entry = which pages/actions are visible to that role
export const PERMISSIONS: Record<UserRole, {
  viewDashboard: boolean;
  viewShipments: boolean;
  createShipment: boolean;
  editShipment: boolean;
  deleteShipment: boolean;
  bookCarrier: boolean;
  viewAir: boolean;
  viewSea: boolean;
  viewCustoms: boolean;
  editCustoms: boolean;
  viewTrucking: boolean;
  editTrucking: boolean;
  viewCustomers: boolean;
  editCustomers: boolean;
  viewQuotes: boolean;
  createQuote: boolean;
  convertQuote: boolean;
  viewInvoices: boolean;
  createInvoice: boolean;
  markInvoicePaid: boolean;
  viewReports: boolean;
  viewMap: boolean;
  viewBenchmark: boolean;
  sendEmails: boolean;
  manageUsers: boolean;
  classifyHs: boolean;
  generateDocs: boolean;
  viewWarehouse: boolean;
  viewDriverApp: boolean;
}> = {
  admin: {
    viewDashboard: true, viewShipments: true, createShipment: true, editShipment: true, deleteShipment: true,
    bookCarrier: true, viewAir: true, viewSea: true, viewCustoms: true, editCustoms: true,
    viewTrucking: true, editTrucking: true, viewCustomers: true, editCustomers: true,
    viewQuotes: true, createQuote: true, convertQuote: true, viewInvoices: true, createInvoice: true,
    markInvoicePaid: true, viewReports: true, viewMap: true, viewBenchmark: true,
    sendEmails: true, manageUsers: true, classifyHs: true, generateDocs: true, viewWarehouse: true, viewDriverApp: true,
  },
  operations: {
    viewDashboard: true, viewShipments: true, createShipment: true, editShipment: true, deleteShipment: false,
    bookCarrier: true, viewAir: true, viewSea: true, viewCustoms: true, editCustoms: true,
    viewTrucking: true, editTrucking: true, viewCustomers: true, editCustomers: false,
    viewQuotes: true, createQuote: false, convertQuote: true, viewInvoices: true, createInvoice: true,
    markInvoicePaid: false, viewReports: true, viewMap: true, viewBenchmark: true,
    sendEmails: true, manageUsers: false, classifyHs: true, generateDocs: true, viewWarehouse: true, viewDriverApp: true,
  },
  sales: {
    viewDashboard: true, viewShipments: true, createShipment: false, editShipment: false, deleteShipment: false,
    bookCarrier: false, viewAir: true, viewSea: true, viewCustoms: false, editCustoms: false,
    viewTrucking: false, editTrucking: false, viewCustomers: true, editCustomers: true,
    viewQuotes: true, createQuote: true, convertQuote: true, viewInvoices: true, createInvoice: false,
    markInvoicePaid: false, viewReports: true, viewMap: false, viewBenchmark: true,
    sendEmails: true, manageUsers: false, classifyHs: false, generateDocs: true, viewWarehouse: false, viewDriverApp: false,
  },
  customs: {
    viewDashboard: true, viewShipments: true, createShipment: false, editShipment: false, deleteShipment: false,
    bookCarrier: false, viewAir: true, viewSea: true, viewCustoms: true, editCustoms: true,
    viewTrucking: false, editTrucking: false, viewCustomers: true, editCustomers: false,
    viewQuotes: false, createQuote: false, convertQuote: false, viewInvoices: false, createInvoice: false,
    markInvoicePaid: false, viewReports: false, viewMap: false, viewBenchmark: false,
    sendEmails: false, manageUsers: false, classifyHs: true, generateDocs: true, viewWarehouse: true, viewDriverApp: false,
  },
  driver: {
    viewDashboard: false, viewShipments: false, createShipment: false, editShipment: false, deleteShipment: false,
    bookCarrier: false, viewAir: false, viewSea: false, viewCustoms: false, editCustoms: false,
    viewTrucking: true, editTrucking: true, viewCustomers: false, editCustomers: false,
    viewQuotes: false, createQuote: false, convertQuote: false, viewInvoices: false, createInvoice: false,
    markInvoicePaid: false, viewReports: false, viewMap: false, viewBenchmark: false,
    sendEmails: false, manageUsers: false, classifyHs: false, generateDocs: false, viewWarehouse: false, viewDriverApp: true,
  },
};

export function can(role: UserRole | undefined | null, action: keyof typeof PERMISSIONS['admin']): boolean {
  if (!role) return false;
  return PERMISSIONS[role][action] === true;
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return DEMO_USERS[0];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return DEMO_USERS.find((u) => u.id === data.userId) || null;
  } catch {
    return null;
  }
}

export function login(userId: string): User | null {
  const u = DEMO_USERS.find((x) => x.id === userId);
  if (!u) return null;
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify({ userId: u.id, loggedInAt: new Date().toISOString() }));
    try { window.dispatchEvent(new CustomEvent('ff:auth-changed')); } catch {}
  }
  return u;
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(KEY);
    try { window.dispatchEvent(new CustomEvent('ff:auth-changed')); } catch {}
  }
}

export function getAllUsers(): User[] {
  return DEMO_USERS;
}
