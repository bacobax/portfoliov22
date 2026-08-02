import { getDb } from "@/lib/mongodb";
import { loadContentHub } from "@/lib/content-hub-db";
import { materializeCvPresets } from "@/lib/content-hub";
import type { Document } from "mongodb";
import {
  cvPresetsDocumentSchema,
  defaultPresetsDocument,
  type CvPresetsDocument,
  type CvPreset,
  type PersistedCvPresetsDocument,
} from "@/lib/cv-presets";
import { migrateCvContent } from "@/lib/cv-content";
import { cvContentFromPortfolio } from "@/lib/cv-content-db";
import type { PortfolioContent } from "@/lib/default-content";

const COLLECTION_NAME = "cv_presets";
const DOCUMENT_ID = "cv_presets";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** Load raw presets from MongoDB, migrating old content format if needed */
export async function loadCvPresets(): Promise<CvPresetsDocument> {
  try {
    const hub = await loadContentHub();
    if (hub) return { presets: materializeCvPresets(hub) };

    const db = await getDb();
    const doc = await db
      .collection<{ _id: string } & Document>(COLLECTION_NAME)
      .findOne({ _id: DOCUMENT_ID });

    if (!doc) return defaultPresetsDocument();

    const { _id: _ignoredId, ...rest } = doc;

    // Migrate each preset's content from old format if necessary
    if (Array.isArray(rest.presets)) {
      rest.presets = rest.presets.map((candidate) => {
        if (!candidate || typeof candidate !== "object") {
          return candidate;
        }

        const preset = candidate as Record<string, unknown>;
        const content = preset.content;
        return {
          ...preset,
          content:
            content && typeof content === "object"
              ? migrateCvContent(
                  content as Parameters<typeof migrateCvContent>[0],
                )
              : content,
        };
      });
    }

    const parsed = cvPresetsDocumentSchema.safeParse(rest);

    if (!parsed.success) {
      console.error("Failed to parse CV presets", parsed.error);
      return defaultPresetsDocument();
    }

    return parsed.data as CvPresetsDocument;
  } catch (error) {
    console.error("Failed to load CV presets", error);
    return defaultPresetsDocument();
  }
}

/**
 * Load presets, auto-initializing two defaults from portfolio if empty.
 */
export async function loadCvPresetsWithFallback(
  portfolio: PortfolioContent,
): Promise<CvPresetsDocument> {
  const hub = await loadContentHub();
  if (hub) return { presets: materializeCvPresets(hub) };

  const doc = await loadCvPresets();

  if (doc.presets.length === 0) {
    const content = cvContentFromPortfolio(portfolio);
    const defaults: CvPreset[] = [
      {
        id: uid(),
        name: "Standard",
        layout: "classic",
        visible: true,
        content,
      },
      {
        id: uid(),
        name: "Résumé",
        layout: "resume",
        visible: true,
        content: { ...content },
      },
    ];
    const initialized: CvPresetsDocument = { presets: defaults };
    await saveCvPresets(initialized as PersistedCvPresetsDocument);
    return initialized;
  }

  return doc;
}

export async function saveCvPresets(
  doc: PersistedCvPresetsDocument,
): Promise<void> {
  const hub = await loadContentHub();
  if (hub) {
    throw new Error("Snapshot CV writes are retired; use /api/editor/content");
  }
  const db = await getDb();
  await db
    .collection<{ _id: string } & Document>(COLLECTION_NAME)
    .updateOne(
      { _id: DOCUMENT_ID },
      { $set: doc, $setOnInsert: { _id: DOCUMENT_ID } },
      { upsert: true },
    );
}
