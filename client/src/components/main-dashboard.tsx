import { Network, Plug, Shield, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { SystemMetrics } from "@shared/schema";

export default function MainDashboard() {
  const { data: currentMetrics } = useQuery<SystemMetrics>({
    queryKey: ["/api/metrics/current"],
    refetchInterval: 5000,
  });

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">NetGuard AI Dashboard</h1>
        
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="metric-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Traffic Volume</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-traffic-volume">
                    {currentMetrics ? `${currentMetrics.trafficVolume.toFixed(1)} GB/s` : "0 GB/s"}
                  </p>
                  <p className="text-xs text-chart-4">↑ 12% from last hour</p>
                </div>
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Network className="text-primary text-lg" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Connections</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-active-connections">
                    {currentMetrics ? currentMetrics.activeConnections.toLocaleString() : "0"}
                  </p>
                  <p className="text-xs text-chart-2">↓ 3% from last hour</p>
                </div>
                <div className="w-12 h-12 bg-chart-2/20 rounded-lg flex items-center justify-center">
                  <Plug className="text-chart-2 text-lg" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Threats Blocked</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-threats-blocked">
                    {currentMetrics ? currentMetrics.threatsBlocked : 0}
                  </p>
                  <p className="text-xs text-destructive">↑ 8% from last hour</p>
                </div>
                <div className="w-12 h-12 bg-destructive/20 rounded-lg flex items-center justify-center">
                  <Shield className="text-destructive text-lg" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Model Accuracy</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-model-accuracy">
                    {currentMetrics ? `${(currentMetrics.modelAccuracy * 100).toFixed(1)}%` : "0%"}
                  </p>
                  <p className="text-xs text-chart-4">↑ 0.2% improvement</p>
                </div>
                <div className="w-12 h-12 bg-chart-4/20 rounded-lg flex items-center justify-center">
                  <Brain className="text-chart-4 text-lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="text-center py-8">
          <p className="text-muted-foreground">Dashboard components loading...</p>
        </div>
      </div>
    </main>
  );
}
