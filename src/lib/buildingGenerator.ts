import * as THREE from 'three';
import { Floor, Room, Wall } from './types';
import { ROOM_3D_COLORS, WALL_THICKNESS, DOOR_HEIGHT, DEFAULT_WINDOW_HEIGHT, DEFAULT_SILL_HEIGHT } from './constants';
import { createFurniture3D } from './furnitureFactory';

export function generateBuilding3D(floor: Floor, scene: THREE.Scene): THREE.Group {
  const buildingGroup = new THREE.Group();
  const floorHeight = floor.heightMeters;

  for (const room of floor.rooms) {
    const roomGroup = createRoom3D(room, floorHeight);
    buildingGroup.add(roomGroup);
  }

  scene.add(buildingGroup);
  return buildingGroup;
}

function createRoom3D(room: Room, floorHeight: number): THREE.Group {
  const group = new THREE.Group();
  const { x, y: z, widthMeters: w, depthMeters: d } = room;

  // Floor
  const floorColor = ROOM_3D_COLORS[room.type] || 0xd4d4d4;
  const floorMat = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.8 });
  const floorGeo = new THREE.BoxGeometry(w, 0.05, d);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.set(x + w / 2, 0.025, z + d / 2);
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Ceiling
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9 });
  const ceilingGeo = new THREE.BoxGeometry(w, 0.05, d);
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.position.set(x + w / 2, floorHeight - 0.025, z + d / 2);
  group.add(ceilingMesh);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.7, side: THREE.DoubleSide });

  // North wall (at z position, spans width)
  if (room.walls.north.hasWall) {
    createWall3D(group, room.walls.north, x, z, w, floorHeight, 'north', wallMat);
  }
  // South wall (at z + depth)
  if (room.walls.south.hasWall) {
    createWall3D(group, room.walls.south, x, z + d, w, floorHeight, 'south', wallMat);
  }
  // West wall (at x position, spans depth)
  if (room.walls.west.hasWall) {
    createWall3D(group, room.walls.west, x, z, d, floorHeight, 'west', wallMat);
  }
  // East wall (at x + width)
  if (room.walls.east.hasWall) {
    createWall3D(group, room.walls.east, x + w, z, d, floorHeight, 'east', wallMat);
  }

  // Furniture
  for (const item of room.furniture) {
    const furniture = createFurniture3D(item.type, item.widthMeters, item.depthMeters);
    // Position: room origin + furniture offset
    // JSON: x is east, y is south → Three.js: x is east, z is south
    furniture.position.set(
      x + item.x + item.widthMeters / 2,
      0,
      z + item.y + item.depthMeters / 2
    );
    furniture.rotation.y = -(item.rotation * Math.PI) / 180;
    group.add(furniture);
  }

  return group;
}

function createWall3D(
  group: THREE.Group,
  wall: Wall,
  wallX: number,
  wallZ: number,
  wallLength: number,
  floorHeight: number,
  direction: 'north' | 'south' | 'east' | 'west',
  wallMat: THREE.Material
) {
  const openings = [...wall.openings].sort((a, b) => a.positionFromLeft - b.positionFromLeft);

  if (openings.length === 0) {
    // Solid wall
    const wallMesh = createSolidWall(wallX, wallZ, wallLength, floorHeight, direction, wallMat);
    group.add(wallMesh);
    return;
  }

  // Wall with openings — create segments
  let currentPos = 0;

  for (const opening of openings) {
    const openStart = opening.positionFromLeft;
    const openEnd = openStart + opening.widthMeters;

    // Wall segment before opening
    if (currentPos < openStart) {
      const segLength = openStart - currentPos;
      const segMesh = createWallSegment(
        wallX, wallZ, currentPos, segLength, 0, floorHeight, direction, wallMat
      );
      group.add(segMesh);
    }

    if (opening.type === 'door') {
      // Wall above door
      const aboveDoorH = floorHeight - DOOR_HEIGHT;
      if (aboveDoorH > 0) {
        const aboveMesh = createWallSegment(
          wallX, wallZ, openStart, opening.widthMeters,
          DOOR_HEIGHT, aboveDoorH, direction, wallMat
        );
        group.add(aboveMesh);
      }
    } else {
      // Window
      const sillH = opening.sillHeight || DEFAULT_SILL_HEIGHT;
      const winH = opening.heightMeters || DEFAULT_WINDOW_HEIGHT;
      const topH = floorHeight - sillH - winH;

      // Below window
      if (sillH > 0) {
        const belowMesh = createWallSegment(
          wallX, wallZ, openStart, opening.widthMeters,
          0, sillH, direction, wallMat
        );
        group.add(belowMesh);
      }

      // Above window
      if (topH > 0) {
        const aboveMesh = createWallSegment(
          wallX, wallZ, openStart, opening.widthMeters,
          sillH + winH, topH, direction, wallMat
        );
        group.add(aboveMesh);
      }

      // Glass pane
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.3,
        roughness: 0.1,
      });
      const glassMesh = createWallSegment(
        wallX, wallZ, openStart, opening.widthMeters,
        sillH, winH, direction, glassMat
      );
      group.add(glassMesh);
    }

    currentPos = openEnd;
  }

  // Remaining wall after last opening
  if (currentPos < wallLength) {
    const segLength = wallLength - currentPos;
    const segMesh = createWallSegment(
      wallX, wallZ, currentPos, segLength, 0, floorHeight, direction, wallMat
    );
    group.add(segMesh);
  }
}

function createSolidWall(
  wallX: number,
  wallZ: number,
  length: number,
  height: number,
  direction: 'north' | 'south' | 'east' | 'west',
  mat: THREE.Material
): THREE.Mesh {
  return createWallSegment(wallX, wallZ, 0, length, 0, height, direction, mat);
}

function createWallSegment(
  wallX: number,
  wallZ: number,
  offsetAlongWall: number,
  segLength: number,
  yOffset: number,
  segHeight: number,
  direction: 'north' | 'south' | 'east' | 'west',
  mat: THREE.Material
): THREE.Mesh {
  let geo: THREE.BoxGeometry;
  let px: number, py: number, pz: number;

  py = yOffset + segHeight / 2;

  switch (direction) {
    case 'north':
    case 'south':
      // Wall along X axis
      geo = new THREE.BoxGeometry(segLength, segHeight, WALL_THICKNESS);
      px = wallX + offsetAlongWall + segLength / 2;
      pz = wallZ;
      break;
    case 'east':
    case 'west':
      // Wall along Z axis
      geo = new THREE.BoxGeometry(WALL_THICKNESS, segHeight, segLength);
      px = wallX;
      pz = wallZ + offsetAlongWall + segLength / 2;
      break;
  }

  const mesh = new THREE.Mesh(geo!, mat);
  mesh.position.set(px!, py, pz!);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function getWallBoundingBoxes(floor: Floor): THREE.Box3[] {
  const boxes: THREE.Box3[] = [];
  const playerRadius = 0.3;

  for (const room of floor.rooms) {
    const { x, y: z, widthMeters: w, depthMeters: d } = room;
    const h = floor.heightMeters;

    // Check each wall for solid segments (accounting for openings)
    addWallBoxes(boxes, room.walls.north, x, z, w, h, 'north', room);
    addWallBoxes(boxes, room.walls.south, x, z + d, w, h, 'south', room);
    addWallBoxes(boxes, room.walls.west, x, z, d, h, 'west', room);
    addWallBoxes(boxes, room.walls.east, x + w, z, d, h, 'east', room);
  }

  return boxes;
}

function addWallBoxes(
  boxes: THREE.Box3[],
  wall: Wall,
  wallX: number,
  wallZ: number,
  wallLength: number,
  height: number,
  direction: 'north' | 'south' | 'east' | 'west',
  room: Room
) {
  if (!wall.hasWall) return;

  const openings = [...wall.openings].sort((a, b) => a.positionFromLeft - b.positionFromLeft);

  // For collision, we only care about solid parts at player height (0-2m)
  let segments: { start: number; end: number }[] = [];
  let currentPos = 0;

  for (const opening of openings) {
    if (opening.type === 'door') {
      // Door is fully open at player height
      if (currentPos < opening.positionFromLeft) {
        segments.push({ start: currentPos, end: opening.positionFromLeft });
      }
      currentPos = opening.positionFromLeft + opening.widthMeters;
    } else {
      // Window — wall still exists at sill height, skip collision for simplicity
      // (player can't walk through window anyway)
      // Keep as solid
    }
  }

  if (currentPos < wallLength) {
    segments.push({ start: currentPos, end: wallLength });
  }

  // If no doors, entire wall is solid
  if (openings.filter(o => o.type === 'door').length === 0) {
    segments = [{ start: 0, end: wallLength }];
  }

  for (const seg of segments) {
    const segLen = seg.end - seg.start;
    const wt = WALL_THICKNESS + 0.2; // slight padding for collision

    let min: THREE.Vector3, max: THREE.Vector3;

    switch (direction) {
      case 'north':
      case 'south':
        min = new THREE.Vector3(
          wallX + seg.start,
          0,
          wallZ - wt / 2
        );
        max = new THREE.Vector3(
          wallX + seg.end,
          height,
          wallZ + wt / 2
        );
        break;
      case 'east':
      case 'west':
        min = new THREE.Vector3(
          wallX - wt / 2,
          0,
          wallZ + seg.start
        );
        max = new THREE.Vector3(
          wallX + wt / 2,
          height,
          wallZ + seg.end
        );
        break;
    }

    boxes.push(new THREE.Box3(min!, max!));
  }
}
