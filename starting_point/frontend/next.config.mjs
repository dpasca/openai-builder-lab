/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SERP_API_KEY: process.env.SERP_API_KEY,
  }
};

export default nextConfig;
