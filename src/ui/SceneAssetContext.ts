import { BACKGROUND_ASSET_DECLARATIONS, type BackgroundAssetUsage } from "../assets/BackgroundAssets";
import { assessAssetRemoval, UNUSED_CANDIDATE_LIMITATION, type AssetRemovalAssessment, type AssetReferenceRecord } from "../assets/AssetReferenceIndex";
import type { AssetId, AssetLifecycleState } from "../assets/AssetTypes";

export interface SceneAssetContextItem {
  readonly id: AssetId;
  readonly displayName: string;
  readonly runtimeUrl: string;
  readonly nativeSize: { readonly width: number; readonly height: number };
  readonly usage: readonly BackgroundAssetUsage[];
  readonly pixelArt: boolean;
  readonly lifecycle: { readonly state: AssetLifecycleState; readonly replacementId?: AssetId };
}

/** Read-only authoring projection; canonical declarations remain the sole metadata owner. */
export const SCENE_ASSET_CONTEXT_ITEMS: readonly SceneAssetContextItem[] = BACKGROUND_ASSET_DECLARATIONS.map(
  ({ definition, background }) => ({
    id: definition.id,
    displayName: definition.displayName,
    runtimeUrl: definition.runtime.url,
    nativeSize: background.preparation.nativeSize,
    usage: background.preparation.usage,
    pixelArt: background.pixelArt,
    lifecycle: definition.lifecycle,
  }),
);

export const sceneAssetUsageLabel = (usage: BackgroundAssetUsage): string => ({
  segment: "SEG",
  object: "OBJ",
  "static-backdrop": "BGR",
})[usage];

function preview(documentRef: Document, item: SceneAssetContextItem, className: string): HTMLElement {
  const frame = documentRef.createElement("div");
  frame.className = className;
  const image = documentRef.createElement("img");
  image.src = item.runtimeUrl;
  image.alt = `Preview of ${item.displayName}`;
  if (item.pixelArt) image.classList.add("pixelated");
  const unavailable = documentRef.createElement("span");
  unavailable.className = "cm-scene-asset-unavailable";
  unavailable.textContent = "Preview unavailable";
  unavailable.hidden = true;
  image.onerror = () => { image.hidden = true; unavailable.hidden = false; };
  frame.append(image, unavailable);
  return frame;
}

function referenceRow(documentRef: Document, reference: AssetReferenceRecord): HTMLElement {
  const row = documentRef.createElement("div");
  row.className = "cm-scene-asset-reference-row";
  const value = (className: string, text: string) => {
    const line = documentRef.createElement("div");
    line.className = className;
    line.textContent = text;
    row.appendChild(line);
  };
  value("cm-scene-asset-reference-impact", reference.impact === "blocking" ? "BLOCKING" : "INFO");
  value("", reference.sourceId);
  value("", reference.sourceKind);
  value("", reference.sourcePath);
  value("", reference.confidence);
  if (reference.detail) value("cm-scene-asset-reference-detail", reference.detail);
  return row;
}

export function createSceneAssetSafetyDetails(
  item: SceneAssetContextItem,
  assessment: AssetRemovalAssessment,
  documentRef: Document = document,
): HTMLElement {
  const safety = documentRef.createElement("section");
  safety.className = "cm-scene-asset-safety";

  const metadata = documentRef.createElement("dl");
  const field = (label: string, value: string) => {
    const term = documentRef.createElement("dt"); term.textContent = label;
    const description = documentRef.createElement("dd"); description.textContent = value;
    metadata.append(term, description);
  };
  field("LIFECYCLE", item.lifecycle.state.toUpperCase());
  if (item.lifecycle.state === "deprecated" && item.lifecycle.replacementId) field("REPLACEMENT", item.lifecycle.replacementId);
  field("REFERENCES", `${assessment.blockingReferences.length} blocking\n${assessment.informationalReferences.length} informational`);
  const removal = assessment.blockingReferences.length > 0 ? "BLOCKED" : "SAFE AGAINST KNOWN REPO REFERENCES\nUNUSED_CANDIDATE";
  field("REMOVAL", removal);
  safety.appendChild(metadata);

  const toggle = documentRef.createElement("button");
  toggle.type = "button";
  toggle.className = "cm-scene-asset-find-references";
  toggle.textContent = "Find References";
  toggle.setAttribute("aria-expanded", "false");
  const list = documentRef.createElement("div");
  list.className = "cm-scene-asset-reference-list";
  list.hidden = true;
  list.setAttribute("aria-label", "Known repository references");
  const references = [...assessment.blockingReferences, ...assessment.informationalReferences];
  if (references.length === 0) list.textContent = "No known repository references";
  else for (const reference of references) list.appendChild(referenceRow(documentRef, reference));
  toggle.onclick = () => {
    list.hidden = !list.hidden;
    toggle.setAttribute("aria-expanded", String(!list.hidden));
  };

  const limitation = documentRef.createElement("p");
  limitation.className = "cm-scene-asset-limitation";
  limitation.textContent = UNUSED_CANDIDATE_LIMITATION;
  safety.append(toggle, list, limitation);
  return safety;
}

export function createSceneAssetContext(
  selectedAssetId: string,
  onSelect: (assetId: string) => void,
  documentRef: Document = document,
): HTMLElement {
  const context = documentRef.createElement("section");
  context.className = "cm-scene-context";
  context.dataset.sceneContext = "assets";
  context.setAttribute("aria-label", "Scene Asset Context");

  const title = documentRef.createElement("h2");
  title.textContent = "ASSETS";
  const catalog = documentRef.createElement("div");
  catalog.className = "cm-scene-asset-catalog";
  catalog.setAttribute("aria-label", "Scene asset catalogue");
  for (const item of SCENE_ASSET_CONTEXT_ITEMS) {
    const card = documentRef.createElement("button");
    card.type = "button";
    card.className = "cm-scene-asset-card";
    card.title = item.displayName;
    card.setAttribute("aria-label", `Select asset: ${item.displayName}`);
    card.setAttribute("aria-pressed", String(item.id === selectedAssetId));
    card.dataset.assetId = item.id;
    const name = documentRef.createElement("span");
    name.className = "cm-scene-asset-name";
    name.textContent = item.displayName;
    card.append(preview(documentRef, item, "cm-scene-asset-thumb"), name);
    card.onclick = () => onSelect(item.id);
    catalog.appendChild(card);
  }

  const detailTitle = documentRef.createElement("h2");
  detailTitle.textContent = "SELECTED ASSET";
  const detail = documentRef.createElement("section");
  detail.className = "cm-scene-asset-detail";
  detail.setAttribute("aria-label", "Selected asset details");
  const selected = SCENE_ASSET_CONTEXT_ITEMS.find((item) => item.id === selectedAssetId);
  if (selected) {
    const name = documentRef.createElement("h3");
    name.textContent = selected.displayName;
    const metadata = documentRef.createElement("dl");
    const field = (label: string, value: string) => {
      const term = documentRef.createElement("dt"); term.textContent = label;
      const description = documentRef.createElement("dd"); description.textContent = value;
      metadata.append(term, description);
    };
    field("ID", selected.id);
    field("SIZE", `${selected.nativeSize.width} × ${selected.nativeSize.height}`);
    field("USAGE", selected.usage.map(sceneAssetUsageLabel).join("  "));
    field("PATH", selected.runtimeUrl);
    const assessment = assessAssetRemoval(selected.id);
    detail.append(preview(documentRef, selected, "cm-scene-asset-preview"), name, metadata, createSceneAssetSafetyDetails(selected, assessment, documentRef));
  } else {
    detail.textContent = selectedAssetId ? `Unknown / unresolved asset: ${selectedAssetId}` : "Catalogue empty";
  }
  context.append(title, catalog, detailTitle, detail);
  return context;
}

export const SCENE_ASSET_CONTEXT_CSS = `
.cm-scene-context{min-height:100%;box-sizing:border-box;padding:8px;overflow:visible;color:#eaf6ff;font:11px/1.25 ui-monospace,Menlo,Consolas,monospace}
.cm-scene-context h2{margin:0 0 6px;padding-bottom:4px;border-bottom:1px solid rgba(142,232,255,.2);color:#8ee8ff;font-size:11px;letter-spacing:.08em}
.cm-scene-context h2:not(:first-child){margin-top:10px}
.cm-scene-asset-catalog{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}
.cm-scene-asset-card{display:grid;grid-template-rows:48px minmax(0,1fr);gap:3px;min-width:0;min-height:70px;padding:3px;border:1px solid rgba(142,232,255,.18);border-radius:2px;background:#071521;color:#eaf6ff;font:inherit;text-align:left;cursor:pointer}
.cm-scene-asset-card[aria-pressed="true"]{border-color:#ffe66d;box-shadow:inset 0 0 0 1px rgba(255,230,109,.45)}
.cm-scene-asset-card:focus-visible{outline:1px solid #8ee8ff;outline-offset:1px}
.cm-scene-asset-thumb,.cm-scene-asset-preview{display:grid;place-items:center;overflow:hidden;background:#02060a}
.cm-scene-asset-thumb img,.cm-scene-asset-preview img{display:block;width:100%;height:100%;object-fit:contain}
.cm-scene-asset-thumb img.pixelated,.cm-scene-asset-preview img.pixelated{image-rendering:pixelated}
.cm-scene-asset-name{overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.cm-scene-asset-unavailable{padding:4px;color:#ffd166;font-size:9px;text-align:center}
.cm-scene-asset-detail h3{margin:6px 0;color:#fff;font-size:11px;overflow-wrap:anywhere}
.cm-scene-asset-preview{height:104px;border:1px solid rgba(255,255,255,.12)}
.cm-scene-asset-detail dl{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:3px 7px;margin:0}
.cm-scene-asset-detail dt{color:#8ee8ff;font-size:9px}
.cm-scene-asset-detail dd{min-width:0;margin:0;overflow-wrap:anywhere;user-select:text}
.cm-scene-asset-safety{margin-top:9px;padding-top:7px;border-top:1px solid rgba(142,232,255,.16)}
.cm-scene-asset-safety dl{white-space:pre-line}
.cm-scene-asset-find-references{margin:7px 0 4px;padding:3px 6px;border:1px solid rgba(142,232,255,.35);border-radius:2px;background:#071521;color:#8ee8ff;font:inherit;cursor:pointer}
.cm-scene-asset-find-references:focus-visible{outline:1px solid #ffe66d;outline-offset:1px}
.cm-scene-asset-reference-list{display:grid;gap:4px}
.cm-scene-asset-reference-list[hidden]{display:none}
.cm-scene-asset-reference-row{padding:4px;border-left:2px solid rgba(142,232,255,.28);background:rgba(142,232,255,.04);overflow-wrap:anywhere;user-select:text}
.cm-scene-asset-reference-impact{color:#ffd166;font-weight:700}
.cm-scene-asset-reference-detail{color:#aebbc4}
.cm-scene-asset-limitation{margin:6px 0 0;color:#8f9da7;font-size:9px;overflow-wrap:anywhere}
`;
