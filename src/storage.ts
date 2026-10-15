import { getDefaultConfig } from './defaultConfig';
import { parseAndNormalizeConfig } from './repoHelpers';
import { HomepageConfig } from './types';

const STORAGE_KEY = 'homepage_config_v1';

function hasChromeStorage(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    Boolean(chrome.storage) &&
    Boolean(chrome.storage.local)
  );
}

export async function loadConfig(): Promise<HomepageConfig> {
  if (hasChromeStorage()) {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      if (result && result[STORAGE_KEY]) {
        return parseAndNormalizeConfig(result[STORAGE_KEY]);
      }
    } catch {
      // Fall back to localStorage or default
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return parseAndNormalizeConfig(raw);
    }
  } catch {
    // Ignore parse/storage error and return default
  }

  return getDefaultConfig();
}

export async function saveConfig(config: HomepageConfig): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore quota errors
  }

  if (hasChromeStorage()) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: config });
    } catch {
      // Ignore extension storage error
    }
  }
}

export function exportConfigJson(config: HomepageConfig): string {
  return JSON.stringify(config, null, 2);
}
