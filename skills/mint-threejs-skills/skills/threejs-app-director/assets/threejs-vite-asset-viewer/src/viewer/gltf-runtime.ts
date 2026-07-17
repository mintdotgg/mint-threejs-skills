import type { LoadingManager } from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const MINT_DRACO_DECODER_PATH =
  "https://cdn.mint.gg/runtime/draco/gltf/three-0.184.0/";

const dracoLoaders = new Map<string, DRACOLoader>();

function normalizedDecoderPath(value: string) {
  const path = value.trim();
  if (!path) throw new Error("The Draco decoder path cannot be empty.");
  return path.endsWith("/") ? path : `${path}/`;
}

function sharedDracoLoader(decoderPath: string) {
  const path = normalizedDecoderPath(decoderPath);
  let loader = dracoLoaders.get(path);
  if (!loader) {
    loader = new DRACOLoader().setDecoderPath(path);
    dracoLoaders.set(path, loader);
  }
  return loader;
}

export function createMintGltfLoader(options: {
  manager?: LoadingManager;
  decoderPath?: string;
} = {}) {
  const loader = new GLTFLoader(options.manager);
  return loader.setDRACOLoader(
    sharedDracoLoader(options.decoderPath ?? MINT_DRACO_DECODER_PATH),
  );
}

export function disposeMintGltfRuntime() {
  dracoLoaders.forEach((loader) => loader.dispose());
  dracoLoaders.clear();
}
