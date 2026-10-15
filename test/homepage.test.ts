import { describe, expect, it } from 'vitest';
import { normalizeBookmarkRoot } from '../src/bookmarks';
import { getDefaultConfig } from '../src/defaultConfig';
import {
  detectProvider,
  generateAzDOLinks,
  generateGitHubLinks,
  inferCategoryFromUrl,
  parseAndNormalizeConfig,
  parseAzDORepo,
  parseGitHubSlug,
} from '../src/repoHelpers';
import { BookmarksSidebar } from '../src/sidebar';
import { HomepageConfig } from '../src/types';
import { formatRepoDisplayName, RepoWorkspace } from '../src/workspace';

function createSampleConfig(): HomepageConfig {
  return {
    version: 1,
    viewMode: 'table',
    theme: 'system',
    sidebarCollapsed: false,
    groups: [
      {
        id: 'group-sample-repos',
        name: 'Sample Repositories',
        collapsed: false,
        repos: [
          {
            id: 'repo-sample-1',
            name: 'org/sample-service',
            links: [
              {
                id: 's1-gh',
                category: 'repo',
                label: 'GitHub',
                url: 'https://github.com/org/sample-service',
                provider: 'github',
              },
              {
                id: 's1-azdo',
                category: 'repo',
                label: 'AzDO',
                url: 'https://dev.azure.com/org/project/_git/sample-service',
                provider: 'azdo',
              },
              {
                id: 's1-pulls',
                category: 'pulls',
                label: 'Pulls',
                url: 'https://github.com/org/sample-service/pulls',
                provider: 'github',
              },
              {
                id: 's1-issues',
                category: 'issues',
                label: 'Issues',
                url: 'https://github.com/org/sample-service/issues',
                provider: 'github',
              },
              {
                id: 's1-discussions',
                category: 'discussions',
                label: 'Discussions',
                url: 'https://github.com/org/sample-service/discussions',
                provider: 'github',
              },
              {
                id: 's1-pipe',
                category: 'pipelines',
                label: 'Public',
                url: 'https://dev.azure.com/org/project/_build',
                provider: 'azdo',
              },
              {
                id: 's1-sec',
                category: 'security',
                label: 'Alerts',
                url: 'https://github.com/org/sample-service/security',
                provider: 'github',
              },
            ],
          },
        ],
      },
      {
        id: 'group-sample-2',
        name: 'Secondary Group',
        collapsed: false,
        repos: [],
      },
    ],
  };
}

describe('repoHelpers', () => {
  it('parses GitHub slugs and full URLs', () => {
    expect(parseGitHubSlug('dotnet/dotnet-docker')).toBe('dotnet/dotnet-docker');
    expect(parseGitHubSlug('https://github.com/dotnet/docker-tools/pulls')).toBe(
      'dotnet/docker-tools',
    );
    expect(parseGitHubSlug('invalid')).toBeNull();
  });

  it('generates standard GitHub links', () => {
    const links = generateGitHubLinks({
      ownerRepo: 'dotnet/dotnet-docker',
      includeRepo: true,
      includePulls: true,
      includeIssues: true,
      includeDiscussions: true,
      includeActions: false,
    });
    expect(links.map((l) => l.category)).toEqual([
      'repo',
      'pulls',
      'issues',
      'discussions',
    ]);
    expect(links[0].url).toBe('https://github.com/dotnet/dotnet-docker');
    expect(links[1].url).toBe('https://github.com/dotnet/dotnet-docker/pulls');
  });

  it('parses Azure DevOps URLs and generates mirror + pipeline links', () => {
    const parsed = parseAzDORepo(
      'https://dev.azure.com/dnceng/internal/_git/dotnet-dotnet-docker',
    );
    expect(parsed).toEqual({
      org: 'dnceng',
      project: 'internal',
      repo: 'dotnet-dotnet-docker',
      repoUrl: 'https://dev.azure.com/dnceng/internal/_git/dotnet-dotnet-docker',
    });

    const links = generateAzDOLinks({
      input: 'dnceng/internal/dotnet-dotnet-docker',
      definitionScope: '\\dotnet\\dotnet-docker',
      includeRepo: true,
      includePulls: true,
      includePublicPipeline: true,
      includeInternalPipeline: true,
    });
    expect(links).toHaveLength(4);
    expect(links[0].category).toBe('repo');
    expect(links[0].provider).toBe('azdo');
    expect(links[2].label).toBe('Public');
    expect(links[2].url).toContain('dnceng-public/public/_build?definitionScope=%5Cdotnet%5Cdotnet-docker');
    expect(links[3].label).toBe('Internal');
    expect(links[3].url).toContain('dnceng/internal/_build?definitionScope=%5Cdotnet%5Cdotnet-docker');
  });

  it('detects providers and infers link categories', () => {
    expect(detectProvider('https://github.com/dotnet/runtime')).toBe('github');
    expect(detectProvider('https://dev.azure.com/dnceng/internal')).toBe('azdo');
    expect(inferCategoryFromUrl('https://github.com/dotnet/dotnet-docker/pulls')).toBe('pulls');
    expect(
      inferCategoryFromUrl(
        'https://dev.azure.com/dnceng/internal/_build?definitionScope=%5Cdotnet%5Cdotnet-docker',
      ),
    ).toBe('pipelines');
  });

  it('validates and normalizes imported JSON configs and has an empty default preset', () => {
    const defaultCfg = getDefaultConfig();
    expect(defaultCfg.groups).toEqual([]);

    const sampleCfg = createSampleConfig();
    const exported = JSON.stringify(sampleCfg);
    const reimported = parseAndNormalizeConfig(exported);

    expect(reimported.groups).toHaveLength(sampleCfg.groups.length);
    expect(reimported.groups[0].repos[0].name).toBe('org/sample-service');
    // Verify multiple repo mirrors on one logical repo are preserved
    const repoLinks = reimported.groups[0].repos[0].links.filter(
      (l) => l.category === 'repo',
    );
    expect(repoLinks).toHaveLength(2);
    expect(repoLinks.map((l) => l.label)).toEqual(['GitHub', 'AzDO']);
  });
});

describe('bookmarks & UI components', () => {
  it('flattens Bookmarks Bar and preserves nested folders for file-menu expansion', () => {
    const normalized = normalizeBookmarkRoot([
      {
        id: '0',
        title: '',
        children: [
          {
            id: '1',
            title: 'Bookmarks bar',
            children: [
              {
                id: 'f1',
                title: 'Dev Folder',
                children: [{ id: 'b1', title: 'GitHub', url: 'https://github.com' }],
              },
              { id: 'b2', title: 'Direct Link', url: 'https://example.com' },
            ],
          },
          {
            id: '2',
            title: 'Other bookmarks',
            children: [{ id: 'b3', title: 'Saved Doc', url: 'https://docs.microsoft.com' }],
          },
        ],
      },
    ]);

    expect(normalized).toHaveLength(3);
    expect(normalized[0].title).toBe('Dev Folder');
    expect(normalized[1].title).toBe('Direct Link');
    expect(normalized[2].title).toBe('Other bookmarks');
  });

  it('opens cascading file-menu flyout when clicking a bookmark folder', () => {
    const sidebarEl = document.createElement('aside');
    const flyoutEl = document.createElement('div');
    document.body.appendChild(sidebarEl);
    document.body.appendChild(flyoutEl);

    const sidebar = new BookmarksSidebar(sidebarEl, flyoutEl, {
      onToggleCollapse: () => {},
      onToggleTheme: () => {},
      onAddRepo: () => {},
      onAddGroup: () => {},
      onOpenImportExport: () => {},
    });

    sidebar.setState({
      collapsed: false,
      theme: 'light',
      bookmarks: [
        {
          id: 'folder-1',
          title: 'Engineering',
          children: [
            {
              id: 'subfolder-1',
              title: 'Pipelines',
              children: [
                { id: 'leaf-1', title: 'Official Build', url: 'https://dev.azure.com' },
              ],
            },
          ],
        },
      ],
    });

    const folderBtn = sidebarEl.querySelector<HTMLButtonElement>('[data-bm-top-id="folder-1"]');
    expect(folderBtn).not.toBeNull();
    folderBtn!.click();

    // Level 0 flyout menu should be rendered in the flyout layer
    const level0 = flyoutEl.querySelector('[data-depth="0"]');
    expect(level0).not.toBeNull();
    expect(level0!.textContent).toContain('Pipelines');

    // Clicking nested subfolder opens level 1 cascading flyout alongside level 0
    const subBtn = level0!.querySelector<HTMLButtonElement>('[data-child-id="subfolder-1"]');
    expect(subBtn).not.toBeNull();
    subBtn!.click();

    const level1 = flyoutEl.querySelector('[data-depth="1"]');
    expect(level1).not.toBeNull();
    expect(level1!.textContent).toContain('Official Build');

    sidebarEl.remove();
    flyoutEl.remove();
  });

  it('renders workspace in both table and grid modes and filters repos', () => {
    const workspaceEl = document.createElement('main');
    document.body.appendChild(workspaceEl);
    const config = createSampleConfig();

    const workspace = new RepoWorkspace(workspaceEl, config, {
      onChangeViewMode: (m) => {
        config.viewMode = m;
        workspace.setConfig(config);
      },
      onToggleGroupCollapse: () => {},
      onCollapseAllGroups: () => {},
      onAddRepo: () => {},
      onEditRepo: () => {},
      onMoveRepo: () => {},
      onAddGroup: () => {},
      onEditGroup: () => {},
      onMoveGroup: () => {},
      onOpenImportExport: () => {},
    });

    workspace.render();
    expect(workspaceEl.querySelectorAll('.repo-row').length).toBe(1);
    expect(formatRepoDisplayName('org/sample-service')).toBe('sample-service');
    expect(formatRepoDisplayName('Product Repos (All)')).toBe('Product Repos (All)');

    const firstRow = workspaceEl.querySelector('.repo-row')!;
    const primaryLink = firstRow.querySelector<HTMLAnchorElement>('.repo-primary-link');
    expect(primaryLink?.textContent).toBe('sample-service');
    expect(primaryLink?.getAttribute('href')).toBe('https://github.com/org/sample-service');

    const mirrorLink = firstRow.querySelector<HTMLAnchorElement>('.repo-mirror-link');
    expect(mirrorLink?.textContent).toContain('AzDO');
    expect(mirrorLink?.getAttribute('href')).toBe(
      'https://dev.azure.com/org/project/_git/sample-service',
    );
    expect(mirrorLink?.querySelector('svg.icon-external')).not.toBeNull();

    // Verify column order: Pulls, Issues, Pipelines, Discussions, More
    const headers = Array.from(
      workspaceEl.querySelectorAll('.repo-table-repo-matrix th.col-category'),
    ).map((th) => th.textContent);
    expect(headers).toEqual(['Pulls', 'Issues', 'Pipelines', 'Discussions', 'More']);

    // Verify three-dots menu opens and includes Edit (plus any hidden column links)
    let editedRepoId = '';
    const workspaceWithEdit = new RepoWorkspace(workspaceEl, config, {
      onChangeViewMode: () => {},
      onToggleGroupCollapse: () => {},
      onCollapseAllGroups: () => {},
      onAddRepo: () => {},
      onEditRepo: (repoId) => {
        editedRepoId = repoId;
      },
      onMoveRepo: () => {},
      onAddGroup: () => {},
      onEditGroup: () => {},
      onMoveGroup: () => {},
      onOpenImportExport: () => {},
    });
    workspaceWithEdit.render();

    const row = workspaceEl.querySelector<HTMLElement>('.repo-row')!;
    // Simulate a hidden rightmost column ("More")
    row.querySelector<HTMLElement>('td.cell-cat-other')?.classList.add('is-col-hidden');

    const overflowBtn = row.querySelector<HTMLButtonElement>('button[data-repo-overflow]')!;
    expect(overflowBtn).not.toBeNull();
    overflowBtn.click();

    const popover = document.querySelector<HTMLElement>('.repo-overflow-menu');
    expect(popover).not.toBeNull();
    expect(popover?.textContent).toContain('Alerts');
    expect(popover?.textContent).toContain('Edit');

    const editBtn = popover!.querySelector<HTMLButtonElement>('button[data-overflow-edit-repo]')!;
    editBtn.click();
    expect(editedRepoId).toBe(row.getAttribute('data-repo-id'));
    expect(document.querySelector('.repo-overflow-menu')).toBeNull();

    // Verify group header has no yellow count badge and opens a three-dots menu with Add repo / Move up / Move down / Edit
    expect(workspaceEl.querySelector('.group-count-badge')).toBeNull();
    let editedGroupId = '';
    let movedGroupDir = '';
    const workspaceWithGroupMenu = new RepoWorkspace(workspaceEl, config, {
      onChangeViewMode: () => {},
      onToggleGroupCollapse: () => {},
      onCollapseAllGroups: () => {},
      onAddRepo: () => {},
      onEditRepo: () => {},
      onMoveRepo: () => {},
      onAddGroup: () => {},
      onEditGroup: (gId) => {
        editedGroupId = gId;
      },
      onMoveGroup: (_gId, dir) => {
        movedGroupDir = dir;
      },
      onOpenImportExport: () => {},
    });
    workspaceWithGroupMenu.render();

    const groupOverflowBtn = workspaceEl.querySelector<HTMLButtonElement>('button[data-group-overflow]')!;
    expect(groupOverflowBtn).not.toBeNull();
    groupOverflowBtn.click();

    const groupPopover = document.querySelector<HTMLElement>('.group-overflow-menu');
    expect(groupPopover).not.toBeNull();
    expect(groupPopover?.textContent).toContain('Add repo');
    expect(groupPopover?.textContent).toContain('Move up');
    expect(groupPopover?.textContent).toContain('Move down');
    expect(groupPopover?.textContent).toContain('Edit');

    groupPopover!.querySelector<HTMLButtonElement>('[data-group-menu-move="down"]')!.click();
    expect(movedGroupDir).toBe('down');

    groupOverflowBtn.click();
    document
      .querySelector<HTMLElement>('.group-overflow-menu [data-group-menu-edit]')!
      .click();
    expect(editedGroupId).toBe(config.groups[0].id);

    workspaceEl.remove();
  });
});
