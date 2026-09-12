import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ASSET_CATALOG, BACKGROUND_ASSET_DECLARATIONS, BACKGROUND_ASSET_TOMBSTONES } from "./BackgroundAssets";
import { createAssetReferenceIndex } from "./AssetReferenceIndex";
import { inspectAssetFileIntrinsicSize } from "./AssetPreparationInspection";
import {
  combineAssetValidationResults,
  validateAssetDefinitions,
  validateBackgroundAssetPreparations,
  validateAssetReferences,
  validateAssetLifecycle,
  type AssetValidationResult,
} from "./AssetValidation";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

export function validateRepositoryAssets(): AssetValidationResult {
  const definitions = BACKGROUND_ASSET_DECLARATIONS.map(({ definition }) => definition);
  const references = createAssetReferenceIndex().filter(({ confidence }) => confidence === "exact-id").map(({ assetId, sourceId, sourcePath }) => ({ assetId, source: `${sourceId}.${sourcePath}` }));
  return combineAssetValidationResults(
    validateAssetDefinitions(definitions, {
      runtimeUrlToPath: (url) => url.startsWith("/assets/")
        ? resolve(repositoryRoot, "public", url.slice(1))
        : null,
      fileExists: existsSync,
    }),
    validateAssetLifecycle(definitions, BACKGROUND_ASSET_TOMBSTONES),
    validateBackgroundAssetPreparations(BACKGROUND_ASSET_DECLARATIONS, {
      runtimeUrlToPath: (url) => url.startsWith("/assets/")
        ? resolve(repositoryRoot, "public", url.slice(1))
        : null,
      inspectFile: inspectAssetFileIntrinsicSize,
    }),
    validateAssetReferences(references, new Set(ASSET_CATALOG.list().map(({ id }) => id))),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const validation = validateRepositoryAssets();
  for (const diagnostic of validation.diagnostics) console.log(JSON.stringify(diagnostic));
  const errors = validation.diagnostics.filter(({ severity }) => severity === "ERROR").length;
  console.log(`Asset validation: ${validation.valid ? "PASS" : "FAIL"} (${errors} ERROR, ${validation.diagnostics.length - errors} non-error)`);
  if (!validation.valid) process.exitCode = 1;
}
