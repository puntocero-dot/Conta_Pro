import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT (starts with ' + process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 8) + ')' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
    CWD: process.cwd(),
  });
}
