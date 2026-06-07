import { FloorPlan, Floor, Room } from './types';
import { WALL_THICKNESS } from './constants';

/**
 * Minimal IFC4 (STEP) exporter — produces a BIM model with a project, site,
 * building, storeys, walls and spaces. Imports into ArchiCAD, Revit, etc.
 *
 * This is a pragmatic subset: walls are extruded boxes, spaces are extruded
 * room footprints. Coordinates map x→x, y→y (meters), Z is height.
 */

class IfcWriter {
  private id = 0;
  private lines: string[] = [];

  next(): number {
    return ++this.id;
  }

  add(ref: number, content: string) {
    this.lines.push(`#${ref}=${content};`);
  }

  raw(content: string): number {
    const ref = this.next();
    this.add(ref, content);
    return ref;
  }

  body(): string {
    return this.lines.join('\n');
  }
}

function ifcGuid(): string {
  // IFC GUID is a 22-char base64-ish string; a pseudo-random one is fine here.
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
  let s = '';
  for (let i = 0; i < 22; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function exportToIfc(floorPlan: FloorPlan): string {
  const w = new IfcWriter();
  const now = new Date().toISOString().split('.')[0];

  // Owner history / person / org (minimal)
  const person = w.raw(`IFCPERSON($,'BuildAI','User',$,$,$,$,$)`);
  const org = w.raw(`IFCORGANIZATION($,'BuildAI',$,$,$)`);
  const personOrg = w.raw(`IFCPERSONANDORGANIZATION(#${person},#${org},$)`);
  const app = w.raw(`IFCAPPLICATION(#${org},'1.0','BuildAI','BuildAI')`);
  const ownerHistory = w.raw(
    `IFCOWNERHISTORY(#${personOrg},#${app},$,.ADDED.,$,$,$,${Math.floor(Date.now() / 1000)})`
  );

  // Units (meters, square meters, cubic meters)
  const lenUnit = w.raw(`IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)`);
  const areaUnit = w.raw(`IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)`);
  const volUnit = w.raw(`IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)`);
  const angleUnit = w.raw(`IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)`);
  const unitAssignment = w.raw(
    `IFCUNITASSIGNMENT((#${lenUnit},#${areaUnit},#${volUnit},#${angleUnit}))`
  );

  // Geometric context
  const originPt = w.raw(`IFCCARTESIANPOINT((0.,0.,0.))`);
  const axisZ = w.raw(`IFCDIRECTION((0.,0.,1.))`);
  const axisX = w.raw(`IFCDIRECTION((1.,0.,0.))`);
  const worldCS = w.raw(`IFCAXIS2PLACEMENT3D(#${originPt},#${axisZ},#${axisX})`);
  const context = w.raw(
    `IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#${worldCS},$)`
  );

  const placement = w.raw(`IFCLOCALPLACEMENT($,#${worldCS})`);

  // Spatial structure
  const projElems: number[] = [];
  const project = w.raw(
    `IFCPROJECT('${ifcGuid()}',#${ownerHistory},'${floorPlan.buildingName}',$,$,$,$,(#${context}),#${unitAssignment})`
  );
  const site = w.raw(
    `IFCSITE('${ifcGuid()}',#${ownerHistory},'Site',$,$,#${placement},$,$,.ELEMENT.,$,$,$,$,$)`
  );
  const building = w.raw(
    `IFCBUILDING('${ifcGuid()}',#${ownerHistory},'${floorPlan.buildingName}',$,$,#${placement},$,$,.ELEMENT.,$,$,$)`
  );
  void projElems;

  // Aggregation: project → site → building
  w.raw(`IFCRELAGGREGATES('${ifcGuid()}',#${ownerHistory},$,$,#${project},(#${site}))`);
  w.raw(`IFCRELAGGREGATES('${ifcGuid()}',#${ownerHistory},$,$,#${site},(#${building}))`);

  let baseElevation = 0;
  const storeyRefs: number[] = [];

  for (const floor of floorPlan.floors) {
    const storeyPtRef = w.raw(`IFCCARTESIANPOINT((0.,0.,${baseElevation.toFixed(3)}))`);
    const storeyCS = w.raw(`IFCAXIS2PLACEMENT3D(#${storeyPtRef},#${axisZ},#${axisX})`);
    const storeyPlacement = w.raw(`IFCLOCALPLACEMENT(#${placement},#${storeyCS})`);
    const storey = w.raw(
      `IFCBUILDINGSTOREY('${ifcGuid()}',#${ownerHistory},'${floor.floorName}',$,$,#${storeyPlacement},$,$,.ELEMENT.,${baseElevation.toFixed(3)})`
    );
    storeyRefs.push(storey);

    const productsInStorey: number[] = [];

    for (const room of floor.rooms) {
      // --- Walls ---
      const wallSpecs = [
        { wall: room.walls.north, x: room.x, y: room.y, len: room.widthMeters, dir: 'h' as const },
        { wall: room.walls.south, x: room.x, y: room.y + room.depthMeters, len: room.widthMeters, dir: 'h' as const },
        { wall: room.walls.west, x: room.x, y: room.y, len: room.depthMeters, dir: 'v' as const },
        { wall: room.walls.east, x: room.x + room.widthMeters, y: room.y, len: room.depthMeters, dir: 'v' as const },
      ];

      for (const spec of wallSpecs) {
        if (!spec.wall.hasWall) continue;
        const wallRef = createWall(
          w, ownerHistory, context, placement, storeyPlacement,
          spec.x, spec.y, spec.len, floor.heightMeters, spec.dir
        );
        productsInStorey.push(wallRef);
      }

      // --- Space (room) ---
      const spaceRef = createSpace(
        w, ownerHistory, context, storeyPlacement,
        room, floor.heightMeters
      );
      productsInStorey.push(spaceRef);
    }

    // Relate products to storey
    if (productsInStorey.length > 0) {
      const refList = productsInStorey.map((r) => `#${r}`).join(',');
      w.raw(
        `IFCRELCONTAINEDINSPATIALSTRUCTURE('${ifcGuid()}',#${ownerHistory},$,$,(${refList}),#${storey})`
      );
    }

    baseElevation += floor.heightMeters;
  }

  // Building → storeys aggregation
  if (storeyRefs.length > 0) {
    const list = storeyRefs.map((r) => `#${r}`).join(',');
    w.raw(`IFCRELAGGREGATES('${ifcGuid()}',#${ownerHistory},$,$,#${building},(${list}))`);
  }

  const header = [
    'ISO-10303-21;',
    'HEADER;',
    `FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');`,
    `FILE_NAME('${floorPlan.buildingName}.ifc','${now}',('BuildAI'),('BuildAI'),'BuildAI','BuildAI','');`,
    `FILE_SCHEMA(('IFC4'));`,
    'ENDSEC;',
    'DATA;',
  ].join('\n');

  return `${header}\n${w.body()}\nENDSEC;\nEND-ISO-10303-21;\n`;
}

function createWall(
  w: IfcWriter,
  ownerHistory: number,
  context: number,
  buildingPlacement: number,
  storeyPlacement: number,
  x: number,
  y: number,
  length: number,
  height: number,
  dir: 'h' | 'v'
): number {
  // Wall local placement at its start point
  const startPt = w.raw(`IFCCARTESIANPOINT((${x.toFixed(3)},${y.toFixed(3)},0.))`);
  const zDir = w.raw(`IFCDIRECTION((0.,0.,1.))`);
  // X axis along the wall direction
  const xDir = dir === 'h'
    ? w.raw(`IFCDIRECTION((1.,0.,0.))`)
    : w.raw(`IFCDIRECTION((0.,1.,0.))`);
  const wallCS = w.raw(`IFCAXIS2PLACEMENT3D(#${startPt},#${zDir},#${xDir})`);
  const wallPlacement = w.raw(`IFCLOCALPLACEMENT(#${storeyPlacement},#${wallCS})`);

  // Profile: rectangle (length x thickness) centered on its placement origin offset
  const profilePt = w.raw(`IFCCARTESIANPOINT((${(length / 2).toFixed(3)},0.))`);
  const profileDir = w.raw(`IFCDIRECTION((1.,0.))`);
  const profilePlacement = w.raw(`IFCAXIS2PLACEMENT2D(#${profilePt},#${profileDir})`);
  const profile = w.raw(
    `IFCRECTANGLEPROFILEDEF(.AREA.,$,#${profilePlacement},${length.toFixed(3)},${WALL_THICKNESS.toFixed(3)})`
  );

  const extrudeDir = w.raw(`IFCDIRECTION((0.,0.,1.))`);
  const solidPt = w.raw(`IFCCARTESIANPOINT((0.,0.,0.))`);
  const solidZ = w.raw(`IFCDIRECTION((0.,0.,1.))`);
  const solidX = w.raw(`IFCDIRECTION((1.,0.,0.))`);
  const solidPos = w.raw(`IFCAXIS2PLACEMENT3D(#${solidPt},#${solidZ},#${solidX})`);
  const solid = w.raw(
    `IFCEXTRUDEDAREASOLID(#${profile},#${solidPos},#${extrudeDir},${height.toFixed(3)})`
  );

  const shapeRep = w.raw(
    `IFCSHAPEREPRESENTATION(#${context},'Body','SweptSolid',(#${solid}))`
  );
  const prodShape = w.raw(`IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRep}))`);

  void buildingPlacement;
  return w.raw(
    `IFCWALLSTANDARDCASE('${ifcGuid()}',#${ownerHistory},'Wall',$,$,#${wallPlacement},#${prodShape},$,$)`
  );
}

function createSpace(
  w: IfcWriter,
  ownerHistory: number,
  context: number,
  storeyPlacement: number,
  room: Room,
  height: number
): number {
  const pt = w.raw(`IFCCARTESIANPOINT((${room.x.toFixed(3)},${room.y.toFixed(3)},0.))`);
  const zDir = w.raw(`IFCDIRECTION((0.,0.,1.))`);
  const xDir = w.raw(`IFCDIRECTION((1.,0.,0.))`);
  const cs = w.raw(`IFCAXIS2PLACEMENT3D(#${pt},#${zDir},#${xDir})`);
  const spacePlacement = w.raw(`IFCLOCALPLACEMENT(#${storeyPlacement},#${cs})`);

  // Footprint rectangle profile
  const profPt = w.raw(`IFCCARTESIANPOINT((${(room.widthMeters / 2).toFixed(3)},${(room.depthMeters / 2).toFixed(3)}))`);
  const profDir = w.raw(`IFCDIRECTION((1.,0.))`);
  const profPlacement = w.raw(`IFCAXIS2PLACEMENT2D(#${profPt},#${profDir})`);
  const profile = w.raw(
    `IFCRECTANGLEPROFILEDEF(.AREA.,$,#${profPlacement},${room.widthMeters.toFixed(3)},${room.depthMeters.toFixed(3)})`
  );

  const extrudeDir = w.raw(`IFCDIRECTION((0.,0.,1.))`);
  const solidPt = w.raw(`IFCCARTESIANPOINT((0.,0.,0.))`);
  const solidZ = w.raw(`IFCDIRECTION((0.,0.,1.))`);
  const solidX = w.raw(`IFCDIRECTION((1.,0.,0.))`);
  const solidPos = w.raw(`IFCAXIS2PLACEMENT3D(#${solidPt},#${solidZ},#${solidX})`);
  const solid = w.raw(
    `IFCEXTRUDEDAREASOLID(#${profile},#${solidPos},#${extrudeDir},${height.toFixed(3)})`
  );

  const shapeRep = w.raw(
    `IFCSHAPEREPRESENTATION(#${context},'Body','SweptSolid',(#${solid}))`
  );
  const prodShape = w.raw(`IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRep}))`);

  return w.raw(
    `IFCSPACE('${ifcGuid()}',#${ownerHistory},'${room.name}',$,$,#${spacePlacement},#${prodShape},$,.ELEMENT.,.INTERNAL.,$)`
  );
}

export function downloadIfc(floorPlan: FloorPlan) {
  const content = exportToIfc(floorPlan);
  const blob = new Blob([content], { type: 'application/x-step' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${floorPlan.buildingName.replace(/\s+/g, '_')}.ifc`;
  a.click();
  URL.revokeObjectURL(url);
}
