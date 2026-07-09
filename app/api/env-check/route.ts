import { NextResponse } from "next/server";

export async function GET() {
  const supabaseRelatedKeys = Object.keys(process.env)
    .filter((key) => key.toUpperCase().includes("SUPABASE"))
    .sort();

  return NextResponse.json({
    ok: true,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabaseRelatedKeys
  });
}
