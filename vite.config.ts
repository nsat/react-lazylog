import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import dts from 'vite-plugin-dts';
import { viteSingleFile } from 'vite-plugin-singlefile';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// Everything the consumer is expected to install themselves (runtime deps and
// peer deps) should stay external so it is not bundled into dist/index.js.
// This avoids duplicate copies in consumer bundles and preserves singletons
// (e.g. a single `immutable`/`react` instance shared across the boundary).
const externalDeps = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

// Match the package itself and any of its subpath imports (e.g. "react/jsx-runtime").
const externalPattern = new RegExp(
  `^(${externalDeps.map((dep) => dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(/.*)?$`,
);

export default defineConfig(({ command, mode }) => {

  // The library bundle is only produced by an explicit production build in
  // library mode (`npm run build`). Every other invocation — the dev server
  // (`npm run dev`) and the demo build (`npm run build:demo`) — serves/builds
  // the demo application.
  const isLibraryBuild = command === 'build' && mode !== 'demo';

  if (!isLibraryBuild) {
    return {
      // React + Tailwind for the demo UI. viteSingleFile inlines
      // all JS/CSS into a single index.html so the demo can be opened directly
      // from disk (file://) without a server.
      plugins: [react(), tailwindcss(), viteSingleFile()],
      // Relative base so the single-file build works both on GitHub Pages
      // (served from a subpath) and when opened directly from disk.
      base: './',
      resolve: {
        alias: {
          // shadcn/ui components import from "@/..."; map it to src/demo.
          '@': fileURLToPath(new URL('./src/demo', import.meta.url)),
        },
      },
      build: {
        outDir: 'dist-demo', // Saves the demo website here
        emptyOutDir: true,
      },
    };
  }

  return {
    plugins: [
      react(),
      // Generates type files so consumers get IntelliSense in VS Code.
      // bundleTypes rolls every declaration into a single index.d.ts
      // via @microsoft/api-extractor. include is scoped to the library entry
      // so the demo app's declarations are not emitted.
      dts({
        // Roll every declaration into a single dist/index.d.ts via
        // @microsoft/api-extractor so consumers get one clean entry that
        // matches the dist/index.js bundle.
        bundleTypes: true,
        include: ['src/lib/**'],
        exclude: [
          'src/lib/__tests__/**'
        ]
      })
    ],
    build: {
      lib: {
        // Defines the entry point of your module
        entry: 'src/lib/components/index.ts',
        name: 'react-lazylog',
        formats: ['es'],
        fileName: 'index',
      },
      // Ensures your bundle doesn't include code the consumer installs
      // themselves (runtime dependencies + peer dependencies). Only the
      // library's own source is bundled.
      rollupOptions: {
        external: externalPattern,
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
        },
      }
    }
  }
});