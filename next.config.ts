// Next.js application runtime configuration.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow Next/Image for local API-served recipe assets (with query params like ?variant=thumb).
    localPatterns: [
      {
        pathname: "/api/recipe-images/**",
      },
      // Allow Next/Image for handwritten source images exposed through the recipe source-document route.
      {
        pathname: "/api/recipes/**/source-documents/**/file",
      },
      // Allow Next/Image for persisted family images under /uploads/families.
      {
        pathname: "/uploads/families/**",
      },
    ],
  },
};

export default nextConfig;
