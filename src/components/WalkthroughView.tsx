'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { FloorPlan, Floor, Room } from '@/lib/types';
import { EYE_HEIGHT } from '@/lib/constants';
import { generateBuilding3D, getWallBoundingBoxes } from '@/lib/buildingGenerator';
import { FirstPersonControls } from '@/lib/controls';
import MiniMap from './MiniMap';

interface WalkthroughViewProps {
  floorPlan: FloorPlan;
  onBack: () => void;
}

export default function WalkthroughView({ floorPlan, onBack }: WalkthroughViewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<FirstPersonControls | null>(null);
  const animationRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const buildingGroupRef = useRef<THREE.Group | null>(null);

  const [currentFloorIndex, setCurrentFloorIndex] = useState(0);
  const [currentRoom, setCurrentRoom] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);
  const [cameraPos, setCameraPos] = useState({ x: 0, z: 0, yaw: 0 });

  const floor = floorPlan.floors[currentFloorIndex];

  const getCurrentRoom = useCallback(
    (x: number, z: number): string => {
      for (const room of floor.rooms) {
        if (
          x >= room.x &&
          x <= room.x + room.widthMeters &&
          z >= room.y &&
          z <= room.y + room.depthMeters
        ) {
          return room.name;
        }
      }
      return '';
    },
    [floor]
  );

  const initScene = useCallback(() => {
    if (!mountRef.current) return;

    // Clean up existing
    if (rendererRef.current) {
      rendererRef.current.dispose();
      mountRef.current.innerHTML = '';
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (controlsRef.current) {
      controlsRef.current.dispose();
    }

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 20, 50);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      100
    );
    // Start in the first room
    const startRoom = floor.rooms[0];
    camera.position.set(
      startRoom.x + startRoom.widthMeters / 2,
      EYE_HEIGHT,
      startRoom.y + startRoom.depthMeters / 2
    );
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(10, 15, 10);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 50;
    directional.shadow.camera.left = -20;
    directional.shadow.camera.right = 20;
    directional.shadow.camera.top = 20;
    directional.shadow.camera.bottom = -20;
    scene.add(directional);

    // Warm point lights in rooms
    for (const room of floor.rooms) {
      const light = new THREE.PointLight(0xfff5e0, 0.3, 8);
      light.position.set(
        room.x + room.widthMeters / 2,
        floor.heightMeters - 0.5,
        room.y + room.depthMeters / 2
      );
      scene.add(light);
    }

    // Ground plane (exterior)
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Generate building
    if (buildingGroupRef.current) {
      scene.remove(buildingGroupRef.current);
    }
    const buildingGroup = generateBuilding3D(floor, scene);
    buildingGroupRef.current = buildingGroup;

    // Controls
    const controls = new FirstPersonControls(camera, renderer.domElement);
    const wallBoxes = getWallBoundingBoxes(floor);
    controls.setWallBoxes(wallBoxes);
    controlsRef.current = controls;

    // Pointer lock change listener
    const handleLockChange = () => {
      setIsLocked(document.pointerLockElement === renderer.domElement);
    };
    document.addEventListener('pointerlockchange', handleLockChange);

    // Animation loop
    clockRef.current.start();
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      controls.update(delta);

      // Update room detection and minimap position
      const pos = camera.position;
      const roomName = getCurrentRoom(pos.x, pos.z);
      setCurrentRoom(roomName);

      // Extract yaw from quaternion
      const euler = new THREE.Euler();
      euler.setFromQuaternion(camera.quaternion, 'YXZ');
      setCameraPos({ x: pos.x, z: pos.z, yaw: euler.y });

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      cancelAnimationFrame(animationRef.current);
      controls.dispose();
      renderer.dispose();
      document.removeEventListener('pointerlockchange', handleLockChange);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, [floor, getCurrentRoom]);

  useEffect(() => {
    const cleanup = initScene();
    return () => {
      if (cleanup) cleanup();
    };
  }, [initScene]);

  const handleBack = () => {
    if (controlsRef.current) {
      controlsRef.current.unlock();
      controlsRef.current.dispose();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    onBack();
  };

  const handleFloorChange = (index: number) => {
    setCurrentFloorIndex(index);
  };

  return (
    <div className="h-screen w-screen relative bg-black overflow-hidden">
      {/* Three.js mount point */}
      <div ref={mountRef} className="w-full h-full" />

      {/* UI Overlay */}
      {/* Crosshair */}
      {isLocked && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-white/60 text-2xl font-light select-none">+</div>
        </div>
      )}

      {/* Click to start overlay */}
      {!isLocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-bg-primary/80 backdrop-blur-sm border border-border-custom rounded-xl px-8 py-5 text-center pointer-events-auto">
            <p className="text-text-primary font-body text-sm mb-1">Click to start walking</p>
            <p className="text-text-secondary/60 font-mono text-xs">WASD to move • Mouse to look • ESC to pause</p>
          </div>
        </div>
      )}

      {/* Room name */}
      {currentRoom && isLocked && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-bg-primary/70 backdrop-blur-sm border border-border-custom/50 rounded-lg px-4 py-1.5">
            <p className="text-text-primary font-body text-sm">{currentRoom}</p>
          </div>
        </div>
      )}

      {/* Back button */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={handleBack}
          className="bg-bg-secondary/90 backdrop-blur-sm border border-border-custom rounded-lg px-4 py-2 text-text-primary text-sm font-body hover:bg-bg-card transition-all"
        >
          ← Back to Floor Plan
        </button>
      </div>

      {/* Floor selector (multi-storey) */}
      {floorPlan.floors.length > 1 && (
        <div className="absolute top-4 right-4 z-10 flex gap-1 bg-bg-secondary/90 backdrop-blur-sm border border-border-custom rounded-lg p-1">
          {floorPlan.floors.map((f, i) => (
            <button
              key={i}
              onClick={() => handleFloorChange(i)}
              className={`px-3 py-1.5 text-xs rounded-md font-body transition-all ${
                currentFloorIndex === i
                  ? 'bg-accent-primary text-bg-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {f.floorName}
            </button>
          ))}
        </div>
      )}

      {/* Controls help */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <p className="text-white/40 text-xs font-mono">
          WASD to move • Mouse to look • ESC to exit
        </p>
      </div>

      {/* Mini-map */}
      <div className="absolute bottom-4 right-4 z-10">
        <MiniMap
          floor={floor}
          cameraX={cameraPos.x}
          cameraZ={cameraPos.z}
          cameraYaw={cameraPos.yaw}
        />
      </div>
    </div>
  );
}
