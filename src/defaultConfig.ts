import { HomepageConfig } from './types';

export function getDefaultConfig(): HomepageConfig {
  return {
    version: 1,
    viewMode: 'table',
    theme: 'system',
    sidebarCollapsed: false,
    groups: [],
  };
}
