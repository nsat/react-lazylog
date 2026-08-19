import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./src/lib/__tests__/setup.ts"],
        include: ["src/lib/__tests__/**/*.test.{ts,tsx}"],
        css: true,
    },
});
