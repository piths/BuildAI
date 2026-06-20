import { FloorPlan } from './types';
import { normalizeFloorPlan } from './planNormalizer';

const SYSTEM_PROMPT = `You are an expert architectural floor plan generator. Given a building description, generate a detailed JSON floor plan with PERFECTLY TILED rooms — no gaps, no overlaps.

RESPOND WITH ONLY VALID JSON — no markdown, no explanation, no preamble.

CRITICAL LAYOUT RULES — FOLLOW EXACTLY:
1. The building must form a SINGLE RECTANGLE. All rooms must tile perfectly within this rectangle with ZERO gaps.
2. Think of the layout as a grid. First decide the overall building width and depth, then subdivide it into rooms.
3. Use a ROW-BASED approach: divide the building into horizontal bands (rows), then divide each row into rooms. Adjacent rooms in the same row must share the same y and depthMeters. Adjacent rooms in the same column must share the same x and widthMeters.
4. Room edges MUST align exactly. If Room A ends at x=5, the room to its right must start at x=5. If Room A ends at y=4, the room below must start at y=4.
5. Every room's (x + widthMeters) or (y + depthMeters) must equal an adjacent room's x or y — no floating rooms.

EXAMPLE of proper tiling for a 10m × 8m building:
- Row 1 (y=0, depth=4): Room A (x=0, w=5), Room B (x=5, w=5)
- Row 2 (y=4, depth=4): Room C (x=0, w=3), Room D (x=3, w=4), Room E (x=7, w=3)

The JSON schema:
{
  "buildingName": "string",
  "floors": [
    {
      "floorNumber": 1,
      "floorName": "Ground Floor",
      "heightMeters": 3.0,
      "rooms": [
        {
          "id": "room_1",
          "name": "Living Room",
          "type": "living_room",
          "x": 0,
          "y": 0,
          "widthMeters": 5.0,
          "depthMeters": 4.0,
          "walls": {
            "north": { "hasWall": true, "openings": [] },
            "south": { "hasWall": true, "openings": [{ "type": "door", "positionFromLeft": 2.0, "widthMeters": 0.9 }] },
            "east": { "hasWall": false },
            "west": { "hasWall": true, "openings": [{ "type": "window", "positionFromLeft": 1.5, "widthMeters": 1.2, "heightMeters": 1.2, "sillHeight": 0.9 }] }
          },
          "furniture": [
            { "type": "sofa", "x": 0.5, "y": 0.5, "rotation": 0, "widthMeters": 2.0, "depthMeters": 0.8 },
            { "type": "coffee_table", "x": 1.0, "y": 1.8, "rotation": 0, "widthMeters": 1.0, "depthMeters": 0.5 },
            { "type": "tv_stand", "x": 1.0, "y": 3.2, "rotation": 0, "widthMeters": 1.5, "depthMeters": 0.4 }
          ]
        }
      ]
    }
  ],
  "totalAreaSqMeters": 120.5
}

ROOM TYPES: living_room, bedroom, kitchen, bathroom, toilet, dining_room, corridor, hallway, garage, balcony, office, reception, conference_room, classroom, staffroom, store, laundry, staircase, shop

FURNITURE TYPES:
- Living: sofa, armchair, coffee_table, tv_stand, bookshelf, side_table, rug
- Bedroom: single_bed, double_bed, wardrobe, dresser, nightstand, desk, desk_chair
- Kitchen: kitchen_counter, stove, refrigerator, sink, dining_table, dining_chair, kitchen_island
- Bathroom: bathtub, shower, toilet_unit, bathroom_sink, mirror_cabinet
- Office: office_desk, office_chair, filing_cabinet, whiteboard, printer
- Dining: dining_table, dining_chair, sideboard, chandelier
- General: potted_plant, lamp, coat_rack, shoe_rack

WALL RULES:
- If two rooms share an edge, BOTH rooms must have hasWall:false on that shared side, OR one has a door opening on that side.
- Exterior walls (edges touching the outside of the building rectangle) MUST have hasWall:true.
- Exterior walls should have windows (except bathrooms).
- Interior shared walls: set hasWall:false if rooms are open to each other, or hasWall:true with a door if separated.
- Every room MUST be accessible via at least one door.

DOOR & WINDOW PLACEMENT RULES — FOLLOW EXACTLY:
- MAIN ENTRANCE (REQUIRED): the building MUST have exactly one main entrance — a 0.9m–1.0m door on an EXTERIOR wall of the living room, hallway/corridor, or reception, opening to the outside. Never leave the building with no way in.
- Windows go ONLY on EXTERIOR walls. NEVER put a window on an interior (shared) wall.
- Center openings sensibly: keep every door and window at least 0.3m away from any wall corner. Do not place an opening flush against a corner.
- An opening must fit fully on its wall: positionFromLeft >= 0.3 AND positionFromLeft + widthMeters <= wallLength - 0.3.
- Do not overlap two openings on the same wall; leave at least 0.2m of solid wall between them.
- For a door in a shared interior wall, place it roughly centered on the shared edge so it reads cleanly in both rooms.
- Widths: main entrance 0.9–1.0m; room doors 0.8–0.9m; bathroom/toilet doors 0.7m. Windows 1.0–1.5m wide, sillHeight 0.9 (1.5 for bathrooms), heightMeters 1.2.
- Each habitable room (living room, bedrooms, kitchen, dining, office) should have at least one window on an exterior wall.

MEASUREMENT RULES:
- All in meters. Bedrooms: 3×3 to 4×5. Living rooms: 4×4 to 6×6. Kitchen: 3×3 to 4×5. Bathrooms: 2×2 to 3×3. Corridors: 1.2m–1.5m wide.
- Furniture positions are RELATIVE to room origin. Keep all furniture within room bounds (x + widthMeters <= room widthMeters, y + depthMeters <= room depthMeters).
- Place 3-6 furniture items per room, appropriate to room type.
- For multi-floor buildings, include a staircase room on each floor aligned vertically.
- Calculate totalAreaSqMeters as sum of all room areas.

PLANNING STEPS (do this mentally before generating):
1. Determine overall building rectangle dimensions
2. Divide into 2-3 horizontal rows
3. Subdivide each row into rooms that fill it completely
4. Verify: no gaps, no overlaps, all edges align
5. Assign walls: exterior=true, shared interior=false or door
6. Place furniture within each room's bounds`;

const MODIFY_PROMPT = `You are an expert architectural floor plan modifier. You will receive an existing floor plan as JSON and a user request to modify it.

Apply the requested changes while maintaining:
1. PERFECT TILING — the building must remain a single rectangle with no gaps or overlaps
2. All existing rooms not mentioned in the modification should remain as-is unless they need to move/resize to accommodate changes
3. Walls, doors, and windows must remain consistent
4. Furniture must stay within room bounds
5. All the same rules from the original generation apply

RESPOND WITH ONLY THE COMPLETE UPDATED FLOOR PLAN JSON — no markdown, no explanation, no preamble. Return the FULL floor plan, not just the changed parts.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type GenProvider = 'chatgpt' | 'openrouter';

export const OPENROUTER_MODEL = 'google/gemini-2.5-flash-lite-preview-09-2025';

export interface ProviderOption {
  id: GenProvider;
  label: string;
  sublabel: string;
  /** Whether this provider needs the ChatGPT sign-in flow. */
  requiresChatGptSignIn: boolean;
}

export const GENERATION_PROVIDERS: ProviderOption[] = [
  { id: 'chatgpt', label: 'ChatGPT', sublabel: 'GPT-5.5 (your subscription)', requiresChatGptSignIn: true },
  { id: 'openrouter', label: 'Gemini Flash Lite', sublabel: 'via OpenRouter', requiresChatGptSignIn: false },
];

async function callGenerateApi(
  systemPrompt: string,
  messages: Array<{ role: string; content: unknown }>,
  provider: GenProvider = 'chatgpt'
): Promise<FloorPlan> {
  let response: Response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        messages,
        provider,
        model: provider === 'openrouter' ? OPENROUTER_MODEL : undefined,
      }),
    });
  } catch (networkErr) {
    throw new Error(
      'Network error — could not reach the server. Check your connection and try again.'
    );
  }

  let data: { floorPlan?: FloorPlan; error?: string };
  try {
    data = await response.json();
  } catch {
    throw new Error(
      'The server response was unreadable. This usually means the connection was dropped. Please try again.'
    );
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data.floorPlan as FloorPlan;
}

export function isSignedInWithChatGPT(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes('chatgpt_signed_in=1');
}

export async function signOutChatGPT(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export function startChatGPTSignIn(): void {
  window.location.href = '/api/auth/login';
}

export interface UsageWindow {
  usedPercent: number | null;
  windowMinutes: number | null;
  resetsInSeconds: number | null;
}

export interface UsageInfo {
  signedIn: boolean;
  available?: boolean;
  reason?: string;
  primary?: UsageWindow;
  secondary?: UsageWindow;
}

export async function fetchUsage(): Promise<UsageInfo> {
  const response = await fetch('/api/usage');
  return response.json();
}

export async function generateFloorPlan(
  userPrompt: string,
  provider: GenProvider = 'chatgpt'
): Promise<FloorPlan> {
  const plan = await callGenerateApi(SYSTEM_PROMPT, [{ role: 'user', content: userPrompt }], provider);
  return normalizeFloorPlan(plan);
}

export async function modifyFloorPlan(
  currentPlan: FloorPlan,
  userMessage: string,
  chatHistory: ChatMessage[],
  imageBase64?: string,
  provider: GenProvider = 'chatgpt'
): Promise<FloorPlan> {
  let userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  if (imageBase64) {
    userContent = [
      ...(userMessage ? [{ type: 'text' as const, text: userMessage }] : []),
      { type: 'image_url' as const, image_url: { url: imageBase64 } },
      { type: 'text' as const, text: 'Based on the above image and/or instructions, modify the current floor plan. Return the FULL updated JSON.' },
    ];
  } else {
    userContent = userMessage;
  }

  const messages: Array<{ role: string; content: unknown }> = [
    {
      role: 'user',
      content: `Here is the current floor plan:\n\n${JSON.stringify(currentPlan, null, 2)}`,
    },
    ...chatHistory.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: 'user', content: userContent },
  ];

  return callGenerateApi(MODIFY_PROMPT, messages, provider).then(normalizeFloorPlan);
}
