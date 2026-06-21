/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root to this project so the stray lockfile in $HOME
  // doesn't get picked as the inferred root.
  turbopack: {
    root: __dirname,
  },
}

module.exports = nextConfig
