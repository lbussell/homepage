import {
  HomepageConfig,
  LinkCategory,
  LinkProvider,
  RepoEntry,
  RepoGroup,
  RepoLink,
  ThemePreference,
  ViewMode,
} from './types';

export const LINK_CATEGORIES: { value: LinkCategory; label: string; shortLabel: string }[] = [
  { value: 'repo', label: 'Repository / Mirror', shortLabel: 'Repos' },
  { value: 'pulls', label: 'Pull Requests', shortLabel: 'Pulls' },
  { value: 'issues', label: 'Issues', shortLabel: 'Issues' },
  { value: 'discussions', label: 'Discussions', shortLabel: 'Discussions' },
  { value: 'pipelines', label: 'Pipelines / CI', shortLabel: 'Pipelines' },
  { value: 'security', label: 'Security & Compliance', shortLabel: 'Security' },
  { value: 'boards', label: 'Boards & Projects', shortLabel: 'Boards' },
  { value: 'docs', label: 'Docs, Wiki & Reports', shortLabel: 'Docs' },
  { value: 'releases', label: 'Releases & Packages', shortLabel: 'Releases' },
  { value: 'custom', label: 'Other / Custom', shortLabel: 'Links' },
];

const VALID_CATEGORIES = new Set<LinkCategory>(LINK_CATEGORIES.map((c) => c.value));

let idCounter = 0;
export function createId(prefix = 'item'): string {
  idCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${idCounter}-${rand}`;
}

export function detectProvider(url: string): LinkProvider {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === 'github.com' || host.endsWith('.github.com')) {
      return 'github';
    }
    if (
      host === 'dev.azure.com' ||
      host.endsWith('.visualstudio.com') ||
      host.endsWith('.azure.com')
    ) {
      return 'azdo';
    }
    if (host.includes('powerbi.com')) {
      return 'powerbi';
    }
    if (host.includes('sharepoint.com')) {
      return 'sharepoint';
    }
  } catch {
    // Fallback for malformed or partial URLs
  }
  return 'other';
}

export function inferCategoryFromUrl(url: string, label = ''): LinkCategory {
  const lowerUrl = url.toLowerCase();
  const lowerLabel = label.toLowerCase();

  if (
    lowerUrl.includes('/pulls') ||
    lowerUrl.includes('/pullrequests') ||
    lowerUrl.includes('is%3apr') ||
    lowerUrl.includes('is:pr') ||
    lowerLabel.includes('pull') ||
    lowerLabel === 'prs'
  ) {
    return 'pulls';
  }
  if (
    lowerUrl.includes('/discussions') ||
    lowerLabel.includes('discussion')
  ) {
    return 'discussions';
  }
  if (
    lowerUrl.includes('/_build') ||
    lowerUrl.includes('/actions') ||
    lowerUrl.includes('/pipelines') ||
    lowerLabel.includes('pipeline') ||
    lowerLabel === 'public' ||
    lowerLabel === 'internal'
  ) {
    return 'pipelines';
  }
  if (
    lowerUrl.includes('_componentgovernance') ||
    lowerUrl.includes('s360') ||
    lowerUrl.includes('/security') ||
    lowerUrl.includes('vulnerability') ||
    lowerLabel.includes('cg') ||
    lowerLabel.includes('security') ||
    lowerLabel.includes('vuln')
  ) {
    return 'security';
  }
  if (
    lowerUrl.includes('/issues') ||
    lowerUrl.includes('/_workitems') ||
    lowerLabel.includes('issue')
  ) {
    return 'issues';
  }
  if (
    lowerUrl.includes('/projects/') ||
    lowerUrl.includes('/_dashboards') ||
    lowerUrl.includes('/_boards') ||
    lowerLabel.includes('board') ||
    lowerLabel.includes('dashboard')
  ) {
    return 'boards';
  }
  if (
    lowerUrl.includes('/releases') ||
    lowerUrl.includes('/pkgs') ||
    lowerLabel.includes('release')
  ) {
    return 'releases';
  }
  if (
    lowerUrl.includes('/wiki') ||
    lowerUrl.includes('sharepoint.com') ||
    lowerUrl.includes('powerbi.com') ||
    lowerLabel.includes('notes') ||
    lowerLabel.includes('report') ||
    lowerLabel.includes('wiki')
  ) {
    return 'docs';
  }
  if (
    lowerUrl.includes('github.com/') ||
    lowerUrl.includes('/_git/')
  ) {
    return 'repo';
  }
  return 'custom';
}

export interface GitHubQuickOptions {
  ownerRepo: string;
  includeRepo?: boolean;
  includePulls?: boolean;
  includeIssues?: boolean;
  includeDiscussions?: boolean;
  includeActions?: boolean;
  includeReleases?: boolean;
}

/**
 * Parses either "owner/repo" or "https://github.com/owner/repo/..." into "owner/repo".
 */
export function parseGitHubSlug(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1].replace(/\.git$/, '')}`;
      }
    } catch {
      return null;
    }
  }

  const parts = trimmed.replace(/^\/+|\/+$/g, '').split('/');
  if (parts.length === 2 && parts[0] && parts[1]) {
    return `${parts[0]}/${parts[1].replace(/\.git$/, '')}`;
  }
  return null;
}

export function generateGitHubLinks(options: GitHubQuickOptions): RepoLink[] {
  const slug = parseGitHubSlug(options.ownerRepo);
  if (!slug) return [];

  const base = `https://github.com/${slug}`;
  const links: RepoLink[] = [];

  if (options.includeRepo !== false) {
    links.push({
      id: createId('link'),
      category: 'repo',
      label: 'GitHub',
      url: base,
      provider: 'github',
    });
  }
  if (options.includePulls !== false) {
    links.push({
      id: createId('link'),
      category: 'pulls',
      label: 'Pulls',
      url: `${base}/pulls`,
      provider: 'github',
    });
  }
  if (options.includeIssues !== false) {
    links.push({
      id: createId('link'),
      category: 'issues',
      label: 'Issues',
      url: `${base}/issues`,
      provider: 'github',
    });
  }
  if (options.includeDiscussions) {
    links.push({
      id: createId('link'),
      category: 'discussions',
      label: 'Discussions',
      url: `${base}/discussions`,
      provider: 'github',
    });
  }
  if (options.includeActions) {
    links.push({
      id: createId('link'),
      category: 'pipelines',
      label: 'Actions',
      url: `${base}/actions`,
      provider: 'github',
    });
  }
  if (options.includeReleases) {
    links.push({
      id: createId('link'),
      category: 'releases',
      label: 'Releases',
      url: `${base}/releases`,
      provider: 'github',
    });
  }

  return links;
}

export interface AzDOQuickOptions {
  input: string; // Full URL or org/project/repo
  definitionScope?: string; // e.g., \dotnet\dotnet-docker
  includeRepo?: boolean;
  includePulls?: boolean;
  includePublicPipeline?: boolean;
  includeInternalPipeline?: boolean;
}

export interface ParsedAzDORepo {
  org: string;
  project: string;
  repo: string;
  repoUrl: string;
}

export function parseAzDORepo(input: string): ParsedAzDORepo | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      const parts = u.pathname.split('/').filter(Boolean);
      // https://dev.azure.com/{org}/{project}/_git/{repo}
      const gitIndex = parts.indexOf('_git');
      if (u.hostname.toLowerCase() === 'dev.azure.com' && gitIndex >= 2 && parts[gitIndex + 1]) {
        const org = parts[0];
        const project = parts[1];
        const repo = parts[gitIndex + 1];
        return {
          org,
          project,
          repo,
          repoUrl: `https://dev.azure.com/${org}/${project}/_git/${repo}`,
        };
      }
      // https://{org}.visualstudio.com/{project}/_git/{repo}
      if (u.hostname.toLowerCase().endsWith('.visualstudio.com') && gitIndex >= 1 && parts[gitIndex + 1]) {
        const org = u.hostname.split('.')[0];
        const project = parts[0];
        const repo = parts[gitIndex + 1];
        return {
          org,
          project,
          repo,
          repoUrl: `https://dev.azure.com/${org}/${project}/_git/${repo}`,
        };
      }
    } catch {
      return null;
    }
  }

  // Format: org/project/repo
  const parts = trimmed.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts.length === 3) {
    const [org, project, repo] = parts;
    return {
      org,
      project,
      repo,
      repoUrl: `https://dev.azure.com/${org}/${project}/_git/${repo}`,
    };
  }

  return null;
}

export function generateAzDOLinks(options: AzDOQuickOptions): RepoLink[] {
  const parsed = parseAzDORepo(options.input);
  if (!parsed) return [];

  const links: RepoLink[] = [];
  if (options.includeRepo !== false) {
    links.push({
      id: createId('link'),
      category: 'repo',
      label: 'AzDO',
      url: parsed.repoUrl,
      provider: 'azdo',
    });
  }
  if (options.includePulls) {
    links.push({
      id: createId('link'),
      category: 'pulls',
      label: 'AzDO PRs',
      url: `${parsed.repoUrl}/pullrequests?_a=mine`,
      provider: 'azdo',
    });
  }

  const rawScope = (options.definitionScope || '').trim();
  const normalizedScope = rawScope
    ? rawScope.startsWith('\\')
      ? rawScope
      : `\\${rawScope.replace(/\//g, '\\')}`
    : '';
  const encodedScope = normalizedScope ? `?definitionScope=${encodeURIComponent(normalizedScope)}` : '';

  if (options.includePublicPipeline) {
    const pubOrg = parsed.org === 'dnceng' ? 'dnceng-public' : parsed.org;
    const pubProject = parsed.org === 'dnceng' ? 'public' : parsed.project;
    links.push({
      id: createId('link'),
      category: 'pipelines',
      label: 'Public',
      url: `https://dev.azure.com/${pubOrg}/${pubProject}/_build${encodedScope}`,
      provider: 'azdo',
    });
  }
  if (options.includeInternalPipeline) {
    links.push({
      id: createId('link'),
      category: 'pipelines',
      label: 'Internal',
      url: `https://dev.azure.com/${parsed.org}/${parsed.project}/_build${encodedScope}`,
      provider: 'azdo',
    });
  }

  return links;
}

function normalizeLink(raw: unknown): RepoLink | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const url = typeof obj.url === 'string' ? obj.url.trim() : '';
  if (!url) return null;

  const label = typeof obj.label === 'string' && obj.label.trim() ? obj.label.trim() : 'Link';
  const rawCategory = typeof obj.category === 'string' ? (obj.category as LinkCategory) : undefined;
  const category: LinkCategory =
    rawCategory && VALID_CATEGORIES.has(rawCategory)
      ? rawCategory
      : inferCategoryFromUrl(url, label);

  const provider: LinkProvider =
    typeof obj.provider === 'string' &&
    ['github', 'azdo', 'powerbi', 'sharepoint', 'other'].includes(obj.provider)
      ? (obj.provider as LinkProvider)
      : detectProvider(url);

  return {
    id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : createId('link'),
    category,
    label,
    url,
    provider,
  };
}

function normalizeRepo(raw: unknown): RepoEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!name) return null;

  const rawLinks = Array.isArray(obj.links) ? obj.links : [];
  const links = rawLinks.map(normalizeLink).filter((l): l is RepoLink => l !== null);

  return {
    id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : createId('repo'),
    name,
    links,
  };
}

function normalizeGroup(raw: unknown): RepoGroup | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!name) return null;

  const rawRepos = Array.isArray(obj.repos) ? obj.repos : [];
  const repos = rawRepos.map(normalizeRepo).filter((r): r is RepoEntry => r !== null);

  return {
    id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : createId('group'),
    name,
    collapsed: Boolean(obj.collapsed),
    repos,
  };
}

export function parseAndNormalizeConfig(
  input: string | unknown,
  fallbackDefaults?: Partial<HomepageConfig>,
): HomepageConfig {
  const parsed: unknown = typeof input === 'string' ? JSON.parse(input) : input;

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Configuration must be a JSON object or array of repositories.');
  }

  // Support importing a flat array of repos directly
  if (Array.isArray(parsed)) {
    const repos = parsed.map(normalizeRepo).filter((r): r is RepoEntry => r !== null);
    if (repos.length === 0) {
      throw new Error('No valid repository entries found in JSON array.');
    }
    return {
      version: 1,
      viewMode: fallbackDefaults?.viewMode ?? 'table',
      theme: fallbackDefaults?.theme ?? 'system',
      sidebarCollapsed: fallbackDefaults?.sidebarCollapsed ?? false,
      groups: [
        {
          id: createId('group'),
          name: 'Imported Repositories',
          collapsed: false,
          repos,
        },
      ],
    };
  }

  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.groups)) {
    throw new Error('Configuration JSON must contain a "groups" array.');
  }

  const groups = obj.groups.map(normalizeGroup).filter((g): g is RepoGroup => g !== null);

  const viewMode: ViewMode =
    obj.viewMode === 'grid' || obj.viewMode === 'table'
      ? obj.viewMode
      : (fallbackDefaults?.viewMode ?? 'table');

  const theme: ThemePreference =
    obj.theme === 'light' || obj.theme === 'dark' || obj.theme === 'system'
      ? obj.theme
      : (fallbackDefaults?.theme ?? 'system');

  const sidebarCollapsed =
    typeof obj.sidebarCollapsed === 'boolean'
      ? obj.sidebarCollapsed
      : (fallbackDefaults?.sidebarCollapsed ?? false);

  return {
    version: 1,
    viewMode,
    theme,
    sidebarCollapsed,
    groups,
  };
}
