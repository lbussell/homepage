# Dev Workspace New Tab Extension

A high-density Chrome / Edge Manifest V3 New Tab extension featuring:

- **Cascading File-Menu Bookmarks Sidebar**: Displays your browser bookmarks along the left sidebar with multi-level flyout submenus on click.
- **Multi-Mirror Repository & Quick-Links Workspace**: Groupable, reorderable, and editable repositories supporting multiple mirrors per logical repo (e.g., GitHub + Azure DevOps), Pull Requests, Issues, Pipelines, Discussions, Security, Boards, and Docs.
- **Responsive Multi-Group Tables**: Side-by-side group tables on wide monitors with automatic `...` overflow menus on narrower viewports and instant keyboard filtering (`/`).
- **JSON Config Import / Export**: Export, edit, paste, or import your workspace configuration as JSON. Any `*.local.json` file in the project root is gitignored and loaded automatically in local `npm run dev` when `localStorage` is empty.
- **System Light / Dark Theme**: Follows `prefers-color-scheme` with a quick manual toggle (`Lights Off` / `Lights On`).

## Install in Chrome or Edge

1. Build the extension bundle:
   ```bash
   npm install
   npm run build
   ```
2. Open `edge://extensions` (Edge) or `chrome://extensions` (Chrome).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `dist` directory (`D:\copilot-app\homepage\dist`).

## Development & Tests

- `npm run dev` — Start local Vite dev server (uses fallback bookmarks when outside extension context)
- `npm test` — Run unit and component tests with Vitest
- `npm run build` — Type-check and build the production extension into `dist/`

