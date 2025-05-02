// DOM Elements
const bookmarksList = document.getElementById('bookmarks-list');
const reposContainer = document.getElementById('repos-container');
const searchInput = document.getElementById('search-input');
const addBookmarkBtn = document.getElementById('add-bookmark');
const addGithubBtn = document.getElementById('add-github');
const settingsBtn = document.getElementById('settings-btn');
const bookmarkModal = document.getElementById('bookmark-modal');
const githubModal = document.getElementById('github-modal');
const settingsModal = document.getElementById('settings-modal');
const bookmarkForm = document.getElementById('bookmark-form');
const githubForm = document.getElementById('github-form');
const settingsForm = document.getElementById('settings-form');
const dashboardTitleEl = document.getElementById('dashboard-title');
const exportDataBtn = document.getElementById('export-data');
const importDataInput = document.getElementById('import-data');
const resetDataBtn = document.getElementById('reset-data');
const tabButtons = document.querySelectorAll('.tab-btn');
const isAzureDevOpsCheckbox = document.getElementById('is-azure-devops');
const azureFieldsGroup = document.getElementById('azure-fields-group');

// Helper functions
function extractDomain(url) {
    try {
        const domain = new URL(url).hostname;
        return domain;
    } catch (error) {
        console.error("Invalid URL:", error);
        return "";
    }
}

function getFaviconUrl(domain, size = 32) {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

// Data structure
let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
let githubRepos = JSON.parse(localStorage.getItem('githubRepos')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || {
    pageTitle: 'My Bookmarks',
    dashboardTitle: 'My Dashboard',
    primaryColor: '#4285f4'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    setupEventListeners();
    applySettings();
});

// Event listeners setup
function setupEventListeners() {
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterItems(button.dataset.tab);
        });
    });

    // Azure DevOps checkbox toggle
    isAzureDevOpsCheckbox.addEventListener('change', () => {
        if (isAzureDevOpsCheckbox.checked) {
            azureFieldsGroup.style.display = 'block';
            document.getElementById('azure-org').setAttribute('required', '');
            document.getElementById('azure-repo').setAttribute('required', '');
        } else {
            azureFieldsGroup.style.display = 'none';
            document.getElementById('azure-org').removeAttribute('required');
            document.getElementById('azure-repo').removeAttribute('required');
        }
    });

    // Search functionality
    if (searchInput !== null) {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();

            // Filter bookmarks
            const filteredBookmarks = bookmarks.filter(item =>
                item.title.toLowerCase().includes(searchTerm) ||
                (item.url && item.url.toLowerCase().includes(searchTerm))
            );
            renderBookmarks(filteredBookmarks);

            // Filter GitHub repos
            const filteredRepos = githubRepos.filter(item =>
                item.title.toLowerCase().includes(searchTerm) ||
                (item.owner && item.owner.toLowerCase().includes(searchTerm)) ||
                (item.repo && item.repo.toLowerCase().includes(searchTerm))
            );
            renderGithubRepos(filteredRepos);
        });
    }

    // Modal controls
    addBookmarkBtn.addEventListener('click', () => openModal(bookmarkModal));
    addGithubBtn.addEventListener('click', () => openModal(githubModal));
    settingsBtn.addEventListener('click', () => openSettingsModal());

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeModals();
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === bookmarkModal || e.target === githubModal || e.target === settingsModal) {
            closeModals();
        }
    });

    // Form submissions
    bookmarkForm.addEventListener('submit', addBookmark);
    githubForm.addEventListener('submit', addGithubRepo);
    settingsForm.addEventListener('submit', saveSettings);

    // Data export and import
    exportDataBtn.addEventListener('click', exportData);
    importDataInput.addEventListener('change', importData);
    resetDataBtn.addEventListener('click', resetData);
}

// Render all items
function renderAll() {
    renderBookmarks(bookmarks);
    renderGithubRepos(githubRepos);
}

// Render bookmarks in the sidebar
function renderBookmarks(bookmarksToRender) {
    if (bookmarksList === null) {
        return;
    }

    bookmarksList.innerHTML = '';

    if (bookmarksToRender.length === 0) {
        bookmarksList.innerHTML = '<p class="no-bookmarks">No bookmarks yet. Add some!</p>';
        return;
    }

    // Render bookmarks in sidebar
    bookmarksToRender.forEach(bookmark => {
        const bookmarkItem = document.createElement('div');
        bookmarkItem.className = 'bookmark-item';
        bookmarkItem.dataset.id = bookmark.id;

        // Get domain if bookmark doesn't have faviconUrl stored
        if (!bookmark.faviconUrl && bookmark.url) {
            const domain = extractDomain(bookmark.url);
            bookmark.faviconUrl = getFaviconUrl(domain);
            saveBookmarks(); // Save the updated favicon URL
        }

        bookmarkItem.innerHTML = `
            <span class="bookmark-icon">
                ${bookmark.faviconUrl
                  ? `<img src="${bookmark.faviconUrl}" alt="${bookmark.title}" width="16" height="16">`
                  : `<i class="fas fa-link"></i>`}
            </span>
            <div class="bookmark-info">
                <div class="bookmark-title">${bookmark.title}</div>
            </div>
            <div class="bookmark-actions">
                <button class="action-btn edit-bookmark" data-id="${bookmark.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-bookmark" data-id="${bookmark.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        bookmarksList.appendChild(bookmarkItem);

        // Make the whole bookmark item clickable except for action buttons
        bookmarkItem.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn')) {
                window.open(bookmark.url, '_blank');
            }
        });

        // Add event listeners for actions
        bookmarkItem.querySelector('.edit-bookmark').addEventListener('click', (e) => {
            e.stopPropagation();
            editBookmark(bookmark.id);
        });

        bookmarkItem.querySelector('.delete-bookmark').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteBookmark(bookmark.id);
        });
    });
}

// Render GitHub repos in the main content
function renderGithubRepos(reposToRender) {
    reposContainer.innerHTML = '';

    if (reposToRender.length === 0) {
        reposContainer.innerHTML = '<p class="no-repos">No GitHub repositories yet. Add some!</p>';
        return;
    }

    // Render github cards
    reposToRender.forEach(repo => {
        const card = document.createElement('div');
        card.className = 'github-card';
        card.dataset.id = repo.id;

        // Determine repository URLs
        const githubUrl = `https://github.com/${repo.owner}/${repo.repo}`;
        let azureDevOpsUrl = '';
        let pipelinesUrl = '';
        
        if (repo.isAzureDevOps) {
            azureDevOpsUrl = `https://dev.azure.com/${repo.azureOrg}/${repo.azureRepo}/_git/${repo.azureRepo}`;
            pipelinesUrl = repo.azurePipelines || `https://dev.azure.com/${repo.azureOrg}/${repo.azureRepo}/_build`;
            card.className += ' has-azure-devops';
        }

        // Create badge with appropriate icon
        const ownerBadgeContent = `<i class="fab fa-github"></i> ${repo.owner}`;
        
        // Create Azure DevOps badge if needed
        let azureBadgeContent = '';
        if (repo.isAzureDevOps) {
            azureBadgeContent = `<span class="owner-badge azure-owner-badge"><i class="fab fa-microsoft"></i> ${repo.azureOrg}</span>`;
        }

        card.innerHTML = `
            <div class="github-header">
                <div class="repo-title-container">
                    <a href="${githubUrl}" class="github-title" target="_blank">
                        ${repo.repo}
                    </a>
                    <div class="badges-container">
                        <span class="owner-badge">${ownerBadgeContent}</span>
                        ${azureBadgeContent}
                    </div>
                </div>
                <div class="bookmark-actions">
                    <button class="action-btn delete-github" data-id="${repo.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="github-links">
                <a href="${githubUrl}" class="github-link" target="_blank">
                    <i class="fas fa-code"></i> GitHub
                </a>
                <a href="${githubUrl}/issues" class="github-link" target="_blank">
                    <i class="fas fa-exclamation-circle"></i> Issues
                </a>
                <a href="${githubUrl}/pulls" class="github-link" target="_blank">
                    <i class="fas fa-code-branch"></i> PRs
                </a>
                <a href="${githubUrl}/actions" class="github-link" target="_blank">
                    <i class="fas fa-play-circle"></i> Actions
                </a>`;

        // Add Azure DevOps-specific links if this repo has Azure DevOps
        if (repo.isAzureDevOps) {
            card.querySelector('.github-links').innerHTML += `
                <a href="${azureDevOpsUrl}" class="github-link azure-link" target="_blank">
                    <i class="fab fa-microsoft"></i> Azure
                </a>
                <a href="${azureDevOpsUrl}/pullrequests" class="github-link azure-link" target="_blank">
                    <i class="fas fa-code-branch"></i> Azure PRs
                </a>
                <a href="${pipelinesUrl}" class="github-link azure-link" target="_blank">
                    <i class="fas fa-play-circle"></i> Pipelines
                </a>
            `;
        } else {
            // Add remaining GitHub links for non-Azure repos
            card.querySelector('.github-links').innerHTML += `
                <a href="${githubUrl}/discussions" class="github-link" target="_blank">
                    <i class="fas fa-comments"></i> Discussions
                </a>
                <a href="${githubUrl}/projects" class="github-link" target="_blank">
                    <i class="fas fa-project-diagram"></i> Projects
                </a>
            `;
        }

        card.querySelector('.github-links').innerHTML += `
            </div>
        `;

        reposContainer.appendChild(card);

        // Add event listener for delete
        card.querySelector('.delete-github').addEventListener('click', () => deleteGithubRepo(repo.id));
    });
}

// Modal helpers
function openModal(modal) {
    modal.style.display = 'flex';
}

function closeModals() {
    bookmarkModal.style.display = 'none';
    githubModal.style.display = 'none';
    settingsModal.style.display = 'none';
    bookmarkForm.reset();
    githubForm.reset();
    settingsForm.reset();
}

// Add bookmark
function addBookmark(e) {
    e.preventDefault();

    const title = document.getElementById('bookmark-title').value;
    const url = document.getElementById('bookmark-url').value;

    // Get domain and favicon URL
    const domain = extractDomain(url);
    const faviconUrl = getFaviconUrl(domain);

    const newBookmark = {
        id: Date.now(),
        title,
        url,
        faviconUrl,
        domain,
        type: 'bookmark'
    };

    bookmarks.push(newBookmark);
    saveBookmarks();
    renderBookmarks(bookmarks);

    closeModals();
}

// Add GitHub repo
function addGithubRepo(e) {
    e.preventDefault();

    const owner = document.getElementById('github-owner').value;
    const repo = document.getElementById('github-repo').value;
    const isAzureDevOps = document.getElementById('is-azure-devops').checked;

    let azureOrg = '';
    let azureRepo = '';
    let azurePipelines = '';

    if (isAzureDevOps) {
        azureOrg = document.getElementById('azure-org').value;
        azureRepo = document.getElementById('azure-repo').value;
        azurePipelines = document.getElementById('azure-pipelines').value;
    }

    const newRepo = {
        id: Date.now(),
        owner: isAzureDevOps ? azureOrg : owner,
        repo: isAzureDevOps ? azureRepo : repo,
        title: `${isAzureDevOps ? azureOrg : owner}/${isAzureDevOps ? azureRepo : repo}`,
        type: 'github',
        isAzureDevOps,
        azureOrg,
        azureRepo,
        azurePipelines
    };

    githubRepos.push(newRepo);
    saveGithubRepos();
    renderGithubRepos(githubRepos);

    closeModals();
}

// Edit bookmark
function editBookmark(id) {
    const bookmark = bookmarks.find(b => b.id === id);

    if (bookmark) {
        document.getElementById('bookmark-title').value = bookmark.title;
        document.getElementById('bookmark-url').value = bookmark.url;

        // Convert form to edit mode
        bookmarkForm.dataset.mode = 'edit';
        bookmarkForm.dataset.id = id;

        // Change submit button text
        bookmarkForm.querySelector('button[type="submit"]').textContent = 'Update Bookmark';

        // Add event listener for edit mode
        bookmarkForm.removeEventListener('submit', addBookmark);
        bookmarkForm.addEventListener('submit', updateBookmark);

        openModal(bookmarkModal);
    }
}

// Update bookmark
function updateBookmark(e) {
    e.preventDefault();

    const id = parseInt(bookmarkForm.dataset.id);
    const title = document.getElementById('bookmark-title').value;
    const url = document.getElementById('bookmark-url').value;

    // Get domain and favicon URL if URL changed
    const domain = extractDomain(url);
    const faviconUrl = getFaviconUrl(domain);

    const index = bookmarks.findIndex(b => b.id === id);

    if (index !== -1) {
        // Check if URL has changed
        const urlChanged = bookmarks[index].url !== url;

        bookmarks[index] = {
            ...bookmarks[index],
            title,
            url,
            // Update domain and favicon if URL changed
            domain: urlChanged ? domain : bookmarks[index].domain,
            faviconUrl: urlChanged ? faviconUrl : bookmarks[index].faviconUrl
        };

        saveBookmarks();
        renderBookmarks(bookmarks);
    }

    // Reset form to add mode
    bookmarkForm.dataset.mode = 'add';
    bookmarkForm.removeEventListener('submit', updateBookmark);
    bookmarkForm.addEventListener('submit', addBookmark);
    bookmarkForm.querySelector('button[type="submit"]').textContent = 'Save Bookmark';

    closeModals();
}

// Delete bookmark
function deleteBookmark(id) {
    if (confirm('Are you sure you want to delete this bookmark?')) {
        bookmarks = bookmarks.filter(bookmark => bookmark.id !== id);
        saveBookmarks();
        renderBookmarks(bookmarks);
    }
}

// Delete GitHub repo
function deleteGithubRepo(id) {
    if (confirm('Are you sure you want to delete this GitHub repository?')) {
        githubRepos = githubRepos.filter(repo => repo.id !== id);
        saveGithubRepos();
        renderGithubRepos(githubRepos);
    }
}

// Save to localStorage
function saveBookmarks() {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

function saveGithubRepos() {
    localStorage.setItem('githubRepos', JSON.stringify(githubRepos));
}

// Settings functions
function openSettingsModal() {
    // Set current values in form
    document.getElementById('page-title').value = settings.pageTitle || '';
    document.getElementById('dashboard-title-input').value = settings.dashboardTitle || '';
    document.getElementById('primary-color').value = settings.primaryColor || '#4285f4';

    // Open the modal
    openModal(settingsModal);
}

function saveSettings(e) {
    e.preventDefault();

    const pageTitle = document.getElementById('page-title').value;
    const dashboardTitle = document.getElementById('dashboard-title-input').value;
    const primaryColor = document.getElementById('primary-color').value;

    settings = {
        ...settings,
        pageTitle: pageTitle || 'My Bookmarks',
        dashboardTitle: dashboardTitle || 'My Dashboard',
        primaryColor: primaryColor || '#4285f4'
    };

    localStorage.setItem('settings', JSON.stringify(settings));
    applySettings();
    closeModals();
}

function applySettings() {
    // Update the page title in the browser tab
    document.title = settings.pageTitle;

    // Update the dashboard title in the header
    if (dashboardTitleEl) {
        dashboardTitleEl.textContent = settings.dashboardTitle;
    }

    // Update the primary color CSS variable
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
}

// Data Management Functions
function exportData() {
    // Create a data object with all user data
    const data = {
        bookmarks,
        githubRepos,
        settings,
        exportDate: new Date().toISOString()
    };

    // Convert to JSON string
    const jsonData = JSON.stringify(data, null, 2);

    // Create download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Format date as YYYY-MM-DD
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // Gets YYYY-MM-DD format

    // Create a temporary link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `homepage-data-${dateString}.json`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);

            // Validate the data structure
            if (!data.bookmarks || !data.settings || !data.githubRepos) {
                throw new Error('Invalid data format');
            }

            // Confirm before overwriting current data
            if (confirm('This will replace all your current data. Continue?')) {
                // Update data structures
                bookmarks = data.bookmarks;
                githubRepos = data.githubRepos;
                settings = data.settings;

                // Save to localStorage
                saveBookmarks();
                saveGithubRepos();
                localStorage.setItem('settings', JSON.stringify(settings));

                // Apply changes
                renderAll();
                applySettings();

                alert('Data imported successfully!');
            }
        } catch (error) {
            console.error('Error importing data:', error);
            alert('Failed to import data. Please check the file format.');
        }

        // Reset the file input
        e.target.value = '';
    };

    reader.readAsText(file);
}

// Reset all data
function resetData() {
    if (confirm('WARNING: This will permanently delete all your bookmarks, repositories, and settings. This action cannot be undone.\n\nDo you want to proceed?')) {
        // Clear data structures
        bookmarks = [];
        githubRepos = [];

        // Reset settings to defaults
        settings = {
            pageTitle: 'My Bookmarks',
            dashboardTitle: 'My Dashboard',
            primaryColor: '#4285f4'
        };

        // Clear localStorage
        localStorage.removeItem('bookmarks');
        localStorage.removeItem('githubRepos');
        localStorage.setItem('settings', JSON.stringify(settings));

        // Update UI
        renderAll();
        applySettings();

        // Close modal and show notification
        closeModals();
        alert('All data has been reset successfully.');
    }
}