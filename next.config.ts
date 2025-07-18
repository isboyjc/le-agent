import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb'
    }
  },
  eslint: {
    ignoreDuringBuilds: true
  }
}

export default withNextIntl(nextConfig)
