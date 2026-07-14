import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type {
  MaterialAssetItem,
  MaterialMapRecord,
  MaterialMapType,
  ViewerSession,
} from "./types";

const MATERIAL_MAP_ORDER: readonly MaterialMapType[] = [
  "basecolor",
  "normal",
  "roughness",
  "metalness",
  "height",
];
const MATERIAL_CAMERA_POSITION = new THREE.Vector3(0, 0.72, 3.15);
const MATERIAL_CAMERA_TARGET = new THREE.Vector3(0, 0.32, 0);
const MATERIAL_NORMAL_SCALE = new THREE.Vector2(0.88, 0.88);
const MATERIAL_SPHERE_RADIUS = 0.68;

function firstMapByType(item: MaterialAssetItem, mapType: MaterialMapType) {
  return item.maps.find((map) => map.mapType === mapType && map.url.trim());
}

function configureTexture(
  texture: THREE.Texture,
  mapType: MaterialMapType,
  anisotropy: number,
) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = anisotropy;
  texture.colorSpace =
    mapType === "basecolor" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
}

async function loadMaterialTextures(
  renderer: THREE.WebGLRenderer,
  item: MaterialAssetItem,
) {
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures: Partial<Record<MaterialMapType, THREE.Texture>> = {};
  try {
    for (const mapType of MATERIAL_MAP_ORDER) {
      const map = firstMapByType(item, mapType);
      if (!map) continue;
      const texture = await loader.loadAsync(map.url);
      configureTexture(texture, mapType, anisotropy);
      textures[mapType] = texture;
    }
    return textures;
  } catch (error) {
    Object.values(textures).forEach((texture) => texture.dispose());
    throw error;
  }
}

export class MaterialSession implements ViewerSession {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly sphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  private readonly textures: Partial<Record<MaterialMapType, THREE.Texture>>;

  private constructor(input: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    sphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
    textures: Partial<Record<MaterialMapType, THREE.Texture>>;
  }) {
    this.scene = input.scene;
    this.camera = input.camera;
    this.controls = input.controls;
    this.sphere = input.sphere;
    this.textures = input.textures;
    this.scene.add(this.sphere);

    this.camera.fov = 50;
    this.camera.near = 0.01;
    this.camera.far = 100;
    this.camera.updateProjectionMatrix();
    this.controls.enablePan = false;
    this.controls.minDistance = 1.45;
    this.controls.maxDistance = 5.5;
    this.resetView();
  }

  static async create(input: {
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    item: MaterialAssetItem;
  }) {
    if (!input.item.maps.some((map) => map.url.trim())) {
      throw new Error("The material manifest has no usable texture maps.");
    }

    const textures = await loadMaterialTextures(input.renderer, input.item);
    try {
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: textures.basecolor,
        normalMap: textures.normal,
        normalScale: MATERIAL_NORMAL_SCALE,
        roughnessMap: textures.roughness,
        metalnessMap: textures.metalness,
        displacementMap: textures.height,
        displacementScale: textures.height ? 0.025 : 0,
        roughness: textures.roughness ? 1 : 0.72,
        metalness: textures.metalness ? 1 : 0.08,
      });
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(MATERIAL_SPHERE_RADIUS, 96, 64),
        material,
      );
      sphere.name = "asset-viewer-material-sphere";
      sphere.position.copy(MATERIAL_CAMERA_TARGET);
      sphere.rotation.y = -0.35;
      return new MaterialSession({ ...input, sphere, textures });
    } catch (error) {
      Object.values(textures).forEach((texture) => texture.dispose());
      throw error;
    }
  }

  update(_deltaSeconds: number) {}

  resetView() {
    this.camera.position.copy(MATERIAL_CAMERA_POSITION);
    this.controls.target.copy(MATERIAL_CAMERA_TARGET);
    this.controls.update();
  }

  dispose() {
    this.sphere.removeFromParent();
    this.sphere.geometry.dispose();
    this.sphere.material.dispose();
    Object.values(this.textures).forEach((texture) => texture.dispose());
  }
}

export function materialMapLabel(map: MaterialMapRecord) {
  switch (map.mapType) {
    case "basecolor":
      return "Base Color";
    case "normal":
      return "Normal";
    case "roughness":
      return "Roughness";
    case "metalness":
      return "Metalness";
    case "height":
      return "Height";
  }
}
