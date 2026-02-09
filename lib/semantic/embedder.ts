const SEMANTIC_MODEL_ID = process.env.NEXT_PUBLIC_SEMANTIC_MODEL_ID || "Xenova/all-MiniLM-L6-v2"

type ExtractorOutput = { data: ArrayLike<number> }
type FeatureExtractor = (
  text: string,
  options: { pooling: "mean"; normalize: boolean },
) => Promise<ExtractorOutput>

let extractorPromise: Promise<FeatureExtractor> | null = null

const getExtractor = async (): Promise<FeatureExtractor> => {
  if (typeof window === "undefined") {
    throw new Error("Semantic embedder can only be used in the browser")
  }

  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { env, pipeline } = await import("@xenova/transformers")
      env.allowLocalModels = false
      env.useBrowserCache = true

      const extractor = await pipeline("feature-extraction", SEMANTIC_MODEL_ID, {
        quantized: true,
      })

      return extractor as unknown as FeatureExtractor
    })()
  }

  return extractorPromise
}

export const warmupSemanticEmbedder = async (): Promise<void> => {
  await getExtractor()
}

export const embedSemanticText = async (text: string): Promise<number[]> => {
  const extractor = await getExtractor()
  const output = await extractor(text, { pooling: "mean", normalize: true })
  return Array.from(output.data)
}
