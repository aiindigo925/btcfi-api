/**
 * Alert Rules API — CRUD for smart alert rules.
 * GET    /api/v1/alerts/rules     — list all rules for API key holder
 * POST   /api/v1/alerts/rules     — create a new alert rule
 *
 * Auth: X-API-Key header required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRule, listRules, getMaxRules } from '@/lib/alert-rules';
import { validateApiKey, type ApiKeyTier } from '@/lib/api-keys';
import { validateWebhookUrl } from '@/lib/webhooks';

const VALID_METRICS = ['price', 'fees', 'whale_btc', 'whale_count', 'mvrv', 'sopr', 'mempool_size', 'block_time'];
const VALID_OPS = ['>', '<', '>=', '<=', '==', 'crosses_above', 'crosses_below'];
const VALID_TYPES = ['threshold', 'compound', 'scheduled', 'anomaly'];

function getApiKey(request: NextRequest): string | null {
  return request.headers.get('X-API-Key') || request.headers.get('x-api-key');
}

async function authenticateAndIdentify(request: NextRequest): Promise<{
  authenticated: boolean;
  userId?: string;
  tier?: ApiKeyTier;
  error?: string;
  status?: number;
}> {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return { authenticated: false, error: 'Missing X-API-Key header', status: 401 };
  }

  const validation = await validateApiKey(apiKey);
  if (!validation.valid || !validation.info) {
    return {
      authenticated: false,
      error: validation.error || 'Invalid API key',
      status: 401,
    };
  }

  // Use keyHash as userId for rules storage
  return {
    authenticated: true,
    userId: validation.info.keyHash,
    tier: validation.info.tier,
  };
}

export async function GET(request: NextRequest) {
  const auth = await authenticateAndIdentify(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: auth.error, code: 'AUTH_FAILED' },
      { status: auth.status }
    );
  }

  try {
    const rules = await listRules(auth.userId!);
    // Strip delivery secrets from response
    const safeRules = rules.map((rule) => ({
      ...rule,
      delivery:
        rule.delivery.type === 'webhook'
          ? { type: 'webhook' as const, url: rule.delivery.url, secret: '***' }
          : rule.delivery,
    }));

    return NextResponse.json({
      success: true,
      data: safeRules,
      meta: {
        count: safeRules.length,
        max_rules: getMaxRules(auth.tier || 'free'),
        tier: auth.tier,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list alert rules',
        code: 'RULES_LIST_FAILED',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAndIdentify(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: auth.error, code: 'AUTH_FAILED' },
      { status: auth.status }
    );
  }

  try {
    const body = await request.json();
    const { type, metric, op, value, operator, conditions, cron, zscore_threshold, delivery } = body;

    // Validate type
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid type "${type}". Must be one of: ${VALID_TYPES.join(', ')}`,
          code: 'INVALID_TYPE',
        },
        { status: 400 }
      );
    }

    // Validate metric (not required for compound rules with only conditions)
    if (type !== 'compound' && (!metric || !VALID_METRICS.includes(metric))) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid metric "${metric}". Must be one of: ${VALID_METRICS.join(', ')}`,
          code: 'INVALID_METRIC',
        },
        { status: 400 }
      );
    }

    // Validate op
    if (!op || !VALID_OPS.includes(op)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid operator "${op}". Must be one of: ${VALID_OPS.join(', ')}`,
          code: 'INVALID_OP',
        },
        { status: 400 }
      );
    }

    // Validate value
    if (value === undefined || value === null || typeof value !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid "value" field (must be a number)',
          code: 'INVALID_VALUE',
        },
        { status: 400 }
      );
    }

    // Validate delivery
    if (!delivery || !delivery.type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing "delivery" field. Must specify { type: "webhook" | "telegram", ... }',
          code: 'INVALID_DELIVERY',
        },
        { status: 400 }
      );
    }

    if (delivery.type === 'webhook') {
      if (!delivery.url || !delivery.secret) {
        return NextResponse.json(
          {
            success: false,
            error: 'Webhook delivery requires "url" and "secret"',
            code: 'INVALID_WEBHOOK_DELIVERY',
          },
          { status: 400 }
        );
      }
      // Validate URL
      try {
        new URL(delivery.url);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook URL format', code: 'INVALID_URL' },
          { status: 400 }
        );
      }

      // SSRF protection — reject private/internal/metadata URLs
      const ssrfCheck = validateWebhookUrl(delivery.url);
      if (!ssrfCheck.valid) {
        return NextResponse.json(
          { success: false, error: ssrfCheck.error, code: 'SSRF_BLOCKED' },
          { status: 400 }
        );
      }
    } else if (delivery.type === 'telegram') {
      if (!delivery.userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Telegram delivery requires "userId" (Telegram chat ID)',
            code: 'INVALID_TELEGRAM_DELIVERY',
          },
          { status: 400 }
        );
      }
    }

    // Check rule limit per user
    const existing = await listRules(auth.userId!);
    const maxRules = getMaxRules(auth.tier || 'free');
    if (existing.length >= maxRules) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum rule limit reached (${maxRules} for ${auth.tier} tier). Delete existing rules first.`,
          code: 'RULE_LIMIT_REACHED',
        },
        { status: 400 }
      );
    }

    // Validate compound rules
    if (type === 'compound') {
      if (!operator || !['and', 'or'].includes(operator)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Compound rules require "operator": "and" or "or"',
            code: 'INVALID_COMPOUND',
          },
          { status: 400 }
        );
      }
      if (!conditions || !Array.isArray(conditions) || conditions.length < 2) {
        return NextResponse.json(
          {
            success: false,
            error: 'Compound rules require "conditions" array with at least 2 items',
            code: 'INVALID_CONDITIONS',
          },
          { status: 400 }
        );
      }
    }

    // Validate anomaly rules
    if (type === 'anomaly' && (!zscore_threshold || typeof zscore_threshold !== 'number')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Anomaly rules require "zscore_threshold" (number, e.g. 2.0)',
          code: 'INVALID_ANOMALY',
        },
        { status: 400 }
      );
    }

    // Validate scheduled rules
    if (type === 'scheduled' && (!cron || typeof cron !== 'string')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scheduled rules require "cron" (cron expression string)',
          code: 'INVALID_SCHEDULED',
        },
        { status: 400 }
      );
    }

    const rule = await createRule(auth.userId!, {
      userId: auth.userId!,
      type,
      metric: metric || 'price',
      op,
      value,
      operator,
      conditions,
      cron,
      zscore_threshold,
      delivery,
    });

    return NextResponse.json(
      {
        success: true,
        data: rule,
        meta: {
          endpoint: 'alert-rules-create',
          remaining_rules: maxRules - existing.length - 1,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[AlertRules] Create error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create alert rule',
        code: 'RULES_CREATE_FAILED',
      },
      { status: 500 }
    );
  }
}
