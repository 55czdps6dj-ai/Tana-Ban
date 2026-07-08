import "server-only";

type SupabaseRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  prefer?: string;
};

export type SupabaseConfigStatus =
  | {
      configured: true;
      supabaseUrl: string;
      serviceRoleKey: string;
    }
  | {
      configured: false;
      missingKeys: string[];
    };

export function getSupabaseConfig(): SupabaseConfigStatus {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missingKeys = [
    !supabaseUrl ? "SUPABASE_URL" : null,
    !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null
  ].filter((key): key is string => key !== null);

  if (missingKeys.length > 0) {
    return {
      configured: false,
      missingKeys
    };
  }

  return {
    configured: true,
    supabaseUrl: supabaseUrl as string,
    serviceRoleKey: serviceRoleKey as string
  };
}

export function verifySharedPassword(request: Request): boolean {
  const configuredPassword = process.env.APP_SHARED_PASSWORD?.trim();
  const providedPassword = request.headers.get("x-app-password")?.trim();

  return Boolean(configuredPassword && providedPassword && providedPassword === configuredPassword);
}

export function verifyUploadPassword(request: Request): boolean {
  const uploadPassword = (process.env.ADMIN_UPLOAD_PASSWORD ?? process.env.APP_SHARED_PASSWORD)?.trim();
  const providedPassword = request.headers.get("x-upload-password")?.trim();

  return Boolean(uploadPassword && providedPassword && providedPassword === uploadPassword);
}

export async function supabaseRequest<T>(
  path: string,
  options: SupabaseRequestOptions = {}
): Promise<T> {
  const config = getSupabaseConfig();

  if (!config.configured) {
    throw new Error(`Supabase設定が不足しています: ${config.missingKeys.join(", ")}`);
  }

  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    method: options.method ?? "GET",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase API error: ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
