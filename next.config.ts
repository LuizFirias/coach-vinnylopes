import type { NextConfig } from "next";
import path from "path";

function supabaseHostname(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseHostname();

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.15.18', '192.168.15.2'],
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      // Projeto legado (fallback)
      {
        protocol: "https",
        hostname: "ulyssryxgkvdkbgvfgpz.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      // Projeto atual
      {
        protocol: "https",
        hostname: "mdgzctjpamtcmyxefkrk.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      // Qualquer host do NEXT_PUBLIC_SUPABASE_URL (dev/prod)
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              port: "",
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
