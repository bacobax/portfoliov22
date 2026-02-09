"use client"

import { FormEvent, useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { Search, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { embedSemanticText, warmupSemanticEmbedder } from "@/lib/semantic/embedder"
import { rankSemanticResults } from "@/lib/semantic/search"
import type { SemanticEmbeddingItem, SemanticSearchResult } from "@/lib/semantic/types"

const EMBEDDINGS_URL = "/semantic/embeddings.json"

type SemanticSearchProps = {
  theme: "dark" | "light"
  className?: string
  topK?: number
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
      console.log({parsed})
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
  }

  const handleInputFocus = () => {
    void warmupModel().catch((modelError) => {
      setError(modelError instanceof Error ? modelError.message : "Failed to initialize embedder")
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedQuery = query.trim()
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
  }

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

  return (
    <Card className={cn("p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm sm:text-base font-mono text-primary flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          SEMANTIC_SEARCH
        </h3>
        {!isOpen ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void openSearch()
            }}
            className="bg-transparent border-primary/50 hover:border-primary font-mono text-xs"
          >
            OPEN
          </Button>
        ) : (
          <Badge variant="outline" className="font-mono text-[10px] sm:text-xs border-primary/50 text-primary">
            {statusLabel}
          </Badge>
        )}
      </div>

      {isOpen && (
        <div className="mt-4 space-y-4">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={handleInputFocus}
              placeholder="Search projects and experience semantically..."
              className="bg-background border-primary/50 focus:border-primary font-mono"
            />
            <Button type="submit" className="font-mono" disabled={isSearching || isEmbeddingsLoading || isModelLoading}>
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
            <ul className="space-y-2">
              {results.map((result) => {
                const title = typeof result.meta.title === "string" ? result.meta.title : result.id
                const summary = typeof result.meta.summary === "string" ? result.meta.summary : result.text
                const path = typeof result.meta.path === "string" ? result.meta.path : null
                const href = path
                  ? `${path}${path.includes("?") ? "&" : "?"}theme=${encodeURIComponent(theme)}`
                  : null

                return (
                  <li key={result.id} className="border border-primary/20 bg-background/40 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <p className="text-xs sm:text-sm font-mono text-foreground">{title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
                          {result.type.toUpperCase()}
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">{result.score.toFixed(3)}</span>
                      </div>
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2">{summary}</p>
                    {href && (
                      <div className="mt-2">
                        <Link href={href} className="text-[11px] sm:text-xs font-mono text-primary hover:text-primary/80">
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
      )}
    </Card>
  )
}
