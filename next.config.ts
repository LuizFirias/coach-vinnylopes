import type { NextConfig } from "next";

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
  // Permite acesso ao dev server pelo celular na rede local (Next 16 bloqueia origens não listadas).
  // Inclua host com porta quando o IP mudar: http://SEU_IP:3000
  allowedDevOrigins: [
    "192.168.15.*",
    "192.168.15.*:3000",
    "192.168.15.6",
    "192.168.15.6:3000",
    "192.168.15.13",
    "192.168.15.13:3000",
    "192.168.15.20",
    "192.168.15.20:3000",
    "192.168.15.21",
    "192.168.15.21:3000",
    "192.168.15.7",
    "192.168.15.7:3000",
    "192.168.15.19",
    "192.168.15.19:3000",
    "192.168.15.22",
    "192.168.15.22:3000",
    "192.168.15.12",
    "192.168.15.12:3000",
    "172.20.10.2",
    "172.20.10.2:3000",
    "192.168.15.14",
    "192.168.15.14:3000",
    "192.168.15.23",
    "192.168.15.23:3000",
    "192.168.15.15",
    "192.168.15.15:3000",
    "192.168.15.163",
    "192.168.15.163:3000",
    "192.168.15.32",
    "192.168.15.32:3000",
    "192.168.15.18",
    "192.168.15.18:3000",
    "172.21.224.1",
    "172.21.224.1:3000",
  ],
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
