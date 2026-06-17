/**
 * Alert Rule Delete API — Remove a specific alert rule.
 * DELETE /api/v1/alerts/rules/[id] — delete rule by ID
 * POST   /api/v1/alerts/rules/[id] — also supported (for MCP tool compatibility)
 *
 * Auth: X-API-Key header required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { deleteRule } from '@/lib/alert-rules';
import { validateApiKey } from '@/lib/api-keys';

function getApiKey(request: NextRequest): string | null {
  return request.headers.get('X-API-Key') || request.headers.get('x-api-key');
}

async function handleDelete(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Missing X-API-Key header', code: 'AUTH_FAILED' },
      { status: 401 }
    );
  }

  const validation = await validateApiKey(apiKey);
  if (!validation.valid || !validation.info) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error || 'Invalid API key',
        code: 'AUTH_FAILED',
      },
      { status: 401 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Missing rule ID in path', code: 'MISSING_ID' },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteRule(validation.info.keyHash, id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Alert rule not found', code: 'RULE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true, id },
      meta: { endpoint: 'alert-rules-delete' },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete alert rule',
        code: 'RULES_DELETE_FAILED',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleDelete(request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleDelete(request, params);
}
