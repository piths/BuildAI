import { NextResponse } from 'next/server';
import crypto from 'crypto';

const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'; // Codex CLI client ID
const AUTH_URL = 'https://auth.openai.com/oauth/authorize';
const REDIRECT_URI = 'http://localhost:1455/auth/callback';

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function GET() {
  // Generate PKCE
  const codeVerifier = base64url(crypto.randomBytes(64));
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
  const state = base64url(crypto.randomBytes(32));

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email offline_access',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    id_token_add_organizations: 'true',
    codex_cli_simplified_flow: 'true',
    state,
  });

  const authUrl = `${AUTH_URL}?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);
  // Store PKCE verifier + state in httpOnly cookies for the callback
  response.cookies.set('pkce_verifier', codeVerifier, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
