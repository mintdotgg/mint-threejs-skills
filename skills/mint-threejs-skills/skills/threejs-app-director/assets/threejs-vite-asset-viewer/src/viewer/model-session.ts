import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  GLTFLoader,
  type GLTF,
} from "three/addons/loaders/GLTFLoader.js";
import { disposeObject3D, hasUsableBounds } from "./dispose";
import type {
  AnimationProgress,
  LoadedAnimation,
  MeshStats,
  ModelAssetItem,
  RenderMode,
  ViewerSession,
} from "./types";

const MODEL_GROUND_Y = -0.055;
const MODEL_TARGET_SIZE = 2.5;
const SOLID_COLOR = new THREE.Color("#cfd3d8");
const WIREFRAME_COLOR = new THREE.Color("#30343a");

interface MaterialSlot {
  mesh: THREE.Mesh;
  originalMaterial: THREE.Material | THREE.Material[];
}

interface DisplayMaterialSlot extends MaterialSlot {
  displayMaterial: THREE.Material | THREE.Material[];
}

interface WireframeSlot {
  mesh: THREE.Mesh;
  line: THREE.LineSegments;
  geometry: THREE.WireframeGeometry;
  material: THREE.LineBasicMaterial;
}

interface ModelSessionCallbacks {
  onStats: (stats: MeshStats) => void;
  onAnimations: (animations: readonly LoadedAnimation[]) => void;
  onAnimationProgress: (progress: AnimationProgress) => void;
}

function toMaterialArray(material: THREE.Material | THREE.Material[]) {
  return Array.isArray(material) ? material : [material];
}

function mapMaterial(
  material: THREE.Material | THREE.Material[],
  create: (source: THREE.Material) => THREE.Material,
) {
  return Array.isArray(material)
    ? material.map((entry) => create(entry))
    : create(material);
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  toMaterialArray(material).forEach((entry) => entry.dispose());
}

function makeSolidMaterial(source: THREE.Material) {
  return new THREE.MeshStandardMaterial({
    color: SOLID_COLOR,
    metalness: 0,
    roughness: 0.86,
    side: source.side,
  });
}

function makeNormalMaterial(source: THREE.Material) {
  return new THREE.MeshNormalMaterial({ side: source.side });
}

function collectMaterialSlots(root: THREE.Object3D) {
  const slots: MaterialSlot[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    slots.push({ mesh: object, originalMaterial: object.material });
  });
  return slots;
}

function meshStats(
  slots: readonly MaterialSlot[],
  dimensions: readonly [number, number, number],
) {
  const counts = slots.reduce(
    (stats, { mesh }) => {
      const position = mesh.geometry.getAttribute("position");
      const vertices = position?.count ?? 0;
      const faces = mesh.geometry.index
        ? mesh.geometry.index.count / 3
        : vertices / 3;
      const instances = mesh instanceof THREE.InstancedMesh ? mesh.count : 1;
      stats.vertices += vertices * instances;
      stats.faces += Math.floor(faces) * instances;
      return stats;
    },
    { faces: 0, vertices: 0 },
  );
  return { ...counts, dimensions } satisfies MeshStats;
}

function presentationTransform(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(model);
  if (!hasUsableBounds(sourceBounds)) {
    throw new Error("The model has no usable bounds.");
  }

  const size = sourceBounds.getSize(new THREE.Vector3());
  const scale = MODEL_TARGET_SIZE / Math.max(size.x, size.y, size.z);
  const presentation = new THREE.Group();
  presentation.name = "asset-viewer-presentation";
  presentation.scale.setScalar(scale);
  presentation.add(model);
  presentation.updateMatrixWorld(true);

  const scaledBounds = new THREE.Box3().setFromObject(presentation);
  const center = scaledBounds.getCenter(new THREE.Vector3());
  presentation.position.set(
    -center.x,
    MODEL_GROUND_Y - scaledBounds.min.y,
    -center.z,
  );
  presentation.updateMatrixWorld(true);

  return {
    presentation,
    bounds: new THREE.Box3().setFromObject(presentation),
    sourceSize: [size.x, size.y, size.z] as const,
  };
}

function cameraFrame(bounds: THREE.Box3) {
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const target = sphere.center.clone();
  const direction = new THREE.Vector3(1, 0.62, 1.35).normalize();
  const distance = Math.max(sphere.radius * 3.2, 2.8);
  return {
    position: target.clone().addScaledVector(direction, distance),
    target,
    radius: Math.max(sphere.radius, 0.5),
  };
}

async function resolveAnimations(
  loader: GLTFLoader,
  item: ModelAssetItem,
  base: GLTF,
) {
  if (!item.animations?.length) {
    return base.animations.map((clip, index): LoadedAnimation => ({
      id: `embedded:${index}`,
      label: clip.name || `Animation ${index + 1}`,
      clip: clip.clone(),
    }));
  }

  const external = new Map<string, Promise<GLTF>>();
  const resolved: LoadedAnimation[] = [];

  try {
    for (const source of item.animations) {
      let clips = base.animations;
      if (source.url) {
        let pending = external.get(source.url);
        if (!pending) {
          pending = loader.loadAsync(source.url);
          external.set(source.url, pending);
        }
        clips = (await pending).animations;
      }

      const selected = source.clipName
        ? clips.find((clip) => clip.name === source.clipName)
        : clips[0];
      if (!selected) continue;

      const clip = selected.clone();
      clip.name = source.id;
      resolved.push({
        id: source.id,
        label: source.label,
        clip,
        downloadUrl: source.downloadUrl,
        fileSizeBytes: source.fileSizeBytes,
      });
    }
    return resolved;
  } finally {
    const externalGltfs = await Promise.allSettled(external.values());
    externalGltfs.forEach((result) => {
      if (result.status === "fulfilled") disposeObject3D(result.value.scene);
    });
  }
}

export class ModelSession implements ViewerSession {
  private readonly presentation: THREE.Group;
  private readonly model: THREE.Object3D;
  private readonly materialSlots: MaterialSlot[];
  private readonly ground: THREE.Mesh;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly homePosition: THREE.Vector3;
  private readonly homeTarget: THREE.Vector3;
  private readonly mixer: THREE.AnimationMixer;
  private readonly animations: LoadedAnimation[];
  private readonly callbacks: ModelSessionCallbacks;
  private displaySlots: DisplayMaterialSlot[] = [];
  private wireframeSlots: WireframeSlot[] = [];
  private activeAction: THREE.AnimationAction | null = null;
  private activeAnimationId: string | undefined;
  private playing = true;

  private constructor(input: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    presentation: THREE.Group;
    model: THREE.Object3D;
    bounds: THREE.Box3;
    sourceSize: readonly [number, number, number];
    animations: LoadedAnimation[];
    callbacks: ModelSessionCallbacks;
  }) {
    this.presentation = input.presentation;
    this.model = input.model;
    this.animations = input.animations;
    this.callbacks = input.callbacks;
    this.camera = input.camera;
    this.controls = input.controls;
    this.materialSlots = collectMaterialSlots(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);

    const frame = cameraFrame(input.bounds);
    this.homePosition = frame.position;
    this.homeTarget = frame.target;
    input.camera.near = Math.max(frame.radius / 100, 0.01);
    input.camera.far = Math.max(frame.radius * 100, 100);
    input.camera.updateProjectionMatrix();
    input.controls.minDistance = frame.radius * 0.7;
    input.controls.maxDistance = frame.radius * 8;
    input.controls.enablePan = true;
    input.controls.target.copy(this.homeTarget);
    input.camera.position.copy(this.homePosition);
    input.controls.update();

    const groundMaterial = new THREE.ShadowMaterial({
      color: 0x111111,
      opacity: 0.3,
      transparent: true,
    });
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      groundMaterial,
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = MODEL_GROUND_Y - 0.002;
    this.ground.receiveShadow = true;
    input.scene.add(this.ground);
    input.scene.add(this.presentation);

    this.callbacks.onStats(meshStats(this.materialSlots, input.sourceSize));
    this.callbacks.onAnimations(this.animations);
    if (this.animations[0]) {
      this.playAnimation(this.animations[0].id);
    }
  }

  static async create(input: {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    item: ModelAssetItem;
    callbacks: ModelSessionCallbacks;
  }) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(input.item.glbUrl);
    const model = gltf.scene;
    try {
      const { presentation, bounds, sourceSize } = presentationTransform(model);
      const animations = await resolveAnimations(loader, input.item, gltf);
      return new ModelSession({
        ...input,
        presentation,
        model,
        bounds,
        sourceSize,
        animations,
      });
    } catch (error) {
      disposeObject3D(model);
      throw error;
    }
  }

  getAnimationList() {
    return this.animations;
  }

  getActiveAnimationId() {
    return this.activeAnimationId;
  }

  setRenderMode(mode: RenderMode) {
    this.restoreDisplayMaterials();
    if (mode === "material") return;

    this.displaySlots = this.materialSlots.map((slot) => {
      const displayMaterial = mapMaterial(
        slot.originalMaterial,
        mode === "solid" ? makeSolidMaterial : makeNormalMaterial,
      );
      slot.mesh.material = displayMaterial;
      return { ...slot, displayMaterial };
    });
  }

  setWireframe(enabled: boolean) {
    this.clearWireframe();
    if (!enabled) return;

    this.wireframeSlots = this.materialSlots.map(({ mesh }) => {
      const geometry = new THREE.WireframeGeometry(mesh.geometry);
      const material = new THREE.LineBasicMaterial({
        color: WIREFRAME_COLOR,
        depthWrite: false,
        opacity: 0.72,
        transparent: true,
      });
      const line = new THREE.LineSegments(geometry, material);
      line.name = "asset-viewer-wireframe";
      line.renderOrder = 10;
      line.frustumCulled = false;
      mesh.add(line);
      return { mesh, line, geometry, material };
    });
  }

  playAnimation(id: string) {
    const animation = this.animations.find((entry) => entry.id === id);
    if (!animation) return;

    if (this.activeAction) {
      this.activeAction.stop();
    }
    const action = this.mixer.clipAction(animation.clip, this.model);
    action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    action.paused = !this.playing;
    this.activeAction = action;
    this.activeAnimationId = id;
    this.callbacks.onAnimationProgress({ id, progress: 0, playing: this.playing });
  }

  setAnimationPlaying(playing: boolean) {
    this.playing = playing;
    if (this.activeAction) {
      this.activeAction.paused = !playing;
    }
  }

  seekAnimation(progress: number) {
    if (!this.activeAction) return;
    const duration = Math.max(this.activeAction.getClip().duration, 0.0001);
    this.activeAction.time = THREE.MathUtils.clamp(progress, 0, 1) * duration;
    this.mixer.update(0);
  }

  update(deltaSeconds: number) {
    this.mixer.update(deltaSeconds);
    if (!this.activeAction) return;
    const duration = Math.max(this.activeAction.getClip().duration, 0.0001);
    this.callbacks.onAnimationProgress({
      id: this.activeAnimationId,
      progress: (this.activeAction.time % duration) / duration,
      playing: this.playing,
    });
  }

  resetView() {
    this.camera.position.copy(this.homePosition);
    this.controls.target.copy(this.homeTarget);
    this.controls.update();
  }

  private restoreDisplayMaterials() {
    this.displaySlots.forEach(({ mesh, originalMaterial, displayMaterial }) => {
      mesh.material = originalMaterial;
      disposeMaterial(displayMaterial);
    });
    this.displaySlots = [];
    this.materialSlots.forEach(({ mesh, originalMaterial }) => {
      mesh.material = originalMaterial;
    });
  }

  private clearWireframe() {
    this.wireframeSlots.forEach(({ mesh, line, geometry, material }) => {
      mesh.remove(line);
      geometry.dispose();
      material.dispose();
    });
    this.wireframeSlots = [];
  }

  dispose() {
    this.clearWireframe();
    this.restoreDisplayMaterials();
    this.mixer.stopAllAction();
    this.animations.forEach(({ clip }) => this.mixer.uncacheClip(clip));
    this.mixer.uncacheRoot(this.model);
    this.presentation.removeFromParent();
    this.ground.removeFromParent();
    disposeObject3D(this.presentation);
    disposeObject3D(this.ground);
  }
}
