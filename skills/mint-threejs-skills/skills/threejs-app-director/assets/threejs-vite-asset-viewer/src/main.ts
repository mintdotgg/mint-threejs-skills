import "./styles.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { assetManifest } from "./asset-manifest";
import { MaterialSession, materialMapLabel } from "./viewer/material-session";
import { ModelSession } from "./viewer/model-session";
import type {
  AnimationProgress,
  LoadedAnimation,
  MaterialAssetItem,
  MaterialMapRecord,
  MaterialViewerManifest,
  MeshStats,
  ModelAssetItem,
  ModelViewerManifest,
  RenderMode,
  ViewerManifest,
  ViewerSession,
  WorldViewerManifest,
} from "./viewer/types";

const MODEL_BACKGROUND = new THREE.Color("#5b605d");
const WORLD_BACKGROUND = new THREE.Color("#090b0a");

function requiredElement<T extends Element>(selector: string) {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing viewer element: ${selector}`);
  return element;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(Math.round(value));
}

function formatBytes(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  const units = ["B", "KB", "MB", "GB"];
  let scaled = value;
  let unitIndex = 0;
  while (scaled >= 1024 && unitIndex < units.length - 1) {
    scaled /= 1024;
    unitIndex += 1;
  }
  const digits = scaled >= 10 || unitIndex === 0 ? 0 : 1;
  return `${scaled.toFixed(digits)} ${units[unitIndex]}`;
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.isContentEditable ||
        target.closest("input, textarea, select, [contenteditable='true']"),
    )
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The asset could not be loaded.";
}

function formatDimensions(dimensions: readonly [number, number, number] | undefined) {
  if (!dimensions) return undefined;
  return dimensions
    .map((value) => (value >= 10 ? value.toFixed(1) : value.toFixed(2)))
    .join(" × ");
}

function materialThumbnail(item: MaterialAssetItem) {
  return (
    item.thumbnailUrl ??
    item.maps.find((map) => map.mapType === "basecolor")?.url ??
    item.maps[0]?.url
  );
}

function materialMapFormat(map: MaterialMapRecord) {
  return (
    map.format ??
    map.contentType?.replace(/^image\//, "").replace(/^jpeg$/i, "JPG").toUpperCase()
  );
}

class AssetViewerApp {
  private readonly app = requiredElement<HTMLElement>("#app");
  private readonly canvas = requiredElement<HTMLCanvasElement>("#viewer-canvas");
  private readonly loadingSurface = requiredElement<HTMLElement>("#loading-surface");
  private readonly loadingImage = requiredElement<HTMLImageElement>("#loading-image");
  private readonly loadingLabel = requiredElement<HTMLElement>("#loading-label");
  private readonly detailsPanel = requiredElement<HTMLElement>("#details-panel");
  private readonly detailsToggle = requiredElement<HTMLButtonElement>("#details-toggle");
  private readonly detailsClose = requiredElement<HTMLButtonElement>("#details-close");
  private readonly assetKind = requiredElement<HTMLElement>("#asset-kind");
  private readonly assetTitle = requiredElement<HTMLElement>("#asset-title");
  private readonly metadataList = requiredElement<HTMLElement>("#metadata-list");
  private readonly materialMapsSection = requiredElement<HTMLElement>("#material-maps-section");
  private readonly materialMapItems = requiredElement<HTMLElement>("#material-map-items");
  private readonly promptSection = requiredElement<HTMLElement>("#prompt-section");
  private readonly assetPrompt = requiredElement<HTMLElement>("#asset-prompt");
  private readonly downloadActions = requiredElement<HTMLElement>("#download-actions");
  private readonly statusLine = requiredElement<HTMLElement>("#status-line");
  private readonly modelToolbar = requiredElement<HTMLElement>("#model-toolbar");
  private readonly materialToolbar = requiredElement<HTMLElement>("#material-toolbar");
  private readonly worldToolbar = requiredElement<HTMLElement>("#world-toolbar");
  private readonly wireframeToggle = requiredElement<HTMLButtonElement>("#wireframe-toggle");
  private readonly resetViewButton = requiredElement<HTMLButtonElement>("#reset-view");
  private readonly resetMaterialButton = requiredElement<HTMLButtonElement>("#reset-material-view");
  private readonly resetWorldButton = requiredElement<HTMLButtonElement>("#reset-world-view");
  private readonly carousel = requiredElement<HTMLElement>("#asset-carousel");
  private readonly carouselItems = requiredElement<HTMLElement>("#carousel-items");
  private readonly carouselPrevious = requiredElement<HTMLButtonElement>("#carousel-previous");
  private readonly carouselNext = requiredElement<HTMLButtonElement>("#carousel-next");
  private readonly animationSection = requiredElement<HTMLElement>("#animation-section");
  private readonly animationSelect = requiredElement<HTMLSelectElement>("#animation-select");
  private readonly animationPrevious = requiredElement<HTMLButtonElement>("#animation-previous");
  private readonly animationToggle = requiredElement<HTMLButtonElement>("#animation-toggle");
  private readonly animationNext = requiredElement<HTMLButtonElement>("#animation-next");
  private readonly animationSeek = requiredElement<HTMLInputElement>("#animation-seek");
  private readonly manifest: ViewerManifest;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;
  private environmentTexture: THREE.Texture | null = null;
  private session: ViewerSession | null = null;
  private modelSession: ModelSession | null = null;
  private activeItemIndex = 0;
  private activeStats: MeshStats | undefined;
  private loadedAnimations: readonly LoadedAnimation[] = [];
  private renderMode: RenderMode = "material";
  private wireframe = false;
  private animationPlaying = true;
  private loadVersion = 0;
  private frameRequest = 0;
  private lastFrameTime = performance.now();

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (
      this.manifest.kind === "world" ||
      this.manifest.items.length < 2 ||
      isEditableTarget(event.target)
    ) {
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      void this.selectRelativeItem(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      void this.selectRelativeItem(1);
    }
  };

  private readonly onBeforeUnload = () => this.dispose();

  constructor(manifest: ViewerManifest) {
    this.manifest = manifest;
    document.title = `${manifest.title} · Asset Viewer`;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: manifest.kind !== "world",
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = manifest.kind === "model";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, manifest.kind === "world" ? 1.5 : 2),
    );

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.app);
    this.resize();
    this.bindControls();
  }

  async start() {
    this.frameRequest = window.requestAnimationFrame(this.renderFrame);
    if (this.manifest.kind === "world") {
      await this.loadWorld(this.manifest);
      return;
    }

    const itemManifest = this.manifest;
    if (itemManifest.kind === "material") {
      this.configureMaterialScene();
    } else {
      this.configureModelScene();
    }
    this.activeItemIndex = Math.max(
      0,
      itemManifest.items.findIndex(
        (item) => item.id === itemManifest.activeItemId,
      ),
    );
    this.renderCarousel(itemManifest);
    if (!itemManifest.items.length) {
      this.showSetupState();
      return;
    }
    if (itemManifest.kind === "material") {
      await this.loadMaterialItem(itemManifest, this.activeItemIndex);
    } else {
      await this.loadModelItem(itemManifest, this.activeItemIndex);
    }
  }

  private configureModelScene() {
    this.scene.background = MODEL_BACKGROUND;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x2c302e, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 24;
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xb8d2ff, 1.1);
    rim.position.set(-5, 3, -4);
    this.scene.add(rim);
  }

  private configureMaterialScene() {
    this.scene.background = MODEL_BACKGROUND;
    this.renderer.shadowMap.enabled = false;
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(5, 10, 5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-5, 5, -5);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.3);
    rim.position.set(0, 5, -10);
    this.scene.add(rim);

    const environment = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(this.renderer);
    this.environmentTexture = generator.fromScene(environment).texture;
    this.scene.environment = this.environmentTexture;
    environment.dispose();
    generator.dispose();
  }

  private bindControls() {
    const setDetailsOpen = (open: boolean) => {
      this.app.classList.toggle("details-open", open);
      this.detailsPanel.setAttribute("aria-hidden", String(!open));
      this.detailsToggle.setAttribute("aria-expanded", String(open));
    };
    this.detailsToggle.addEventListener("click", () => {
      setDetailsOpen(!this.app.classList.contains("details-open"));
    });
    this.detailsClose.addEventListener("click", () => setDetailsOpen(false));
    setDetailsOpen(true);

    this.modelToolbar
      .querySelectorAll<HTMLButtonElement>("[data-render-mode]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const mode = button.dataset.renderMode as RenderMode | undefined;
          if (!mode) return;
          this.renderMode = mode;
          this.modelSession?.setRenderMode(mode);
          this.updateMeshControls();
        });
      });
    this.wireframeToggle.addEventListener("click", () => {
      this.wireframe = !this.wireframe;
      this.modelSession?.setWireframe(this.wireframe);
      this.updateMeshControls();
    });
    this.resetViewButton.addEventListener("click", () => this.session?.resetView());
    this.resetMaterialButton.addEventListener("click", () => this.session?.resetView());
    this.resetWorldButton.addEventListener("click", () => this.session?.resetView());
    this.carouselPrevious.addEventListener("click", () => void this.selectRelativeItem(-1));
    this.carouselNext.addEventListener("click", () => void this.selectRelativeItem(1));

    this.animationSelect.addEventListener("change", () => {
      this.selectAnimation(this.animationSelect.value);
    });
    this.animationPrevious.addEventListener("click", () => this.selectRelativeAnimation(-1));
    this.animationNext.addEventListener("click", () => this.selectRelativeAnimation(1));
    this.animationToggle.addEventListener("click", () => {
      this.setAnimationPlaying(!this.animationPlaying);
    });
    this.animationSeek.addEventListener("input", () => {
      this.modelSession?.seekAnimation(Number(this.animationSeek.value) / 1000);
    });

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("beforeunload", this.onBeforeUnload);
  }

  private async loadModelItem(manifest: ModelViewerManifest, index: number) {
    const item = manifest.items[index];
    if (!item) return;
    const version = ++this.loadVersion;
    this.session?.dispose();
    this.session = null;
    this.modelSession = null;
    this.activeItemIndex = index;
    this.activeStats = undefined;
    this.loadedAnimations = [];
    this.animationPlaying = true;
    this.renderCarousel(manifest);
    this.renderModelDetails(manifest, item);
    this.renderAnimations([]);
    this.setLoading(true, item.thumbnailUrl, `Loading ${item.title}...`);
    this.statusLine.textContent = `Loading ${item.title}`;

    try {
      const modelSession = await ModelSession.create({
        scene: this.scene,
        camera: this.camera,
        controls: this.controls,
        item,
        callbacks: {
          onStats: (stats) => {
            if (version !== this.loadVersion) return;
            this.activeStats = stats;
            this.renderModelDetails(manifest, item);
          },
          onAnimations: (animations) => {
            if (version !== this.loadVersion) return;
            this.loadedAnimations = animations;
            this.renderAnimations(animations);
            this.renderDownloads(manifest, item);
          },
          onAnimationProgress: (progress) => {
            if (version !== this.loadVersion) return;
            this.updateAnimationProgress(progress);
          },
        },
      });
      if (version !== this.loadVersion) {
        modelSession.dispose();
        return;
      }
      this.session = modelSession;
      this.modelSession = modelSession;
      modelSession.setRenderMode(this.renderMode);
      modelSession.setWireframe(this.wireframe);
      this.renderDownloads(manifest, item);
      this.updateMeshControls();
      this.setLoading(false);
      this.statusLine.textContent = manifest.items.length > 1
        ? `${index + 1} of ${manifest.items.length} · Drag to orbit · Scroll to zoom`
        : "Drag to orbit · Scroll to zoom";
    } catch (error) {
      if (version !== this.loadVersion) return;
      this.showError(errorMessage(error));
    }
  }

  private async loadMaterialItem(
    manifest: MaterialViewerManifest,
    index: number,
  ) {
    const item = manifest.items[index];
    if (!item) return;
    const version = ++this.loadVersion;
    this.session?.dispose();
    this.session = null;
    this.modelSession = null;
    this.activeItemIndex = index;
    this.renderCarousel(manifest);
    this.renderAnimations([]);
    this.renderMaterialDetails(manifest, item);
    this.setLoading(true, materialThumbnail(item), `Loading ${item.title}...`);
    this.statusLine.textContent = `Loading ${item.title}`;

    try {
      const materialSession = await MaterialSession.create({
        scene: this.scene,
        renderer: this.renderer,
        camera: this.camera,
        controls: this.controls,
        item,
      });
      if (version !== this.loadVersion) {
        materialSession.dispose();
        return;
      }
      this.session = materialSession;
      this.setLoading(false);
      this.statusLine.textContent = manifest.items.length > 1
        ? `${index + 1} of ${manifest.items.length} · Drag to orbit · Scroll to zoom`
        : "Drag to orbit · Scroll to zoom";
    } catch (error) {
      if (version !== this.loadVersion) return;
      this.showError(errorMessage(error));
    }
  }

  private async loadWorld(manifest: WorldViewerManifest) {
    const version = ++this.loadVersion;
    this.scene.background = WORLD_BACKGROUND;
    this.modelToolbar.hidden = true;
    this.materialToolbar.hidden = true;
    this.worldToolbar.hidden = false;
    this.carousel.hidden = true;
    this.renderMaterialMaps([]);
    this.assetKind.textContent = "RAD world";
    this.assetTitle.textContent = manifest.title;
    this.renderPrompt(manifest.prompt);
    this.renderMetadata([
      ["Format", manifest.format ?? "RAD"],
      ["Runtime", "Remote paged stream"],
      ["Collider", "Aligned GLB"],
      ["File size", formatBytes(manifest.fileSizeBytes)],
    ]);
    this.renderWorldDownloads(manifest);
    this.setLoading(true, manifest.thumbnailUrl, `Loading ${manifest.title}...`);
    this.statusLine.textContent = `Streaming ${manifest.title}`;

    try {
      const { WorldSession } = await import("./viewer/world-session");
      const worldSession = await WorldSession.create({
        scene: this.scene,
        renderer: this.renderer,
        camera: this.camera,
        controls: this.controls,
        manifest,
      });
      if (version !== this.loadVersion) {
        worldSession.dispose();
        return;
      }
      this.session = worldSession;
      this.setLoading(false);
      this.statusLine.textContent = "Drag to look · WASD move · Shift fast";
    } catch (error) {
      if (version !== this.loadVersion) return;
      this.showError(errorMessage(error));
    }
  }

  private renderModelDetails(manifest: ModelViewerManifest, item: ModelAssetItem) {
    const isPack = manifest.items.length > 1;
    this.assetKind.textContent = isPack ? "Asset pack" : "3D model";
    this.assetTitle.textContent = item.title || manifest.title;
    this.modelToolbar.hidden = false;
    this.materialToolbar.hidden = true;
    this.worldToolbar.hidden = true;
    this.renderMaterialMaps([]);
    this.renderPrompt(item.prompt ?? manifest.prompt);
    this.renderMetadata([
      ...(isPack ? [["Item", `${this.activeItemIndex + 1} of ${manifest.items.length}`] as const] : []),
      ["Format", item.format ?? "GLB"],
      ["File size", formatBytes(item.fileSizeBytes)],
      ["Dimensions", formatDimensions(this.activeStats?.dimensions)],
      ["Faces", this.activeStats ? formatNumber(this.activeStats.faces) : undefined],
      ["Vertices", this.activeStats ? formatNumber(this.activeStats.vertices) : undefined],
      ["Animations", this.loadedAnimations.length ? formatNumber(this.loadedAnimations.length) : undefined],
    ]);
    this.renderDownloads(manifest, item);
  }

  private renderMaterialDetails(
    manifest: MaterialViewerManifest,
    item: MaterialAssetItem,
  ) {
    const isPack = manifest.items.length > 1;
    this.assetKind.textContent = isPack ? "Material pack" : "Material";
    this.assetTitle.textContent = item.title || manifest.title;
    this.modelToolbar.hidden = true;
    this.materialToolbar.hidden = false;
    this.worldToolbar.hidden = true;
    this.renderPrompt(item.prompt ?? manifest.prompt);
    this.renderMetadata([
      ...(isPack
        ? [["Item", `${this.activeItemIndex + 1} of ${manifest.items.length}`] as const]
        : []),
      ["Maps", formatNumber(item.maps.length)],
      ["Mode", item.mode],
      ["Tiling", "2 × 2 preview"],
    ]);
    this.renderMaterialMaps(item.maps);
    this.renderMaterialDownloads(manifest, item);
  }

  private renderMaterialMaps(maps: readonly MaterialMapRecord[]) {
    this.materialMapsSection.hidden = maps.length === 0;
    this.materialMapItems.replaceChildren();
    maps.forEach((map) => {
      const link = document.createElement("a");
      link.className = "material-map-item";
      link.href = map.downloadUrl ?? map.url;
      link.download = map.fileName ?? "";
      link.title = `Download ${materialMapLabel(map)} map`;

      const image = document.createElement("img");
      image.src = map.url;
      image.alt = "";
      image.loading = "lazy";

      const copy = document.createElement("span");
      copy.className = "material-map-item-copy";
      const label = document.createElement("strong");
      label.textContent = materialMapLabel(map);
      const description = document.createElement("small");
      const dimensions =
        map.width && map.height
          ? `${formatNumber(map.width)} × ${formatNumber(map.height)}`
          : undefined;
      description.textContent = [
        dimensions,
        materialMapFormat(map),
        formatBytes(map.fileSizeBytes),
      ]
        .filter(Boolean)
        .join(" · ") || "Ready";
      copy.append(label, description);
      link.append(image, copy);
      this.materialMapItems.append(link);
    });
  }

  private renderMetadata(rows: readonly (readonly [string, string | undefined])[]) {
    this.metadataList.replaceChildren();
    rows.forEach(([label, value]) => {
      if (!value) return;
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      this.metadataList.append(term, description);
    });
  }

  private renderPrompt(prompt: string | undefined) {
    this.promptSection.hidden = !prompt;
    this.assetPrompt.textContent = prompt ?? "";
  }

  private downloadLink(label: string, url: string, secondary = false) {
    const link = document.createElement("a");
    link.href = url;
    link.download = "";
    link.className = secondary ? "download-button secondary" : "download-button";
    link.textContent = label;
    return link;
  }

  private renderDownloads(manifest: ModelViewerManifest, item: ModelAssetItem) {
    this.downloadActions.replaceChildren();
    const modelUrl = item.downloadUrl ?? item.glbUrl;
    if (modelUrl) {
      this.downloadActions.append(this.downloadLink("Download model", modelUrl));
    }
    if (manifest.packDownloadUrl) {
      this.downloadActions.append(
        this.downloadLink("Download pack", manifest.packDownloadUrl, true),
      );
    }
    const activeAnimation = this.loadedAnimations.find(
      (animation) => animation.id === this.modelSession?.getActiveAnimationId(),
    );
    if (activeAnimation?.downloadUrl) {
      this.downloadActions.append(
        this.downloadLink("Download animation", activeAnimation.downloadUrl, true),
      );
    }
  }

  private renderMaterialDownloads(
    manifest: MaterialViewerManifest,
    item: MaterialAssetItem,
  ) {
    this.downloadActions.replaceChildren();
    if (item.archiveDownloadUrl) {
      this.downloadActions.append(
        this.downloadLink("Download material", item.archiveDownloadUrl),
      );
    }
    if (manifest.packDownloadUrl) {
      this.downloadActions.append(
        this.downloadLink("Download material pack", manifest.packDownloadUrl, true),
      );
    }
    if (!item.archiveDownloadUrl) {
      item.maps.forEach((map, index) => {
        this.downloadActions.append(
          this.downloadLink(
            `Download ${materialMapLabel(map)}`,
            map.downloadUrl ?? map.url,
            index > 0,
          ),
        );
      });
    }
  }

  private renderWorldDownloads(manifest: WorldViewerManifest) {
    this.downloadActions.replaceChildren();
    if (manifest.downloadUrl) {
      this.downloadActions.append(
        this.downloadLink("Download world", manifest.downloadUrl),
      );
    }
  }

  private renderCarousel(
    manifest: ModelViewerManifest | MaterialViewerManifest,
  ) {
    const showCarousel = manifest.items.length > 1;
    this.carousel.hidden = !showCarousel;
    this.carouselItems.replaceChildren();
    if (!showCarousel) return;

    manifest.items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "carousel-item";
      button.classList.toggle("active", index === this.activeItemIndex);
      button.setAttribute("aria-pressed", String(index === this.activeItemIndex));
      button.title = item.title;
      const thumbnailUrl =
        "maps" in item ? materialThumbnail(item) : item.thumbnailUrl;
      if (thumbnailUrl) {
        const image = document.createElement("img");
        image.src = thumbnailUrl;
        image.alt = "";
        image.loading = "lazy";
        button.append(image);
      }
      const indexLabel = document.createElement("span");
      indexLabel.textContent = String(index + 1).padStart(2, "0");
      button.append(indexLabel);
      button.addEventListener("click", () => {
        if (manifest.kind === "material") {
          void this.loadMaterialItem(manifest, index);
        } else {
          void this.loadModelItem(manifest, index);
        }
      });
      this.carouselItems.append(button);
      if (index === this.activeItemIndex) {
        queueMicrotask(() => {
          button.scrollIntoView({ block: "nearest", inline: "center" });
        });
      }
    });
  }

  private async selectRelativeItem(offset: number) {
    if (this.manifest.kind === "world" || this.manifest.items.length < 2) return;
    const count = this.manifest.items.length;
    const nextIndex = (this.activeItemIndex + offset + count) % count;
    if (this.manifest.kind === "material") {
      await this.loadMaterialItem(this.manifest, nextIndex);
    } else {
      await this.loadModelItem(this.manifest, nextIndex);
    }
  }

  private renderAnimations(animations: readonly LoadedAnimation[]) {
    this.animationSection.hidden = animations.length === 0;
    this.animationSelect.replaceChildren();
    animations.forEach((animation) => {
      const option = document.createElement("option");
      option.value = animation.id;
      option.textContent = animation.label;
      this.animationSelect.append(option);
    });
    if (animations[0]) {
      this.animationSelect.value = animations[0].id;
      this.animationSeek.value = "0";
      this.setAnimationPlaying(true);
    }
  }

  private selectAnimation(id: string) {
    if (!id || !this.modelSession) return;
    this.modelSession.playAnimation(id);
    this.animationSelect.value = id;
    this.setAnimationPlaying(true);
    if (this.manifest.kind === "model") {
      const item = this.manifest.items[this.activeItemIndex];
      if (item) this.renderDownloads(this.manifest, item);
    }
  }

  private selectRelativeAnimation(offset: number) {
    if (!this.loadedAnimations.length) return;
    const activeId = this.modelSession?.getActiveAnimationId();
    const activeIndex = Math.max(
      0,
      this.loadedAnimations.findIndex((animation) => animation.id === activeId),
    );
    const nextIndex =
      (activeIndex + offset + this.loadedAnimations.length) % this.loadedAnimations.length;
    const next = this.loadedAnimations[nextIndex];
    if (next) this.selectAnimation(next.id);
  }

  private setAnimationPlaying(playing: boolean) {
    this.animationPlaying = playing;
    this.modelSession?.setAnimationPlaying(playing);
    this.animationToggle.textContent = playing ? "Ⅱ" : "▶";
    this.animationToggle.title = playing ? "Pause animation" : "Play animation";
    this.animationToggle.setAttribute("aria-label", this.animationToggle.title);
  }

  private updateAnimationProgress(progress: AnimationProgress) {
    this.animationPlaying = progress.playing;
    this.animationToggle.textContent = progress.playing ? "Ⅱ" : "▶";
    if (progress.id && this.animationSelect.value !== progress.id) {
      this.animationSelect.value = progress.id;
    }
    if (document.activeElement !== this.animationSeek) {
      this.animationSeek.value = String(Math.round(progress.progress * 1000));
    }
  }

  private updateMeshControls() {
    this.modelToolbar
      .querySelectorAll<HTMLButtonElement>("[data-render-mode]")
      .forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.renderMode === this.renderMode));
      });
    this.wireframeToggle.setAttribute("aria-pressed", String(this.wireframe));
  }

  private setLoading(loading: boolean, imageUrl?: string, label?: string) {
    this.loadingSurface.hidden = !loading;
    this.loadingSurface.classList.remove("error");
    if (imageUrl) {
      this.loadingImage.src = imageUrl;
      this.loadingImage.hidden = false;
    } else {
      this.loadingImage.removeAttribute("src");
      this.loadingImage.hidden = true;
    }
    if (label) this.loadingLabel.textContent = label;
  }

  private showSetupState() {
    this.setLoading(true, undefined, "Add asset URLs in src/asset-manifest.ts");
    this.loadingSurface.classList.add("setup");
    this.modelToolbar.hidden = true;
    this.materialToolbar.hidden = true;
    this.worldToolbar.hidden = true;
    this.renderMaterialMaps([]);
    this.statusLine.textContent = "Viewer scaffold ready for generated output";
    this.assetKind.textContent = "Asset viewer";
    this.assetTitle.textContent = this.manifest.title;
    this.renderMetadata([["Setup", "Configure src/asset-manifest.ts"]]);
    this.renderPrompt(this.manifest.prompt);
    this.downloadActions.replaceChildren();
  }

  private showError(message: string) {
    this.setLoading(true, undefined, message);
    this.loadingSurface.classList.add("error");
    this.statusLine.textContent = "Asset failed to load";
  }

  private resize() {
    const width = Math.max(this.app.clientWidth, 1);
    const height = Math.max(this.app.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private readonly renderFrame = (time: number) => {
    const deltaSeconds = Math.min(Math.max((time - this.lastFrameTime) / 1000, 0), 0.1);
    this.lastFrameTime = time;
    this.session?.update(deltaSeconds);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.frameRequest = window.requestAnimationFrame(this.renderFrame);
  };

  private dispose() {
    window.cancelAnimationFrame(this.frameRequest);
    this.resizeObserver.disconnect();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("beforeunload", this.onBeforeUnload);
    this.session?.dispose();
    this.scene.environment = null;
    this.environmentTexture?.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

const viewer = new AssetViewerApp(assetManifest);
void viewer.start().catch((error: unknown) => {
  console.error("Asset viewer failed to start", error);
});
