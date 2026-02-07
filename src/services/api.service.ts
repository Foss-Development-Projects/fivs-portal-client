import { User, Lead, Transaction, PayoutReport, ProfitReport, Ticket, Banner, UserRole, UserStatus, KYCStatus, Notification, AutoFetchRecord, AdminPayoutRecord } from '@/types';
import { createWorker } from 'tesseract.js';
// import { GoogleGenAI } from "@google/genai";

/**
 * Cloud API Service
 * Routes data operations to PHP backend.
 */

// const rootURL = 'http://localhost:3000';

// Hybrid API Caller
export const ROOT_URL = import.meta.env.VITE_ROOT_URL || '';

const callApi = async (path: string, method = 'GET', body?: any) => {
  try {
    const token = localStorage.getItem('fivs_auth_token');
    const headers: any = {};
    const isFormData = body instanceof FormData || (body && typeof body.append === 'function');

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Auth-Token'] = token; // Redundant header to bypass aggressive WAF/stripping
    }

    // 1. Attempt Network Call
    const fetchUrl = `${ROOT_URL}/api/${path}`;
    const response = await fetch(fetchUrl, {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined)
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
    const data = await callApi('auth/login', 'POST', { email, password });
    if (data.token) {
      localStorage.setItem('fivs_auth_token', data.token);
    }
    return data.user;
  },

  checkSession: async (): Promise<void> => {
    await callApi('auth/status');
  },

  register: async (userData: any): Promise<User> => {
    const id = `P${Date.now()}`;
    const newUser = { ...userData, id, status: UserStatus.PENDING, kycStatus: KYCStatus.NOT_SUBMITTED, leadSubmissionEnabled: true, kycDocuments: [] };
    return await callApi('auth/register', 'POST', newUser);
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
    return true;
  },

  extractDocumentData: async (dataUrl: string, type: string): Promise<any> => {
    try {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(dataUrl);
      await worker.terminate();

      const text = ret.data.text;
      const result: any = {};

      if (type === 'pan') {
        const panMatch = text.match(/[A-Z]{5}[0-9]{4}[A-Z]/);
        if (panMatch) result.panNo = panMatch[0];

        const dobMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (dobMatch) {
          const [day, month, year] = dobMatch[0].split('/');
          result.dob = `${year}-${month}-${day}`;
        }
      } else if (type === 'aadhaar') {
        // Aadhaar: 12 digits, often XXXX XXXX XXXX
        const aadhaarMatch = text.match(/\d{4}\s\d{4}\s\d{4}/);
        if (aadhaarMatch) result.aadhaarNo = aadhaarMatch[0];
        else {
          // Try continuous
          const aadhaarCont = text.match(/\d{12}/);
          if (aadhaarCont) result.aadhaarNo = aadhaarCont[0].replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
        }
      } else if (type === 'rc') {
        // RC: Matches standard configurations
        const regNoMatch = text.match(/[A-Z]{2}\s?[0-9]{1,2}\s?[A-Z]{1,3}\s?[0-9]{4}/);
        if (regNoMatch) result.vehicleRegNo = regNoMatch[0].replace(/\s/g, '');

        const chassisMatch = text.match(/(?:Chassis\s*No\.?|VIN)\s*[:\-\.]?\s*([A-Z0-9]+)/i);
        if (chassisMatch) result.chassisNo = chassisMatch[1];

        const engineMatch = text.match(/Engine\s*No\.?\s*[:\-\.]?\s*([A-Z0-9]+)/i);
        if (engineMatch) result.engineNo = engineMatch[1];

        const nameMatch = text.match(/Name\s*[:\-\.]?\s*([A-Za-z\s\.]+)(?:\r?\n|$)/i);
        if (nameMatch) result.ownerName = nameMatch[1].trim();
      } else if (type === 'policy') {
        const policyMatch = text.match(/(?:Policy\s*No\.?|Pol\s*No\.?)\s*[:\-\.]?\s*([A-Z0-9\-\/]+)/i);
        if (policyMatch) result.policyNo = policyMatch[1];

        // Try to guess insurer
        const insurers = ['HDFC', 'ICICI', 'Bajaj', 'Digit', 'Acko', 'TATA', 'Reliance', 'SBI', 'United', 'New India', 'Oriental'];
        const foundInsurer = insurers.find(i => text.toLowerCase().includes(i.toLowerCase()));
        if (foundInsurer) result.insuranceCompany = foundInsurer;
      }

      return result;
    } catch (err) {
      console.error("OCR Extraction Failed:", err);
      // Fallback: return empty, allow manual entry
      return {};
    }
  }
};
