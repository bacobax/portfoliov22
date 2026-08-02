import { getDb } from "@/lib/mongodb";
import { loadContentHub } from "@/lib/content-hub-db";
import { materializeCvPresets } from "@/lib/content-hub";
import type { Document } from "mongodb";
import {
  createRegionalPreset,
  cvPresetsDocumentSchema,
  defaultPresetsDocument,
  type CvPresetsDocument,
  type CvPreset,
  type PersistedCvPresetsDocument,
} from "@/lib/cv-presets";
import { migrateCvContent } from "@/lib/cv-content";
import { cvContentFromPortfolio } from "@/lib/cv-content-db";
import type { PortfolioContent } from "@/lib/default-content";
import { legacyLayoutMap } from "@/lib/content-hub-v3-migration";

const COLLECTION_NAME = "cv_presets";
const DOCUMENT_ID = "cv_presets";

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
        if (!content || typeof content !== "object") return candidate;
        const migratedContent = migrateCvContent(
          content as Parameters<typeof migrateCvContent>[0],
        ) as unknown as CvPreset["content"];
        if (preset.layout === "classic" || preset.layout === "resume") {
          const migrated = createRegionalPreset({
            name: String(preset.name ?? "Migrated CV"),
            country: "Italy",
            locale: "en",
            layout: legacyLayoutMap[preset.layout],
            sourceContent: migratedContent,
          });
          migrated.id = String(preset.id ?? migrated.id);
          migrated.visible = preset.visible !== false;
          return migrated;
        }
        return { ...preset, content: migratedContent };
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
      createRegionalPreset({ name: "Standard", country: "Italy", locale: "en", layout: "germanic_tabular", sourceContent: content }),
      createRegionalPreset({ name: "Résumé", country: "Italy", locale: "en", layout: "southern_european", sourceContent: content }),
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
