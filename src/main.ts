import './styles.css';
import { loadBookmarks, subscribeBookmarkChanges } from './bookmarks';
import { openConfigJsonModal, openGroupModal, openRepoModal } from './modals';
import { createId } from './repoHelpers';
import { BookmarksSidebar } from './sidebar';
import { loadConfig, saveConfig } from './storage';
import { BookmarkNode, HomepageConfig, ThemePreference, ViewMode } from './types';
import { RepoWorkspace } from './workspace';

function applyThemeAttribute(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') {
    root.setAttribute('data-theme', theme);
  } else {
    root.removeAttribute('data-theme');
  }
}

function getNextTheme(current: ThemePreference): ThemePreference {
  const isSystemDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  if (current === 'system') {
    return isSystemDark ? 'light' : 'dark';
  }
  return current === 'dark' ? 'light' : 'dark';
}

async function bootstrap(): Promise<void> {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;

  appRoot.innerHTML = `
    <div class="app-layout">
      <aside id="sidebar-root" class="app-sidebar" aria-label="Bookmarks Sidebar"></aside>
      <main id="workspace-root" class="app-main"></main>
    </div>
    <div id="flyout-layer" class="flyout-layer"></div>
    <div id="modal-root"></div>
  `;

  const sidebarEl = document.getElementById('sidebar-root')!;
  const workspaceEl = document.getElementById('workspace-root')!;
  const flyoutLayerEl = document.getElementById('flyout-layer')!;
  const modalRootEl = document.getElementById('modal-root')!;

  let config: HomepageConfig = await loadConfig();
  void saveConfig(config);
  let bookmarks: BookmarkNode[] = await loadBookmarks();

  applyThemeAttribute(config.theme);

  const persistAndRender = () => {
    applyThemeAttribute(config.theme);
    sidebar.setState({
      bookmarks,
      collapsed: config.sidebarCollapsed,
      theme: config.theme,
    });
    workspace.setConfig(config);
    void saveConfig(config);
  };

  const handleOpenAddRepo = (groupId?: string) => {
    if (config.groups.length === 0) {
      config.groups.push({
        id: createId('group'),
        name: 'Repositories',
        collapsed: false,
        repos: [],
      });
    }
    const targetGroupId = groupId || config.groups[0].id;
    openRepoModal(modalRootEl, {
      groups: config.groups,
      initialGroupId: targetGroupId,
      onSave: ({ repo, groupId: destGroupId }) => {
        const grp =
          config.groups.find((g) => g.id === destGroupId) || config.groups[0];
        grp.repos.push(repo);
        grp.collapsed = false;
        persistAndRender();
      },
    });
  };

  const handleOpenEditRepo = (repoId: string, groupId: string) => {
    const group = config.groups.find((g) => g.id === groupId);
    const existingRepo = group?.repos.find((r) => r.id === repoId);
    if (!group || !existingRepo) return;

    openRepoModal(modalRootEl, {
      groups: config.groups,
      initialGroupId: group.id,
      existingRepo,
      onSave: ({ repo, groupId: destGroupId }) => {
        if (destGroupId === group.id) {
          const idx = group.repos.findIndex((r) => r.id === repoId);
          if (idx >= 0) group.repos[idx] = repo;
        } else {
          group.repos = group.repos.filter((r) => r.id !== repoId);
          const destGroup =
            config.groups.find((g) => g.id === destGroupId) || config.groups[0];
          destGroup.repos.push(repo);
          destGroup.collapsed = false;
        }
        persistAndRender();
      },
      onDelete: (delRepoId, delGroupId) => {
        const g = config.groups.find((grp) => grp.id === delGroupId);
        if (g) {
          g.repos = g.repos.filter((r) => r.id !== delRepoId);
          persistAndRender();
        }
      },
    });
  };

  const handleOpenAddGroup = () => {
    openGroupModal(modalRootEl, {
      onSave: (name) => {
        config.groups.push({
          id: createId('group'),
          name,
          collapsed: false,
          repos: [],
        });
        persistAndRender();
      },
    });
  };

  const handleOpenEditGroup = (groupId: string) => {
    const group = config.groups.find((g) => g.id === groupId);
    if (!group) return;
    openGroupModal(modalRootEl, {
      existingGroup: group,
      onSave: (name) => {
        group.name = name;
        persistAndRender();
      },
      onDelete: () => {
        config.groups = config.groups.filter((g) => g.id !== groupId);
        persistAndRender();
      },
    });
  };

  const handleOpenImportExport = () => {
    openConfigJsonModal(modalRootEl, {
      currentConfig: config,
      onApplyConfig: (newConfig) => {
        config = newConfig;
        persistAndRender();
      },
    });
  };

  const sidebar = new BookmarksSidebar(sidebarEl, flyoutLayerEl, {
    onToggleCollapse: () => {
      config.sidebarCollapsed = !config.sidebarCollapsed;
      persistAndRender();
    },
    onToggleTheme: () => {
      config.theme = getNextTheme(config.theme);
      persistAndRender();
    },
    onAddRepo: () => handleOpenAddRepo(),
    onAddGroup: () => handleOpenAddGroup(),
    onOpenImportExport: () => handleOpenImportExport(),
  });

  const workspace = new RepoWorkspace(workspaceEl, config, {
    onChangeViewMode: (mode: ViewMode) => {
      config.viewMode = mode;
      persistAndRender();
    },
    onToggleGroupCollapse: (groupId: string) => {
      const grp = config.groups.find((g) => g.id === groupId);
      if (grp) {
        grp.collapsed = !grp.collapsed;
        persistAndRender();
      }
    },
    onCollapseAllGroups: (collapse: boolean) => {
      config.groups.forEach((g) => {
        g.collapsed = collapse;
      });
      persistAndRender();
    },
    onAddRepo: (groupId?: string) => handleOpenAddRepo(groupId),
    onEditRepo: (repoId: string, groupId: string) =>
      handleOpenEditRepo(repoId, groupId),
    onMoveRepo: (
      repoId: string,
      fromGroupId: string,
      toGroupId: string,
      toIndex: number,
    ) => {
      const sourceGroup = config.groups.find((g) => g.id === fromGroupId);
      const targetGroup = config.groups.find((g) => g.id === toGroupId);
      if (!sourceGroup || !targetGroup) return;

      const repoIdx = sourceGroup.repos.findIndex((r) => r.id === repoId);
      if (repoIdx < 0) return;

      const [moved] = sourceGroup.repos.splice(repoIdx, 1);
      const clampedIndex = Math.max(
        0,
        Math.min(toIndex, targetGroup.repos.length),
      );
      targetGroup.repos.splice(clampedIndex, 0, moved);
      targetGroup.collapsed = false;
      persistAndRender();
    },
    onAddGroup: () => handleOpenAddGroup(),
    onEditGroup: (groupId: string) => handleOpenEditGroup(groupId),
    onMoveGroup: (groupId: string, direction: 'up' | 'down') => {
      const idx = config.groups.findIndex((g) => g.id === groupId);
      if (idx < 0) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= config.groups.length) return;
      const tmp = config.groups[targetIdx];
      config.groups[targetIdx] = config.groups[idx];
      config.groups[idx] = tmp;
      persistAndRender();
    },
    onOpenImportExport: () => handleOpenImportExport(),
  });

  sidebar.setState({
    bookmarks,
    collapsed: config.sidebarCollapsed,
    theme: config.theme,
  });
  workspace.render();

  subscribeBookmarkChanges(async () => {
    bookmarks = await loadBookmarks();
    sidebar.setState({
      bookmarks,
      collapsed: config.sidebarCollapsed,
      theme: config.theme,
    });
  });
}

void bootstrap();
