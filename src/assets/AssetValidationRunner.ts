import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ASSET_CATALOG, BACKGROUND_ASSET_DECLARATIONS } from "./BackgroundAssets";
import {
  collectBackgroundV2AssetReferences,
  combineAssetValidationResults,
  validateAssetDefinitions,
  validateAssetReferences,
  type AssetValidationResult,
} from "./AssetValidation";
import { createBackgroundV2DesertTestScene } from "../render/bg/v2/BackgroundV2DesertTestScene";
import { createBackgroundV2VisualVerificationScene } from "../render/bg/v2/BackgroundV2VisualVerificationScene";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

export function validateRepositoryAssets(): AssetValidationResult {
  const definitions = BACKGROUND_ASSET_DECLARATIONS.map(({ definition }) => definition);
  const references = [
    ...collectBackgroundV2AssetReferences(createBackgroundV2DesertTestScene(), "BackgroundV2DesertTestScene"),
    ...collectBackgroundV2AssetReferences(createBackgroundV2VisualVerificationScene(), "BackgroundV2VisualVerificationScene"),
  ];
  return combineAssetValidationResults(
    validateAssetDefinitions(definitions, {
      runtimeUrlToPath: (url) => url.startsWith("/assets/")
        ? resolve(repositoryRoot, "public", url.slice(1))
        : null,
      fileExists: existsSync,
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
