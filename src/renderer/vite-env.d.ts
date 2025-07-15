/// <reference types="vite/client" />

interface ElectronAPI {
  searchProducts: (query: string, imageData?: string) => Promise<any[]>;
  saveProduct: (product: any) => Promise<{ success: boolean; id?: number; error?: string }>;
  getChatHistory: () => Promise<any[]>;
  saveChat: (sessionData: any, message: any) => Promise<{ success: boolean; sessionId?: number; error?: string }>;
  saveDiscoverySetting: (percentage: 0 | 5 | 10) => Promise<{ success: boolean }>;
  getDiscoverySetting: () => Promise<0 | 5 | 10>;
  getAppVersion?: () => Promise<string>;
}

interface Window {
  electronAPI: ElectronAPI;
}
