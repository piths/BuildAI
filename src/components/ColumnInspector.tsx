'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Column, Beam, Floor, ColumnShape } from '@/lib/types';

interface ColumnInspectorProps {
  floor: Floor;
  column: Column;
  onUpdate: (column: Column) => void;
  onClose: () => void;
}

const CONCRETE = 0xcfcabd;
const SLAB = 0xe6e2d8;
const HIGHLIGHT = 0xf59e0b;

export default function ColumnInspector({ floor, column, onUpdate, onClose }: ColumnInspectorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const structureRef = useRef<THREE.Group | null>(null);
  const animRef = useRef<number>(0);
  // Orbit state
  const orbit = useRef({ theta: Math.PI * 0.25, phi: Math.PI * 0.32, radius: 7, dragging: false, lastX: 0, lastY: 0 });

  const [draft, setDraft] = useState<Column>(column);
  const floorHeight = floor.heightMeters || 3;

  // Beams that frame into this column (an endpoint near the column centre).
  const connectedBeams = useCallback((): Beam[] => {
    const reach = Math.max(draft.widthMeters, draft.depthMeters) + 0.4;
    return (floor.beams || []).filter(
      (b) =>
        Math.hypot(b.x1 - draft.x, b.y1 - draft.y) <= reach ||
        Math.hypot(b.x2 - draft.x, b.y2 - draft.y) <= reach,
    );
  }, [floor.beams, draft.x, draft.y, draft.widthMeters, draft.depthMeters]);

  // Build/rebuild the local structural model around the column.
  const buildStructure = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (structureRef.current) {
      scene.remove(structureRef.current);
      structureRef.current.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    }
    const group = new THREE.Group();
    const colMat = new THREE.MeshStandardMaterial({ color: HIGHLIGHT, roughness: 0.7, metalness: 0.05 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: CONCRETE, roughness: 0.85 });
    const slabMat = new THREE.MeshStandardMaterial({ color: SLAB, roughness: 0.9, transparent: true, opacity: 0.85 });

    // Column (centred at origin for easy orbit).
    let colGeo: THREE.BufferGeometry;
    if (draft.shape === 'circular') {
      colGeo = new THREE.CylinderGeometry(draft.widthMeters / 2, draft.widthMeters / 2, floorHeight, 28);
    } else {
      colGeo = new THREE.BoxGeometry(draft.widthMeters, floorHeight, draft.depthMeters);
    }
    const colMesh = new THREE.Mesh(colGeo, colMat);
    colMesh.position.set(0, floorHeight / 2, 0);
    group.add(colMesh);

    // Slab cap on top.
    const slabSize = Math.max(draft.widthMeters, draft.depthMeters) + 1.6;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(slabSize, 0.15, slabSize), slabMat);
    slab.position.set(0, floorHeight + 0.075, 0);
    group.add(slab);

    // Beams framing in (relative to the column centre), each ~1.2m stub.
    for (const b of connectedBeams()) {
      const startNear = Math.hypot(b.x1 - draft.x, b.y1 - draft.y) <= Math.hypot(b.x2 - draft.x, b.y2 - draft.y);
      const dx = (startNear ? b.x2 - b.x1 : b.x1 - b.x2);
      const dz = (startNear ? b.y2 - b.y1 : b.y1 - b.y2);
      const ang = Math.atan2(dz, dx);
      const stub = 1.4;
      const beamGeo = new THREE.BoxGeometry(stub, b.depthMeters, b.widthMeters);
      const beamMesh = new THREE.Mesh(beamGeo, concreteMat);
      // Place starting at column face, going outward.
      beamMesh.position.set(Math.cos(ang) * stub / 2, floorHeight - b.depthMeters / 2, Math.sin(ang) * stub / 2);
      beamMesh.rotation.y = -ang;
      group.add(beamMesh);
    }

    // Footing pad at base.
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(draft.widthMeters, draft.depthMeters) + 0.8, 0.3, Math.max(draft.widthMeters, draft.depthMeters) + 0.8),
      concreteMat,
    );
    pad.position.set(0, 0.15, 0);
    group.add(pad);

    scene.add(group);
    structureRef.current = group;
  }, [draft, floorHeight, connectedBeams]);

  // Init scene once.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12121f);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.05, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(4, 8, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.4);
    fill.position.set(-5, 3, -4);
    scene.add(fill);

    // Grid for reference.
    const grid = new THREE.GridHelper(12, 12, 0x2a2a4a, 0x1f1f33);
    scene.add(grid);

    const target = new THREE.Vector3(0, floorHeight * 0.55, 0);

    const updateCamera = () => {
      const o = orbit.current;
      o.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, o.phi));
      o.radius = Math.max(2.5, Math.min(20, o.radius));
      camera.position.set(
        target.x + o.radius * Math.sin(o.phi) * Math.cos(o.theta),
        target.y + o.radius * Math.cos(o.phi),
        target.z + o.radius * Math.sin(o.phi) * Math.sin(o.theta),
      );
      camera.lookAt(target);
    };

    const onDown = (e: MouseEvent) => {
      orbit.current.dragging = true;
      orbit.current.lastX = e.clientX;
      orbit.current.lastY = e.clientY;
    };
    const onMove = (e: MouseEvent) => {
      if (!orbit.current.dragging) return;
      const dx = e.clientX - orbit.current.lastX;
      const dy = e.clientY - orbit.current.lastY;
      orbit.current.lastX = e.clientX;
      orbit.current.lastY = e.clientY;
      orbit.current.theta -= dx * 0.01;
      orbit.current.phi -= dy * 0.01;
    };
    const onUp = () => (orbit.current.dragging = false);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbit.current.radius += e.deltaY * 0.01;
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      updateCamera();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorHeight]);

  // Rebuild geometry whenever the draft changes.
  useEffect(() => {
    buildStructure();
  }, [buildStructure]);

  const apply = (changes: Partial<Column>) => {
    const next = { ...draft, ...changes };
    setDraft(next);
    onUpdate(next);
  };

  const setShape = (shape: ColumnShape) => {
    if (shape === 'circular') {
      apply({ shape, depthMeters: draft.widthMeters });
    } else {
      apply({ shape });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-bg-secondary border border-border-custom rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-custom">
          <h2 className="font-display text-accent-primary text-sm tracking-wide">
            🏛️ Column Inspector {draft.label ? `— ${draft.label}` : ''}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-bg-card text-text-secondary hover:text-text-primary transition-colors">
            ✕
          </button>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* 3D view */}
          <div className="relative flex-1">
            <div ref={mountRef} className="w-full h-[360px] md:h-[420px]" />
            <p className="absolute bottom-2 left-3 text-text-secondary/50 text-[10px] font-mono pointer-events-none">
              drag to orbit • scroll to zoom — inspect the beam / slab junction
            </p>
          </div>

          {/* Controls */}
          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border-custom p-4 space-y-4">
            <div>
              <p className="text-text-secondary/60 text-[10px] font-mono uppercase mb-1.5">Section shape</p>
              <div className="flex gap-1.5">
                {(['rectangular', 'circular'] as ColumnShape[]).map((sh) => (
                  <button
                    key={sh}
                    onClick={() => setShape(sh)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-body transition-all ${
                      draft.shape === sh ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40' : 'bg-bg-card text-text-secondary border border-border-custom'
                    }`}
                  >
                    {sh === 'rectangular' ? '▭ Rect' : '● Circular'}
                  </button>
                ))}
              </div>
            </div>

            <Slider
              label={draft.shape === 'circular' ? 'Diameter' : 'Width'}
              value={draft.widthMeters}
              min={0.15}
              max={1.2}
              step={0.05}
              onChange={(v) => apply(draft.shape === 'circular' ? { widthMeters: v, depthMeters: v } : { widthMeters: v })}
            />
            {draft.shape === 'rectangular' && (
              <Slider label="Depth" value={draft.depthMeters} min={0.15} max={1.2} step={0.05} onChange={(v) => apply({ depthMeters: v })} />
            )}

            <div>
              <p className="text-text-secondary/60 text-[10px] font-mono uppercase mb-1.5">Material</p>
              <select
                value={draft.material || 'reinforced_concrete'}
                onChange={(e) => apply({ material: e.target.value as Column['material'] })}
                className="w-full bg-bg-card border border-border-custom rounded-lg px-2 py-1.5 text-xs text-text-primary font-body focus:outline-none focus:border-accent-primary/40"
              >
                <option value="reinforced_concrete">Reinforced concrete</option>
                <option value="steel">Steel</option>
                <option value="timber">Timber</option>
              </select>
            </div>

            <div className="bg-bg-card/50 rounded-lg p-2.5 text-[11px] font-mono text-text-secondary space-y-1">
              <p>Section: {draft.shape === 'circular' ? `Ø${(draft.widthMeters * 1000).toFixed(0)}mm` : `${(draft.widthMeters * 1000).toFixed(0)}×${(draft.depthMeters * 1000).toFixed(0)}mm`}</p>
              <p>Height: {floorHeight.toFixed(2)}m</p>
              <p>Beams framing in: {connectedBeams().length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-text-secondary/60 text-[10px] font-mono uppercase">{label}</span>
        <span className="text-accent-primary text-[11px] font-mono">{(value * 1000).toFixed(0)}mm</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-accent-primary"
      />
    </div>
  );
}
