import { NextRequest, NextResponse } from 'next/server';

const XAI_API_URL = 'https://api.x.ai/v1';

export async function POST(request: NextRequest) {
  try {
    const { action, buildingName, description, imageUrl, requestId, seedIsRender } = await request.json();
    const token = process.env.XAI_API_KEY;

    if (!token) {
      return NextResponse.json(
        { error: 'xAI API key not configured. Add XAI_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // Action: "image" — generate the architectural render
    if (action === 'image') {
      const imagePrompt = `Professional architectural interior photograph of ${description}. Wide-angle lens shot from the hallway looking into the living area. Clean white walls, warm wood flooring, floor-to-ceiling windows with natural light, contemporary minimalist furniture arranged as described. Photorealistic, 8K quality, interior design magazine photography, architectural visualization`;

      const res = await fetch(`${XAI_API_URL}/images/generations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-imagine-image-quality',
          prompt: imagePrompt,
          n: 1,
          aspect_ratio: '16:9',
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Image generation failed (${res.status}): ${err}`);
      }

      const data = await res.json();
      const url = data.data?.[0]?.url;
      if (!url) throw new Error('No image was generated');

      return NextResponse.json({ imageUrl: url });
    }

    // Action: "video" — submit video generation request
    if (action === 'video') {
      if (!imageUrl) throw new Error('imageUrl is required for video action');

      // When the seed is a real 3D render of the building, ask for a cinematic
      // reveal that preserves the shown layout and turns it photorealistic.
      const videoPrompt = seedIsRender
        ? `Cinematic architectural reveal of ${buildingName || 'this home'}. Smooth slow camera orbit and gentle push-in over the building shown in the image, keeping the exact same room layout, wall positions and furniture arrangement. Turn it into a photorealistic architectural visualization with warm natural daylight, soft shadows and realistic materials. Professional real-estate quality, steady motion.`
        : `Smooth cinematic camera slowly dollying forward through ${buildingName || 'a modern apartment'}, exploring the modern interior space. Gentle steady movement, natural light shifting, architectural walkthrough, professional real estate cinematic video`;

      const res = await fetch(`${XAI_API_URL}/videos/generations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'grok-imagine-video',
          prompt: videoPrompt,
          image: { url: imageUrl },
          duration: 8,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Video submission failed (${res.status}): ${err}`);
      }

      const data = await res.json();
      if (!data.request_id) throw new Error('No video request ID returned');

      return NextResponse.json({ requestId: data.request_id });
    }

    // Action: "poll" — check video generation status
    if (action === 'poll') {
      if (!requestId) throw new Error('requestId is required for poll action');

      const res = await fetch(`${XAI_API_URL}/videos/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Poll failed (${res.status}): ${err}`);
      }

      const data = await res.json();

      if (data.status === 'done' && data.video?.url) {
        return NextResponse.json({ status: 'done', videoUrl: data.video.url });
      }
      if (data.status === 'failed' || data.status === 'error') {
        throw new Error('Video generation failed on xAI side');
      }

      return NextResponse.json({ status: 'processing', progress: data.progress || 0 });
    }

    throw new Error('Invalid action. Use "image", "video", or "poll".');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Video generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
