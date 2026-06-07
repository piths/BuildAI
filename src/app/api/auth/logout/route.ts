import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('chatgpt_access_token');
  response.cookies.delete('chatgpt_refresh_token');
  response.cookies.delete('chatgpt_account_id');
  response.cookies.delete('chatgpt_signed_in');
  return response;
}
