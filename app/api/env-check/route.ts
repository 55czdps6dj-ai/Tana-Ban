import { NextResponse } from "next/server";
import { normalizeSupabaseUrl } from "@/lib/server/supabase-rest";

export async function GET() {
  const supabaseRelatedKeys = Object.keys(process.env)
    .filter((key) => key.toUpperCase().includes("SUPABASE"))
    .sort();
  const normalizedSupabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);

  return NextResponse.json({
    ok: true,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    supabaseUrlNormalized: Boolean(normalizedSupabaseUrl),
    supabaseUrlHadRestPath: Boolean(process.env.SUPABASE_URL?.match(/\/rest\/v1\/?$/i)),
    hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabaseRelatedKeys
  });
}
