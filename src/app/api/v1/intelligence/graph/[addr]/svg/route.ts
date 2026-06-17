/**
 * Address Graph SVG Visualization
 * GET /api/v1/intelligence/graph/:addr/svg
 *
 * Returns an SVG image of the address connection graph.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getGraph, type GraphData } from '@/lib/address-graph';
import { isValidBitcoinAddress, ERRORS, sanitizeInt } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ addr: string }> },
) {
  const { addr } = await params;

  if (!isValidBitcoinAddress(addr)) {
    return new NextResponse(
      JSON.stringify(ERRORS.INVALID_ADDRESS),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const depth = sanitizeInt(request.nextUrl.searchParams.get('depth'), 2, 1, 3);

  try {
    const graph = await getGraph(addr, depth);
    const svg = renderGraphSvg(graph, addr);

    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch {
    return new NextResponse(
      JSON.stringify({ error: 'SVG generation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

// ============ SVG RENDERER ============

function renderGraphSvg(graph: GraphData, rootAddr: string): string {
  const width = 800;
  const height = 600;
  const centerX = width / 2;
  const centerY = height / 2;

  // Layout nodes in concentric circles by depth
  const byDepth = new Map<number, typeof graph.nodes>();
  for (const node of graph.nodes) {
    const d = node.depth;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(node);
  }

  const nodePositions = new Map<string, { x: number; y: number }>();

  // Root at center
  nodePositions.set(rootAddr, { x: centerX, y: centerY });

  // Position each depth ring
  for (const [depth, nodes] of byDepth) {
    if (depth === 0) continue;
    const radius = 100 + depth * 120;
    const count = nodes.length;
    const angleStep = (2 * Math.PI) / Math.max(count, 1);
    const startAngle = -Math.PI / 2;

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * angleStep;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      nodePositions.set(nodes[i].address, { x, y });
    }
  }

  // Build SVG
  const parts: string[] = [];

  // Header
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`);
  parts.push(`<rect width="${width}" height="${height}" fill="#0a0a0a"/>`);

  // Title
  parts.push(`<text x="${centerX}" y="24" text-anchor="middle" fill="#f7931a" font-family="monospace" font-size="14" font-weight="bold">BTCFi Address Graph</text>`);
  parts.push(`<text x="${centerX}" y="42" text-anchor="middle" fill="#666" font-family="monospace" font-size="10">${rootAddr.slice(0, 12)}... — ${graph.total_addresses} nodes, ${graph.total_connections} edges</text>`);

  // Edges
  for (const edge of graph.edges) {
    const from = nodePositions.get(edge.from);
    const to = nodePositions.get(edge.to);
    if (!from || !to) continue;

    const color = edge.method === 'common_input' ? '#4a9eff'
      : edge.method === 'entity_label' ? '#ff9a4a'
      : edge.method === 'change_detection' ? '#4aff9a'
      : '#9a4aff';

    const opacity = Math.max(0.3, edge.confidence);
    parts.push(`<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.5"/>`);
  }

  // Nodes
  for (const node of graph.nodes) {
    const pos = nodePositions.get(node.address);
    if (!pos) continue;

    const isRoot = node.address === rootAddr;
    const radius = isRoot ? 12 : 8;
    const fill = node.entity ? '#f7931a' : '#4a9eff';
    const stroke = isRoot ? '#fff' : '#333';
    const strokeWidth = isRoot ? 2 : 1;

    parts.push(`<circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`);

    // Label
    const label = node.entity || `${node.address.slice(0, 8)}...`;
    const labelY = pos.y + radius + 14;
    const labelColor = node.entity ? '#f7931a' : '#888';
    parts.push(`<text x="${pos.x}" y="${labelY}" text-anchor="middle" fill="${labelColor}" font-family="monospace" font-size="9">${escapeXml(label)}</text>`);
  }

  // Legend
  const legendY = height - 50;
  parts.push(`<text x="16" y="${legendY}" fill="#888" font-family="monospace" font-size="10" font-weight="bold">Legend</text>`);
  const legends = [
    { color: '#4a9eff', label: 'Common Input' },
    { color: '#ff9a4a', label: 'Entity Label' },
    { color: '#4aff9a', label: 'Change Detection' },
    { color: '#9a4aff', label: 'Temporal' },
  ];
  legends.forEach((l, i) => {
    const lx = 16 + i * 170;
    const ly = legendY + 16;
    parts.push(`<circle cx="${lx}" cy="${ly}" r="5" fill="${l.color}"/>`);
    parts.push(`<text x="${lx + 12}" y="${ly + 4}" fill="#888" font-family="monospace" font-size="9">${l.label}</text>`);
  });

  parts.push('</svg>');
  return parts.join('\n');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
