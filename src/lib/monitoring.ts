/**
 * Monitoring & Error Tracking — MP3 Task 17.4
 * Lightweight capture + metrics. Sentry if DSN set, else console.
 */

const SENTRY_DSN = process.env.SENTRY_DSN || '';
let sentryModule: any = null;
let sentryAvailable: boolean | null = null;

async function getSentry(): Promise<any> {
  if (sentryAvailable === false) return null;
  if (sentryModule) return sentryModule;
  if (!SENTRY_DSN) { sentryAvailable = false; return null; }
  try {
    sentryModule = await import('@sentry/nextjs' as string);
    sentryModule.init({ dsn: SENTRY_DSN, tracesSampleRate: 0.1 });
    sentryAvailable = true;
    return sentryModule;
  } catch { sentryAvailable = false; return null; }
}

export async function captureError(error: Error | string, context?: Record<string, unknown>): Promise<void> {
  const err = typeof error === 'string' ? new Error(error) : error;
  const tags = context ? Object.entries(context).map(([k, v]) => `${k}=${v}`).join(' ') : '';
  console.error(`[monitor] ${err.message} ${tags}`);
  try { const sentry = await getSentry(); if (sentry) sentry.captureException(err, { extra: context }); } catch {}
}

export function trackMetric(name: string, value: number, tags?: Record<string, string>): void {
  const tagStr = tags ? Object.entries(tags).map(([k, v]) => `${k}=${v}`).join(',') : '';
  console.log(`[metric] ${name}=${value} ${tagStr}`.trim());
}

export function trackLatency(endpoint: string, startMs: number): void {
  const duration = Date.now() - startMs;
  trackMetric('api.latency', duration, { endpoint });
  if (duration > 5000) captureError(`Slow response: ${endpoint} took ${duration}ms`, { endpoint, duration, severity: 'warning' });
}

export function trackRpcFailure(provider: string, chain: string, error: string): void {
  trackMetric('rpc.failure', 1, { provider, chain });
  captureError(`RPC failure: ${provider}/${chain}: ${error}`, { provider, chain, severity: 'high' });
}

export function trackFacilitatorError(network: string, error: string): void {
  trackMetric('facilitator.error', 1, { network });
  captureError(`Facilitator error: ${network}: ${error}`, { network, severity: 'high' });
}

export function trackServerError(endpoint: string, statusCode: number): void {
  trackMetric('api.5xx', 1, { endpoint, status: statusCode.toString() });
}
