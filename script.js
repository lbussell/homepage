// DOM Elements
const bookmarksList = document.getElementById('bookmarks-list');
const reposContainer = document.getElementById('repos-container');
const searchInput = document.getElementById('search-input');
const addBookmarkBtn = document.getElementById('add-bookmark');
const addGithubBtn = document.getElementById('add-github');
const bookmarkModal = document.getElementById('bookmark-modal');
const githubModal = document.getElementById('github-modal');
const bookmarkForm = document.getElementById('bookmark-form');
const githubForm = document.getElementById('github-form');

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    setupEventListeners();
});

// Event listeners setup
function setupEventListeners() {
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

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            closeModals();
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === bookmarkModal) closeModals();
        if (e.target === githubModal) closeModals();
    });

    // Form submissions
    bookmarkForm.addEventListener('submit', addBookmark);
    githubForm.addEventListener('submit', addGithubRepo);
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

        const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;

        card.innerHTML = `
            <div class="github-header">
                <span class="github-logo">
                    <i class="fab fa-github"></i>
                </span>
                <a href="${repoUrl}" class="github-title" target="_blank">
                    ${repo.owner}/${repo.repo}
                </a>
                <div class="bookmark-actions">
                    <button class="action-btn delete-github" data-id="${repo.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="github-links">
                <a href="${repoUrl}" class="github-link" target="_blank">
                    <i class="fas fa-code"></i> Code
                </a>
                <a href="${repoUrl}/issues" class="github-link" target="_blank">
                    <i class="fas fa-exclamation-circle"></i> Issues
                </a>
                <a href="${repoUrl}/pulls" class="github-link" target="_blank">
                    <i class="fas fa-code-branch"></i> Pull Requests
                </a>
                <a href="${repoUrl}/discussions" class="github-link" target="_blank">
                    <i class="fas fa-comments"></i> Discussions
                </a>
                <a href="${repoUrl}/actions" class="github-link" target="_blank">
                    <i class="fas fa-play-circle"></i> Actions
                </a>
                <a href="${repoUrl}/projects" class="github-link" target="_blank">
                    <i class="fas fa-project-diagram"></i> Projects
                </a>
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
    bookmarkForm.reset();
    githubForm.reset();
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

    const newRepo = {
        id: Date.now(),
        owner,
        repo,
        title: `${owner}/${repo}`,
        type: 'github'
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