/**
 * Lightning Network Intelligence
 * Channel capacity, top nodes, and routing data.
 */

export interface LightningStats {
  totalCapacity: number;
  channelCount: number;
  avgChannelSize: number;
  topNodes: { alias: string; capacity: number; channels: number }[];
  capacityTrend: { label: string; pct: number }[];
}

export async function getLightningStats(): Promise<LightningStats> {
  try {
    const res = await fetch('https://1ml.com/statistics', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error('1ML unavailable');
    const data = await res.json();
    return {
      totalCapacity: data.capacity || 0,
      channelCount: data.num_channels || 0,
      avgChannelSize: data.num_channels ? (data.capacity / data.num_channels) : 0,
      topNodes: (data.top_nodes || []).slice(0, 10).map((n: any) => ({
        alias: n.alias || 'Unknown',
        capacity: n.capacity || 0,
        channels: n.num_channels || 0,
      })),
      capacityTrend: [
        { label: '7d', pct: data.capacity_7d_pct || 0 },
        { label: '30d', pct: data.capacity_30d_pct || 0 },
      ],
    };
  } catch {
    return { totalCapacity: 0, channelCount: 0, avgChannelSize: 0, topNodes: [], capacityTrend: [] };
  }
}
