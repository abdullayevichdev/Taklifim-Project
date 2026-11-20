import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function cleanEnvValue(val?: string): string {
  if (!val) return '';
  let str = val.trim();
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

function stripAt(val?: string): string {
  return cleanEnvValue(val).replace(/^@+/, '').trim();
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const vercelEnv = cleanEnvValue(process.env.VERCEL_ENV || env.VERCEL_ENV).toLowerCase();

  const prodBotUsername = stripAt(
    process.env.VITE_TELEGRAM_BOT_USERNAME ||
      env.VITE_TELEGRAM_BOT_USERNAME ||
      process.env.TELEGRAM_BOT_USERNAME ||
      env.TELEGRAM_BOT_USERNAME
  );
  const testBotUsername = stripAt(
    process.env.TELEGRAM_TEST_BOT_USERNAME ||
      env.TELEGRAM_TEST_BOT_USERNAME ||
      process.env.VITE_TELEGRAM_TEST_BOT_USERNAME ||
      env.VITE_TELEGRAM_TEST_BOT_USERNAME
  );

  // Production strictly uses primary bot username; Preview strictly uses test bot username.
  const resolvedBotUsername =
    vercelEnv === 'production'
      ? prodBotUsername
      : vercelEnv === 'preview'
      ? testBotUsername
      : testBotUsername || prodBotUsername;

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_TELEGRAM_BOT_USERNAME': JSON.stringify(resolvedBotUsername),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || __dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
