import * as THREE from 'three';
import { Floor } from './types';
import { generateBuilding3D } from './buildingGenerator';

// ─────────────────────────────────────────────────────────────────────────────
// Off-screen 3D capture of the ACTUAL building.
// Renders the generated building (real rooms, walls, window openings and
// furniture) to a PNG data URL so it can be used as the seed image for AI video
// generation. This grounds the video in the user's real floor plan instead of a
// generic stock interior.
// ─────────────────────────────────────────────────────────────────────────────

export type CaptureView = 'dollhouse' | 'interior';

interface CaptureOptions {
  view?: CaptureView;
  width?: number;
  height?: number;
}

export function captureBuildingImage(floor: Floor, options: CaptureOptions = {}): string | null {
  if (typeof document === 'undefined') return null;
  const width = options.width ?? 1280;
  const height = options.height ?? 720;
  const view = options.view ?? 'dollhouse';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  } catch {
    return null; // WebGL unavailable
  }

  try {
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfe3f5);

    // Lighting — bright, warm daylight for an attractive render.
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.1);
    sun.position.set(12, 22, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    scene.add(sun);

    // Warm interior fill lights per room.
    for (const room of floor.rooms) {
      const light = new THREE.PointLight(0xfff0d8, 0.35, 10);
      light.position.set(
        room.x + room.widthMeters / 2,
        floor.heightMeters - 0.4,
        room.y + room.depthMeters / 2,
      );
      scene.add(light);
    }

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x6f9460, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    scene.add(ground);

    const group = generateBuilding3D(floor, scene);

    // For the dollhouse view, hide ceilings so the camera sees into every room.
    if (view === 'dollhouse') {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.BoxGeometry) {
          const p = obj.geometry.parameters;
          // Ceiling slabs are 0.05m thick and sit near the top of the room.
          if (Math.abs(p.height - 0.05) < 0.001 && obj.position.y > 0.5) {
            obj.visible = false;
          }
        }
      });
    }

    // Frame the building.
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z, 4);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);

    if (view === 'dollhouse') {
      // Elevated 3/4 aerial revealing the whole layout.
      camera.position.set(center.x + span * 0.85, span * 0.95 + floor.heightMeters, center.z + span * 0.85);
      camera.lookAt(center.x, 0, center.z);
    } else {
      // Eye-level wide shot from a corner of the largest room.
      const biggest = floor.rooms.reduce((a, b) =>
        a.widthMeters * a.depthMeters >= b.widthMeters * b.depthMeters ? a : b,
      );
      camera.position.set(biggest.x + 0.6, 1.6, biggest.y + 0.6);
      camera.lookAt(
        biggest.x + biggest.widthMeters - 0.5,
        1.3,
        biggest.y + biggest.depthMeters - 0.5,
      );
    }

    renderer.render(scene, camera);
    const url = canvas.toDataURL('image/jpeg', 0.92);

    // Dispose GPU resources.
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    renderer.dispose();

    return url;
  } catch {
    renderer.dispose();
    return null;
  }
}
