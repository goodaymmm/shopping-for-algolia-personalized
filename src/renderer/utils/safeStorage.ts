/**
 * Safe localStorage utility functions to prevent JSON parse errors
 */

/**
 * Safely parse JSON from localStorage with fallback
 * @param key - localStorage key
 * @param defaultValue - fallback value if parsing fails
 * @returns Parsed value or default value
 */
export function safeGetItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null || item === undefined || item === '') {
      return defaultValue;
    }
    
    // Try to parse the JSON
    const parsed = JSON.parse(item);
    return parsed;
  } catch (error) {
    console.warn(`Failed to parse localStorage key "${key}":`, error);
    
    // Clear corrupted data
    try {
      localStorage.removeItem(key);
      console.info(`Cleared corrupted localStorage key "${key}"`);
    } catch (clearError) {
      console.error(`Failed to clear localStorage key "${key}":`, clearError);
    }
    
    return defaultValue;
  }
}

/**
 * Safely set item in localStorage with JSON stringify
 * @param key - localStorage key
 * @param value - value to store
 * @returns Success status
 */
export function safeSetItem<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error(`Failed to save to localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Safely remove item from localStorage
 * @param key - localStorage key
 * @returns Success status
 */
export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Check if localStorage is available and working
 * @returns Availability status
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.error('localStorage is not available:', error);
    return false;
  }
}

/**
 * Clear all localStorage data (use with caution)
 */
export function clearAllStorage(): void {
  try {
    localStorage.clear();
    console.info('Cleared all localStorage data');
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}