import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve';
  const isProd = mode === 'production';
  
  return {
    base: '/',
    plugins: [react()],
    
    server: {
      port: 5173,
      host: true,
      open: true
    },
    
    build: {
      outDir: 'dist',
      sourcemap: !isProd,
      minify: isProd ? 'terser' : false,
      
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            plaid: ['react-plaid-link'],
          },
        },
      },
      
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        mangle: {
          safari10: true,
        },
      } : {},
    },
    
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
  };
});
