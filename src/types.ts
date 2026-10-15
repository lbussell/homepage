export type LinkCategory =
  | 'repo'
  | 'pulls'
  | 'issues'
  | 'discussions'
  | 'pipelines'
  | 'security'
  | 'boards'
  | 'docs'
  | 'releases'
  | 'custom';

export type LinkProvider = 'github' | 'azdo' | 'powerbi' | 'sharepoint' | 'other';

export interface RepoLink {
  id: string;
  category: LinkCategory;
  label: string;
  url: string;
  provider?: LinkProvider;
}

export interface RepoEntry {
  id: string;
  name: string;
  links: RepoLink[];
}

export interface RepoGroup {
  id: string;
  name: string;
  collapsed?: boolean;
  repos: RepoEntry[];
}

export type ViewMode = 'table' | 'grid';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface HomepageConfig {
  version: 1;
  viewMode: ViewMode;
  theme: ThemePreference;
  sidebarCollapsed: boolean;
  groups: RepoGroup[];
}

export interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkNode[];
}
