export type RenderMode = "material" | "solid" | "normal";

export interface ModelAnimationSource {
  id: string;
  label: string;
  url?: string;
  clipName?: string;
  downloadUrl?: string;
  fileSizeBytes?: number;
}

export interface ModelAssetItem {
  id: string;
  title: string;
  glbUrl: string;
  thumbnailUrl?: string;
  prompt?: string;
  format?: string;
  fileSizeBytes?: number;
  downloadUrl?: string;
  animations?: ModelAnimationSource[];
}

export interface ModelViewerManifest {
  kind: "model";
  title: string;
  prompt?: string;
  activeItemId?: string;
  packDownloadUrl?: string;
  items: ModelAssetItem[];
}

export type MaterialMapType =
  | "basecolor"
  | "normal"
  | "roughness"
  | "metalness"
  | "height";

export interface MaterialMapRecord {
  mapType: MaterialMapType;
  url: string;
  downloadUrl?: string;
  fileName?: string;
  format?: string;
  contentType?: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
}

export interface MaterialAssetItem {
  id: string;
  title: string;
  maps: MaterialMapRecord[];
  thumbnailUrl?: string;
  prompt?: string;
  mode?: string;
  archiveDownloadUrl?: string;
}

export interface MaterialViewerManifest {
  kind: "material";
  title: string;
  prompt?: string;
  activeItemId?: string;
  packDownloadUrl?: string;
  items: MaterialAssetItem[];
}

export interface WorldViewerManifest {
  kind: "world";
  title: string;
  prompt?: string;
  thumbnailUrl?: string;
  format?: "RAD";
  fileSizeBytes?: number;
  downloadUrl?: string;
  runtime: {
    runtimeUrl: string;
    collider: {
      runtimeUrl: string;
    };
  };
}

export type ViewerManifest =
  | ModelViewerManifest
  | MaterialViewerManifest
  | WorldViewerManifest;

export interface MeshStats {
  faces: number;
  vertices: number;
  dimensions: readonly [number, number, number];
}

export interface LoadedAnimation {
  id: string;
  label: string;
  clip: import("three").AnimationClip;
  downloadUrl?: string;
  fileSizeBytes?: number;
}

export interface AnimationProgress {
  id?: string;
  progress: number;
  playing: boolean;
}

export interface ViewerSession {
  update(deltaSeconds: number): void;
  resetView(): void;
  dispose(): void;
}
