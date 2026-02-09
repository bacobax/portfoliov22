import { cosineSimilarity } from "@/lib/semantic/cosine"
import type { SemanticEmbeddingItem, SemanticSearchResult } from "@/lib/semantic/types"

type RankOptions = {
  topK?: number
  minScore?: number
}

export const rankSemanticResults = (
  queryEmbedding: number[],
  items: SemanticEmbeddingItem[],
  options: RankOptions = {},
): SemanticSearchResult[] => {
  const topK = options.topK ?? 8
  const minScore = options.minScore ?? -1

  return items
    .map((item) => ({
      ...item,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }))
    .filter((item) => Number.isFinite(item.score) && item.score >= minScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, topK)
}
