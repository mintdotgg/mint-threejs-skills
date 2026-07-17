#!/usr/bin/env node

import { constants as fsConstants } from "node:fs";
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REGISTRY_VERSION = 1;
const DEFAULT_REGISTRY = "mint-assets.json";
const DEFAULT_ASSET_ROOT = "public/assets/mint";
const IDENTITY_TRANSFORM = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
};
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLTF_RUNTIME_EXTENSIONS = {
  draco: "KHR_draco_mesh_compression",
  meshopt: ["EXT_meshopt_compression", "KHR_meshopt_compression"],
  ktx2: "KHR_texture_basisu",
};
const THREE_GLTF_LOADER_EXTENSIONS = new Set([
  "KHR_draco_mesh_compression",
  "KHR_lights_punctual",
  "KHR_materials_anisotropy",
  "KHR_materials_clearcoat",
  "KHR_materials_dispersion",
  "KHR_materials_emissive_strength",
  "KHR_materials_ior",
  "KHR_materials_iridescence",
  "KHR_materials_sheen",
  "KHR_materials_specular",
  "KHR_materials_transmission",
  "KHR_materials_unlit",
  "KHR_materials_volume",
  "KHR_mesh_quantization",
  "KHR_meshopt_compression",
  "KHR_texture_basisu",
  "KHR_texture_transform",
  "EXT_materials_bump",
  "EXT_mesh_gpu_instancing",
  "EXT_meshopt_compression",
  "EXT_texture_avif",
  "EXT_texture_webp",
]);

function usage() {
  return `
Usage: node scripts/sync-mint-assets.mjs --manifest <file> --key <logical-key> [options]

Options:
  --project <path>      Project root. Defaults to the current directory.
  --manifest <file>    Saved Mint MCP artifact-manifest JSON file.
  --key <key>          Stable project-owned logical key, such as hero or courtyard.
  --registry <path>    Project-relative registry path. Defaults to mint-assets.json.
  --asset-root <path>  Project-relative download root. Defaults to public/assets/mint.
  --force              Re-download files even when the existing entry is reusable.
  --help               Show this help.
`;
}

function parseArgs(argv) {
  const options = { projectDir: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      console.log(usage().trim());
      process.exit(0);
    }
    if (arg === "--project") options.projectDir = requireValue(argv, (index += 1), arg);
    else if (arg === "--manifest") options.manifestPath = requireValue(argv, (index += 1), arg);
    else if (arg === "--key") options.key = requireValue(argv, (index += 1), arg);
    else if (arg === "--registry") options.registryPath = requireValue(argv, (index += 1), arg);
    else if (arg === "--asset-root") options.assetRoot = requireValue(argv, (index += 1), arg);
    else if (arg === "--force") options.force = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!options.manifestPath) throw new Error("--manifest is required");
  if (!options.key) throw new Error("--key is required");
  return options;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function optionalNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sanitizeSegment(value, label) {
  const safe = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
  if (!safe) throw new Error(`${label} must contain a path-safe letter or number`);
  return safe;
}

function normalizeRelativePath(value, label) {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (
    !normalized ||
    path.posix.isAbsolute(normalized) ||
    normalized.split("/").some((segment) => segment === "..")
  ) {
    throw new Error(`${label} must stay inside the project`);
  }
  return normalized.replace(/\/$/, "");
}

function resolveProjectPath(projectDir, relativePath, label) {
  const normalized = normalizeRelativePath(relativePath, label);
  const absolute = path.resolve(projectDir, ...normalized.split("/"));
  const relative = path.relative(projectDir, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside the project`);
  }
  return { absolute, relative: normalized };
}

async function exists(file) {
  try {
    await access(file, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file, label) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return null;
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }
}

function sourceRecord(manifest) {
  const source = asRecord(manifest.source);
  if (!source) throw new Error("manifest.source is required");
  const kind = requireString(source.kind, "manifest.source.kind");
  const assetType = requireString(
    source.assetType ?? source.targetType,
    "manifest.source.assetType or targetType",
  );
  return {
    manifestVersion: manifest.manifestVersion,
    kind,
    assetType,
    assetId: requireString(source.id, "manifest.source.id"),
    mintUrl: requireHttpUrl(manifest.mintUrl, "manifest.mintUrl"),
  };
}

function requireHttpUrl(value, label) {
  const raw = requireString(value, label);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${label} must be an HTTP(S) URL`);
  }
  return url.href;
}

function copyKnownMetadata(input, output) {
  for (const key of [
    "byteSize",
    "width",
    "height",
    "aspectRatio",
    "durationSeconds",
  ]) {
    const value = optionalNumber(input[key]);
    const minimum = key === "width" || key === "height" || key === "aspectRatio" ? 0 : -1;
    if (value !== undefined && value > minimum) output[key] = value;
  }
  return output;
}

function extensionForArtifact(artifact) {
  const filename = requireString(artifact.filename, "artifact.filename");
  const filenameExtension = path.posix.extname(path.posix.basename(filename));
  if (/^\.[a-zA-Z0-9]{1,12}$/.test(filenameExtension)) {
    return filenameExtension.toLowerCase();
  }
  return `.${sanitizeSegment(requireString(artifact.format, "artifact.format"), "artifact.format")}`;
}

function normalizeTransform(value) {
  const transform = asRecord(value);
  const validVector = (candidate) =>
    Array.isArray(candidate) &&
    candidate.length === 3 &&
    candidate.every((entry) => typeof entry === "number" && Number.isFinite(entry));
  if (
    transform &&
    validVector(transform.position) &&
    validVector(transform.rotation) &&
    validVector(transform.scale)
  ) {
    return {
      position: [...transform.position],
      rotation: [...transform.rotation],
      scale: [...transform.scale],
    };
  }
  return structuredClone(IDENTITY_TRANSFORM);
}

function normalizeRegistry(value) {
  const registry = asRecord(value);
  if (!registry) {
    return { registryVersion: REGISTRY_VERSION, assetRoot: DEFAULT_ASSET_ROOT, assets: {} };
  }
  if (registry.registryVersion !== REGISTRY_VERSION) {
    throw new Error(`Unsupported mint-assets registryVersion: ${registry.registryVersion}`);
  }
  return {
    ...registry,
    registryVersion: REGISTRY_VERSION,
    assetRoot:
      typeof registry.assetRoot === "string" && registry.assetRoot
        ? registry.assetRoot
        : DEFAULT_ASSET_ROOT,
    assets: asRecord(registry.assets) ?? {},
  };
}

function stableObject(record) {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}

function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry) => typeof entry === "string" && entry.trim()).map((entry) => entry.trim()))]
    .sort((left, right) => left.localeCompare(right));
}

function documentUsesExtension(document, extensionName) {
  const stack = [document];
  const visited = new Set();
  while (stack.length > 0) {
    const value = stack.pop();
    if (!value || typeof value !== "object" || visited.has(value)) continue;
    visited.add(value);
    if (Array.isArray(value)) {
      stack.push(...value);
      continue;
    }
    const record = asRecord(value);
    if (!record) continue;
    const extensions = asRecord(record.extensions);
    if (extensions && Object.hasOwn(extensions, extensionName)) return true;
    stack.push(...Object.values(record));
  }
  return false;
}

export function inspectGlbExtensions(input, label = "GLB") {
  const bytes = Buffer.from(input);
  if (bytes.byteLength < 20 || bytes.toString("ascii", 0, 4) !== "glTF") {
    throw new Error(`${label} is missing the glTF binary header`);
  }
  if (bytes.readUInt32LE(4) !== 2) throw new Error(`${label} must use glTF binary version 2`);
  const declaredLength = bytes.readUInt32LE(8);
  if (declaredLength !== bytes.byteLength) {
    throw new Error(`${label} declares ${declaredLength} bytes but contains ${bytes.byteLength}`);
  }

  let document;
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > bytes.byteLength) throw new Error(`${label} contains a truncated GLB chunk`);
    if (chunkType === GLB_JSON_CHUNK && document === undefined) {
      const json = bytes
        .toString("utf8", chunkStart, chunkEnd)
        .replace(/[\u0000\u0020]+$/, "");
      try {
        document = JSON.parse(json);
      } catch (error) {
        throw new Error(`${label} contains invalid glTF JSON: ${error instanceof Error ? error.message : error}`);
      }
    }
    offset = chunkEnd;
  }
  if (!asRecord(document)) throw new Error(`${label} does not contain a JSON chunk`);

  const extensionsUsed = stringArray(document.extensionsUsed);
  const extensionsRequired = stringArray(document.extensionsRequired);
  const uses = (extension) =>
    extensionsUsed.includes(extension) ||
    extensionsRequired.includes(extension) ||
    documentUsesExtension(document, extension);
  const requires = (extension) => extensionsRequired.includes(extension);
  const usesAny = (extensions) => extensions.some((extension) => uses(extension));
  const requiresAny = (extensions) => extensions.some((extension) => requires(extension));

  return {
    extensionsUsed,
    extensionsRequired,
    usesDraco: uses(GLTF_RUNTIME_EXTENSIONS.draco),
    requiresDraco: requires(GLTF_RUNTIME_EXTENSIONS.draco),
    usesMeshopt: usesAny(GLTF_RUNTIME_EXTENSIONS.meshopt),
    requiresMeshopt: requiresAny(GLTF_RUNTIME_EXTENSIONS.meshopt),
    usesKtx2: uses(GLTF_RUNTIME_EXTENSIONS.ktx2),
    requiresKtx2: requires(GLTF_RUNTIME_EXTENSIONS.ktx2),
    unknownRequiredExtensions: extensionsRequired.filter(
      (extension) => !THREE_GLTF_LOADER_EXTENSIONS.has(extension),
    ),
  };
}

function isGlbArtifact(artifact) {
  const format = typeof artifact.format === "string" ? artifact.format.toLowerCase() : "";
  const contentType =
    typeof artifact.contentType === "string" ? artifact.contentType.toLowerCase() : "";
  const filename = typeof artifact.filename === "string" ? artifact.filename.toLowerCase() : "";
  return format === "glb" || contentType === "model/gltf-binary" || filename.endsWith(".glb");
}

function withGlbCompatibility(entry, artifact, bytes, label) {
  if (!isGlbArtifact(artifact)) return entry;
  const compatibility = inspectGlbExtensions(bytes, label);
  if (compatibility.unknownRequiredExtensions.length > 0) {
    throw new Error(
      `${label} requires unsupported glTF extensions: ${compatibility.unknownRequiredExtensions.join(", ")}`,
    );
  }
  return { ...entry, ...compatibility };
}

async function writeIfChanged(file, contents) {
  if ((await exists(file)) && Buffer.compare(await readFile(file), contents) === 0) return false;
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.mint-sync-${process.pid}`;
  try {
    await writeFile(temporary, contents);
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
  return true;
}

async function downloadArtifacts(input) {
  const artifacts = Array.isArray(input.manifest.artifacts) ? input.manifest.artifacts : [];
  if (artifacts.length === 0) throw new Error("The manifest has no downloadable artifacts");
  const entries = {};
  const usedPaths = new Set();
  let changedFiles = 0;
  if (typeof input.fetchImpl !== "function") {
    throw new Error("This Node.js runtime does not provide fetch");
  }
  const previousSource = asRecord(input.previousAsset?.source);
  const previousArtifacts = asRecord(input.previousAsset?.artifacts) ?? {};
  const sameSource =
    previousSource?.manifestVersion === input.source.manifestVersion &&
    previousSource?.kind === input.source.kind &&
    previousSource?.assetType === input.source.assetType &&
    previousSource?.assetId === input.source.assetId;

  for (const rawArtifact of artifacts) {
    const artifact = asRecord(rawArtifact);
    if (!artifact) throw new Error("Every manifest artifact must be an object");
    const artifactId = requireString(artifact.artifactId ?? artifact.id, "artifact.artifactId");
    const safeArtifactId = sanitizeSegment(artifactId, "artifact.artifactId");
    const relativePath = path.posix.join(
      input.assetRoot,
      sanitizeSegment(input.key, "--key"),
      `${safeArtifactId}${extensionForArtifact(artifact)}`,
    );
    if (usedPaths.has(relativePath)) throw new Error(`Artifact path collision: ${relativePath}`);
    usedPaths.add(relativePath);

    const destination = resolveProjectPath(input.projectDir, relativePath, "artifact path");
    const previousArtifact = asRecord(previousArtifacts[artifactId]);
    const knownByteSize = optionalNumber(artifact.byteSize);
    let onDiskSize;
    if (
      !input.force &&
      sameSource &&
      previousArtifact?.localPath === destination.relative &&
      (await exists(destination.absolute))
    ) {
      onDiskSize = (await stat(destination.absolute)).size;
      const previousByteSize = optionalNumber(previousArtifact.byteSize);
      const expectedByteSize = knownByteSize ?? previousByteSize;
      if (expectedByteSize === undefined || expectedByteSize === onDiskSize) {
        const entry = copyKnownMetadata(
          { ...artifact, byteSize: knownByteSize ?? onDiskSize },
          {
            artifactId,
            role: requireString(artifact.role ?? artifact.kind, `role for ${artifactId}`),
            format: requireString(artifact.format, `format for ${artifactId}`),
            contentType: requireString(artifact.contentType, `contentType for ${artifactId}`),
            filename: requireString(artifact.filename, `filename for ${artifactId}`),
            localPath: destination.relative,
            loaderHint: requireString(artifact.loaderHint, `loaderHint for ${artifactId}`),
          },
        );
        entries[artifactId] = withGlbCompatibility(
          entry,
          artifact,
          await readFile(destination.absolute),
          artifact.filename,
        );
        continue;
      }
    }

    const response = await input.fetchImpl(
      requireHttpUrl(artifact.downloadUrl, `downloadUrl for ${artifactId}`),
    );
    if (!response.ok) {
      throw new Error(
        `Download failed for ${artifactId}: ${response.status} ${response.statusText ?? ""}`.trim(),
      );
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (await writeIfChanged(destination.absolute, bytes)) changedFiles += 1;

    const entry = copyKnownMetadata(
      { ...artifact, byteSize: knownByteSize ?? bytes.byteLength },
      {
        artifactId,
        role: requireString(artifact.role ?? artifact.kind, `role for ${artifactId}`),
        format: requireString(artifact.format, `format for ${artifactId}`),
        contentType: requireString(artifact.contentType, `contentType for ${artifactId}`),
        filename: requireString(artifact.filename, `filename for ${artifactId}`),
        localPath: destination.relative,
        loaderHint: requireString(artifact.loaderHint, `loaderHint for ${artifactId}`),
      },
    );
    entries[artifactId] = withGlbCompatibility(
      entry,
      artifact,
      bytes,
      artifact.filename,
    );
  }

  return { artifacts: stableObject(entries), changedFiles };
}

function remoteWorldRecord(manifest) {
  const runtime = asRecord(manifest.runtime);
  const collider = asRecord(runtime?.collider);
  const loaderHint = asRecord(runtime?.loaderHint);
  if (!runtime || !collider || !loaderHint) {
    throw new Error("Remote world manifest requires runtime, collider, and loaderHint");
  }
  return {
    mode: "remote_stream",
    runtime: copyKnownMetadata(runtime, {
      artifactId: requireString(runtime.artifactId ?? "world_runtime_rad", "runtime.artifactId"),
      role: requireString(runtime.role ?? "environment", "runtime.role"),
      format: requireString(runtime.format, "runtime.format"),
      runtimeUrl: requireHttpUrl(runtime.runtimeUrl, "runtime.runtimeUrl"),
      renderer: requireString(runtime.renderer, "runtime.renderer"),
      loaderHint: {
        renderer: requireString(loaderHint.renderer, "runtime.loaderHint.renderer"),
        mesh: requireString(loaderHint.mesh, "runtime.loaderHint.mesh"),
        paged: loaderHint.paged === true,
        lod: loaderHint.lod === true,
      },
      collider: copyKnownMetadata(collider, {
        artifactId: requireString(collider.artifactId ?? "world_collider", "collider.artifactId"),
        role: requireString(collider.role ?? "physics_collider", "collider.role"),
        format: requireString(collider.format, "collider.format"),
        runtimeUrl: requireHttpUrl(collider.runtimeUrl, "collider.runtimeUrl"),
        loaderHint: requireString(collider.loaderHint, "collider.loaderHint"),
        visible: false,
        requiredForPhysics: true,
      }),
    }),
  };
}

function getThumbnailUrl(artifacts) {
  const entries = Object.values(artifacts ?? {});
  const preview = entries.find(
    (artifact) => asRecord(artifact)?.role === "preview_image",
  );
  return asRecord(preview)?.localPath;
}

export async function syncMintAssets(options) {
  const projectDir = path.resolve(options.projectDir ?? process.cwd());
  const key = requireString(options.key, "--key");
  if (sanitizeSegment(key, "--key") !== key) {
    throw new Error("--key must already be a lowercase path-safe logical key");
  }
  const registryLocation = resolveProjectPath(
    projectDir,
    options.registryPath ?? DEFAULT_REGISTRY,
    "--registry",
  );
  const existingRegistry = normalizeRegistry(await readJson(registryLocation.absolute, "registry"));
  const assetRoot = normalizeRelativePath(
    options.assetRoot ?? existingRegistry.assetRoot ?? DEFAULT_ASSET_ROOT,
    "--asset-root",
  );
  const manifestFile = path.isAbsolute(options.manifestPath)
    ? options.manifestPath
    : path.resolve(projectDir, options.manifestPath);
  const manifest = asRecord(await readJson(manifestFile, "manifest"));
  if (!manifest) throw new Error("Manifest file was not found or did not contain an object");
  if (manifest.manifestVersion !== 1) {
    throw new Error(`Unsupported manifestVersion: ${manifest.manifestVersion}`);
  }

  const previousAsset = asRecord(existingRegistry.assets[key]);
  const source = sourceRecord(manifest);
  const common = {
    source,
    transform: normalizeTransform(previousAsset?.transform),
  };
  let asset;
  let changedFiles = 0;
  if (manifest.integrationMode === "remote_stream") {
    const manifestArtifacts = Array.isArray(manifest.artifacts)
      ? manifest.artifacts
      : [];
    const downloaded = manifestArtifacts.length
      ? await downloadArtifacts({
          manifest,
          projectDir,
          assetRoot,
          key,
          fetchImpl: options.fetchImpl ?? globalThis.fetch,
          previousAsset,
          source,
          force: options.force === true,
        })
      : { artifacts: {}, changedFiles: 0 };
    changedFiles = downloaded.changedFiles;
    asset = {
      ...common,
      ...remoteWorldRecord(manifest),
      ...(Object.keys(downloaded.artifacts).length > 0
        ? { artifacts: downloaded.artifacts }
        : {}),
      ...(getThumbnailUrl(downloaded.artifacts)
        ? { thumbnailUrl: getThumbnailUrl(downloaded.artifacts) }
        : {}),
    };
  } else {
    const downloaded = await downloadArtifacts({
      manifest,
      projectDir,
      assetRoot,
      key,
      fetchImpl: options.fetchImpl ?? globalThis.fetch,
      previousAsset,
      source,
      force: options.force === true,
    });
    changedFiles = downloaded.changedFiles;
    asset = {
      ...common,
      mode: "local_files",
      artifacts: downloaded.artifacts,
      ...(getThumbnailUrl(downloaded.artifacts)
        ? { thumbnailUrl: getThumbnailUrl(downloaded.artifacts) }
        : {}),
    };
  }

  const registry = {
    ...existingRegistry,
    registryVersion: REGISTRY_VERSION,
    assetRoot,
    assets: stableObject({ ...existingRegistry.assets, [key]: asset }),
  };
  const registryContents = Buffer.from(`${JSON.stringify(registry, null, 2)}\n`);
  const registryChanged = await writeIfChanged(registryLocation.absolute, registryContents);
  return {
    key,
    mode: asset.mode,
    registryPath: registryLocation.relative,
    artifactCount: Object.keys(asset.artifacts ?? {}).length,
    changedFiles,
    registryChanged,
  };
}

async function main() {
  const result = await syncMintAssets(parseArgs(process.argv.slice(2)));
  const detail =
    result.mode === "remote_stream"
      ? "remote world runtime preserved"
      : `${result.artifactCount} artifact${result.artifactCount === 1 ? "" : "s"} synced`;
  console.log(`${result.key}: ${detail} in ${result.registryPath}`);
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entrypoint === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
