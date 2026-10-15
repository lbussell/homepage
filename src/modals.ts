import { getDefaultConfig } from './defaultConfig';
import { ICONS } from './icons';
import {
  createId,
  detectProvider,
  generateAzDOLinks,
  generateGitHubLinks,
  inferCategoryFromUrl,
  LINK_CATEGORIES,
  parseAndNormalizeConfig,
} from './repoHelpers';
import { exportConfigJson } from './storage';
import { HomepageConfig, LinkCategory, RepoEntry, RepoGroup, RepoLink } from './types';

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

export interface RepoModalResult {
  repo: RepoEntry;
  groupId: string;
}

export function openRepoModal(
  modalRoot: HTMLElement,
  options: {
    groups: RepoGroup[];
    initialGroupId: string;
    existingRepo?: RepoEntry;
    onSave: (result: RepoModalResult) => void;
    onDelete?: (repoId: string, groupId: string) => void;
  },
): void {
  const isEdit = Boolean(options.existingRepo);
  let repoName = options.existingRepo ? options.existingRepo.name : '';
  let selectedGroupId = options.initialGroupId || options.groups[0]?.id || '';
  let draftLinks: RepoLink[] = options.existingRepo
    ? options.existingRepo.links.map((l) => ({ ...l }))
    : [
        {
          id: createId('link'),
          category: 'repo',
          label: 'GitHub',
          url: '',
          provider: 'github',
        },
      ];

  const close = () => {
    modalRoot.innerHTML = '';
    document.removeEventListener('keydown', onKeyDown);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
    }
  };
  document.addEventListener('keydown', onKeyDown);

  const syncDraftFromInputs = (overlay: HTMLElement) => {
    const nameInput = overlay.querySelector<HTMLInputElement>('#repo-name-input');
    const groupSelect = overlay.querySelector<HTMLSelectElement>('#repo-group-select');
    if (nameInput) repoName = nameInput.value;
    if (groupSelect) selectedGroupId = groupSelect.value;

    const rows = overlay.querySelectorAll<HTMLElement>('[data-link-row-index]');
    const updated: RepoLink[] = [];
    rows.forEach((row, idx) => {
      const existing = draftLinks[idx];
      const catEl = row.querySelector<HTMLSelectElement>('.link-cat-select');
      const labelEl = row.querySelector<HTMLInputElement>('.link-label-input');
      const urlEl = row.querySelector<HTMLInputElement>('.link-url-input');
      const urlVal = urlEl ? urlEl.value.trim() : '';
      const labelVal = labelEl ? labelEl.value.trim() : '';
      const catVal = (catEl ? catEl.value : 'repo') as LinkCategory;
      updated.push({
        id: existing?.id || createId('link'),
        category: catVal,
        label: labelVal,
        url: urlVal,
        provider: urlVal ? detectProvider(urlVal) : existing?.provider,
      });
    });
    draftLinks = updated;
  };

  const renderModal = () => {
    modalRoot.innerHTML = `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-repo-title">
        <div class="modal-panel modal-panel-lg">
          <div class="modal-header">
            <h2 id="modal-repo-title" class="modal-title">${isEdit ? 'Edit Repository / Item' : 'New Repository / Item'}</h2>
            <button type="button" class="icon-btn" data-modal-close title="Close (Esc)">${ICONS.close}</button>
          </div>
          <div class="modal-body">
            <div class="form-row-2col">
              <div class="form-field">
                <label class="form-label" for="repo-name-input">Name</label>
                <input
                  id="repo-name-input"
                  type="text"
                  class="form-input"
                  placeholder="e.g. owner/repo"
                  value="${escapeAttr(repoName)}"
                  autocomplete="off"
                />
              </div>
              <div class="form-field">
                <label class="form-label" for="repo-group-select">Group</label>
                <select id="repo-group-select" class="form-select">
                  ${options.groups
                    .map(
                      (g) =>
                        `<option value="${escapeAttr(g.id)}" ${
                          g.id === selectedGroupId ? 'selected' : ''
                        }>${escapeHtml(g.name)}</option>`,
                    )
                    .join('')}
                </select>
              </div>
            </div>

            <div class="generator-box">
              <div class="generator-header">Quick Link Generators (Mirror / Multi-Host Helper)</div>
              <div class="generator-grid">
                <div class="generator-card">
                  <div class="generator-card-title">${ICONS.github} <span>GitHub Mirror</span></div>
                  <div class="generator-input-row">
                    <input
                      type="text"
                      id="gen-gh-slug"
                      class="form-input form-input-sm"
                      placeholder="owner/repo or GitHub URL"
                      value="${escapeAttr(repoName.includes('/') && !repoName.includes(' ') ? repoName : '')}"
                    />
                    <button type="button" class="btn btn-sm" id="btn-gen-gh">+ Add GitHub Links</button>
                  </div>
                  <div class="generator-checks">
                    <label class="check-label"><input type="checkbox" id="gh-chk-repo" checked /> Repo</label>
                    <label class="check-label"><input type="checkbox" id="gh-chk-pulls" checked /> Pulls</label>
                    <label class="check-label"><input type="checkbox" id="gh-chk-issues" checked /> Issues</label>
                    <label class="check-label"><input type="checkbox" id="gh-chk-disc" /> Discussions</label>
                    <label class="check-label"><input type="checkbox" id="gh-chk-actions" /> Actions</label>
                  </div>
                </div>

                <div class="generator-card">
                  <div class="generator-card-title">${ICONS.azdo} <span>Azure DevOps Mirror & Pipelines</span></div>
                  <div class="generator-input-row">
                    <input
                      type="text"
                      id="gen-azdo-repo"
                      class="form-input form-input-sm"
                      placeholder="org/project/repo or AzDO _git URL"
                    />
                    <input
                      type="text"
                      id="gen-azdo-scope"
                      class="form-input form-input-sm"
                      placeholder="Scope e.g. \\team\\repo"
                    />
                    <button type="button" class="btn btn-sm" id="btn-gen-azdo">+ Add AzDO Links</button>
                  </div>
                  <div class="generator-checks">
                    <label class="check-label"><input type="checkbox" id="azdo-chk-repo" checked /> AzDO Repo</label>
                    <label class="check-label"><input type="checkbox" id="azdo-chk-pulls" /> AzDO PRs</label>
                    <label class="check-label"><input type="checkbox" id="azdo-chk-pub" checked /> Public Pipeline</label>
                    <label class="check-label"><input type="checkbox" id="azdo-chk-int" checked /> Internal Pipeline</label>
                  </div>
                </div>
              </div>
            </div>

            <div class="links-editor-section">
              <div class="links-editor-header">
                <span class="form-label">Links (${draftLinks.length})</span>
                <button type="button" class="btn btn-sm" id="btn-add-link">${ICONS.plus} Add Link</button>
              </div>
              <div class="links-editor-list">
                ${
                  draftLinks.length === 0
                    ? `<div class="links-empty-hint">No links added yet. Use a generator above or click "+ Add Link".</div>`
                    : draftLinks
                        .map(
                          (link, index) => `
                            <div class="link-edit-row" data-link-row-index="${index}">
                              <select class="form-select form-select-sm link-cat-select" aria-label="Link category">
                                ${LINK_CATEGORIES.map(
                                  (c) =>
                                    `<option value="${c.value}" ${
                                      c.value === link.category ? 'selected' : ''
                                    }>${escapeHtml(c.shortLabel)}</option>`,
                                ).join('')}
                              </select>
                              <input
                                type="text"
                                class="form-input form-input-sm link-label-input"
                                placeholder="Label (e.g. GitHub, AzDO, Public)"
                                value="${escapeAttr(link.label)}"
                                aria-label="Link label"
                              />
                              <input
                                type="url"
                                class="form-input form-input-sm link-url-input"
                                placeholder="https://..."
                                value="${escapeAttr(link.url)}"
                                aria-label="Link URL"
                              />
                              <div class="link-row-actions">
                                <button
                                  type="button"
                                  class="icon-btn"
                                  data-move-link-up="${index}"
                                  title="Move up"
                                  ${index === 0 ? 'disabled' : ''}
                                >${ICONS.arrowUp}</button>
                                <button
                                  type="button"
                                  class="icon-btn"
                                  data-move-link-down="${index}"
                                  title="Move down"
                                  ${index === draftLinks.length - 1 ? 'disabled' : ''}
                                >${ICONS.arrowDown}</button>
                                <button
                                  type="button"
                                  class="icon-btn icon-btn-danger"
                                  data-remove-link="${index}"
                                  title="Remove link"
                                >${ICONS.trash}</button>
                              </div>
                            </div>
                          `,
                        )
                        .join('')
                }
              </div>
            </div>
            <div id="repo-modal-error" class="modal-error" hidden></div>
          </div>
          <div class="modal-footer">
            <div>
              ${
                isEdit && options.onDelete && options.existingRepo
                  ? `<button type="button" class="btn btn-danger" id="btn-delete-repo">${ICONS.trash} Delete Repo</button>`
                  : ''
              }
            </div>
            <div class="modal-footer-right">
              <button type="button" class="btn" data-modal-close>Cancel</button>
              <button type="button" class="btn btn-primary" id="btn-save-repo">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const backdrop = modalRoot.querySelector<HTMLElement>('.modal-backdrop');
    if (!backdrop) return;

    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) close();
    });

    backdrop.querySelectorAll<HTMLElement>('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', close);
    });

    // Auto-infer category when pasting URL if label is empty
    backdrop.querySelectorAll<HTMLElement>('[data-link-row-index]').forEach((row) => {
      const urlInput = row.querySelector<HTMLInputElement>('.link-url-input');
      const labelInput = row.querySelector<HTMLInputElement>('.link-label-input');
      const catSelect = row.querySelector<HTMLSelectElement>('.link-cat-select');
      urlInput?.addEventListener('change', () => {
        const u = urlInput.value.trim();
        if (!u) return;
        const inferredCat = inferCategoryFromUrl(u, labelInput?.value || '');
        if (catSelect && catSelect.value === 'custom' && inferredCat !== 'custom') {
          catSelect.value = inferredCat;
        }
        if (labelInput && !labelInput.value.trim()) {
          const prov = detectProvider(u);
          if (inferredCat === 'repo') {
            labelInput.value = prov === 'github' ? 'GitHub' : prov === 'azdo' ? 'AzDO' : 'Repo';
          } else if (inferredCat === 'pulls') {
            labelInput.value = 'Pulls';
          } else if (inferredCat === 'issues') {
            labelInput.value = 'Issues';
          } else if (inferredCat === 'discussions') {
            labelInput.value = 'Discussions';
          } else if (inferredCat === 'pipelines') {
            labelInput.value = 'Pipeline';
          }
        }
      });
    });

    backdrop.querySelector<HTMLElement>('#btn-add-link')?.addEventListener('click', () => {
      syncDraftFromInputs(backdrop);
      draftLinks.push({
        id: createId('link'),
        category: 'custom',
        label: '',
        url: '',
      });
      renderModal();
    });

    backdrop.querySelectorAll<HTMLElement>('[data-remove-link]').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncDraftFromInputs(backdrop);
        const idx = Number(btn.getAttribute('data-remove-link'));
        draftLinks.splice(idx, 1);
        renderModal();
      });
    });

    backdrop.querySelectorAll<HTMLElement>('[data-move-link-up]').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncDraftFromInputs(backdrop);
        const idx = Number(btn.getAttribute('data-move-link-up'));
        if (idx > 0) {
          const tmp = draftLinks[idx - 1];
          draftLinks[idx - 1] = draftLinks[idx];
          draftLinks[idx] = tmp;
          renderModal();
        }
      });
    });

    backdrop.querySelectorAll<HTMLElement>('[data-move-link-down]').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncDraftFromInputs(backdrop);
        const idx = Number(btn.getAttribute('data-move-link-down'));
        if (idx < draftLinks.length - 1) {
          const tmp = draftLinks[idx + 1];
          draftLinks[idx + 1] = draftLinks[idx];
          draftLinks[idx] = tmp;
          renderModal();
        }
      });
    });

    backdrop.querySelector<HTMLElement>('#btn-gen-gh')?.addEventListener('click', () => {
      syncDraftFromInputs(backdrop);
      const slugInput = backdrop.querySelector<HTMLInputElement>('#gen-gh-slug');
      const slug = slugInput?.value.trim() || repoName.trim();
      const generated = generateGitHubLinks({
        ownerRepo: slug,
        includeRepo: backdrop.querySelector<HTMLInputElement>('#gh-chk-repo')?.checked,
        includePulls: backdrop.querySelector<HTMLInputElement>('#gh-chk-pulls')?.checked,
        includeIssues: backdrop.querySelector<HTMLInputElement>('#gh-chk-issues')?.checked,
        includeDiscussions: backdrop.querySelector<HTMLInputElement>('#gh-chk-disc')?.checked,
        includeActions: backdrop.querySelector<HTMLInputElement>('#gh-chk-actions')?.checked,
      });

      const errEl = backdrop.querySelector<HTMLElement>('#repo-modal-error');
      if (generated.length === 0) {
        if (errEl) {
          errEl.textContent = 'Enter a valid GitHub "owner/repo" or GitHub URL first.';
          errEl.hidden = false;
        }
        return;
      }

      if (!repoName.trim() && slug) {
        repoName = slug;
      }

      // Remove blank placeholder links before appending
      draftLinks = draftLinks.filter((l) => l.url.trim().length > 0);
      const existingUrls = new Set(draftLinks.map((l) => l.url));
      for (const g of generated) {
        if (!existingUrls.has(g.url)) {
          draftLinks.push(g);
        }
      }
      renderModal();
    });

    backdrop.querySelector<HTMLElement>('#btn-gen-azdo')?.addEventListener('click', () => {
      syncDraftFromInputs(backdrop);
      const azdoInput = backdrop.querySelector<HTMLInputElement>('#gen-azdo-repo')?.value.trim() || '';
      const scopeInput = backdrop.querySelector<HTMLInputElement>('#gen-azdo-scope')?.value.trim() || '';
      const generated = generateAzDOLinks({
        input: azdoInput,
        definitionScope: scopeInput,
        includeRepo: backdrop.querySelector<HTMLInputElement>('#azdo-chk-repo')?.checked,
        includePulls: backdrop.querySelector<HTMLInputElement>('#azdo-chk-pulls')?.checked,
        includePublicPipeline: backdrop.querySelector<HTMLInputElement>('#azdo-chk-pub')?.checked,
        includeInternalPipeline: backdrop.querySelector<HTMLInputElement>('#azdo-chk-int')?.checked,
      });

      const errEl = backdrop.querySelector<HTMLElement>('#repo-modal-error');
      if (generated.length === 0) {
        if (errEl) {
          errEl.textContent =
            'Enter a valid Azure DevOps repo ("org/project/repo" or "https://dev.azure.com/org/project/_git/repo").';
          errEl.hidden = false;
        }
        return;
      }

      draftLinks = draftLinks.filter((l) => l.url.trim().length > 0);
      const existingUrls = new Set(draftLinks.map((l) => l.url));
      for (const g of generated) {
        if (!existingUrls.has(g.url)) {
          draftLinks.push(g);
        }
      }
      renderModal();
    });

    backdrop.querySelector<HTMLElement>('#btn-delete-repo')?.addEventListener('click', () => {
      if (options.existingRepo && options.onDelete) {
        options.onDelete(options.existingRepo.id, options.initialGroupId);
        close();
      }
    });

    backdrop.querySelector<HTMLElement>('#btn-save-repo')?.addEventListener('click', () => {
      syncDraftFromInputs(backdrop);
      const errEl = backdrop.querySelector<HTMLElement>('#repo-modal-error');
      const trimmedName = repoName.trim();
      if (!trimmedName) {
        if (errEl) {
          errEl.textContent = 'Repository / item name is required.';
          errEl.hidden = false;
        }
        return;
      }

      const validLinks = draftLinks
        .filter((l) => l.url.trim().length > 0)
        .map((l) => ({
          ...l,
          label: l.label.trim() || 'Link',
          url: l.url.trim(),
          provider: detectProvider(l.url.trim()),
        }));

      options.onSave({
        groupId: selectedGroupId,
        repo: {
          id: options.existingRepo?.id || createId('repo'),
          name: trimmedName,
          links: validLinks,
        },
      });
      close();
    });
  };

  renderModal();
  modalRoot.querySelector<HTMLInputElement>('#repo-name-input')?.focus();
}

export function openGroupModal(
  modalRoot: HTMLElement,
  options: {
    existingGroup?: RepoGroup;
    onSave: (name: string) => void;
    onDelete?: () => void;
  },
): void {
  const isEdit = Boolean(options.existingGroup);
  const initialName = options.existingGroup?.name || '';

  const close = () => {
    modalRoot.innerHTML = '';
    document.removeEventListener('keydown', onKeyDown);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKeyDown);

  modalRoot.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-group-title">
      <div class="modal-panel modal-panel-sm">
        <div class="modal-header">
          <h2 id="modal-group-title" class="modal-title">${isEdit ? 'Edit Group' : 'New Group'}</h2>
          <button type="button" class="icon-btn" data-modal-close title="Close (Esc)">${ICONS.close}</button>
        </div>
        <div class="modal-body">
          <div class="form-field">
            <label class="form-label" for="group-name-input">Group Name</label>
            <input
              id="group-name-input"
              type="text"
              class="form-input"
              placeholder="e.g. Repositories"
              value="${escapeAttr(initialName)}"
              autocomplete="off"
            />
          </div>
          <div id="group-modal-error" class="modal-error" hidden></div>
        </div>
        <div class="modal-footer">
          <div>
            ${
              isEdit && options.onDelete
                ? `<button type="button" class="btn btn-danger" id="btn-delete-group">${ICONS.trash} Delete Group</button>`
                : ''
            }
          </div>
          <div class="modal-footer-right">
            <button type="button" class="btn" data-modal-close>Cancel</button>
            <button type="button" class="btn btn-primary" id="btn-save-group">Save</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const backdrop = modalRoot.querySelector<HTMLElement>('.modal-backdrop');
  if (!backdrop) return;

  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close();
  });

  backdrop.querySelectorAll<HTMLElement>('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', close);
  });

  const input = backdrop.querySelector<HTMLInputElement>('#group-name-input');
  input?.focus();
  input?.select();

  const submit = () => {
    const val = input?.value.trim() || '';
    const errEl = backdrop.querySelector<HTMLElement>('#group-modal-error');
    if (!val) {
      if (errEl) {
        errEl.textContent = 'Group name cannot be empty.';
        errEl.hidden = false;
      }
      return;
    }
    options.onSave(val);
    close();
  };

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });

  backdrop.querySelector<HTMLElement>('#btn-save-group')?.addEventListener('click', submit);
  backdrop.querySelector<HTMLElement>('#btn-delete-group')?.addEventListener('click', () => {
    options.onDelete?.();
    close();
  });
}

export function openConfigJsonModal(
  modalRoot: HTMLElement,
  options: {
    currentConfig: HomepageConfig;
    onApplyConfig: (newConfig: HomepageConfig) => void;
  },
): void {
  const jsonText = exportConfigJson(options.currentConfig);

  const close = () => {
    modalRoot.innerHTML = '';
    document.removeEventListener('keydown', onKeyDown);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKeyDown);

  modalRoot.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-json-title">
      <div class="modal-panel modal-panel-lg">
        <div class="modal-header">
          <h2 id="modal-json-title" class="modal-title">JSON Configuration (Import / Export)</h2>
          <button type="button" class="icon-btn" data-modal-close title="Close (Esc)">${ICONS.close}</button>
        </div>
        <div class="modal-body">
          <div class="json-toolbar">
            <button type="button" class="btn btn-sm" id="btn-copy-json">${ICONS.copy} <span id="copy-json-label">Copy JSON</span></button>
            <button type="button" class="btn btn-sm" id="btn-download-json">${ICONS.download} Download .json</button>
            <label class="btn btn-sm file-upload-btn">
              ${ICONS.upload} Load .json File
              <input type="file" id="input-upload-json" accept=".json,application/json" hidden />
            </label>
            <button type="button" class="btn btn-sm" id="btn-reset-default" title="Reset to default empty configuration">
              ${ICONS.reset} Reset Default
            </button>
          </div>
          <textarea
            id="json-config-textarea"
            class="json-textarea"
            spellcheck="false"
            aria-label="JSON configuration"
          >${escapeHtml(jsonText)}</textarea>
          <div id="json-modal-error" class="modal-error" hidden></div>
        </div>
        <div class="modal-footer">
          <div class="modal-footer-hint">Edit or paste JSON above and click Apply to update your workspace.</div>
          <div class="modal-footer-right">
            <button type="button" class="btn" data-modal-close>Cancel</button>
            <button type="button" class="btn btn-primary" id="btn-apply-json">Apply JSON Config</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const backdrop = modalRoot.querySelector<HTMLElement>('.modal-backdrop');
  if (!backdrop) return;

  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close();
  });

  backdrop.querySelectorAll<HTMLElement>('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', close);
  });

  const textarea = backdrop.querySelector<HTMLTextAreaElement>('#json-config-textarea');
  const errEl = backdrop.querySelector<HTMLElement>('#json-modal-error');

  backdrop.querySelector<HTMLElement>('#btn-copy-json')?.addEventListener('click', async () => {
    if (!textarea) return;
    try {
      await navigator.clipboard.writeText(textarea.value);
      const label = backdrop.querySelector<HTMLElement>('#copy-json-label');
      if (label) {
        label.textContent = 'Copied!';
        setTimeout(() => {
          label.textContent = 'Copy JSON';
        }, 1500);
      }
    } catch {
      textarea.select();
      document.execCommand('copy');
    }
  });

  backdrop.querySelector<HTMLElement>('#btn-download-json')?.addEventListener('click', () => {
    if (!textarea) return;
    const blob = new Blob([textarea.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'homepage-config.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const fileInput = backdrop.querySelector<HTMLInputElement>('#input-upload-json');
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file || !textarea) return;
    try {
      const content = await file.text();
      textarea.value = content;
      if (errEl) errEl.hidden = true;
    } catch (err) {
      if (errEl) {
        errEl.textContent = `Failed to read file: ${(err as Error).message}`;
        errEl.hidden = false;
      }
    }
  });

  backdrop.querySelector<HTMLElement>('#btn-reset-default')?.addEventListener('click', () => {
    if (!textarea) return;
    const def = getDefaultConfig();
    def.theme = options.currentConfig.theme;
    def.viewMode = options.currentConfig.viewMode;
    def.sidebarCollapsed = options.currentConfig.sidebarCollapsed;
    textarea.value = exportConfigJson(def);
    if (errEl) errEl.hidden = true;
  });

  backdrop.querySelector<HTMLElement>('#btn-apply-json')?.addEventListener('click', () => {
    if (!textarea) return;
    try {
      const normalized = parseAndNormalizeConfig(textarea.value, {
        theme: options.currentConfig.theme,
        viewMode: options.currentConfig.viewMode,
        sidebarCollapsed: options.currentConfig.sidebarCollapsed,
      });
      options.onApplyConfig(normalized);
      close();
    } catch (err) {
      if (errEl) {
        errEl.textContent = `Invalid JSON configuration: ${(err as Error).message}`;
        errEl.hidden = false;
      }
    }
  });
}
