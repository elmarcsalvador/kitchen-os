import { NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export function withCors(response) {
  for (const [name, value] of Object.entries(corsHeaders)) response.headers.set(name, value);
  return response;
}

export function optionsResponse() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
