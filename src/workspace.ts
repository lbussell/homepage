import { getLinkIcon, ICONS } from './icons';
import { HomepageConfig, LinkCategory, RepoEntry, RepoGroup, RepoLink, ViewMode } from './types';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return escapeHtml(str).replace(/'/g, '&#39;');
}

export interface WorkspaceCallbacks {
  onChangeViewMode: (mode: ViewMode) => void;
  onToggleGroupCollapse: (groupId: string) => void;
  onCollapseAllGroups: (collapse: boolean) => void;
  onAddRepo: (groupId?: string) => void;
  onEditRepo: (repoId: string, groupId: string) => void;
  onMoveRepo: (
    repoId: string,
    fromGroupId: string,
    toGroupId: string,
    toIndex: number,
  ) => void;
  onAddGroup: () => void;
  onEditGroup: (groupId: string) => void;
  onMoveGroup: (groupId: string, direction: 'up' | 'down') => void;
  onOpenImportExport: () => void;
}

const NON_REPO_CATEGORY_ORDER: LinkCategory[] = [
  'pulls',
  'issues',
  'discussions',
  'pipelines',
  'security',
  'boards',
  'docs',
  'releases',
  'custom',
];

export function formatRepoDisplayName(name: string): string {
  const trimmed = name.trim();
  const slashIdx = trimmed.indexOf('/');
  if (
    slashIdx > 0 &&
    slashIdx < trimmed.length - 1 &&
    !trimmed.includes(' ') &&
    trimmed.indexOf('/', slashIdx + 1) === -1
  ) {
    return trimmed.slice(slashIdx + 1);
  }
  return trimmed;
}

function renderInlineLink(link: RepoLink): string {
  const icon = getLinkIcon(link.category, link.provider);
  const providerClass = link.provider ? `link-provider-${link.provider}` : '';
  const catClass = `link-cat-${link.category}`;
  return `
    <a
      href="${escapeAttr(link.url)}"
      class="workspace-link ${providerClass} ${catClass}"
      title="${escapeAttr(link.label)} — ${escapeAttr(link.url)}"
    >
      ${icon}
      <span class="workspace-link-text">${escapeHtml(link.label)}</span>
    </a>
  `;
}

function renderRepoTitleAndMirrors(repo: RepoEntry): string {
  const displayName = formatRepoDisplayName(repo.name);
  const repoLinks = repo.links.filter((l) => l.category === 'repo');
  const primaryRepoLink = repoLinks[0] || null;
  const extraMirrorLinks = repoLinks.slice(1);

  const titleHtml = primaryRepoLink
    ? `<a href="${escapeAttr(primaryRepoLink.url)}" class="repo-primary-link" title="${escapeAttr(repo.name)} — ${escapeAttr(primaryRepoLink.url)}">${escapeHtml(displayName)}</a>`
    : `<span class="repo-primary-text" title="${escapeAttr(repo.name)}">${escapeHtml(displayName)}</span>`;

  const mirrorsHtml =
    extraMirrorLinks.length > 0
      ? `<span class="repo-mirrors">(${extraMirrorLinks
          .map(
            (m) =>
              `<a href="${escapeAttr(m.url)}" class="repo-mirror-link" title="${escapeAttr(m.label)} — ${escapeAttr(m.url)}"><span class="repo-mirror-text">${escapeHtml(m.label)}</span>${ICONS.externalLink}</a>`,
          )
          .join(', ')})</span>`
      : '';

  return `${titleHtml}${mirrorsHtml}`;
}

function getTableColumnsForGroup(repos: RepoEntry[]): {
  mode: 'repo-matrix' | 'links-list';
  columns: { key: string; label: string; categories: LinkCategory[] }[];
} {
  const hasRepoCategory = repos.some((r) =>
    r.links.some((l) => l.category === 'repo'),
  );

  if (!hasRepoCategory) {
    return {
      mode: 'links-list',
      columns: [
        {
          key: 'all',
          label: 'Links',
          categories: NON_REPO_CATEGORY_ORDER,
        },
      ],
    };
  }

  const candidateColumns: { key: string; label: string; categories: LinkCategory[] }[] = [
    { key: 'pulls', label: 'Pulls', categories: ['pulls'] },
    { key: 'issues', label: 'Issues', categories: ['issues'] },
    { key: 'pipelines', label: 'Pipelines', categories: ['pipelines'] },
    { key: 'discussions', label: 'Discussions', categories: ['discussions'] },
    {
      key: 'other',
      label: 'More',
      categories: ['security', 'boards', 'docs', 'releases', 'custom'],
    },
  ];

  const active = candidateColumns.filter((col) =>
    repos.some((r) => r.links.some((l) => col.categories.includes(l.category))),
  );

  return {
    mode: 'repo-matrix',
    columns: active.length > 0 ? active : candidateColumns.slice(0, 3),
  };
}

export class RepoWorkspace {
  private container: HTMLElement;
  private config: HomepageConfig;
  private callbacks: WorkspaceCallbacks;
  private filterQuery = '';
  private activeGroupFilter = 'all';
  private draggedRepo: { repoId: string; fromGroupId: string } | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private activeOverflowPopover: HTMLElement | null = null;
  private activeOverflowBtn: HTMLElement | null = null;

  constructor(
    container: HTMLElement,
    config: HomepageConfig,
    callbacks: WorkspaceCallbacks,
  ) {
    this.container = container;
    this.config = config;
    this.callbacks = callbacks;

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.closeOverflowPopover();
        this.applyResponsiveOverflow();
      });
      this.resizeObserver.observe(this.container);
    }

    window.addEventListener('resize', () => {
      this.closeOverflowPopover();
      this.applyResponsiveOverflow();
    });

    document.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        this.activeOverflowPopover &&
        !this.activeOverflowPopover.contains(target) &&
        (!this.activeOverflowBtn || !this.activeOverflowBtn.contains(target))
      ) {
        this.closeOverflowPopover();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeOverflowPopover) {
        this.closeOverflowPopover();
        return;
      }

      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (inInput) return;
      if (document.querySelector('.modal-backdrop')) return;

      if (e.key === '/') {
        e.preventDefault();
        const filterInput = this.container.querySelector<HTMLInputElement>('#workspace-filter-input');
        filterInput?.focus();
        filterInput?.select();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        this.callbacks.onAddRepo();
      }
    });
  }

  public setConfig(config: HomepageConfig): void {
    this.config = config;
    if (
      this.activeGroupFilter !== 'all' &&
      !this.config.groups.some((g) => g.id === this.activeGroupFilter)
    ) {
      this.activeGroupFilter = 'all';
    }
    this.render();
  }

  private matchesFilter(repo: RepoEntry, query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    if (repo.name.toLowerCase().includes(q)) return true;
    return repo.links.some(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q),
    );
  }

  public render(): void {
    const activeInput = document.activeElement as HTMLInputElement | null;
    const wasFilterFocused = activeInput?.id === 'workspace-filter-input';
    const selStart = activeInput?.selectionStart ?? null;
    const selEnd = activeInput?.selectionEnd ?? null;

    const allCollapsed =
      this.config.groups.length > 0 &&
      this.config.groups.every((g) => Boolean(g.collapsed));

    const visibleGroups = this.config.groups
      .filter((g) => this.activeGroupFilter === 'all' || g.id === this.activeGroupFilter)
      .map((group) => ({
        group,
        filteredRepos: group.repos.filter((r) => this.matchesFilter(r, this.filterQuery)),
      }))
      .filter((entry) => !this.filterQuery || entry.filteredRepos.length > 0);

    this.container.innerHTML = `
      <header class="workspace-toolbar">
        <div class="toolbar-left">
          <div class="filter-box">
            <span class="filter-box-icon">${ICONS.search}</span>
            <input
              type="text"
              id="workspace-filter-input"
              class="filter-input"
              placeholder="Filter repos..."
              value="${escapeAttr(this.filterQuery)}"
              autocomplete="off"
              aria-label="Filter repositories and links"
            />
            ${
              this.filterQuery
                ? `<button type="button" class="filter-clear-btn" id="btn-clear-filter" title="Clear filter">${ICONS.close}</button>`
                : `<kbd class="kbd-hint filter-kbd">/</kbd>`
            }
          </div>
        </div>

        <div class="toolbar-right">
          <button
            type="button"
            class="toolbar-text-btn"
            id="btn-collapse-all"
            title="${allCollapsed ? 'Expand all groups' : 'Collapse all groups'}"
          >
            ${ICONS.folder}
            <span>${allCollapsed ? 'Expand all' : 'Collapse all'}</span>
          </button>

          <div class="segmented-actions">
            <button type="button" class="seg-btn" id="btn-toolbar-add-repo" title="Add Repository (N)">
              ${ICONS.plus}
              <span>Repo</span>
              <kbd class="kbd-hint">N</kbd>
            </button>
            <button type="button" class="seg-btn" id="btn-toolbar-add-group" title="Add Group">
              ${ICONS.folder}
              <span>Group</span>
            </button>
            <button type="button" class="seg-btn" id="btn-toolbar-json" title="Import / Export JSON Configuration">
              ${ICONS.docs}
              <span>JSON</span>
            </button>
          </div>
        </div>
      </header>

      <div class="workspace-content">
        ${
          visibleGroups.length === 0
            ? `<div class="workspace-empty">
                <span>No matching repositories found.</span>
                ${
                  this.filterQuery
                    ? `<button type="button" class="btn btn-sm" id="btn-empty-clear">Clear Filter</button>`
                    : `<button type="button" class="btn btn-sm btn-primary" id="btn-empty-add">${ICONS.plus} Add Repository</button>`
                }
              </div>`
            : visibleGroups
                .map(({ group, filteredRepos }, groupIdx) =>
                  this.renderGroupSection(group, filteredRepos, groupIdx),
                )
                .join('')
        }
      </div>
    `;

    this.closeOverflowPopover();
    this.bindEvents();
    this.applyResponsiveOverflow();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        this.applyResponsiveOverflow();
      });
    }

    if (wasFilterFocused) {
      const input = this.container.querySelector<HTMLInputElement>('#workspace-filter-input');
      if (input) {
        input.focus();
        if (selStart !== null && selEnd !== null) {
          input.setSelectionRange(selStart, selEnd);
        }
      }
    }
  }

  private renderGroupSection(
    group: RepoGroup,
    repos: RepoEntry[],
    groupIdx: number,
  ): string {
    const isCollapsed = Boolean(group.collapsed) && !this.filterQuery;

    return `
      <section
        class="repo-group-section ${isCollapsed ? 'is-collapsed' : ''}"
        data-group-id="${escapeAttr(group.id)}"
      >
        <div
          class="group-header-bar"
          data-group-dropzone="${escapeAttr(group.id)}"
          data-toggle-group="${escapeAttr(group.id)}"
        >
          <button
            type="button"
            class="group-toggle-btn"
            aria-expanded="${isCollapsed ? 'false' : 'true'}"
          >
            <span class="group-chevron">${isCollapsed ? ICONS.chevronRight : ICONS.chevronDown}</span>
            <span class="group-title-text">${escapeHtml(group.name)}</span>
          </button>

          <div class="group-header-right">
            <button
              type="button"
              class="icon-btn repo-overflow-btn"
              data-group-overflow="${escapeAttr(group.id)}"
              data-group-idx="${groupIdx}"
              title="Group actions"
              aria-haspopup="menu"
              aria-expanded="false"
            >${ICONS.moreHorizontal}</button>
          </div>
        </div>

        ${
          isCollapsed
            ? ''
            : `<div class="group-body" data-group-body="${escapeAttr(group.id)}">
                ${
                  repos.length === 0
                    ? `<div class="group-empty-row" data-group-dropzone="${escapeAttr(group.id)}">
                        <span>No repositories in this group.</span>
                        <button type="button" class="btn btn-sm" data-add-repo-in-group="${escapeAttr(group.id)}">${ICONS.plus} Add Repo</button>
                      </div>`
                    : this.renderTableView(group, repos)
                }
              </div>`
        }
      </section>
    `;
  }

  private renderTableView(group: RepoGroup, repos: RepoEntry[]): string {
    const { mode, columns } = getTableColumnsForGroup(repos);

    return `
      <div class="repo-table-wrapper">
        <table class="repo-table repo-table-${mode}" data-col-count="${columns.length}">
          <thead>
            <tr>
              <th class="col-repo-name">Name</th>
              ${columns
                .map(
                  (col, colIdx) =>
                    `<th class="col-category col-cat-${col.key}" data-col-idx="${colIdx}">${escapeHtml(col.label)}</th>`,
                )
                .join('')}
              <th class="col-overflow" data-overflow-header aria-label="More actions"></th>
            </tr>
          </thead>
          <tbody>
            ${repos
              .map((repo, idx) => {
                const fullGroupIndex = group.repos.findIndex((r) => r.id === repo.id);

                return `
                  <tr
                    class="repo-row"
                    draggable="true"
                    data-repo-id="${escapeAttr(repo.id)}"
                    data-group-id="${escapeAttr(group.id)}"
                    data-repo-index="${fullGroupIndex >= 0 ? fullGroupIndex : idx}"
                  >
                    <td class="cell-repo-name">
                      <div class="repo-name-wrap">
                        <span class="drag-handle" title="Drag to reorder">${ICONS.drag}</span>
                        ${renderRepoTitleAndMirrors(repo)}
                      </div>
                    </td>
                    ${columns
                      .map((col, colIdx) => {
                        const catLinks = repo.links.filter((l) =>
                          col.categories.includes(l.category),
                        );
                        return `
                          <td class="cell-category cell-cat-${col.key}" data-col-idx="${colIdx}">
                            <div class="cell-links ${mode === 'repo-matrix' ? 'cell-links-nowrap' : ''}">
                              ${catLinks.map(renderInlineLink).join('')}
                            </div>
                          </td>
                        `;
                      })
                      .join('')}
                    <td class="cell-overflow" data-overflow-cell>
                      <button
                        type="button"
                        class="icon-btn repo-overflow-btn"
                        data-repo-overflow="${escapeAttr(repo.id)}"
                        title="More actions"
                        aria-haspopup="menu"
                        aria-expanded="false"
                      >${ICONS.moreHorizontal}</button>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private closeOverflowPopover(): void {
    if (this.activeOverflowPopover) {
      this.activeOverflowPopover.remove();
      this.activeOverflowPopover = null;
    }
    if (this.activeOverflowBtn) {
      this.activeOverflowBtn.classList.remove('is-active');
      this.activeOverflowBtn.setAttribute('aria-expanded', 'false');
      this.activeOverflowBtn = null;
    }
  }

  private positionOverflowPopover(btn: HTMLElement, popover: HTMLElement): void {
    document.body.appendChild(popover);
    this.activeOverflowPopover = popover;
    this.activeOverflowBtn = btn;
    btn.classList.add('is-active');
    btn.setAttribute('aria-expanded', 'true');

    const btnRect = btn.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    let left = btnRect.right - popRect.width;
    if (left < 8) left = 8;
    if (left + popRect.width > window.innerWidth - 8) {
      left = window.innerWidth - popRect.width - 8;
    }
    let top = btnRect.bottom + 3;
    if (top + popRect.height > window.innerHeight - 8) {
      top = Math.max(8, btnRect.top - popRect.height - 3);
    }
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
  }

  private openGroupOverflowPopover(btn: HTMLElement, groupId: string): void {
    if (this.activeOverflowBtn === btn) {
      this.closeOverflowPopover();
      return;
    }
    this.closeOverflowPopover();

    const groupIdx = this.config.groups.findIndex((g) => g.id === groupId);
    const isFirst = groupIdx <= 0;
    const isLast = groupIdx < 0 || groupIdx >= this.config.groups.length - 1;

    const popover = document.createElement('div');
    popover.className = 'bm-flyout-menu repo-overflow-menu group-overflow-menu';
    popover.setAttribute('role', 'menu');
    popover.innerHTML = `
      <button
        type="button"
        class="bm-flyout-item"
        role="menuitem"
        data-group-menu-add-repo="${escapeAttr(groupId)}"
      >
        <span class="bm-icon">${ICONS.plus}</span>
        <span class="bm-flyout-label">Add repo</span>
      </button>
      <div class="bm-flyout-divider" role="separator"></div>
      <button
        type="button"
        class="bm-flyout-item"
        role="menuitem"
        data-group-menu-move="up"
        ${isFirst ? 'disabled' : ''}
      >
        <span class="bm-icon">${ICONS.arrowUp}</span>
        <span class="bm-flyout-label">Move up</span>
      </button>
      <button
        type="button"
        class="bm-flyout-item"
        role="menuitem"
        data-group-menu-move="down"
        ${isLast ? 'disabled' : ''}
      >
        <span class="bm-icon">${ICONS.arrowDown}</span>
        <span class="bm-flyout-label">Move down</span>
      </button>
      <button
        type="button"
        class="bm-flyout-item"
        role="menuitem"
        data-group-menu-edit="${escapeAttr(groupId)}"
      >
        <span class="bm-icon">${ICONS.edit}</span>
        <span class="bm-flyout-label">Edit</span>
      </button>
    `;

    this.positionOverflowPopover(btn, popover);

    popover
      .querySelector<HTMLButtonElement>('[data-group-menu-add-repo]')
      ?.addEventListener('click', () => {
        this.closeOverflowPopover();
        this.callbacks.onAddRepo(groupId);
      });

    popover
      .querySelectorAll<HTMLButtonElement>('[data-group-menu-move]')
      .forEach((moveBtn) => {
        moveBtn.addEventListener('click', () => {
          const dir = moveBtn.getAttribute('data-group-menu-move') as 'up' | 'down';
          this.closeOverflowPopover();
          if (dir === 'up' || dir === 'down') {
            this.callbacks.onMoveGroup(groupId, dir);
          }
        });
      });

    popover
      .querySelector<HTMLButtonElement>('[data-group-menu-edit]')
      ?.addEventListener('click', () => {
        this.closeOverflowPopover();
        this.callbacks.onEditGroup(groupId);
      });
  }

  private openOverflowPopover(btn: HTMLElement, row: HTMLElement): void {
    if (this.activeOverflowBtn === btn) {
      this.closeOverflowPopover();
      return;
    }
    this.closeOverflowPopover();

    const repoId = row.getAttribute('data-repo-id') || '';
    const groupId = row.getAttribute('data-group-id') || '';
    const hiddenLinks = Array.from(
      row.querySelectorAll<HTMLAnchorElement>('td.cell-category.is-col-hidden a.workspace-link'),
    );

    const hiddenLinksHtml = hiddenLinks
      .map(
        (linkEl) => `
          <a
            href="${escapeAttr(linkEl.getAttribute('href') || '#')}"
            class="bm-flyout-item bm-flyout-link"
            role="menuitem"
            title="${escapeAttr(linkEl.getAttribute('title') || '')}"
          >
            <span class="bm-icon">${linkEl.querySelector('svg')?.outerHTML || ''}</span>
            <span class="bm-flyout-label">${escapeHtml(linkEl.textContent?.trim() || '')}</span>
          </a>
        `,
      )
      .join('');

    const dividerHtml =
      hiddenLinks.length > 0
        ? `<div class="bm-flyout-divider" role="separator"></div>`
        : '';

    const editActionHtml = `
      <button
        type="button"
        class="bm-flyout-item"
        role="menuitem"
        data-overflow-edit-repo="${escapeAttr(repoId)}"
        data-overflow-repo-group="${escapeAttr(groupId)}"
      >
        <span class="bm-icon">${ICONS.edit}</span>
        <span class="bm-flyout-label">Edit</span>
      </button>
    `;

    const popover = document.createElement('div');
    popover.className = 'bm-flyout-menu repo-overflow-menu';
    popover.setAttribute('role', 'menu');
    popover.innerHTML = `${hiddenLinksHtml}${dividerHtml}${editActionHtml}`;

    this.positionOverflowPopover(btn, popover);

    popover.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => this.closeOverflowPopover());
    });

    popover
      .querySelector<HTMLButtonElement>('button[data-overflow-edit-repo]')
      ?.addEventListener('click', () => {
        this.closeOverflowPopover();
        if (repoId && groupId) {
          this.callbacks.onEditRepo(repoId, groupId);
        }
      });
  }

  public applyResponsiveOverflow(): void {
    const wrappers = this.container.querySelectorAll<HTMLElement>('.repo-table-wrapper');
    wrappers.forEach((wrapper) => {
      const table = wrapper.querySelector<HTMLTableElement>('.repo-table-repo-matrix');
      if (!table || wrapper.clientWidth === 0) return;

      const colCount = Number(table.getAttribute('data-col-count') || '0');
      if (colCount <= 1) return;

      // Reset all category columns to visible first
      table.querySelectorAll<HTMLElement>('[data-col-idx]').forEach((el) => {
        el.classList.remove('is-col-hidden');
      });

      if (table.scrollWidth <= wrapper.clientWidth + 2) {
        return;
      }

      // Hide rightmost columns one by one until the table fits
      for (let colIdx = colCount - 1; colIdx >= 1; colIdx--) {
        table.querySelectorAll<HTMLElement>(`[data-col-idx="${colIdx}"]`).forEach((el) => {
          el.classList.add('is-col-hidden');
        });
        if (table.scrollWidth <= wrapper.clientWidth + 2) {
          break;
        }
      }
    });
  }

  private bindEvents(): void {
    if (this.resizeObserver) {
      this.container.querySelectorAll<HTMLElement>('.repo-table-wrapper').forEach((w) => {
        this.resizeObserver?.observe(w);
      });
    }

    // Overflow '...' buttons on repo rows
    this.container.querySelectorAll<HTMLElement>('button[data-repo-overflow]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const row = btn.closest<HTMLElement>('tr.repo-row');
        if (row) this.openOverflowPopover(btn, row);
      });
    });

    // Collapse all
    this.container.querySelector<HTMLElement>('#btn-collapse-all')?.addEventListener('click', () => {
      const allCollapsed =
        this.config.groups.length > 0 &&
        this.config.groups.every((g) => Boolean(g.collapsed));
      this.callbacks.onCollapseAllGroups(!allCollapsed);
    });

    // Filter input
    const filterInput = this.container.querySelector<HTMLInputElement>('#workspace-filter-input');
    filterInput?.addEventListener('input', () => {
      this.filterQuery = filterInput.value;
      this.render();
    });
    filterInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.filterQuery) {
          this.filterQuery = '';
          this.render();
        } else {
          filterInput.blur();
        }
      } else if (e.key === 'Enter' && this.filterQuery.trim()) {
        const firstLink = this.container.querySelector<HTMLAnchorElement>(
          '.workspace-content a.repo-primary-link, .workspace-content a.workspace-link',
        );
        if (firstLink?.href) {
          window.location.href = firstLink.href;
        }
      }
    });

    this.container.querySelector<HTMLElement>('#btn-clear-filter')?.addEventListener('click', () => {
      this.filterQuery = '';
      this.render();
    });

    this.container.querySelector<HTMLElement>('#btn-empty-clear')?.addEventListener('click', () => {
      this.filterQuery = '';
      this.render();
    });

    this.container.querySelector<HTMLElement>('#btn-empty-add')?.addEventListener('click', () => {
      this.callbacks.onAddRepo();
    });

    // Toolbar actions
    this.container.querySelector<HTMLElement>('#btn-toolbar-add-repo')?.addEventListener('click', () => {
      this.callbacks.onAddRepo(
        this.activeGroupFilter !== 'all' ? this.activeGroupFilter : undefined,
      );
    });

    this.container.querySelector<HTMLElement>('#btn-toolbar-add-group')?.addEventListener('click', () => {
      this.callbacks.onAddGroup();
    });

    this.container.querySelector<HTMLElement>('#btn-toolbar-json')?.addEventListener('click', () => {
      this.callbacks.onOpenImportExport();
    });

    // Group actions
    this.container.querySelectorAll<HTMLElement>('button[data-group-overflow]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const groupId = btn.getAttribute('data-group-overflow');
        if (groupId) this.openGroupOverflowPopover(btn, groupId);
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-toggle-group]').forEach((bar) => {
      bar.addEventListener('click', (e) => {
        const target = e.target as HTMLElement | null;
        if (target && target.closest('.group-header-right button')) {
          return;
        }
        const groupId = bar.getAttribute('data-toggle-group');
        if (groupId) this.callbacks.onToggleGroupCollapse(groupId);
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-add-repo-in-group]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const groupId = btn.getAttribute('data-add-repo-in-group') || undefined;
        this.callbacks.onAddRepo(groupId);
      });
    });

    // Copy repo slug button
    this.container.querySelectorAll<HTMLElement>('[data-copy-text]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-copy-text') || '';
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          btn.innerHTML = ICONS.check;
          btn.classList.add('is-copied');
          setTimeout(() => {
            btn.innerHTML = ICONS.copy;
            btn.classList.remove('is-copied');
          }, 1200);
        } catch {
          // Ignore clipboard permission failure
        }
      });
    });

    // Drag and drop reordering for repos
    const draggableRows = this.container.querySelectorAll<HTMLElement>('[draggable="true"][data-repo-id]');
    draggableRows.forEach((row) => {
      row.addEventListener('dragstart', (e) => {
        const repoId = row.getAttribute('data-repo-id');
        const fromGroupId = row.getAttribute('data-group-id');
        if (!repoId || !fromGroupId) return;
        this.draggedRepo = { repoId, fromGroupId };
        row.classList.add('is-dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', repoId);
        }
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('is-dragging');
        this.container
          .querySelectorAll('.is-drag-over')
          .forEach((el) => el.classList.remove('is-drag-over'));
        this.draggedRepo = null;
      });

      row.addEventListener('dragover', (e) => {
        if (!this.draggedRepo) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        row.classList.add('is-drag-over');
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('is-drag-over');
      });

      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('is-drag-over');
        if (!this.draggedRepo) return;

        const targetRepoId = row.getAttribute('data-repo-id');
        const targetGroupId = row.getAttribute('data-group-id');
        const targetIndex = Number(row.getAttribute('data-repo-index') || '0');
        if (!targetGroupId || targetRepoId === this.draggedRepo.repoId) return;

        this.callbacks.onMoveRepo(
          this.draggedRepo.repoId,
          this.draggedRepo.fromGroupId,
          targetGroupId,
          targetIndex,
        );
        this.draggedRepo = null;
      });
    });

    // Allow dropping onto group headers or empty group dropzones
    const groupDropzones = this.container.querySelectorAll<HTMLElement>('[data-group-dropzone]');
    groupDropzones.forEach((zone) => {
      zone.addEventListener('dragover', (e) => {
        if (!this.draggedRepo) return;
        e.preventDefault();
        zone.classList.add('is-drag-over');
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('is-drag-over');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('is-drag-over');
        if (!this.draggedRepo) return;
        const targetGroupId = zone.getAttribute('data-group-dropzone');
        if (!targetGroupId) return;
        const targetGroup = this.config.groups.find((g) => g.id === targetGroupId);
        const endIndex = targetGroup ? targetGroup.repos.length : 0;
        this.callbacks.onMoveRepo(
          this.draggedRepo.repoId,
          this.draggedRepo.fromGroupId,
          targetGroupId,
          endIndex,
        );
        this.draggedRepo = null;
      });
    });
  }
}
