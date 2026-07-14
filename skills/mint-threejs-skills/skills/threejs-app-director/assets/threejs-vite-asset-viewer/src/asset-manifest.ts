import type { ViewerManifest } from "./viewer/types";

// Replace this placeholder with browser URLs derived from mint-assets.json.
// Keep a single model or material as a one-item manifest; add ordered items for a pack.
// Use kind: "world" only for an explicit remote RAD runtime plus collider.
// Map each synchronized registry record's thumbnailUrl to the matching viewer item.
export const assetManifest = {
  kind: "model",
  title: "Mint asset",
  items: [],
} satisfies ViewerManifest;
