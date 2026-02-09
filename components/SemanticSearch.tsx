"use client"

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Search, Sparkles, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { embedSemanticText, warmupSemanticEmbedder } from "@/lib/semantic/embedder"
import { rankSemanticResults } from "@/lib/semantic/search"
import type { SemanticEmbeddingItem, SemanticSearchResult } from "@/lib/semantic/types"

const EMBEDDINGS_URL = "/semantic/embeddings.json"
const SEARCH_DEBOUNCE_MS = 400

type SemanticSearchProps = {
  theme: "dark" | "light"
  className?: string
  topK?: number
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const buildQueryTokens = (query: string): string[] =>
  query
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)

const highlightText = (value: string, tokens: string[], markClassName: string) => {
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

    return (
      <mark key={`part-${index}`} className={markClassName}>
        {part}
      </mark>
    )
  })
}

export function SemanticSearch({ theme, className, topK = 8 }: SemanticSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<SemanticEmbeddingItem[] | null>(null)
  const [results, setResults] = useState<SemanticSearchResult[]>([])
  const [isEmbeddingsLoading, setIsEmbeddingsLoading] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFloating, setIsFloating] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(false)
  const [shortcutLabel, setShortcutLabel] = useState<"⌘ K" | "Ctrl+K">("⌘ K")
  const inputRef = useRef<HTMLInputElement | null>(null)

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

  const openSearch = async () => {
    setIsOpen(true)
    setError(null)

    void loadEmbeddings().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load embeddings")
    })

    void warmupModel().catch((modelError) => {
      setError(modelError instanceof Error ? modelError.message : "Failed to initialize embedder")
    })
  }

  const closeSearch = () => {
    setIsOpen(false)
  }

  const toggleSearch = () => {
    if (isOpen) {
      closeSearch()
      return
    }

    void openSearch()
  }

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

  const statusLabel = useMemo(() => {
    if (isSearching) {
      return "SEARCHING"
    }
    if (isEmbeddingsLoading) {
      return "LOADING_INDEX"
    }
    if (isModelLoading) {
      return "LOADING_MODEL"
    }
    return "READY"
  }, [isEmbeddingsLoading, isModelLoading, isSearching])
  const queryTokens = useMemo(() => buildQueryTokens(query), [query])
  const markClassName = useMemo(
    () =>
      cn(
        "px-0.5 border",
        theme === "dark"
          ? "bg-primary/25 text-primary-foreground border-primary/45"
          : "bg-primary/18 text-foreground border-primary/35",
      ),
    [theme],
  )

  useEffect(() => {
    const platform = typeof navigator !== "undefined" ? navigator.platform.toLowerCase() : ""
    const isApplePlatform = platform.includes("mac") || platform.includes("iphone") || platform.includes("ipad")
    setShortcutLabel(isApplePlatform ? "⌘ K" : "Ctrl+K")
  }, [])

  useEffect(() => {
    const onScroll = () => {
      setIsFloating(window.scrollY > 220)
      const remaining =
        document.documentElement.scrollHeight - (window.scrollY + window.innerHeight)
      setIsNearBottom(remaining < 180)
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

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

  return (
    <div className={cn("mb-4 sm:mb-6", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={toggleSearch}
        className={cn(
          "font-mono backdrop-blur-sm border transition-all duration-200",
          isFloating
            ? cn(
                "fixed right-4 sm:right-6 z-[160] h-11 px-3 text-[11px] shadow-2xl",
                isNearBottom ? "bottom-20 sm:bottom-24" : "bottom-4 sm:bottom-6",
              )
            : "h-10 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm",
          "bg-card/88 border-primary/60 text-primary shadow-lg hover:bg-primary/12 hover:border-primary",
        )}
      >
        <Sparkles className={cn("w-4 h-4", isFloating ? "mr-0" : "mr-2")} />
        <span className={cn(isFloating ? "ml-2" : undefined)}>
          {isFloating ? "SEARCH" : "OPEN_SEMANTIC_SEARCH"}
        </span>
        <span
          className={cn(
            "ml-3 px-2 border font-bold tracking-wide",
            isFloating ? "text-[11px] sm:text-[11px]" : "text-[15px] sm:text-[15px]",
            "border-primary/45 bg-primary/15 text-primary",
          )}
        >
          {shortcutLabel}
        </span>
      </Button>

      {isOpen && (
        <div
          className={cn(
            "fixed inset-0 z-[80] px-3 sm:px-4",
            theme === "dark" ? "bg-black/45 backdrop-blur-sm" : "bg-slate-900/25 backdrop-blur-sm",
          )}
          onClick={closeSearch}
        >
          <div
            className={cn(
              "mx-auto mt-[10vh] w-full max-w-3xl border shadow-2xl",
              theme === "dark"
                ? "bg-slate-950/72 border-cyan-300/20 shadow-black/60"
                : "bg-white/78 border-slate-400/40 shadow-slate-900/25",
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-2">
              <h3 className="text-sm sm:text-base font-mono text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                SEMANTIC_SEARCH
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end min-w-[120px]">
                  <Badge variant="outline" className="font-mono text-[10px] sm:text-xs border-primary/50 text-primary">
                    {statusLabel}
                  </Badge>
                  {(isModelLoading || isEmbeddingsLoading || isSearching) && (
                    <div className="mt-1 h-1.5 w-full overflow-hidden border border-primary/35 bg-background/45">
                      <div className="h-full w-1/3 bg-primary/90 animate-[semantic-loading_1.15s_ease-in-out_infinite]" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeSearch}
                  className="p-1.5 border border-primary/40 text-primary hover:border-primary cursor-pointer"
                  aria-label="Close semantic search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={handleInputFocus}
                  placeholder="Search projects and experience semantically..."
                  className={cn(
                    "font-mono h-11 sm:h-12 text-sm sm:text-base",
                    theme === "dark"
                      ? "bg-black/35 border-primary/35 focus:border-primary text-slate-100"
                      : "bg-white/70 border-slate-400/45 focus:border-primary text-slate-900",
                  )}
                />
                <Button
                  type="submit"
                  className="font-mono h-11 sm:h-12"
                  disabled={isSearching || isEmbeddingsLoading || isModelLoading}
                >
                  <Search className="w-4 h-4 mr-2" />
                  SEARCH
                </Button>
              </form>

              {error && (
                <p className="text-xs sm:text-sm font-mono text-destructive border border-destructive/40 bg-destructive/10 px-3 py-2">
                  {error}
                </p>
              )}

              {results.length > 0 && (
                <ul className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
                  {results.map((result) => {
                    const title = typeof result.meta.title === "string" ? result.meta.title : result.id
                    const summary = typeof result.meta.summary === "string" ? result.meta.summary : result.text
                    const path = typeof result.meta.path === "string" ? result.meta.path : null
                    const href = path
                      ? `${path}${path.includes("?") ? "&" : "?"}theme=${encodeURIComponent(theme)}`
                      : null

                    return (
                      <li
                        key={result.id}
                        className={cn(
                          "border p-3",
                          theme === "dark"
                            ? "border-primary/20 bg-black/25"
                            : "border-slate-300/60 bg-slate-50/70",
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <p className="text-xs sm:text-sm font-mono text-foreground">
                            {highlightText(title, queryTokens, markClassName)}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
                              {result.type.toUpperCase()}
                            </Badge>
                            <span className="text-[10px] font-mono text-muted-foreground">{result.score.toFixed(3)}</span>
                          </div>
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2">
                          {highlightText(summary, queryTokens, markClassName)}
                        </p>
                        {href && (
                          <div className="mt-2">
                            <Link
                              href={href}
                              onClick={closeSearch}
                              className="text-[11px] sm:text-xs font-mono text-primary hover:text-primary/80"
                            >
                              OPEN_RESULT
                            </Link>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
