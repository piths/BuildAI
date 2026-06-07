import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const TOKEN_URL = 'https://auth.openai.com/oauth/token';
const REDIRECT_URI = 'http://localhost:1455/auth/callback';

// Decode a JWT payload (no verification — just to extract account id)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function extractAccountId(accessToken: string): string | null {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return null;
  // The account id lives under auth claim
  const authClaim = payload['https://api.openai.com/auth'] as Record<string, unknown> | undefined;
  if (authClaim && typeof authClaim.chatgpt_account_id === 'string') {
    return authClaim.chatgpt_account_id;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/?auth_error=no_code`);
  }

  const savedVerifier = request.cookies.get('pkce_verifier')?.value;
  const savedState = request.cookies.get('oauth_state')?.value;

  if (!savedVerifier || state !== savedState) {
    return NextResponse.redirect(`${origin}/?auth_error=state_mismatch`);
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: savedVerifier,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    console.error('Token exchange failed:', err);
    return NextResponse.redirect(`${origin}/?auth_error=token_exchange`);
  }

  const tokens = await tokenResponse.json();
  const accessToken = tokens.access_token as string;
  const refreshToken = tokens.refresh_token as string | undefined;
  const accountId = extractAccountId(accessToken) || '';

  const response = NextResponse.redirect(`${origin}/?auth=success`);

  // Store tokens in httpOnly cookies (server-side use only)
  response.cookies.set('chatgpt_access_token', accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  if (refreshToken) {
    response.cookies.set('chatgpt_refresh_token', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
  }
  response.cookies.set('chatgpt_account_id', accountId, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  // Non-httpOnly flag so client knows it's signed in
  response.cookies.set('chatgpt_signed_in', '1', {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  // Clear PKCE cookies
  response.cookies.delete('pkce_verifier');
  response.cookies.delete('oauth_state');

  return response;
}
