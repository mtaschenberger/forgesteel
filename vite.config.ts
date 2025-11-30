import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { generateManifest, manifestPlugin } from './vite-plugin-manifest';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
	base: isProd ? '/' : '/forgesteel/',  // dev: keep, prod: root
	build: {
		chunkSizeWarningLimit: 10000,
		rollupOptions: {
			input: {
				main: './index.html',
				sw: './src/sw.ts'
			},
			output: {
				entryFileNames: chunkInfo =>
					chunkInfo.name === 'sw' ? 'sw.js' : '[name]-[hash].js'
			}
		}
	},
	plugins: [
		react(),
		tsconfigPaths(),
		manifestPlugin(),
		{
			name: 'dev-pwa-files',
			configureServer(server) {
				// Only needed in dev – fine as is
				server.middlewares.use('/forgesteel/forgesteel/manifest.json', (_, res) => {
					const manifest = generateManifest();
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify(manifest, null, 2));
				});
				server.middlewares.use('/forgesteel/manifest.json', (_, res) => {
					const manifest = generateManifest();
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify(manifest, null, 2));
				});

				server.middlewares.use('/forgesteel/sw.js', async (_, res) => {
					try {
						const { build } = await import('esbuild');
						const result = await build({
							entryPoints: ['src/sw.ts'],
							bundle: true,
							write: false,
							format: 'iife',
							target: 'es2020',
							minify: false
						});

						const swCode = result.outputFiles[0].text;
						res.setHeader('Content-Type', 'application/javascript');
						res.end(swCode);
					} catch (error) {
						console.error('Error compiling service worker:', error);
						res.statusCode = 500;
						res.end('Error compiling service worker');
					}
				});
			}
		}
	],
	publicDir: 'public',
	server: {
		headers: {
			'Service-Worker-Allowed': '/forgesteel/'
		}
	}
});
