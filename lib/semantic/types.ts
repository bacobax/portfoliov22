export type SemanticItemType = "project" | "experience"

export type SemanticEmbeddingMeta = Record<string, unknown>

export type SemanticEmbeddingItem = {
  id: string
  type: SemanticItemType
  text: string
  embedding: number[]
  meta: SemanticEmbeddingMeta
}

export type SemanticSearchResult = SemanticEmbeddingItem & {
  score: number
}
