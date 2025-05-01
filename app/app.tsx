"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Github, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

// Repository type definition
type Repository = {
  id: string
  name: string
  url: string
  owner: string
  repo: string
}

export default function Home() {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [newRepoUrl, setNewRepoUrl] = useState("")
  const [error, setError] = useState("")
  const [showSettings, setShowSettings] = useState(false)

  // Load repositories from localStorage on initial render
  useEffect(() => {
    const savedRepos = localStorage.getItem("githubBookmarks")
    if (savedRepos) {
      try {
        setRepositories(JSON.parse(savedRepos))
      } catch (e) {
        console.error("Failed to parse saved repositories")
      }
    }
  }, [])

  // Save repositories to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("githubBookmarks", JSON.stringify(repositories))
  }, [repositories])

  // Parse GitHub URL to extract owner and repo name
  const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
    try {
      const urlObj = new URL(url)
      if (!urlObj.hostname.includes("github.com")) {
        return null
      }

      const pathParts = urlObj.pathname.split("/").filter(Boolean)
      if (pathParts.length < 2) {
        return null
      }

      return {
        owner: pathParts[0],
        repo: pathParts[1],
      }
    } catch (e) {
      return null
    }
  }

  // Add a new repository
  const addRepository = () => {
    setError("")

    const parsed = parseGitHubUrl(newRepoUrl)
    if (!parsed) {
      setError("Invalid GitHub repository URL")
      return
    }

    const { owner, repo } = parsed
    const newRepo: Repository = {
      id: Date.now().toString(),
      name: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`,
      owner,
      repo,
    }

    setRepositories((prev) => [...prev, newRepo])
    setNewRepoUrl("")
  }

  // Remove a repository
  const removeRepository = (id: string) => {
    setRepositories((prev) => prev.filter((repo) => repo.id !== id))
  }

  // Clear all repositories
  const clearAllRepositories = () => {
    setRepositories([])
  }

  return (
    <main className="min-h-screen bg-white text-black font-mono p-4 md:p-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold uppercase tracking-tight">GitHub Bookmarks</h1>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
          className="border-black hover:bg-gray-100"
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </header>

      {showSettings && (
        <div className="mb-8 p-4 border-2 border-black">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Settings</h2>
            <Button
              variant="destructive"
              onClick={clearAllRepositories}
              className="bg-black text-white hover:bg-gray-800"
            >
              Clear All Bookmarks
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="new-repo" className="text-sm uppercase mb-1 block">
                Add Repository
              </Label>
              <div className="flex gap-2">
                <Input
                  id="new-repo"
                  type="text"
                  placeholder="https://github.com/owner/repo"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  className="flex-1 border-2 border-black rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button onClick={addRepository} className="bg-black text-white hover:bg-gray-800 rounded-none">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              {error && <p className="text-red-600 mt-1">{error}</p>}
            </div>
          </div>
        </div>
      )}

      {repositories.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] border-2 border-dashed border-gray-300 p-8">
          <Github className="h-12 w-12 mb-4 text-gray-400" />
          <p className="text-center text-gray-600 mb-4">No repositories bookmarked yet</p>
          <Button onClick={() => setShowSettings(true)} className="bg-black text-white hover:bg-gray-800 rounded-none">
            <Plus className="h-4 w-4 mr-2" />
            Add Repository
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repositories.map((repo) => (
            <RepoCard key={repo.id} repo={repo} onRemove={removeRepository} />
          ))}
        </div>
      )}

      <footer className="mt-12 pt-4 border-t-2 border-black text-center text-sm text-gray-600">
        <p>Brutalist GitHub Bookmarks • {new Date().getFullYear()}</p>
      </footer>
    </main>
  )
}

function RepoCard({ repo, onRemove }: { repo: Repository; onRemove: (id: string) => void }) {
  return (
    <div className="border-2 border-black p-4 flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <h2 className="font-bold text-lg">{repo.name}</h2>
        <Button variant="ghost" size="icon" onClick={() => onRemove(repo.id)} className="h-6 w-6 hover:bg-gray-100">
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove</span>
        </Button>
      </div>

      <Separator className="my-2 bg-black" />

      <div className="grid grid-cols-2 gap-2 mt-2">
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-black p-2 text-center hover:bg-gray-100 transition-colors"
        >
          Code
        </a>
        <a
          href={`${repo.url}/issues`}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-black p-2 text-center hover:bg-gray-100 transition-colors"
        >
          Issues
        </a>
        <a
          href={`${repo.url}/pulls`}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-black p-2 text-center hover:bg-gray-100 transition-colors"
        >
          PRs
        </a>
        <a
          href={`${repo.url}/discussions`}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-black p-2 text-center hover:bg-gray-100 transition-colors"
        >
          Discussions
        </a>
        <a
          href={`${repo.url}/actions`}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-black p-2 text-center hover:bg-gray-100 transition-colors"
        >
          Actions
        </a>
        <a
          href={`${repo.url}/projects`}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-black p-2 text-center hover:bg-gray-100 transition-colors"
        >
          Projects
        </a>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-4 border-black text-black hover:bg-gray-100 rounded-none w-full">
            More Links
          </Button>
        </DialogTrigger>
        <DialogContent className="border-2 border-black rounded-none">
          <DialogHeader>
            <DialogTitle>{repo.name} - Additional Links</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 mt-4">
            <a
              href={`${repo.url}/wiki`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-black p-2 text-center hover:bg-gray-100 transition-colors"
            >
              Wiki
            </a>
            <a
              href={`${repo.url}/pulse`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-black p-2 text-center hover:bg-gray-100 transition-colors"
            >
              Pulse
            </a>
            <a
              href={`${repo.url}/graphs`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-black p-2 text-center hover:bg-gray-100 transition-colors"
            >
              Graphs
            </a>
            <a
              href={`${repo.url}/network`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-black p-2 text-center hover:bg-gray-100 transition-colors"
            >
              Network
            </a>
            <a
              href={`${repo.url}/settings`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-black p-2 text-center hover:bg-gray-100 transition-colors"
            >
              Settings
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
