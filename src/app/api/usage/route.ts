import { NextRequest, NextResponse } from 'next/server';
import { getLastRateLimits } from '../generate/route';

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('chatgpt_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ signedIn: false });
  }

  const limits = getLastRateLimits();

  if (!limits || (limits.primaryUsedPercent === null && limits.secondaryUsedPercent === null)) {
    return NextResponse.json({
      signedIn: true,
      available: false,
      reason: 'Generate a plan to see your usage.',
    });
  }

  return NextResponse.json({
    signedIn: true,
    available: true,
    primary: {
      usedPercent: limits.primaryUsedPercent,
      windowMinutes: limits.primaryWindowMinutes,
      resetsInSeconds: limits.primaryResetSeconds,
    },
    secondary: {
      usedPercent: limits.secondaryUsedPercent,
      windowMinutes: limits.secondaryWindowMinutes,
      resetsInSeconds: limits.secondaryResetSeconds,
    },
  });
}
