import type { NextConfig } from "next";

// Minimal Next.js config. Nothing special is needed for the demo slice — the app is a
// standard client-rendered garden UI. Backend calls (Supabase / Edge Functions) happen
// from the browser via the stubbed modules in lib/, so no server-side secrets live here.
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
