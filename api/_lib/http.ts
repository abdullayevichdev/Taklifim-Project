import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Minimal request/response types for Vercel Node functions.
 * Defined locally so type-checking never depends on the `@vercel/node` package being installed
 * (Vercel production installs skip devDependencies).
 */
export interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[] | undefined>;
  cookies: Record<string, string>;
  body: any;
}

export interface VercelResponse extends ServerResponse {
  send: (body: any) => VercelResponse;
  json: (jsonBody: any) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
  redirect: (statusOrUrl: string | number, url?: string) => VercelResponse;
}
