import { FloorPlan } from './types';

const SYSTEM_PROMPT = `You are an architectural floor plan generator. Given a building description, generate a detailed JSON floor plan.
RESPOND WITH ONLY VALID JSON — no markdown, no explanation, no preamble.
The JSON must follow this exact schema:
{
  "buildingName": "string — name for the building",
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
            "east": { "hasWall": true, "openings": [{ "type": "window", "positionFromLeft": 1.5, "widthMeters": 1.2, "heightMeters": 1.2, "sillHeight": 0.9 }] },
            "west": { "hasWall": false }
          },
          "furniture": [
            { "type": "sofa", "x": 1.0, "y": 0.5, "rotation": 0, "widthMeters": 2.0, "depthMeters": 0.8 },
            { "type": "coffee_table", "x": 1.5, "y": 1.8, "rotation": 0, "widthMeters": 1.0, "depthMeters": 0.5 },
            { "type": "tv_stand", "x": 1.0, "y": 3.2, "rotation": 0, "widthMeters": 1.5, "depthMeters": 0.4 }
          ]
        }
      ]
    }
  ],
  "totalAreaSqMeters": 120.5
}

ROOM TYPES (use these exact strings): living_room, bedroom, kitchen, bathroom, toilet, dining_room, corridor, hallway, garage, balcony, office, reception, conference_room, classroom, staffroom, store, laundry, staircase, shop

FURNITURE TYPES (use these exact strings):
- Living: sofa, armchair, coffee_table, tv_stand, bookshelf, side_table, rug
- Bedroom: single_bed, double_bed, wardrobe, dresser, nightstand, desk, desk_chair
- Kitchen: kitchen_counter, stove, refrigerator, sink, dining_table, dining_chair, kitchen_island
- Bathroom: bathtub, shower, toilet_unit, bathroom_sink, mirror_cabinet
- Office: office_desk, office_chair, filing_cabinet, whiteboard, printer
- Dining: dining_table, dining_chair, sideboard, chandelier
- General: potted_plant, lamp, coat_rack, shoe_rack

OPENING TYPES: "door" or "window"

RULES:
1. All measurements in meters. Be realistic — bedrooms ~3x3 to 4x5, living rooms ~4x5 to 6x7, kitchens ~3x3 to 4x4, bathrooms ~2x2 to 3x3.
2. Rooms must tile logically — shared walls between adjacent rooms should have hasWall:false on the shared side OR have a door opening.
3. Place rooms on a grid starting from (0,0). x increases eastward, y increases southward. Rooms should connect sensibly.
4. Every room MUST have at least one door for access.
5. External walls should have windows (except bathrooms which get small windows or none).
6. Auto-furnish EVERY room appropriately based on its type. Place 3-6 furniture items per room.
7. Furniture x,y positions are RELATIVE to the room's origin (top-left corner). Keep furniture inside room bounds.
8. For multi-floor buildings, include a staircase room on each floor and align them vertically.
9. Corridors/hallways should connect rooms that aren't directly adjacent.
10. Calculate totalAreaSqMeters as the sum of all room areas across all floors.`;

export async function generateFloorPlan(userPrompt: string): Promise<FloorPlan> {
  const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-5.4',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const jsonText = data.choices[0].message.content.replace(/```json|```/g, '').trim();
  const floorPlan: FloorPlan = JSON.parse(jsonText);
  return floorPlan;
}
