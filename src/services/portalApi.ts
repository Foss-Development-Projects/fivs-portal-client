import { User, Lead, Transaction, PayoutReport, ProfitReport, Ticket, Banner, UserRole, UserStatus, KYCStatus, Notification, AutoFetchRecord, AdminPayoutRecord } from '@/types';
// import { GoogleGenAI } from "@google/genai";

/**
 * Cloud API Service
 * Routes data operations to PHP backend.
 */

// const rootURL = 'http://localhost:3000';

// Hybrid API Caller
const callApi = async (path: string, method = 'GET', body?: any) => {
  try {
    const token = localStorage.getItem('fivs_auth_token');
    const headers: any = {};
    if (!(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Auth-Token'] = token; // Redundant header to bypass aggressive WAF/stripping
    }

    // 1. Attempt Network Call
    const response = await fetch(`/api/${path}`, {
      method,
      headers,
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined)
    });

    if (response.status === 401 || response.status === 403) {
      // Token invalid, session expired, or forbidden access
      localStorage.removeItem('fivs_auth_token');
      localStorage.removeItem('fivs_session_user');
      window.location.reload();
      throw new Error("Session Expired or Access Denied");
    }

    if (response.ok) {
      return method === 'DELETE' ? null : response.json();
    }

    // If 404/500, throw to trigger catch block
    if (!response.ok) {
      let errorMessage = `Server Error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
        if (errorData.details) errorMessage += ` (${errorData.details})`;
      } catch (e) {
        // Ignore json parse error
      }
      throw new Error(errorMessage);
    }

    return method === 'DELETE' ? null : response.json();

  } catch (err: any) {
    console.error("API Call Failed:", err);
    throw err; // Propagate error directly, NO MOCK FALLBACK
  }
};

const API_KEY_STORAGE_KEY = 'fivs_custom_api_key';

const getApiKey = () => {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || process.env.API_KEY;
};

export const portalApi = {
  isConfigured: () => !!getApiKey(),

  // --- AUTHENTICATION ---
  login: async (email: string, password?: string): Promise<User> => {
    // SECURITY UPDATE: Use Server-Side Validation
    try {
      const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Login failed');
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('fivs_auth_token', data.token);
      }
      return data.user;
    } catch (e: any) {
      console.error('Login Error:', e);
      throw new Error(e.message || 'Invalid credentials');
    }
  },

  checkSession: async (): Promise<void> => {
    await callApi('auth/status');
  },

  register: async (userData: any): Promise<User> => {
    const id = `P${Date.now()}`;
    const newUser = { ...userData, id, status: UserStatus.PENDING, kycStatus: KYCStatus.NOT_SUBMITTED, leadSubmissionEnabled: true, kycDocuments: [] };

    const response = await fetch(`/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });

    if (!response.ok) {
      throw new Error("Registration Failed");
    }
    return await response.json();
  },

  // --- DATA OPERATIONS ---
  getUsers: () => callApi('users'),
  updateUser: (id: string, updates: Partial<User>) => callApi('users', 'POST', { id, ...updates }),

  getLeads: () => callApi('leads'),
  addLead: (lead: any) => callApi('leads', 'POST', { ...lead, id: `L${Date.now()}`, submittedAt: new Date().toISOString() }),
  updateLead: (id: string, updates: Partial<Lead>) => callApi('leads', 'POST', { id, ...updates }),

  getTransactions: () => callApi('transactions'),
  addTransaction: (tx: any) => callApi('transactions', 'POST', { ...tx, id: `TX${Date.now()}` }),

  getPayoutReports: () => callApi('payout_reports'),
  savePayoutReport: (report: any) => callApi('payout_reports', 'POST', { ...report, id: `PR${Date.now()}` }),

  getProfitReports: () => callApi('profit_reports'),
  saveProfitReport: (report: any) => callApi('profit_reports', 'POST', { ...report, id: `PROF${Date.now()}` }),

  getTickets: () => callApi('tickets'),
  addTicket: (ticket: any) => callApi('tickets', 'POST', { ...ticket, id: `TK${Date.now()}`, createdAt: new Date().toISOString(), status: 'open' }),
  updateTicket: (id: string, updates: Partial<Ticket>) => callApi('tickets', 'POST', { id, ...updates }),

  getBanners: () => callApi('banners'),
  updateBanner: (id: string, updates: Partial<Banner>) => callApi('banners', 'POST', { id, ...updates }),

  getNotifications: () => callApi('notifications'),
  addNotification: (notif: any) => callApi('notifications', 'POST', { ...notif, id: `N${Date.now()}`, createdAt: new Date().toISOString(), readBy: [] }),
  updateNotification: (id: string, updates: Partial<Notification>) => callApi('notifications', 'POST', { id, ...updates }),

  getAutoFetchRecords: () => callApi('autofetch_records'),
  saveAutoFetchRecord: (rec: any) => callApi('autofetch_records', 'POST', rec),
  deleteAutoFetchRecord: (id: string) => callApi(`autofetch_records/${id}`, 'DELETE'),

  getAdminPayoutRecords: () => callApi('admin_payout_records'),
  saveAdminPayoutRecord: (rec: any) => callApi('admin_payout_records', 'POST', rec),
  deleteAdminPayoutRecord: (id: string) => callApi(`admin_payout_records/${id}`, 'DELETE'),

  exportDatabase: async (): Promise<string> => {
    const collections = ['users', 'leads', 'transactions', 'tickets', 'banners', 'notifications', 'autofetch_records', 'admin_payout_records', 'payout_reports', 'profit_reports'];
    const dbData: any = {};
    for (const coll of collections) {
      dbData[coll] = await callApi(coll);
    }
    return JSON.stringify(dbData);
  },

  importDatabase: async (json: string): Promise<void> => {
    const dbData = JSON.parse(json);
    for (const coll in dbData) {
      const items = dbData[coll];
      if (Array.isArray(items)) {
        for (const item of items) {
          await callApi(coll, 'POST', item);
        }
      }
    }
  },

  validateApiKey: async (key: string): Promise<boolean> => {
    console.warn("AI System Disabled");
    return true;
  },

  extractDocumentData: async (dataUrl: string, type: string): Promise<any> => {
    console.warn("AI Extraction Disabled - Manual Entry Mode");
    return {};
  }
};
