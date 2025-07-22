import React, { useState, useEffect } from 'react';
import { ArrowLeft, Monitor, Moon, Sun, Type, Keyboard, Clock, Save, Database, Key, Trash2, RefreshCw, FolderOpen, FileText, Download, RotateCcw, Upload } from 'lucide-react';
import { AppSettings } from '../types';
import { Theme } from '../hooks/useTheme';

interface SettingsPanelProps {
  settings: AppSettings;
  onSettingsChange: (updates: Partial<AppSettings>) => void;
  onThemeChange: (theme: Theme) => void;
  onBack: () => void;
  isDark: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onThemeChange,
  onBack,
  isDark
}) => {
  const [databasePath, setDatabasePath] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [hasExistingApiKey, setHasExistingApiKey] = useState<boolean>(false);
  const [maskedApiKey, setMaskedApiKey] = useState<string>('');
  const [algoliaAppId, setAlgoliaAppId] = useState<string>('');
  const [algoliaSearchKey, setAlgoliaSearchKey] = useState<string>('');
  const [algoliaWriteKey, setAlgoliaWriteKey] = useState<string>('');
  const [hasExistingAlgoliaKeys, setHasExistingAlgoliaKeys] = useState<boolean>(false);
  const [maskedAlgoliaKeys, setMaskedAlgoliaKeys] = useState<{appId: string, searchKey: string, writeKey: string}>({appId: '', searchKey: '', writeKey: ''});
  const [isResetting, setIsResetting] = useState(false);
  const [apiSaveMessage, setApiSaveMessage] = useState<string>('');
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isLoadingSampleData, setIsLoadingSampleData] = useState(false);
  const [sampleDataMessage, setSampleDataMessage] = useState<string>('');
  const [logs, setLogs] = useState<string>('');
  const [logFilePath, setLogFilePath] = useState<string>('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Load current settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Get database path
        if (window.electronAPI?.getDatabasePath) {
          const result = await window.electronAPI.getDatabasePath();
          if (result.success && result.path) {
            setDatabasePath(result.path);
          }
        }
        
        // Get API keys (if available)
        if (window.electronAPI?.getAPIKeys) {
          const result = await window.electronAPI.getAPIKeys();
          if (result.success && result.keys) {
            // Gemini API Key
            if (result.keys.gemini) {
              setHasExistingApiKey(true);
              setMaskedApiKey(result.keys.gemini);
              setGeminiApiKey('');
            } else {
              setHasExistingApiKey(false);
              setMaskedApiKey('');
              setGeminiApiKey('');
            }
            
            // Algolia API Keys
            if (result.keys.algoliaAppId && result.keys.algoliaSearchKey && result.keys.algoliaWriteKey) {
              setHasExistingAlgoliaKeys(true);
              setMaskedAlgoliaKeys({
                appId: result.keys.algoliaAppId,
                searchKey: result.keys.algoliaSearchKey,
                writeKey: result.keys.algoliaWriteKey
              });
              setAlgoliaAppId('');
              setAlgoliaSearchKey('');
              setAlgoliaWriteKey('');
            } else {
              setHasExistingAlgoliaKeys(false);
              setMaskedAlgoliaKeys({appId: '', searchKey: '', writeKey: ''});
              setAlgoliaAppId('');
              setAlgoliaSearchKey('');
              setAlgoliaWriteKey('');
            }
          } else {
            setHasExistingApiKey(false);
            setMaskedApiKey('');
            setGeminiApiKey('');
            setHasExistingAlgoliaKeys(false);
            setMaskedAlgoliaKeys({appId: '', searchKey: '', writeKey: ''});
            setAlgoliaAppId('');
            setAlgoliaSearchKey('');
          }
        }

        // Get log file path
        if (window.electronAPI?.getLogFilePath) {
          const result = await window.electronAPI.getLogFilePath();
          if (result.success && result.path) {
            setLogFilePath(result.path);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleSaveApiKeys = async () => {
    try {
      const keysToSave: any = {};
      let hasNewKeys = false;

      // Gemini API key validation and preparation
      if (geminiApiKey.trim()) {
        // APIキーの基本的な検証（Geminiキーは通常AIzaSyで始まり、39文字）
        if (geminiApiKey.length < 35 || !geminiApiKey.startsWith('AIzaSy')) {
          setApiSaveMessage('Invalid Gemini API key format. Keys should start with "AIzaSy" and be approximately 39 characters long.');
          setTimeout(() => setApiSaveMessage(''), 5000);
          return;
        }
        keysToSave.gemini = geminiApiKey.trim();
        hasNewKeys = true;
      }

      // Algolia API keys validation and preparation
      if (algoliaAppId.trim() || algoliaSearchKey.trim() || algoliaWriteKey.trim()) {
        if (!algoliaAppId.trim() || !algoliaSearchKey.trim() || !algoliaWriteKey.trim()) {
          setApiSaveMessage('All three Algolia keys are required: Application ID, Search API Key, and Write API Key.');
          setTimeout(() => setApiSaveMessage(''), 3000);
          return;
        }
        
        // Basic validation for Algolia keys
        if (algoliaAppId.length < 8) {
          setApiSaveMessage('Invalid Algolia Application ID format. Should be at least 8 characters long.');
          setTimeout(() => setApiSaveMessage(''), 3000);
          return;
        }
        
        if (algoliaSearchKey.length < 20) {
          setApiSaveMessage('Invalid Algolia Search API Key format. Should be at least 20 characters long.');
          setTimeout(() => setApiSaveMessage(''), 3000);
          return;
        }
        
        if (algoliaWriteKey.length < 20) {
          setApiSaveMessage('Invalid Algolia Write API Key format. Should be at least 20 characters long.');
          setTimeout(() => setApiSaveMessage(''), 3000);
          return;
        }
        
        keysToSave.algoliaAppId = algoliaAppId.trim();
        keysToSave.algoliaSearchKey = algoliaSearchKey.trim();
        keysToSave.algoliaWriteKey = algoliaWriteKey.trim();
        hasNewKeys = true;
      }

      // Check if any new keys were provided
      if (!hasNewKeys) {
        if (hasExistingApiKey || hasExistingAlgoliaKeys) {
          setApiSaveMessage('API keys are already configured. Enter new keys to update.');
        } else {
          setApiSaveMessage('Please enter at least one API key to save.');
        }
        setTimeout(() => setApiSaveMessage(''), 3000);
        return;
      }

      if (window.electronAPI?.saveAPIKeys) {
        const result = await window.electronAPI.saveAPIKeys(keysToSave);
        if (result.success) {
          setApiSaveMessage('API keys saved successfully!');
          
          // Update UI state for saved keys
          if (keysToSave.gemini) {
            const newMaskedKey = `${geminiApiKey.substring(0, 4)}...${geminiApiKey.substring(geminiApiKey.length - 4)}`;
            setHasExistingApiKey(true);
            setMaskedApiKey(newMaskedKey);
            setGeminiApiKey('');
          }
          
          if (keysToSave.algoliaAppId && keysToSave.algoliaSearchKey && keysToSave.algoliaWriteKey) {
            const newMaskedAppId = `${algoliaAppId.substring(0, 4)}...${algoliaAppId.substring(algoliaAppId.length - 4)}`;
            const newMaskedSearchKey = `${algoliaSearchKey.substring(0, 4)}...${algoliaSearchKey.substring(algoliaSearchKey.length - 4)}`;
            const newMaskedWriteKey = `${algoliaWriteKey.substring(0, 4)}...${algoliaWriteKey.substring(algoliaWriteKey.length - 4)}`;
            setHasExistingAlgoliaKeys(true);
            setMaskedAlgoliaKeys({
              appId: newMaskedAppId,
              searchKey: newMaskedSearchKey,
              writeKey: newMaskedWriteKey
            });
            setAlgoliaAppId('');
            setAlgoliaSearchKey('');
            setAlgoliaWriteKey('');
          }
          
          setTimeout(() => setApiSaveMessage(''), 3000);
        } else {
          setApiSaveMessage(result.error || 'Failed to save API keys');
          setTimeout(() => setApiSaveMessage(''), 3000);
        }
      }
    } catch (error) {
      console.error('Failed to save API keys:', error);
      setApiSaveMessage('Failed to save API keys: ' + (error as Error).message);
      setTimeout(() => setApiSaveMessage(''), 3000);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('Are you sure you want to reset the database? This will delete all saved products and chat history.')) {
      return;
    }
    
    setIsResetting(true);
    try {
      if (window.electronAPI?.resetDatabase) {
        await window.electronAPI.resetDatabase();
        console.log('Database reset successfully');
      }
    } catch (error) {
      console.error('Failed to reset database:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetMLData = async () => {
    if (!confirm('Are you sure you want to reset ML training data? This will delete all personalization data.')) {
      return;
    }
    
    try {
      if (window.electronAPI?.resetMLData) {
        await window.electronAPI.resetMLData();
        console.log('ML data reset successfully');
      }
    } catch (error) {
      console.error('Failed to reset ML data:', error);
    }
  };

  const handleChangeDatabasePath = async () => {
    try {
      if (window.electronAPI?.changeDatabasePath) {
        const result = await window.electronAPI.changeDatabasePath();
        if (result.success && result.message) {
          alert(result.message);
          // Reload the app to use the new database location
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Failed to change database path:', error);
    }
  };

  const handleLoadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      if (window.electronAPI?.getLogs) {
        const result = await window.electronAPI.getLogs();
        if (result.success) {
          setLogs(result.logs || '');
        } else {
          setLogs('Failed to load logs: ' + (result.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      setLogs('Error loading logs: ' + (error as Error).message);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      return;
    }
    
    try {
      if (window.electronAPI?.clearLogs) {
        const result = await window.electronAPI.clearLogs();
        if (result.success) {
          setLogs('');
          alert('Logs cleared successfully');
        }
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const handleCleanupAPIKeys = async () => {
    if (!confirm('Are you sure you want to cleanup duplicate API keys? This will remove old duplicate entries and keep only the latest ones.')) {
      return;
    }
    
    setIsCleaningUp(true);
    try {
      if (window.electronAPI?.cleanupAPIKeys) {
        const result = await window.electronAPI.cleanupAPIKeys();
        if (result.success) {
          setApiSaveMessage('API key cleanup completed successfully!');
          // 設定を再読み込み
          const settingsResult = await window.electronAPI.getAPIKeys();
          if (settingsResult.success && settingsResult.keys) {
            // Gemini API Key
            if (settingsResult.keys.gemini) {
              setHasExistingApiKey(true);
              setMaskedApiKey(settingsResult.keys.gemini);
              setGeminiApiKey('');
            } else {
              setHasExistingApiKey(false);
              setMaskedApiKey('');
              setGeminiApiKey('');
            }
            
            // Algolia API Keys
            if (settingsResult.keys.algoliaAppId && settingsResult.keys.algoliaSearchKey && settingsResult.keys.algoliaWriteKey) {
              setHasExistingAlgoliaKeys(true);
              setMaskedAlgoliaKeys({
                appId: settingsResult.keys.algoliaAppId,
                searchKey: settingsResult.keys.algoliaSearchKey,
                writeKey: settingsResult.keys.algoliaWriteKey
              });
              setAlgoliaAppId('');
              setAlgoliaSearchKey('');
              setAlgoliaWriteKey('');
            } else {
              setHasExistingAlgoliaKeys(false);
              setMaskedAlgoliaKeys({appId: '', searchKey: '', writeKey: ''});
              setAlgoliaAppId('');
              setAlgoliaSearchKey('');
              setAlgoliaWriteKey('');
            }
          } else {
            setHasExistingApiKey(false);
            setMaskedApiKey('');
            setGeminiApiKey('');
            setHasExistingAlgoliaKeys(false);
            setMaskedAlgoliaKeys({appId: '', searchKey: '', writeKey: ''});
            setAlgoliaAppId('');
            setAlgoliaSearchKey('');
          }
          setTimeout(() => setApiSaveMessage(''), 3000);
        } else {
          setApiSaveMessage('Failed to cleanup API keys: ' + (result.message || 'Unknown error'));
          setTimeout(() => setApiSaveMessage(''), 3000);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup API keys:', error);
      setApiSaveMessage('Failed to cleanup API keys: ' + (error as Error).message);
      setTimeout(() => setApiSaveMessage(''), 3000);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleDebugAPIKeys = async () => {
    try {
      if (window.electronAPI?.debugAPIKeys) {
        const result = await window.electronAPI.debugAPIKeys();
        if (result.success && result.debugInfo) {
          const debugText = result.debugInfo.map((info: any) => 
            `Entry ${info.index}: Provider=${info.provider}, Length=${info.keyLength}, Preview=${info.keyPreview}, Created=${info.createdAt}`
          ).join('\n');
          setDebugInfo(debugText);
          console.log('Debug API Keys Result:', result.debugInfo);
        } else {
          setDebugInfo('Failed to get debug info: ' + (result.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Failed to debug API keys:', error);
      setDebugInfo('Error: ' + (error as Error).message);
    }
  };

  const handleLoadSampleData = async () => {
    setIsLoadingSampleData(true);
    setSampleDataMessage('');
    
    try {
      if (window.electronAPI?.loadSampleData) {
        const result = await window.electronAPI.loadSampleData();
        if (result.success) {
          setSampleDataMessage('Sample data loaded successfully! You can now search for products.');
        } else {
          setSampleDataMessage('Failed to load sample data: ' + (result.error || 'Unknown error'));
        }
      } else {
        setSampleDataMessage('Sample data loading not available');
      }
    } catch (error) {
      console.error('Failed to load sample data:', error);
      setSampleDataMessage('Error loading sample data: ' + (error as Error).message);
    } finally {
      setIsLoadingSampleData(false);
      setTimeout(() => setSampleDataMessage(''), 5000);
    }
  };

  const handleDeleteCorruptedKeys = async () => {
    if (!confirm('Are you sure you want to delete ALL corrupted API keys? This will remove any keys that are too short or have invalid format.')) {
      return;
    }
    
    try {
      if (window.electronAPI?.deleteCorruptedAPIKeys) {
        const result = await window.electronAPI.deleteCorruptedAPIKeys();
        if (result.success) {
          setApiSaveMessage(`Successfully deleted ${result.deletedCount || 0} corrupted API key entries!`);
          // デバッグ情報を更新
          handleDebugAPIKeys();
          // 設定を再読み込み
          const settingsResult = await window.electronAPI.getAPIKeys();
          if (settingsResult.success && settingsResult.keys) {
            // Gemini API Key
            if (settingsResult.keys.gemini) {
              setHasExistingApiKey(true);
              setMaskedApiKey(settingsResult.keys.gemini);
              setGeminiApiKey('');
            } else {
              setHasExistingApiKey(false);
              setMaskedApiKey('');
              setGeminiApiKey('');
            }
            
            // Algolia API Keys
            if (settingsResult.keys.algoliaAppId && settingsResult.keys.algoliaSearchKey && settingsResult.keys.algoliaWriteKey) {
              setHasExistingAlgoliaKeys(true);
              setMaskedAlgoliaKeys({
                appId: settingsResult.keys.algoliaAppId,
                searchKey: settingsResult.keys.algoliaSearchKey,
                writeKey: settingsResult.keys.algoliaWriteKey
              });
              setAlgoliaAppId('');
              setAlgoliaSearchKey('');
              setAlgoliaWriteKey('');
            } else {
              setHasExistingAlgoliaKeys(false);
              setMaskedAlgoliaKeys({appId: '', searchKey: '', writeKey: ''});
              setAlgoliaAppId('');
              setAlgoliaSearchKey('');
              setAlgoliaWriteKey('');
            }
          } else {
            setHasExistingApiKey(false);
            setMaskedApiKey('');
            setGeminiApiKey('');
            setHasExistingAlgoliaKeys(false);
            setMaskedAlgoliaKeys({appId: '', searchKey: '', writeKey: ''});
            setAlgoliaAppId('');
            setAlgoliaSearchKey('');
          }
          setTimeout(() => setApiSaveMessage(''), 3000);
        } else {
          setApiSaveMessage('Failed to delete corrupted keys: ' + (result.error || 'Unknown error'));
          setTimeout(() => setApiSaveMessage(''), 3000);
        }
      }
    } catch (error) {
      console.error('Failed to delete corrupted API keys:', error);
      setApiSaveMessage('Failed to delete corrupted keys: ' + (error as Error).message);
      setTimeout(() => setApiSaveMessage(''), 3000);
    }
  };
  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="border-b px-6 py-4 border-gray-200 dark:border-slate-700/50">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-slate-800/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Settings
          </h1>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Appearance */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Monitor className="w-5 h-5" />
            Appearance
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => onThemeChange(value as Theme)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all shadow-sm hover:shadow-md ${
                      settings.theme === value
                        ? 'bg-gradient-to-r from-blue-500 to-blue-400 border-blue-400 text-white shadow-md'
                        : 'bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-slate-500 backdrop-blur-sm'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Chat Behavior */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Keyboard className="w-5 h-5" />
            Chat Behavior
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border shadow-sm bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 backdrop-blur-sm">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  Send on Enter
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Press Enter to send messages (Cmd/Ctrl+Enter for new line)
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.sendOnEnter}
                  onChange={(e) => onSettingsChange({ sendOnEnter: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border shadow-sm bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 backdrop-blur-sm">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  Show Timestamps
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Display message timestamps in chat
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showTimestamps}
                  onChange={(e) => onSettingsChange({ showTimestamps: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Data */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Save className="w-5 h-5" />
            Data
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border shadow-sm bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 backdrop-blur-sm">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  Auto-save Chats
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Automatically save chat history locally
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => onSettingsChange({ autoSave: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Database Settings */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Database className="w-5 h-5" />
            Database
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 rounded-xl border shadow-sm bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Database Location
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {databasePath || 'Not available'}
                  </div>
                </div>
                <button
                  onClick={handleChangeDatabasePath}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  Change
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleResetDatabase}
                disabled={isResetting}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white transition-colors"
              >
                {isResetting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Reset Database
              </button>
              
              <button
                onClick={handleResetMLData}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reset ML Data
              </button>
            </div>
          </div>
        </section>

        {/* API Keys */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <Key className="w-5 h-5" />
            API Configuration
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Gemini API Key
              </label>
              
              {hasExistingApiKey && (
                <div className="mb-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-800 dark:text-green-200">
                        ✓ API key configured: {maskedApiKey}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setHasExistingApiKey(false);
                        setMaskedApiKey('');
                        setGeminiApiKey('');
                      }}
                      className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 underline"
                    >
                      Clear & Replace
                    </button>
                  </div>
                </div>
              )}
              
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder={hasExistingApiKey ? "Enter new API key to update" : "Enter your Gemini API key"}
                className="w-full p-3 rounded-xl border transition-all shadow-sm focus:shadow-md bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {hasExistingApiKey 
                  ? "Leave empty to keep current key, or enter a new key to update. Get your API key from Google AI Studio."
                  : "Required for image analysis and AI features. Get your free API key from Google AI Studio (makersuite.google.com)."
                }
              </p>
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Algolia Search Configuration
              </label>
              
              {hasExistingAlgoliaKeys && (
                <div className="mb-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-800 dark:text-green-200">
                        ✓ Algolia keys configured: App ID: {maskedAlgoliaKeys.appId}, Search Key: {maskedAlgoliaKeys.searchKey}, Write Key: {maskedAlgoliaKeys.writeKey}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setHasExistingAlgoliaKeys(false);
                        setMaskedAlgoliaKeys({appId: '', searchKey: '', writeKey: ''});
                        setAlgoliaAppId('');
                        setAlgoliaSearchKey('');
                        setAlgoliaWriteKey('');
                      }}
                      className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 underline"
                    >
                      Clear & Replace
                    </button>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                    Application ID *
                  </label>
                  <input
                    type="text"
                    value={algoliaAppId}
                    onChange={(e) => setAlgoliaAppId(e.target.value)}
                    placeholder={hasExistingAlgoliaKeys ? "Enter new App ID to update" : "Enter Algolia Application ID"}
                    className="w-full p-3 rounded-xl border transition-all shadow-sm focus:shadow-md bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                    Search API Key *
                  </label>
                  <input
                    type="password"
                    value={algoliaSearchKey}
                    onChange={(e) => setAlgoliaSearchKey(e.target.value)}
                    placeholder={hasExistingAlgoliaKeys ? "Enter new Search Key to update" : "Enter Search API Key"}
                    className="w-full p-3 rounded-xl border transition-all shadow-sm focus:shadow-md bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                    Write API Key *
                  </label>
                  <input
                    type="password"
                    value={algoliaWriteKey}
                    onChange={(e) => setAlgoliaWriteKey(e.target.value)}
                    placeholder={hasExistingAlgoliaKeys ? "Enter new Write Key to update" : "Enter Write API Key"}
                    className="w-full p-3 rounded-xl border transition-all shadow-sm focus:shadow-md bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {hasExistingAlgoliaKeys 
                  ? "Leave empty to keep current keys, or enter all three keys to update. All three keys are required for full functionality."
                  : "All three keys are required for product search and index creation. Get your API keys from your Algolia Dashboard (algolia.com)."
                }
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={handleSaveApiKeys}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save API Keys
                </button>
                
                <button
                  onClick={handleCleanupAPIKeys}
                  disabled={isCleaningUp}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white transition-colors"
                >
                  {isCleaningUp ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Cleanup Database
                </button>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDebugAPIKeys}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white transition-colors text-sm"
                >
                  <Type className="w-4 h-4" />
                  Debug Database
                </button>
                
                <button
                  onClick={handleDeleteCorruptedKeys}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Corrupted
                </button>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={handleLoadSampleData}
                  disabled={isLoadingSampleData || !hasExistingAlgoliaKeys}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white transition-colors w-full"
                >
                  {isLoadingSampleData ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isLoadingSampleData ? 'Loading Sample Data...' : 'Load Sample Data into Algolia'}
                </button>
                {!hasExistingAlgoliaKeys && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Please configure Algolia API keys first before loading sample data.
                  </p>
                )}
              </div>
            </div>
            
            {sampleDataMessage && (
              <div className={`p-3 rounded-xl text-sm font-medium transition-all ${
                sampleDataMessage.includes('success') 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
              }`}>
                {sampleDataMessage}
              </div>
            )}
            
            {apiSaveMessage && (
              <div className={`p-3 rounded-xl text-sm font-medium transition-all ${
                apiSaveMessage.includes('success') 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' 
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
              }`}>
                {apiSaveMessage}
              </div>
            )}
            
            {debugInfo && (
              <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  Database Debug Information:
                </div>
                <pre className="text-xs text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap font-mono bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded">
                  {debugInfo}
                </pre>
              </div>
            )}
          </div>
        </section>

        {/* Logs */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <FileText className="w-5 h-5" />
            Application Logs
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 rounded-xl border shadow-sm bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Log File
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {logFilePath || 'Log file path not available'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleLoadLogs}
                    disabled={isLoadingLogs}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white transition-colors"
                  >
                    {isLoadingLogs ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Load Logs
                  </button>
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Clear Logs
                  </button>
                </div>
              </div>
              
              {logs && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Log Contents:
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                      {logs}
                    </pre>
                  </div>
                </div>
              )}
              
              {!logs && (
                <div className="mt-4 p-3 rounded-lg bg-gray-100 dark:bg-slate-800 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click "Load Logs" to view application logs
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Debug Mode:</strong> Logs include detailed information about Gemini API calls, database operations, and error details for troubleshooting.
              </p>
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            About
          </h2>
          <div className="p-4 rounded-xl border shadow-sm bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 backdrop-blur-sm">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Shopping AI v1.0.0
              <br />
              Powered by Algolia Search • Built with React, TypeScript, and Tailwind CSS
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};