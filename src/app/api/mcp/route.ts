/**
 * Hosted MCP Server — Streamable HTTP Transport
 * MP5 Phase 7
 *
 * Endpoint: POST /api/mcp
 * Implements JSON-RPC 2.0 for MCP protocol over HTTP.
 * Free tier — uses internal API key bypass (same as Telegram bot).
 *
 * Client config:
 * {
 *   "mcpServers": {
 *     "btcfi": {
 *       "url": "https://btcfi.aiindigo.com/api/mcp",
 *       "transport": "streamable-http"
 *     }
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { TOOLS, getToolCategory, getToolPrice, callToolInternal } from '@/lib/mcp-tools';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

function jsonRpcResponse(id: string | number | undefined, result: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function jsonRpcError(id: string | number | undefined, code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

export async function POST(request: NextRequest) {
  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(jsonRpcError(undefined, -32700, 'Parse error'), { status: 400 });
  }

  if (body.jsonrpc !== '2.0' || !body.method) {
    return NextResponse.json(jsonRpcError(body.id, -32600, 'Invalid Request'), { status: 400 });
  }

  const { method, params, id } = body;

  // MCP lifecycle methods
  if (method === 'initialize') {
    return NextResponse.json(jsonRpcResponse(id, {
      protocolVersion: '2025-03-26',
      capabilities: { tools: {} },
      serverInfo: {
        name: 'btcfi',
        version: '3.0.0',
      },
    }));
  }

  if (method === 'notifications/initialized') {
    return NextResponse.json(jsonRpcResponse(id, {}));
  }

  if (method === 'ping') {
    return NextResponse.json(jsonRpcResponse(id, {}));
  }

  // List tools
  if (method === 'tools/list') {
    const tools = TOOLS.map(t => ({
      name: t.name,
      description: `[${getToolCategory(t.endpoint)}] ${t.description} Cost: ${getToolPrice(t.endpoint)}.`,
      inputSchema: t.inputSchema,
    }));
    return NextResponse.json(jsonRpcResponse(id, { tools }));
  }

  // Call tool
  if (method === 'tools/call') {
    const toolName = (params as any)?.name;
    const args = ((params as any)?.arguments || {}) as Record<string, unknown>;
    const tool = TOOLS.find(t => t.name === toolName);

    if (!tool) {
      return NextResponse.json(jsonRpcResponse(id, {
        content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
        isError: true,
      }));
    }

    try {
      const result = await callToolInternal(tool, args);
      return NextResponse.json(jsonRpcResponse(id, {
        content: [{ type: 'text', text: result }],
      }));
    } catch (error) {
      return NextResponse.json(jsonRpcResponse(id, {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        isError: true,
      }));
    }
  }

  return NextResponse.json(jsonRpcError(id, -32601, `Method not found: ${method}`), { status: 404 });
}

// GET for transport discovery
export async function GET() {
  return NextResponse.json({
    name: 'btcfi',
    version: '3.0.0',
    protocol: 'mcp',
    transport: 'streamable-http',
    tools: TOOLS.length,
    endpoint: 'https://btcfi.aiindigo.com/api/mcp',
    documentation: 'https://btcfi.aiindigo.com/api/docs',
  });
}
