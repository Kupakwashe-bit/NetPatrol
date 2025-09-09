import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useState, useEffect } from "react";
import type { NetworkTraffic } from "@shared/schema";

interface AnomalyDataPoint {
  timestamp: number;
  riskScore: number;
  bytes: number;
  isAnomaly: boolean;
  sourceIp: string;
  protocol: string;
}

export default function AnomalyChart() {
  const [chartData, setChartData] = useState<AnomalyDataPoint[]>([]);

  const { data: trafficData = [] } = useQuery<NetworkTraffic[]>({
    queryKey: ["/api/traffic"],
    refetchInterval: 5000,
  });

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (trafficData.length > 0) {
      const now = Date.now();
      const last5Minutes = now - (5 * 60 * 1000);
      
      const formattedData = trafficData
        .filter(traffic => new Date(traffic.timestamp).getTime() > last5Minutes)
        .map((traffic) => ({
          timestamp: new Date(traffic.timestamp).getTime(),
          riskScore: traffic.riskScore,
          bytes: traffic.bytes,
          isAnomaly: traffic.isAnomaly,
          sourceIp: traffic.sourceIp,
          protocol: traffic.protocol,
        }));
      
      setChartData(formattedData);
    }
  }, [trafficData]);

  // Update with real-time data from WebSocket
  useEffect(() => {
    if (lastMessage?.type === 'data_update' && lastMessage.traffic) {
      const traffic = lastMessage.traffic;
      const newDataPoint: AnomalyDataPoint = {
        timestamp: Date.now(),
        riskScore: traffic.riskScore,
        bytes: traffic.bytes,
        isAnomaly: traffic.isAnomaly,
        sourceIp: traffic.sourceIp,
        protocol: traffic.protocol,
      };

      setChartData(prev => {
        const now = Date.now();
        const last5Minutes = now - (5 * 60 * 1000);
        return [...prev.filter(point => point.timestamp > last5Minutes), newDataPoint];
      });
    }
  }, [lastMessage]);

  const getPointColor = (point: AnomalyDataPoint) => {
    if (point.isAnomaly && point.riskScore >= 8) return "hsl(var(--destructive))";
    if (point.isAnomaly) return "hsl(var(--accent))";
    if (point.riskScore >= 6) return "hsl(var(--chart-3))";
    return "hsl(var(--chart-1))";
  };

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm">Loading anomaly data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64" data-testid="anomaly-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            type="number"
            dataKey="timestamp"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => new Date(value).toLocaleTimeString('en-US', { 
              hour12: false, 
              minute: '2-digit',
              second: '2-digit'
            })}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            type="number"
            dataKey="riskScore"
            domain={[0, 10]}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--popover-foreground))",
            }}
            labelFormatter={(value) => `Time: ${new Date(value as number).toLocaleTimeString()}`}
            formatter={(value: any, name: string, props: any) => {
              const point = props.payload as AnomalyDataPoint;
              return [
                [
                  `Risk Score: ${point.riskScore.toFixed(1)}`,
                  `Bytes: ${point.bytes}`,
                  `Source: ${point.sourceIp}`,
                  `Protocol: ${point.protocol}`,
                  `Anomaly: ${point.isAnomaly ? 'Yes' : 'No'}`
                ].join('\n'),
                'Traffic Data'
              ];
            }}
          />
          <Scatter dataKey="riskScore">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getPointColor(entry)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
