import * as THREE from "three";

function materialTextures(material: THREE.Material) {
  return Object.values(material).filter(
    (value): value is THREE.Texture => value instanceof THREE.Texture,
  );
}
export function disposeObject3D(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.LineSegments)) {
      return;
    }

    if (object.geometry) {
      geometries.add(object.geometry);
    }

    const objectMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    objectMaterials.forEach((material) => {
      if (!material) return;
      materials.add(material);
      materialTextures(material).forEach((texture) => textures.add(texture));
    });
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

export function hasUsableBounds(box: THREE.Box3) {
  const size = box.getSize(new THREE.Vector3());
  return (
    [size.x, size.y, size.z].every(Number.isFinite) &&
    size.lengthSq() > 0.000001
  );
}
