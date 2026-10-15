import { getExtensionFaviconUrl } from './bookmarks';
import { detectProvider } from './repoHelpers';
import { ICONS } from './icons';
import { BookmarkNode, ThemePreference } from './types';

export interface SidebarCallbacks {
  onToggleCollapse: () => void;
  onToggleTheme: () => void;
  onAddRepo: () => void;
  onAddGroup: () => void;
  onOpenImportExport: () => void;
}

interface ActiveSubmenu {
  node: BookmarkNode;
  anchorRect: DOMRect;
  depth: number;
}

function getBookmarkItemIconHtml(node: BookmarkNode): string {
  const isFolder = Boolean(node.children && !node.url);
  if (isFolder) {
    return `<span class="bm-icon bm-folder-icon">${ICONS.folder}</span>`;
  }

  if (node.url) {
    const extFavicon = getExtensionFaviconUrl(node.url);
    if (extFavicon) {
      return `<span class="bm-icon"><img class="bm-favicon" src="${escapeAttr(extFavicon)}" alt="" loading="lazy" /></span>`;
    }
    const provider = detectProvider(node.url);
    if (provider === 'github') {
      return `<span class="bm-icon">${ICONS.github}</span>`;
    }
    if (provider === 'azdo') {
      return `<span class="bm-icon">${ICONS.azdo}</span>`;
    }
    if (provider === 'powerbi' || provider === 'sharepoint') {
      return `<span class="bm-icon">${ICONS.docs}</span>`;
    }
  }

  return `<span class="bm-icon">${ICONS.bookmark}</span>`;
}

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

export class BookmarksSidebar {
  private container: HTMLElement;
  private flyoutLayer: HTMLElement;
  private bookmarks: BookmarkNode[] = [];
  private collapsed = false;
  private theme: ThemePreference = 'system';
  private callbacks: SidebarCallbacks;
  private activeMenus: ActiveSubmenu[] = [];

  constructor(
    container: HTMLElement,
    flyoutLayer: HTMLElement,
    callbacks: SidebarCallbacks,
  ) {
    this.container = container;
    this.flyoutLayer = flyoutLayer;
    this.callbacks = callbacks;

    document.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        !this.container.contains(target) &&
        !this.flyoutLayer.contains(target)
      ) {
        this.closeAllMenus();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeMenus.length > 0) {
        this.closeAllMenus();
      }
    });
  }

  public setState(options: {
    bookmarks: BookmarkNode[];
    collapsed: boolean;
    theme: ThemePreference;
  }): void {
    this.bookmarks = options.bookmarks;
    this.collapsed = options.collapsed;
    this.theme = options.theme;
    this.closeAllMenus();
    this.render();
  }

  public closeAllMenus(): void {
    if (this.activeMenus.length > 0) {
      this.activeMenus = [];
      this.renderFlyouts();
      this.updateActiveTopHighlight();
    }
  }

  private toggleSubmenuAtDepth(node: BookmarkNode, anchorRect: DOMRect, depth: number): void {
    const existingAtDepth = this.activeMenus[depth];
    if (existingAtDepth && existingAtDepth.node.id === node.id) {
      this.activeMenus = this.activeMenus.slice(0, depth);
    } else {
      this.activeMenus = this.activeMenus.slice(0, depth);
      this.activeMenus.push({ node, anchorRect, depth });
    }
    this.renderFlyouts();
    this.updateActiveTopHighlight();
  }

  private updateActiveTopHighlight(): void {
    const activeTopId = this.activeMenus[0]?.node.id ?? null;
    const rows = this.container.querySelectorAll<HTMLElement>('[data-bm-top-id]');
    rows.forEach((row) => {
      const id = row.getAttribute('data-bm-top-id');
      row.classList.toggle('is-active', id === activeTopId);
      row.setAttribute('aria-expanded', id === activeTopId ? 'true' : 'false');
    });
  }

  private getThemeLabel(): string {
    const isDarkResolved =
      this.theme === 'dark' ||
      (this.theme === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches);

    if (this.theme === 'system') {
      return isDarkResolved ? 'Lights On' : 'Lights Off';
    }
    return this.theme === 'dark' ? 'Lights On' : 'Lights Off';
  }

  public render(): void {
    this.container.classList.toggle('is-collapsed', this.collapsed);

    if (this.collapsed) {
      this.container.innerHTML = `
        <div class="sidebar-collapsed-rail">
          <div class="sidebar-collapsed-top">
            ${this.bookmarks
              .map((node) => {
                const isFolder = Boolean(node.children && !node.url);
                if (isFolder) {
                  return `
                    <button
                      type="button"
                      class="sidebar-rail-btn"
                      data-bm-top-id="${escapeAttr(node.id)}"
                      title="${escapeAttr(node.title)}"
                      aria-label="${escapeAttr(node.title)}"
                    >
                      ${getBookmarkItemIconHtml(node)}
                    </button>
                  `;
                }
                return `
                  <a
                    href="${escapeAttr(node.url || '#')}"
                    class="sidebar-rail-btn"
                    title="${escapeAttr(node.title)}"
                    aria-label="${escapeAttr(node.title)}"
                  >
                    ${getBookmarkItemIconHtml(node)}
                  </a>
                `;
              })
              .join('')}
          </div>
          <div class="sidebar-collapsed-bottom">
            <button type="button" class="sidebar-rail-btn" data-action="toggle-theme" title="${escapeAttr(this.getThemeLabel())}">
              ${ICONS.contrast}
            </button>
            <button type="button" class="sidebar-rail-btn" data-action="toggle-collapse" title="Expand sidebar">
              ${ICONS.expandRight}
            </button>
          </div>
        </div>
      `;
      this.bindSidebarEvents();
      return;
    }

    const itemsHtml =
      this.bookmarks.length === 0
        ? `<div class="sidebar-empty">No bookmarks</div>`
        : this.bookmarks
            .map((node) => {
              const isFolder = Boolean(node.children && !node.url);
              if (isFolder) {
                return `
                  <button
                    type="button"
                    class="sidebar-item sidebar-folder"
                    data-bm-top-id="${escapeAttr(node.id)}"
                    aria-haspopup="menu"
                    aria-expanded="false"
                  >
                    ${getBookmarkItemIconHtml(node)}
                    <span class="sidebar-item-label">${escapeHtml(node.title)}</span>
                    <span class="sidebar-item-chevron">${ICONS.chevronRight}</span>
                  </button>
                `;
              }
              return `
                <a
                  href="${escapeAttr(node.url || '#')}"
                  class="sidebar-item sidebar-link"
                  title="${escapeAttr(node.title)} (${escapeAttr(node.url || '')})"
                >
                  ${getBookmarkItemIconHtml(node)}
                  <span class="sidebar-item-label">${escapeHtml(node.title)}</span>
                </a>
              `;
            })
            .join('');

    this.container.innerHTML = `
      <nav class="sidebar-bookmarks" aria-label="Bookmarks">
        ${itemsHtml}
      </nav>
      <div class="sidebar-footer">
        <button type="button" class="sidebar-item sidebar-action" data-action="toggle-theme">
          <span class="bm-icon">${ICONS.contrast}</span>
          <span class="sidebar-item-label">${escapeHtml(this.getThemeLabel())}</span>
        </button>
        <button type="button" class="sidebar-item sidebar-action" data-action="toggle-collapse">
          <span class="bm-icon">${ICONS.collapseLeft}</span>
          <span class="sidebar-item-label">Collapse</span>
        </button>
      </div>
    `;

    this.bindSidebarEvents();
  }

  private bindSidebarEvents(): void {
    this.container
      .querySelector<HTMLElement>('.sidebar-bookmarks, .sidebar-collapsed-top')
      ?.addEventListener('scroll', () => {
        this.closeAllMenus();
      });

    this.container.querySelectorAll<HTMLImageElement>('img.bm-favicon').forEach((img) => {
      img.addEventListener('error', () => {
        const parent = img.parentElement;
        if (parent) {
          parent.innerHTML = ICONS.bookmark;
        }
      });
    });

    const nodeMap = new Map<string, BookmarkNode>();
    for (const node of this.bookmarks) {
      nodeMap.set(node.id, node);
    }

    const topButtons = this.container.querySelectorAll<HTMLElement>('[data-bm-top-id]');
    topButtons.forEach((btn) => {
      const id = btn.getAttribute('data-bm-top-id') || '';
      const node = nodeMap.get(id);
      if (!node) return;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleSubmenuAtDepth(node, btn.getBoundingClientRect(), 0);
      });
    });

    const directLinks = this.container.querySelectorAll<HTMLElement>('.sidebar-link');
    directLinks.forEach((link) => {
      link.addEventListener('click', () => {
        this.closeAllMenus();
      });
    });

    this.container.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        this.closeAllMenus();
        if (action === 'toggle-collapse') this.callbacks.onToggleCollapse();
        if (action === 'toggle-theme') this.callbacks.onToggleTheme();
        if (action === 'add-repo') this.callbacks.onAddRepo();
        if (action === 'add-group') this.callbacks.onAddGroup();
        if (action === 'import-export') this.callbacks.onOpenImportExport();
      });
    });
  }

  private renderFlyouts(): void {
    this.flyoutLayer.innerHTML = '';
    if (this.activeMenus.length === 0) return;

    const sidebarRect = this.container.getBoundingClientRect();
    let prevPanelRight = sidebarRect.right;

    this.activeMenus.forEach((submenu, depth) => {
      const panel = document.createElement('div');
      panel.className = 'bm-flyout-menu';
      panel.setAttribute('role', 'menu');
      panel.setAttribute('data-depth', String(depth));

      const children = submenu.node.children || [];
      const childMap = new Map<string, BookmarkNode>();

      if (children.length === 0) {
        panel.innerHTML = `<div class="bm-flyout-empty">Empty folder</div>`;
      } else {
        panel.innerHTML = children
          .map((child) => {
            childMap.set(child.id, child);
            const isFolder = Boolean(child.children && !child.url);
            const isChildActive = this.activeMenus[depth + 1]?.node.id === child.id;
            if (isFolder) {
              return `
                <button
                  type="button"
                  class="bm-flyout-item bm-flyout-folder ${isChildActive ? 'is-active' : ''}"
                  data-child-id="${escapeAttr(child.id)}"
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded="${isChildActive ? 'true' : 'false'}"
                >
                  ${getBookmarkItemIconHtml(child)}
                  <span class="bm-flyout-label">${escapeHtml(child.title)}</span>
                  <span class="bm-flyout-chevron">${ICONS.chevronRight}</span>
                </button>
              `;
            }
            return `
              <a
                href="${escapeAttr(child.url || '#')}"
                class="bm-flyout-item bm-flyout-link"
                data-child-id="${escapeAttr(child.id)}"
                role="menuitem"
                title="${escapeAttr(child.title)} (${escapeAttr(child.url || '')})"
              >
                ${getBookmarkItemIconHtml(child)}
                <span class="bm-flyout-label">${escapeHtml(child.title)}</span>
              </a>
            `;
          })
          .join('');
      }

      this.flyoutLayer.appendChild(panel);

      // Position panel next to anchor/previous menu and clamp inside viewport
      const panelRect = panel.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      let left = depth === 0 ? sidebarRect.right + 2 : prevPanelRight + 2;
      if (left + panelRect.width > viewportW - 8) {
        left = Math.max(8, submenu.anchorRect.left - panelRect.width - 2);
      }

      let top = submenu.anchorRect.top - 4;
      if (top + panelRect.height > viewportH - 8) {
        top = Math.max(8, viewportH - panelRect.height - 8);
      }
      if (top < 6) top = 6;

      panel.style.left = `${Math.round(left)}px`;
      panel.style.top = `${Math.round(top)}px`;
      prevPanelRight = left + panelRect.width;

      // Handle broken extension favicons gracefully
      panel.querySelectorAll<HTMLImageElement>('img.bm-favicon').forEach((img) => {
        img.addEventListener('error', () => {
          const parent = img.parentElement;
          if (parent) {
            parent.innerHTML = ICONS.bookmark;
          }
        });
      });

      panel.querySelectorAll<HTMLElement>('[data-child-id]').forEach((itemEl) => {
        const childId = itemEl.getAttribute('data-child-id') || '';
        const childNode = childMap.get(childId);
        if (!childNode) return;
        const isFolder = Boolean(childNode.children && !childNode.url);

        if (isFolder) {
          itemEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSubmenuAtDepth(
              childNode,
              itemEl.getBoundingClientRect(),
              depth + 1,
            );
          });
        } else {
          itemEl.addEventListener('click', () => {
            this.closeAllMenus();
          });
        }
      });
    });
  }
}
