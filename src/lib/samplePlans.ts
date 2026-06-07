import { FloorPlan } from './types';

// Pre-built, properly-tiled example floor plans that load instantly (no AI needed).

const door = (positionFromLeft: number, widthMeters = 0.9) => ({
  type: 'door' as const,
  positionFromLeft,
  widthMeters,
});

const window = (positionFromLeft: number, widthMeters = 1.2) => ({
  type: 'window' as const,
  positionFromLeft,
  widthMeters,
  heightMeters: 1.2,
  sillHeight: 0.9,
});

// 1. Studio Apartment — 6m x 5m single open space + bathroom
const studioApartment: FloorPlan = {
  buildingName: 'Compact Studio',
  totalAreaSqMeters: 30,
  floors: [
    {
      floorNumber: 1,
      floorName: 'Ground Floor',
      heightMeters: 3,
      rooms: [
        {
          id: 'room_1',
          name: 'Studio',
          type: 'living_room',
          x: 0,
          y: 0,
          widthMeters: 6,
          depthMeters: 4,
          walls: {
            north: { hasWall: true, openings: [window(2, 1.5)] },
            south: { hasWall: true, openings: [door(0.3)] },
            east: { hasWall: true, openings: [window(1, 1.2)] },
            west: { hasWall: true, openings: [] },
          },
          furniture: [
            { type: 'double_bed', x: 0.3, y: 0.3, rotation: 0, widthMeters: 1.6, depthMeters: 2 },
            { type: 'sofa', x: 3.5, y: 0.4, rotation: 0, widthMeters: 2, depthMeters: 0.8 },
            { type: 'kitchen_counter', x: 2.2, y: 3.3, rotation: 0, widthMeters: 2.5, depthMeters: 0.6 },
            { type: 'refrigerator', x: 5, y: 3.2, rotation: 0, widthMeters: 0.7, depthMeters: 0.7 },
            { type: 'coffee_table', x: 4, y: 1.6, rotation: 0, widthMeters: 1, depthMeters: 0.5 },
            { type: 'potted_plant', x: 0.4, y: 3, rotation: 0, widthMeters: 0.5, depthMeters: 0.5 },
          ],
        },
        {
          id: 'room_2',
          name: 'Bathroom',
          type: 'bathroom',
          x: 0,
          y: 4,
          widthMeters: 2.5,
          depthMeters: 2,
          walls: {
            north: { hasWall: true, openings: [door(1.4)] },
            south: { hasWall: true, openings: [] },
            east: { hasWall: true, openings: [] },
            west: { hasWall: true, openings: [window(0.8, 0.6)] },
          },
          furniture: [
            { type: 'toilet_unit', x: 0.3, y: 0.4, rotation: 0, widthMeters: 0.6, depthMeters: 0.8 },
            { type: 'shower', x: 1.5, y: 0.3, rotation: 0, widthMeters: 0.9, depthMeters: 0.9 },
            { type: 'bathroom_sink', x: 0.3, y: 1.4, rotation: 0, widthMeters: 0.6, depthMeters: 0.5 },
          ],
        },
        {
          id: 'room_3',
          name: 'Entry Hall',
          type: 'hallway',
          x: 2.5,
          y: 4,
          widthMeters: 3.5,
          depthMeters: 2,
          walls: {
            north: { hasWall: true, openings: [door(0.3)] },
            south: { hasWall: true, openings: [door(1.4)] },
            east: { hasWall: true, openings: [] },
            west: { hasWall: true, openings: [] },
          },
          furniture: [
            { type: 'shoe_rack', x: 0.3, y: 1.4, rotation: 0, widthMeters: 0.8, depthMeters: 0.3 },
            { type: 'coat_rack', x: 2.8, y: 0.4, rotation: 0, widthMeters: 0.4, depthMeters: 0.4 },
          ],
        },
      ],
    },
  ],
};

// 2. Two-Bedroom Home — 10m x 7m
const twoBedroomHome: FloorPlan = {
  buildingName: 'Two-Bedroom Home',
  totalAreaSqMeters: 70,
  floors: [
    {
      floorNumber: 1,
      floorName: 'Ground Floor',
      heightMeters: 3,
      rooms: [
        {
          id: 'room_1',
          name: 'Living Room',
          type: 'living_room',
          x: 0,
          y: 0,
          widthMeters: 5,
          depthMeters: 4,
          walls: {
            north: { hasWall: true, openings: [window(2, 1.5)] },
            south: { hasWall: true, openings: [] },
            east: { hasWall: true, openings: [door(1.5)] },
            west: { hasWall: true, openings: [window(1.5, 1.2)] },
          },
          furniture: [
            { type: 'sofa', x: 0.5, y: 0.4, rotation: 0, widthMeters: 2.5, depthMeters: 0.9 },
            { type: 'tv_stand', x: 1, y: 3.4, rotation: 0, widthMeters: 1.8, depthMeters: 0.4 },
            { type: 'coffee_table', x: 1.3, y: 1.8, rotation: 0, widthMeters: 1.2, depthMeters: 0.6 },
            { type: 'armchair', x: 3.5, y: 0.5, rotation: 0, widthMeters: 1, depthMeters: 0.9 },
            { type: 'potted_plant', x: 4.3, y: 3.2, rotation: 0, widthMeters: 0.5, depthMeters: 0.5 },
          ],
        },
        {
          id: 'room_2',
          name: 'Kitchen',
          type: 'kitchen',
          x: 5,
          y: 0,
          widthMeters: 5,
          depthMeters: 4,
          walls: {
            north: { hasWall: true, openings: [window(2, 1.5)] },
            south: { hasWall: true, openings: [] },
            east: { hasWall: true, openings: [window(1.5, 1.2)] },
            west: { hasWall: true, openings: [door(1.5)] },
          },
          furniture: [
            { type: 'kitchen_counter', x: 0.3, y: 0.3, rotation: 0, widthMeters: 4, depthMeters: 0.6 },
            { type: 'stove', x: 1.5, y: 0.35, rotation: 0, widthMeters: 0.7, depthMeters: 0.6 },
            { type: 'sink', x: 2.8, y: 0.35, rotation: 0, widthMeters: 0.7, depthMeters: 0.6 },
            { type: 'refrigerator', x: 4, y: 0.3, rotation: 0, widthMeters: 0.8, depthMeters: 0.7 },
            { type: 'dining_table', x: 1.5, y: 2, rotation: 0, widthMeters: 1.6, depthMeters: 1 },
            { type: 'dining_chair', x: 1.6, y: 3.2, rotation: 0, widthMeters: 0.5, depthMeters: 0.5 },
            { type: 'dining_chair', x: 2.6, y: 3.2, rotation: 0, widthMeters: 0.5, depthMeters: 0.5 },
          ],
        },
        {
          id: 'room_3',
          name: 'Bedroom 1',
          type: 'bedroom',
          x: 0,
          y: 4,
          widthMeters: 4,
          depthMeters: 3,
          walls: {
            north: { hasWall: true, openings: [] },
            south: { hasWall: true, openings: [window(1.5, 1.2)] },
            east: { hasWall: true, openings: [door(1)] },
            west: { hasWall: true, openings: [window(1, 1.2)] },
          },
          furniture: [
            { type: 'double_bed', x: 0.4, y: 0.4, rotation: 0, widthMeters: 1.6, depthMeters: 2 },
            { type: 'wardrobe', x: 2.5, y: 0.3, rotation: 0, widthMeters: 1.2, depthMeters: 0.6 },
            { type: 'nightstand', x: 2.1, y: 0.4, rotation: 0, widthMeters: 0.5, depthMeters: 0.5 },
          ],
        },
        {
          id: 'room_4',
          name: 'Hallway',
          type: 'hallway',
          x: 4,
          y: 4,
          widthMeters: 1.5,
          depthMeters: 3,
          walls: {
            north: { hasWall: true, openings: [door(0.3)] },
            south: { hasWall: true, openings: [] },
            east: { hasWall: true, openings: [door(1)] },
            west: { hasWall: true, openings: [door(0.3)] },
          },
          furniture: [],
        },
        {
          id: 'room_5',
          name: 'Bedroom 2',
          type: 'bedroom',
          x: 5.5,
          y: 4,
          widthMeters: 2.7,
          depthMeters: 3,
          walls: {
            north: { hasWall: true, openings: [] },
            south: { hasWall: true, openings: [window(1, 1.2)] },
            east: { hasWall: true, openings: [] },
            west: { hasWall: true, openings: [door(1)] },
          },
          furniture: [
            { type: 'single_bed', x: 0.3, y: 0.4, rotation: 0, widthMeters: 1, depthMeters: 2 },
            { type: 'wardrobe', x: 1.5, y: 0.3, rotation: 0, widthMeters: 1, depthMeters: 0.6 },
            { type: 'desk', x: 1.4, y: 2.2, rotation: 0, widthMeters: 1.2, depthMeters: 0.6 },
          ],
        },
        {
          id: 'room_6',
          name: 'Bathroom',
          type: 'bathroom',
          x: 8.2,
          y: 4,
          widthMeters: 1.8,
          depthMeters: 3,
          walls: {
            north: { hasWall: true, openings: [] },
            south: { hasWall: true, openings: [window(0.6, 0.6)] },
            east: { hasWall: true, openings: [] },
            west: { hasWall: true, openings: [door(1)] },
          },
          furniture: [
            { type: 'bathtub', x: 0.3, y: 0.3, rotation: 0, widthMeters: 1.2, depthMeters: 0.7 },
            { type: 'toilet_unit', x: 0.3, y: 1.3, rotation: 0, widthMeters: 0.6, depthMeters: 0.8 },
            { type: 'bathroom_sink', x: 0.3, y: 2.3, rotation: 0, widthMeters: 0.6, depthMeters: 0.5 },
          ],
        },
      ],
    },
  ],
};

export interface SamplePlan {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  plan: FloorPlan;
}

export const SAMPLE_PLANS: SamplePlan[] = [
  {
    id: 'sample_studio',
    title: 'Compact Studio',
    subtitle: '30 m² · 3 rooms',
    image:
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80&auto=format&fit=crop',
    plan: studioApartment,
  },
  {
    id: 'sample_2bed',
    title: 'Two-Bedroom Home',
    subtitle: '70 m² · 6 rooms',
    image:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80&auto=format&fit=crop',
    plan: twoBedroomHome,
  },
];

// Architectural inspiration images for the showcase gallery
export const INSPIRATION_IMAGES: { url: string; label: string }[] = [
  {
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80&auto=format&fit=crop',
    label: 'Modern Living',
  },
  {
    url: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=600&q=80&auto=format&fit=crop',
    label: 'Open Kitchen',
  },
  {
    url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&q=80&auto=format&fit=crop',
    label: 'Bedroom Suite',
  },
  {
    url: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&q=80&auto=format&fit=crop',
    label: 'Minimal Interior',
  },
];
