import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useState, useEffect } from "react";
import type { SystemMetrics } from "@shared/schema";

export default function TrafficChart() {
  const [chartData, setChartData] = useState<Array<{ time: string; volume: number; connections: number }>>([]);

  const { data: metricsHistory = [] } = useQuery<SystemMetrics[]>({
    queryKey: ["/api/metrics/history"],
    refetchInterval: 5000,
  });

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (metricsHistory.length > 0) {
      const formattedData = metricsHistory
        .slice(-20)
        .reverse()
        .map((metric) => ({
          time: new Date(metric.timestamp).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          volume: metric.trafficVolume,
          connections: metric.activeConnections / 1000, // Scale for better visualization
        }));
      setChartData(formattedData);
    }
  }, [metricsHistory]);

  // Update with real-time data from WebSocket
  useEffect(() => {
    if (lastMessage?.type === 'data_update' && lastMessage.metrics) {
      const newDataPoint = {
        time: new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        volume: lastMessage.metrics.trafficVolume,
        connections: lastMessage.metrics.activeConnections / 1000,
      };

      setChartData(prev => [...prev.slice(-19), newDataPoint]);
    }
  }, [lastMessage]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm">Loading traffic data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64" data-testid="traffic-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            label={{ value: 'Traffic Volume (GBs)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--popover-foreground))",
            }}
            labelStyle={{ color: "hsl(var(--popover-foreground))" }}
          />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: "hsl(var(--primary))" }}
            name="Traffic Volume (GB/s)"
          />
          <Line
            type="monotone"
            dataKey="connections"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: "hsl(var(--chart-2))" }}
            name="Active Connections (K)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
