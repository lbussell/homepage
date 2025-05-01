document.addEventListener("DOMContentLoaded", () => {
    // --- Get DOM Elements ---
    const settingsToggleBtn = document.getElementById("settings-toggle-btn");
    const settingsSection = document.getElementById("settings-section");
    const newRepoUrlInput = document.getElementById("new-repo-url");
    const addRepoBtn = document.getElementById("add-repo-btn");
    const errorMessage = document.getElementById("error-message");
    const clearAllBtn = document.getElementById("clear-all-btn");
    const repoListContainer = document.getElementById("repo-list-container");
    const noReposMessage = document.getElementById("no-repos-message");
    const addFirstRepoBtn = document.getElementById("add-first-repo-btn");
    const repoCardTemplate = document.getElementById("repo-card-template");
    const currentYearSpan = document.getElementById("current-year");

    // --- Check if essential elements exist ---
    if (!settingsToggleBtn || !settingsSection || !newRepoUrlInput || !addRepoBtn || !errorMessage || !clearAllBtn || !repoListContainer || !noReposMessage || !addFirstRepoBtn || !repoCardTemplate || !currentYearSpan) {
        console.error("Initialization failed: One or more essential DOM elements are missing.");
        // Optionally display a user-friendly error message on the page
        document.body.innerHTML = "<p>Error loading the application. Please try again later.</p>";
        return; // Stop execution if essential elements are missing
    }

    let repositories = [];

    // --- Core Logic ---

    function loadRepositories() {
        const savedRepos = localStorage.getItem("githubBookmarks");
        if (savedRepos) {
            try {
                repositories = JSON.parse(savedRepos);
            } catch (e) {
                console.error("Failed to parse saved repositories:", e);
                repositories = []; // Reset if parsing fails
            }
        }
        renderRepositories();
    }

    function saveRepositories() {
        localStorage.setItem("githubBookmarks", JSON.stringify(repositories));
    }

    function parseGitHubUrl(url) {
        try {
            const urlObj = new URL(url);
            if (!urlObj.hostname.includes("github.com")) {
                return null;
            }
            const pathParts = urlObj.pathname.split("/").filter(Boolean);
            if (pathParts.length < 2) {
                return null;
            }
            return {
                owner: pathParts[0],
                repo: pathParts[1],
            };
        } catch (e) {
            return null;
        }
    }

    function addRepository() {
        errorMessage.textContent = ""; // Safe: errorMessage checked above
        const url = newRepoUrlInput.value.trim(); // Safe: newRepoUrlInput checked above
        if (!url) return;

        const parsed = parseGitHubUrl(url);
        if (!parsed) {
            errorMessage.textContent = "Invalid GitHub repository URL"; // Safe: errorMessage checked above
            return;
        }

        const { owner, repo } = parsed;
        const newRepo = {
            id: Date.now().toString(),
            name: `${owner}/${repo}`,
            url: `https://github.com/${owner}/${repo}`,
            owner,
            repo,
        };

        // Avoid duplicates
        if (repositories.some(r => r.url === newRepo.url)) {
             errorMessage.textContent = "Repository already added."; // Safe: errorMessage checked above
             return;
        }

        repositories.push(newRepo);
        saveRepositories();
        renderRepositories();
        newRepoUrlInput.value = ""; // Clear input; Safe: newRepoUrlInput checked above
    }

    function removeRepository(id) {
        repositories = repositories.filter((repo) => repo.id !== id);
        saveRepositories();
        renderRepositories();
    }

    function clearAllRepositories() {
        if (confirm("Are you sure you want to clear all bookmarks?")) {
            repositories = [];
            saveRepositories();
            renderRepositories();
        }
    }

    function renderRepositories() {
        // Clear current list
        repoListContainer.innerHTML = ""; // Safe: repoListContainer checked above

        if (repositories.length === 0) {
            repoListContainer.classList.add("hidden"); // Safe
            noReposMessage.classList.remove("hidden"); // Safe: noReposMessage checked above
        } else {
            repoListContainer.classList.remove("hidden"); // Safe
            noReposMessage.classList.add("hidden"); // Safe

            repositories.forEach((repo) => {
                // Cast to HTMLTemplateElement to access content
                const template = repoCardTemplate;
                const cardClone = template.content.cloneNode(true);
                const cardElement = cardClone.querySelector(".repo-card");
                // Check if cardElement exists before setting dataset.id
                if (cardElement) {
                    cardElement.dataset.id = repo.id; // Store id for removal
                }

                // Use querySelector on the cloned fragment
                const repoNameElement = cardClone.querySelector(".repo-name");
                if (repoNameElement) {
                    repoNameElement.textContent = repo.name;
                }
                const removeBtn = cardClone.querySelector(".remove-repo-btn");
                if (removeBtn) {
                    removeBtn.addEventListener("click", () => removeRepository(repo.id));
                }

                // Set links (check for element existence)
                const codeLink = cardClone.querySelector(".code-link");
                if (codeLink) codeLink.href = repo.url;
                const issuesLink = cardClone.querySelector(".issues-link");
                if (issuesLink) issuesLink.href = `${repo.url}/issues`;
                const prsLink = cardClone.querySelector(".prs-link");
                if (prsLink) prsLink.href = `${repo.url}/pulls`;
                const discussionsLink = cardClone.querySelector(".discussions-link");
                if (discussionsLink) discussionsLink.href = `${repo.url}/discussions`;
                const actionsLink = cardClone.querySelector(".actions-link");
                if (actionsLink) actionsLink.href = `${repo.url}/actions`;
                const projectsLink = cardClone.querySelector(".projects-link");
                if (projectsLink) projectsLink.href = `${repo.url}/projects`;

                repoListContainer?.appendChild(cardClone); // Safe
            });
        }
    }

    function toggleSettings() {
        settingsSection.classList.toggle("hidden"); // Safe: settingsSection checked above
    }

    // --- Event Listeners (Elements checked above) ---
    settingsToggleBtn.addEventListener("click", toggleSettings);
    addRepoBtn.addEventListener("click", addRepository);
    clearAllBtn.addEventListener("click", clearAllRepositories);
    addFirstRepoBtn.addEventListener("click", () => {
        settingsSection.classList.remove("hidden"); // Safe
        newRepoUrlInput.focus(); // Safe
    });

    // Add repository on Enter key press in the input field
    newRepoUrlInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            addRepository();
        }
    });

    // --- Initialization ---
    currentYearSpan.textContent = new Date().getFullYear().toString(); // Convert number to string
    loadRepositories();
});
