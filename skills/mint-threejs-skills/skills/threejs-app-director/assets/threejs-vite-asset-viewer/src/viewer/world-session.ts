import * as THREE from "three";
import {
  SparkRenderer,
  SplatFileType,
  SplatMesh,
} from "@sparkjsdev/spark";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { disposeObject3D, hasUsableBounds } from "./dispose";
import { createMintGltfLoader } from "./gltf-runtime";
import type { ViewerSession, WorldViewerManifest } from "./types";

const WORLD_POSITION = new THREE.Vector3(0, 1.5, 0);
const WORLD_ROTATION = new THREE.Euler(Math.PI, Math.PI, 0);
const WORLD_SCALE = 2.5;
const WORLD_CAMERA_POSITION = new THREE.Vector3(0, 2.2, 6);
const WORLD_CAMERA_TARGET = new THREE.Vector3(0, 1.4, 0);
const WORLD_SPEED = 3.2;
const WORLD_FAST_SPEED = 8;

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.isContentEditable ||
        target.closest("input, textarea, select, [contenteditable='true']"),
    )
  );
}

export class WorldSession implements ViewerSession {
  private readonly scene: THREE.Scene;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly root: THREE.Group;
  private readonly splat: SplatMesh;
  private readonly collider: THREE.Object3D;
  private readonly spark: SparkRenderer;
  private readonly pressedKeys = new Set<string>();
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return;
    this.pressedKeys.add(event.code);
  };
  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(event.code);
  };
  private readonly onBlur = () => this.pressedKeys.clear();

  private constructor(input: {
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    root: THREE.Group;
    splat: SplatMesh;
    collider: THREE.Object3D;
    spark: SparkRenderer;
    bounds: THREE.Box3;
  }) {
    this.scene = input.scene;
    this.renderer = input.renderer;
    this.camera = input.camera;
    this.controls = input.controls;
    this.root = input.root;
    this.splat = input.splat;
    this.collider = input.collider;
    this.spark = input.spark;

    this.camera.fov = 55;
    this.camera.near = 0.01;
    const sphere = input.bounds.getBoundingSphere(new THREE.Sphere());
    this.camera.far = hasUsableBounds(input.bounds)
      ? Math.max(2000, sphere.radius * 8)
      : 2000;
    this.camera.updateProjectionMatrix();
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = true;
    this.controls.minDistance = 0.35;
    this.controls.maxDistance = 16;
    this.resetView();

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  static async create(input: {
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    manifest: WorldViewerManifest;
  }) {
    const colliderUrl = input.manifest.runtime.collider.runtimeUrl.trim();
    if (!input.manifest.runtime.runtimeUrl.trim() || !colliderUrl) {
      throw new Error("The RAD world manifest requires runtime and collider URLs.");
    }

    const spark = new SparkRenderer({
      renderer: input.renderer,
      enableLod: true,
    });
    input.scene.add(spark);

    const root = new THREE.Group();
    root.name = "mint-rad-world-root";
    root.position.copy(WORLD_POSITION);
    root.rotation.copy(WORLD_ROTATION);
    root.scale.setScalar(WORLD_SCALE);
    input.scene.add(root);

    const splat = new SplatMesh({
      url: input.manifest.runtime.runtimeUrl,
      fileType: SplatFileType.RAD,
      paged: true,
      raycastable: false,
      onFrame: () => {},
    });
    root.add(splat);

    let collider: THREE.Object3D | undefined;
    try {
      const results = await Promise.allSettled([
        splat.initialized,
        createMintGltfLoader().loadAsync(colliderUrl),
      ]);
      const splatResult = results[0];
      const colliderResult = results[1];
      if (colliderResult.status === "fulfilled") {
        collider = colliderResult.value.scene;
      }
      if (splatResult.status === "rejected") throw splatResult.reason;
      if (colliderResult.status === "rejected") throw colliderResult.reason;
      if (!collider) throw new Error("The RAD world collider did not load.");
      root.add(collider);
      root.updateMatrixWorld(true);

      let bounds = new THREE.Box3().setFromObject(collider);
      if (!hasUsableBounds(bounds)) {
        bounds = splat.getBoundingBox(false).clone().applyMatrix4(splat.matrixWorld);
      }
      collider.traverse((object) => {
        object.visible = false;
      });

      return new WorldSession({ ...input, root, splat, collider, spark, bounds });
    } catch (error) {
      if (collider) disposeObject3D(collider);
      root.removeFromParent();
      spark.removeFromParent();
      splat.dispose();
      spark.dispose();
      throw error;
    }
  }

  update(deltaSeconds: number) {
    const movement = new THREE.Vector3();
    const forward = this.camera.getWorldDirection(new THREE.Vector3());
    forward.y = 0;
    if (forward.lengthSq() > 0.0001) forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();

    if (this.pressedKeys.has("KeyW")) movement.add(forward);
    if (this.pressedKeys.has("KeyS")) movement.sub(forward);
    if (this.pressedKeys.has("KeyD")) movement.add(right);
    if (this.pressedKeys.has("KeyA")) movement.sub(right);
    if (this.pressedKeys.has("KeyE") || this.pressedKeys.has("Space")) {
      movement.y += 1;
    }
    if (this.pressedKeys.has("KeyQ")) movement.y -= 1;

    if (movement.lengthSq() > 0) {
      const speed =
        this.pressedKeys.has("ShiftLeft") || this.pressedKeys.has("ShiftRight")
          ? WORLD_FAST_SPEED
          : WORLD_SPEED;
      movement.normalize().multiplyScalar(speed * deltaSeconds);
      this.camera.position.add(movement);
      this.controls.target.add(movement);
    }
  }

  resetView() {
    this.pressedKeys.clear();
    this.camera.position.copy(WORLD_CAMERA_POSITION);
    this.controls.target.copy(WORLD_CAMERA_TARGET);
    this.controls.update();
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.root.removeFromParent();
    this.spark.removeFromParent();
    this.splat.dispose();
    disposeObject3D(this.collider);
    this.spark.dispose();
    this.renderer.setRenderTarget(null);
    this.scene.background = null;
  }
}
