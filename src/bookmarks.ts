import { BookmarkNode } from './types';

function hasChromeBookmarks(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    Boolean(chrome.bookmarks) &&
    typeof chrome.bookmarks.getTree === 'function'
  );
}

function mapChromeNode(node: chrome.bookmarks.BookmarkTreeNode): BookmarkNode {
  return {
    id: node.id,
    title: node.title || (node.url ? node.url : 'Untitled'),
    url: node.url,
    children: node.children ? node.children.map(mapChromeNode) : undefined,
  };
}

/**
 * Extracts top-level sidebar bookmark entries from the browser's bookmark tree.
 * Flattens the primary Bookmarks/Favorites bar so items appear directly in the sidebar,
 * and appends non-empty "Other Bookmarks" / "Mobile Bookmarks" folders.
 */
export function normalizeBookmarkRoot(roots: BookmarkNode[]): BookmarkNode[] {
  if (!roots || roots.length === 0) return [];

  const root = roots[0];
  if (!root.children || root.children.length === 0) {
    return roots;
  }

  const topContainers = root.children;
  const primaryBar = topContainers[0];
  const secondaryContainers = topContainers.slice(1);

  const items: BookmarkNode[] = [];
  if (primaryBar && primaryBar.children && primaryBar.children.length > 0) {
    items.push(...primaryBar.children);
  }

  for (const container of secondaryContainers) {
    if (container.children && container.children.length > 0) {
      if (items.length === 0) {
        items.push(...container.children);
      } else {
        items.push(container);
      }
    }
  }

  return items;
}

export function getFallbackBookmarks(): BookmarkNode[] {
  return [
    {
      id: 'bm-folder-dev',
      title: 'Development',
      children: [
        {
          id: 'bm-gh-home',
          title: 'GitHub',
          url: 'https://github.com',
        },
        {
          id: 'bm-azdo-home',
          title: 'Azure DevOps',
          url: 'https://dev.azure.com',
        },
        {
          id: 'bm-sub-docs',
          title: 'Documentation',
          children: [
            {
              id: 'bm-doc-mdn',
              title: 'MDN Web Docs',
              url: 'https://developer.mozilla.org',
            },
            {
              id: 'bm-doc-ts',
              title: 'TypeScript Handbook',
              url: 'https://www.typescriptlang.org/docs/',
            },
          ],
        },
      ],
    },
    {
      id: 'bm-direct-gh-pulls',
      title: 'Pull Requests',
      url: 'https://github.com/pulls',
    },
    {
      id: 'bm-direct-gh-issues',
      title: 'Issues',
      url: 'https://github.com/issues/assigned',
    },
  ];
}

export async function loadBookmarks(): Promise<BookmarkNode[]> {
  if (hasChromeBookmarks()) {
    try {
      const tree = await chrome.bookmarks.getTree();
      const mapped = tree.map(mapChromeNode);
      const normalized = normalizeBookmarkRoot(mapped);
      if (normalized.length > 0) {
        return normalized;
      }
      return [];
    } catch {
      return getFallbackBookmarks();
    }
  }
  return getFallbackBookmarks();
}

export function subscribeBookmarkChanges(onChange: () => void): () => void {
  if (!hasChromeBookmarks()) {
    return () => {};
  }

  const handler = () => onChange();
  chrome.bookmarks.onCreated?.addListener(handler);
  chrome.bookmarks.onRemoved?.addListener(handler);
  chrome.bookmarks.onChanged?.addListener(handler);
  chrome.bookmarks.onMoved?.addListener(handler);
  chrome.bookmarks.onChildrenReordered?.addListener(handler);

  return () => {
    chrome.bookmarks.onCreated?.removeListener(handler);
    chrome.bookmarks.onRemoved?.removeListener(handler);
    chrome.bookmarks.onChanged?.removeListener(handler);
    chrome.bookmarks.onMoved?.removeListener(handler);
    chrome.bookmarks.onChildrenReordered?.removeListener(handler);
  };
}

export function getExtensionFaviconUrl(pageUrl: string): string | null {
  if (
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    typeof chrome.runtime.id === 'string' &&
    chrome.runtime.id.length > 0 &&
    typeof chrome.runtime.getURL === 'function'
  ) {
    try {
      const url = new URL(chrome.runtime.getURL('/_favicon/'));
      url.searchParams.set('pageUrl', pageUrl);
      url.searchParams.set('size', '16');
      return url.toString();
    } catch {
      return null;
    }
  }
  return null;
}
