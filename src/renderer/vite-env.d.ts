/// <reference types="vite/client" />

interface ElectronAPI {
  searchProducts: (query: string, imageData?: string) => Promise<any[]>;
  saveProduct: (product: any) => Promise<{ success: boolean; id?: number; error?: string }>;
  getProducts?: () => Promise<any[]>;
  removeProduct?: (productId: string) => Promise<{ success: boolean; error?: string }>;
  getChatHistory: () => Promise<any[]>;
  saveChat: (sessionData: any, message: any) => Promise<{ success: boolean; sessionId?: number; error?: string }>;
  saveDiscoverySetting: (percentage: 0 | 5 | 10) => Promise<{ success: boolean }>;
  getDiscoverySetting: () => Promise<0 | 5 | 10>;
  getAppVersion?: () => Promise<string>;
  openExternal?: (url: string) => Promise<{ success: boolean; error?: string }>;
  updateProduct?: (productId: string, updates: { customName?: string; tags?: string }) => Promise<{ success: boolean; error?: string }>;
  getDatabasePath?: () => Promise<{ success: boolean; path?: string; error?: string }>;
  changeDatabasePath?: () => Promise<{ success: boolean; message?: string; error?: string }>;
  resetDatabase?: () => Promise<{ success: boolean; error?: string }>;
  resetMLData?: () => Promise<{ success: boolean; error?: string }>;
  getAPIKeys?: () => Promise<{ success: boolean; keys?: Record<string, string>; error?: string }>;
  saveAPIKeys?: (keys: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  loadSampleData?: () => Promise<{ success: boolean; message?: string; error?: string }>;
}

interface Window {
  electronAPI: ElectronAPI;
}
