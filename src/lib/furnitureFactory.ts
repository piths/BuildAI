import * as THREE from 'three';
import { FurnitureType } from './types';

const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b6914 });
const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
const grayMat = new THREE.MeshStandardMaterial({ color: 0x808080 });
const darkGrayMat = new THREE.MeshStandardMaterial({ color: 0x404040 });
const creamMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e0 });
const greenMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xcc5533 });
const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
const blueMat = new THREE.MeshStandardMaterial({ color: 0x4488cc });

export function createFurniture3D(type: FurnitureType, width: number, depth: number): THREE.Group {
  const group = new THREE.Group();

  switch (type) {
    case 'sofa':
      createSofa(group, width, depth);
      break;
    case 'armchair':
      createArmchair(group, width, depth);
      break;
    case 'coffee_table':
    case 'side_table':
      createTable(group, width, depth, 0.45, woodMat);
      break;
    case 'tv_stand':
      createTVStand(group, width, depth);
      break;
    case 'bookshelf':
      createBookshelf(group, width, depth);
      break;
    case 'single_bed':
      createBed(group, width, depth);
      break;
    case 'double_bed':
      createBed(group, width, depth);
      break;
    case 'wardrobe':
      createWardrobe(group, width, depth);
      break;
    case 'dresser':
      createDresser(group, width, depth);
      break;
    case 'nightstand':
      createTable(group, width, depth, 0.5, darkWoodMat);
      break;
    case 'desk':
    case 'office_desk':
      createDesk(group, width, depth);
      break;
    case 'desk_chair':
    case 'office_chair':
      createOfficeChair(group, width, depth);
      break;
    case 'kitchen_counter':
    case 'kitchen_island':
      createCounter(group, width, depth);
      break;
    case 'stove':
      createStove(group, width, depth);
      break;
    case 'refrigerator':
      createRefrigerator(group, width, depth);
      break;
    case 'sink':
    case 'bathroom_sink':
      createSink(group, width, depth);
      break;
    case 'dining_table':
      createTable(group, width, depth, 0.75, woodMat);
      break;
    case 'dining_chair':
      createDiningChair(group, width, depth);
      break;
    case 'bathtub':
      createBathtub(group, width, depth);
      break;
    case 'shower':
      createShower(group, width, depth);
      break;
    case 'toilet_unit':
      createToilet(group, width, depth);
      break;
    case 'mirror_cabinet':
      createMirrorCabinet(group, width, depth);
      break;
    case 'filing_cabinet':
      createFilingCabinet(group, width, depth);
      break;
    case 'whiteboard':
      createWhiteboard(group, width, depth);
      break;
    case 'printer':
      createPrinter(group, width, depth);
      break;
    case 'sideboard':
      createDresser(group, width, depth);
      break;
    case 'potted_plant':
      createPottedPlant(group, width, depth);
      break;
    case 'lamp':
      createLamp(group, width, depth);
      break;
    case 'coat_rack':
      createCoatRack(group, width, depth);
      break;
    case 'shoe_rack':
      createShoeRack(group, width, depth);
      break;
    case 'rug':
      createRug(group, width, depth);
      break;
    case 'chandelier':
      createChandelier(group, width, depth);
      break;
    default:
      // Generic box
      const geo = new THREE.BoxGeometry(width, 0.5, depth);
      const mesh = new THREE.Mesh(geo, grayMat);
      mesh.position.y = 0.25;
      group.add(mesh);
  }

  return group;
}

function createSofa(group: THREE.Group, w: number, d: number) {
  const seatH = 0.45;
  const backH = 0.35;
  const armW = 0.12;

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(w, seatH, d * 0.7), darkGrayMat);
  seat.position.set(0, seatH / 2, d * 0.15);
  group.add(seat);

  // Back
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, backH, d * 0.2), darkGrayMat);
  back.position.set(0, seatH + backH / 2, -d * 0.4 + d * 0.1);
  group.add(back);

  // Arms
  const armL = new THREE.Mesh(new THREE.BoxGeometry(armW, seatH + 0.1, d * 0.8), darkGrayMat);
  armL.position.set(-w / 2 + armW / 2, (seatH + 0.1) / 2, 0);
  group.add(armL);

  const armR = new THREE.Mesh(new THREE.BoxGeometry(armW, seatH + 0.1, d * 0.8), darkGrayMat);
  armR.position.set(w / 2 - armW / 2, (seatH + 0.1) / 2, 0);
  group.add(armR);
}

function createArmchair(group: THREE.Group, w: number, d: number) {
  createSofa(group, w, d);
}

function createTable(group: THREE.Group, w: number, d: number, h: number, mat: THREE.Material) {
  // Top
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat);
  top.position.y = h;
  group.add(top);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, h, 8);
  const positions = [
    [-w / 2 + 0.06, h / 2, -d / 2 + 0.06],
    [w / 2 - 0.06, h / 2, -d / 2 + 0.06],
    [-w / 2 + 0.06, h / 2, d / 2 - 0.06],
    [w / 2 - 0.06, h / 2, d / 2 - 0.06],
  ];
  for (const [lx, ly, lz] of positions) {
    const leg = new THREE.Mesh(legGeo, darkWoodMat);
    leg.position.set(lx, ly, lz);
    group.add(leg);
  }
}

function createTVStand(group: THREE.Group, w: number, d: number) {
  // Stand
  const stand = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), darkWoodMat);
  stand.position.y = 0.2;
  group.add(stand);

  // TV screen
  const tv = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, w * 0.5, 0.05), blackMat);
  tv.position.set(0, 0.4 + w * 0.25, 0);
  group.add(tv);
}

function createBookshelf(group: THREE.Group, w: number, d: number) {
  const h = 1.8;
  // Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
  frame.position.y = h / 2;
  group.add(frame);

  // Shelves (dark lines)
  for (let i = 1; i < 5; i++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.02, d * 0.9), darkWoodMat);
    shelf.position.y = (h / 5) * i;
    group.add(shelf);
  }
}

function createBed(group: THREE.Group, w: number, d: number) {
  // Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), woodMat);
  frame.position.y = 0.15;
  group.add(frame);

  // Mattress
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.2, d * 0.9), whiteMat);
  mattress.position.set(0, 0.4, 0);
  group.add(mattress);

  // Pillow
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.1, 0.3), creamMat);
  pillow.position.set(0, 0.55, -d * 0.35);
  group.add(pillow);

  // Headboard
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, 0.05), darkWoodMat);
  headboard.position.set(0, 0.6, -d / 2);
  group.add(headboard);
}

function createWardrobe(group: THREE.Group, w: number, d: number) {
  const h = 2.1;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
  body.position.y = h / 2;
  group.add(body);

  // Door line
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.01, h * 0.9, d * 0.01), darkWoodMat);
  line.position.set(0, h / 2, d / 2 + 0.01);
  group.add(line);
}

function createDresser(group: THREE.Group, w: number, d: number) {
  const h = 0.8;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
  body.position.y = h / 2;
  group.add(body);
}

function createDesk(group: THREE.Group, w: number, d: number) {
  createTable(group, w, d, 0.75, woodMat);
}

function createOfficeChair(group: THREE.Group, w: number, d: number) {
  // Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16), grayMat);
  base.position.y = 0.025;
  group.add(base);

  // Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), grayMat);
  pole.position.y = 0.22;
  group.add(pole);

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.06, d * 0.8), darkGrayMat);
  seat.position.y = 0.45;
  group.add(seat);

  // Back
  const back = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.4, 0.05), darkGrayMat);
  back.position.set(0, 0.7, -d * 0.35);
  group.add(back);
}

function createCounter(group: THREE.Group, w: number, d: number) {
  const h = 0.9;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
  body.position.y = h / 2;
  group.add(body);

  // Counter top
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.04, d + 0.02), grayMat);
  top.position.y = h;
  group.add(top);
}

function createStove(group: THREE.Group, w: number, d: number) {
  const h = 0.9;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), darkGrayMat);
  body.position.y = h / 2;
  group.add(body);

  // Burners
  const burnerGeo = new THREE.CylinderGeometry(w * 0.12, w * 0.12, 0.02, 16);
  const positions = [
    [-w * 0.2, h + 0.01, -d * 0.2],
    [w * 0.2, h + 0.01, -d * 0.2],
    [-w * 0.2, h + 0.01, d * 0.2],
    [w * 0.2, h + 0.01, d * 0.2],
  ];
  for (const [bx, by, bz] of positions) {
    const burner = new THREE.Mesh(burnerGeo, blackMat);
    burner.position.set(bx, by, bz);
    group.add(burner);
  }
}

function createRefrigerator(group: THREE.Group, w: number, d: number) {
  const h = 1.8;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), grayMat);
  body.position.y = h / 2;
  group.add(body);

  // Handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), darkGrayMat);
  handle.position.set(w * 0.4, h * 0.6, d / 2 + 0.02);
  group.add(handle);
}

function createSink(group: THREE.Group, w: number, d: number) {
  const h = 0.85;
  // Cabinet
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), whiteMat);
  cabinet.position.y = h / 2;
  group.add(cabinet);

  // Basin (recessed top)
  const basin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.15, d * 0.5), blueMat);
  basin.position.set(0, h - 0.05, 0);
  group.add(basin);
}

function createDiningChair(group: THREE.Group, w: number, d: number) {
  const seatH = 0.45;
  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), woodMat);
  seat.position.y = seatH;
  group.add(seat);

  // Back
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, 0.04), woodMat);
  back.position.set(0, seatH + 0.2, -d / 2);
  group.add(back);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.02, 0.02, seatH, 6);
  const positions = [
    [-w / 2 + 0.04, seatH / 2, -d / 2 + 0.04],
    [w / 2 - 0.04, seatH / 2, -d / 2 + 0.04],
    [-w / 2 + 0.04, seatH / 2, d / 2 - 0.04],
    [w / 2 - 0.04, seatH / 2, d / 2 - 0.04],
  ];
  for (const [lx, ly, lz] of positions) {
    const leg = new THREE.Mesh(legGeo, darkWoodMat);
    leg.position.set(lx, ly, lz);
    group.add(leg);
  }
}

function createBathtub(group: THREE.Group, w: number, d: number) {
  const h = 0.55;
  // Outer
  const outer = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), whiteMat);
  outer.position.y = h / 2;
  group.add(outer);

  // Inner (slightly recessed blue)
  const inner = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, h * 0.6, d * 0.85), blueMat);
  inner.position.set(0, h * 0.55, 0);
  group.add(inner);
}

function createShower(group: THREE.Group, w: number, d: number) {
  // Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), whiteMat);
  base.position.y = 0.04;
  group.add(base);

  // Glass walls (semi-transparent)
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.3 });
  const glass1 = new THREE.Mesh(new THREE.BoxGeometry(w, 2.0, 0.02), glassMat);
  glass1.position.set(0, 1.0, d / 2);
  group.add(glass1);

  // Shower pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.0, 8), grayMat);
  pole.position.set(0, 1.0, -d * 0.4);
  group.add(pole);

  // Shower head
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.04, 12), grayMat);
  head.position.set(0, 2.0, -d * 0.3);
  head.rotation.x = Math.PI / 6;
  group.add(head);
}

function createToilet(group: THREE.Group, w: number, d: number) {
  // Bowl
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.35, w * 0.3, 0.4, 16), whiteMat);
  bowl.position.set(0, 0.2, d * 0.15);
  group.add(bowl);

  // Tank
  const tank = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.4, d * 0.3), whiteMat);
  tank.position.set(0, 0.45, -d * 0.3);
  group.add(tank);

  // Seat
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.33, w * 0.33, 0.04, 16), creamMat);
  seat.position.set(0, 0.42, d * 0.15);
  group.add(seat);
}

function createMirrorCabinet(group: THREE.Group, w: number, d: number) {
  const h = 0.6;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), whiteMat);
  body.position.y = 1.5;
  group.add(body);

  // Mirror face
  const mirror = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.9, h * 0.9, 0.01),
    new THREE.MeshStandardMaterial({ color: 0xccddff, metalness: 0.8, roughness: 0.1 })
  );
  mirror.position.set(0, 1.5, d / 2 + 0.01);
  group.add(mirror);
}

function createFilingCabinet(group: THREE.Group, w: number, d: number) {
  const h = 1.2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), grayMat);
  body.position.y = h / 2;
  group.add(body);

  // Drawer handles
  for (let i = 0; i < 3; i++) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.02, 0.03), darkGrayMat);
    handle.position.set(0, 0.2 + i * 0.35, d / 2 + 0.02);
    group.add(handle);
  }
}

function createWhiteboard(group: THREE.Group, w: number, d: number) {
  const h = 1.2;
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), whiteMat);
  board.position.set(0, 1.4, 0);
  group.add(board);

  // Frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.03, 0.05), frameMat);
  top.position.set(0, 2.0, 0);
  group.add(top);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.03, 0.05), frameMat);
  bottom.position.set(0, 0.8, 0);
  group.add(bottom);
}

function createPrinter(group: THREE.Group, w: number, d: number) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), grayMat);
  body.position.y = 0.15;
  group.add(body);

  // Paper tray
  const tray = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.02, d * 0.4), whiteMat);
  tray.position.set(0, 0.32, d * 0.2);
  group.add(tray);
}

function createPottedPlant(group: THREE.Group, w: number, d: number) {
  // Pot
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.3, w * 0.2, 0.3, 12), terracottaMat);
  pot.position.y = 0.15;
  group.add(pot);

  // Foliage
  const foliage = new THREE.Mesh(new THREE.SphereGeometry(w * 0.4, 12, 12), greenMat);
  foliage.position.y = 0.55;
  group.add(foliage);
}

function createLamp(group: THREE.Group, w: number, d: number) {
  // Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.2, w * 0.25, 0.05, 12), darkGrayMat);
  base.position.y = 0.025;
  group.add(base);

  // Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 8), grayMat);
  pole.position.y = 0.72;
  group.add(pole);

  // Shade
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.3, 12), creamMat);
  shade.position.y = 1.45;
  group.add(shade);
}

function createCoatRack(group: THREE.Group, w: number, d: number) {
  // Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 8), darkWoodMat);
  pole.position.y = 0.85;
  group.add(pole);

  // Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.05, 12), darkWoodMat);
  base.position.y = 0.025;
  group.add(base);

  // Hooks
  for (let i = 0; i < 4; i++) {
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.02), grayMat);
    hook.position.set(0.08 * Math.cos((i * Math.PI) / 2), 1.6, 0.08 * Math.sin((i * Math.PI) / 2));
    group.add(hook);
  }
}

function createShoeRack(group: THREE.Group, w: number, d: number) {
  const h = 0.6;
  // Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
  frame.position.y = h / 2;
  group.add(frame);

  // Shelves
  for (let i = 1; i < 3; i++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.015, d * 0.9), darkWoodMat);
    shelf.position.set(0, (h / 3) * i, 0);
    group.add(shelf);
  }
}

function createRug(group: THREE.Group, w: number, d: number) {
  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.02, d),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  rug.position.y = 0.01;
  group.add(rug);
}

function createChandelier(group: THREE.Group, w: number, d: number) {
  // This will hang from ceiling
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.2, 12), grayMat);
  body.position.y = 2.6;
  group.add(body);

  // Chain
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6), grayMat);
  chain.position.y = 2.85;
  group.add(chain);

  // Lights
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffff88, emissiveIntensity: 0.5 });
  for (let i = 0; i < 4; i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), lightMat);
    bulb.position.set(
      0.25 * Math.cos((i * Math.PI) / 2),
      2.5,
      0.25 * Math.sin((i * Math.PI) / 2)
    );
    group.add(bulb);
  }
}
