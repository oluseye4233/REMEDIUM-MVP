import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: { serverComponentsExternalPackages: ['jspdf'] },
  images: { remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }] },
}

export default nextConfig
