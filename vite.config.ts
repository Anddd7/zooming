import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function normalizeBaseUrl(baseUrl: string | undefined) {
  if (!baseUrl) {
    return "/";
  }

  const withLeadingSlash = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;

  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: normalizeBaseUrl(process.env.VITE_BASE_URL),
});
