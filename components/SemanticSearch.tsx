"use client"

import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Search, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { embedSemanticText, warmupSemanticEmbedder } from "@/lib/semantic/embedder"
import { rankSemanticResults } from "@/lib/semantic/search"
import type { SemanticEmbeddingItem, SemanticSearchResult } from "@/lib/semantic/types"

const EMBEDDINGS_URL = "/semantic/embeddings.json"
const SEARCH_DEBOUNCE_MS = 400

export type QuickPrompt =
  | { type: "query"; label: string; query: string }
  | { type: "link"; label: string; href: string }

const DEFAULT_PROMPTS: QuickPrompt[] = [
  { type: "query", label: "AI & generative models", query: "diffusion models generative AI" },
  { type: "query", label: "Computer vision work", query: "computer vision CLIP forgery detection" },
  { type: "query", label: "Experience & education", query: "experience research education" },
  { type: "query", label: "Creative web & IoT", query: "creative web IoT firmware" },
  { type: "link", label: "View the CV", href: "/cv" },
  { type: "link", label: "Get in touch", href: "#contact" },
]

const DEFAULT_GREETING =
  "Hey — you found the search. I'm the site. Ask about projects, experience or skills, or pick a question below."

type SemanticSearchProps = {
  theme: "dark" | "light"
  className?: string
  topK?: number
  /** controlled mode: when provided, the parent owns the open state */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** viewport point the panel animates out of (e.g. the mascot's position) */
  origin?: { x: number; y: number } | null
  /** header label, e.g. "FRANCESCO* — LIVE SEARCH" */
  title?: string
  /** first message shown before any query has been made */
  greeting?: string
  /** quick-reply pills — query pills run a search, link pills navigate */
  quickPrompts?: QuickPrompt[]
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const buildQueryTokens = (query: string): string[] =>
  query
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)

const highlightText = (value: string, tokens: string[]) => {
  if (!value || tokens.length === 0) {
    return value
  }

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi")
  const parts = value.split(pattern)

  return parts.map((part, index) => {
    const isMatch = tokens.some((token) => part.toLowerCase() === token.toLowerCase())
    if (!isMatch) {
      return <span key={`part-${index}`}>{part}</span>
    }

    return <mark key={`part-${index}`}>{part}</mark>
  })
}

export function SemanticSearch({
  theme,
  className,
  topK = 8,
  open,
  onOpenChange,
  origin = null,
  title = "PORTFOLIO* — LIVE SEARCH",
  greeting = DEFAULT_GREETING,
  quickPrompts = DEFAULT_PROMPTS,
}: SemanticSearchProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next)
      }
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<SemanticEmbeddingItem[] | null>(null)
  const [results, setResults] = useState<SemanticSearchResult[]>([])
  const [isEmbeddingsLoading, setIsEmbeddingsLoading] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const isBusy = isSearching || isEmbeddingsLoading || isModelLoading

  const fetchEmbeddings = useCallback(
    async (url: string, cache: RequestCache): Promise<SemanticEmbeddingItem[]> => {
      const response = await fetch(url, { cache })
      if (!response.ok) {
        throw new Error(`Embeddings request failed (${response.status})`)
      }

      const parsed = (await response.json()) as SemanticEmbeddingItem[]
      if (!Array.isArray(parsed)) {
        throw new Error("Embeddings file is not a valid array")
      }

      return parsed
    },
    [],
  )

  const loadEmbeddings = useCallback(async (): Promise<SemanticEmbeddingItem[]> => {
    if (items) {
      return items
    }

    setIsEmbeddingsLoading(true)
    try {
      let parsed = await fetchEmbeddings(EMBEDDINGS_URL, "no-store")

      if (parsed.length === 0) {
        const cacheBustUrl = `${EMBEDDINGS_URL}?v=${Date.now()}`
        parsed = await fetchEmbeddings(cacheBustUrl, "reload")
      }

      if (parsed.length === 0) {
        throw new Error("Embeddings file is empty. Rebuild/regenerate and redeploy embeddings.json")
      }

      setItems(parsed)
      return parsed
    } finally {
      setIsEmbeddingsLoading(false)
    }
  }, [fetchEmbeddings, items])

  const warmupModel = useCallback(async () => {
    setIsModelLoading(true)
    try {
      await warmupSemanticEmbedder()
    } finally {
      setIsModelLoading(false)
    }
  }, [])

  const closeSearch = () => {
    setIsOpen(false)
  }

  const toggleSearch = () => {
    setIsOpen(!isOpen)
  }

  /* run warmup whenever the panel opens — works for both controlled and
     uncontrolled usage (the mascot flips `open` without calling an opener) */
  useEffect(() => {
    if (!isOpen) {
      return
    }

    setError(null)

    void loadEmbeddings().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load embeddings")
    })

    void warmupModel().catch((modelError) => {
      setError(modelError instanceof Error ? modelError.message : "Failed to initialize embedder")
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  /* animate the panel out of the trigger origin (e.g. the particle mascot) */
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!isOpen || !panel) {
      return
    }

    if (origin) {
      const rect = panel.getBoundingClientRect()
      panel.style.setProperty("--pop-dx", `${origin.x - (rect.left + rect.width / 2)}px`)
      panel.style.setProperty("--pop-dy", `${origin.y - (rect.top + rect.height / 2)}px`)
    } else {
      panel.style.setProperty("--pop-dx", "0px")
      panel.style.setProperty("--pop-dy", "40px")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleInputFocus = () => {
    void warmupModel().catch((modelError) => {
      setError(modelError instanceof Error ? modelError.message : "Failed to initialize embedder")
    })
  }

  const runSearch = useCallback(
    async (rawQuery: string) => {
      const normalizedQuery = rawQuery.trim()
      if (!normalizedQuery) {
        setResults([])
        return
      }

      setError(null)
      setIsSearching(true)

      try {
        const [embeddingItems, queryEmbedding] = await Promise.all([
          loadEmbeddings(),
          embedSemanticText(normalizedQuery),
        ])

        const ranked = rankSemanticResults(queryEmbedding, embeddingItems, {
          topK,
        })
        setResults(ranked)
      } catch (searchError) {
        setError(searchError instanceof Error ? searchError.message : "Semantic search failed")
        setResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [loadEmbeddings, topK],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await runSearch(query)
  }

  const runQuickPrompt = (prompt: Extract<QuickPrompt, { type: "query" }>) => {
    setQuery(prompt.query)
    void runSearch(prompt.query)
    inputRef.current?.focus()
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      setResults([])
      return
    }

    const timeout = window.setTimeout(() => {
      void runSearch(normalizedQuery)
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeout)
  }, [isOpen, query, runSearch])

  const queryTokens = useMemo(() => buildQueryTokens(query), [query])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"
      if (isShortcut) {
        event.preventDefault()
        toggleSearch()
        return
      }

      if (event.key === "Escape" && isOpen) {
        event.preventDefault()
        closeSearch()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 20)

    return () => window.clearTimeout(timeout)
  }, [isOpen])

  const showGreeting = !query.trim() && results.length === 0 && !error
  const showTyping = isSearching && results.length === 0 && !error && query.trim().length > 0

  if (!isOpen) {
    return null
  }

  return (
    <div className={className}>
      <div className="ss-backdrop" onClick={closeSearch}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Semantic search"
          className="ss-panel"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="ss-header">
            <span className="ss-live">
              <i className={cn("ss-dot", isBusy && "busy")} />
              <span>{title}</span>
            </span>
            <button
              type="button"
              onClick={closeSearch}
              className="ss-close"
              aria-label="Close semantic search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="ss-body">
            {showGreeting && <div className="ss-bubble">{greeting}</div>}

            {error && <div className="ss-bubble ss-bubble-error">{error}</div>}

            {results.length > 0 && (
              <ul className="ss-results">
                {results.map((result) => {
                  const resultTitle = typeof result.meta.title === "string" ? result.meta.title : result.id
                  const summary = typeof result.meta.summary === "string" ? result.meta.summary : result.text
                  const path = typeof result.meta.path === "string" ? result.meta.path : null
                  const href = path
                    ? `${path}${path.includes("?") ? "&" : "?"}theme=${encodeURIComponent(theme)}`
                    : null

                  return (
                    <li key={result.id} className="ss-bubble ss-result">
                      <div className="ss-result-head">
                        <p className="ss-result-title">{highlightText(resultTitle, queryTokens)}</p>
                        <span className="ss-result-meta">
                          <span className="ss-result-badge">{result.type.toUpperCase()}</span>
                          <span>{result.score.toFixed(3)}</span>
                        </span>
                      </div>
                      <p className="ss-result-summary">{highlightText(summary, queryTokens)}</p>
                      {href && (
                        <Link href={href} onClick={closeSearch} className="ss-result-link">
                          Open result →
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {showTyping && (
              <div className="ss-bubble ss-typing">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          {quickPrompts.length > 0 && (
            <div className="ss-pills">
              {quickPrompts.map((prompt, index) =>
                prompt.type === "query" ? (
                  <button
                    key={prompt.label}
                    type="button"
                    className={cn("ss-pill", index === 0 && "featured")}
                    onClick={() => runQuickPrompt(prompt)}
                  >
                    {prompt.label}
                  </button>
                ) : prompt.href.startsWith("#") ? (
                  <a key={prompt.label} href={prompt.href} className="ss-pill" onClick={closeSearch}>
                    {prompt.label}
                  </a>
                ) : (
                  <Link key={prompt.label} href={prompt.href} className="ss-pill" onClick={closeSearch}>
                    {prompt.label}
                  </Link>
                ),
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="ss-inputbar">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={handleInputFocus}
              placeholder="Ask your own question..."
              className="ss-input"
            />
            <button type="submit" className="ss-send" disabled={isBusy} aria-label="Search">
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
