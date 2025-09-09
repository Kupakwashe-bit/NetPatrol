import { Network, Plug, Shield, Brain, Search, Download } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import TrafficChart from "./traffic-chart";
import AnomalyChart from "./anomaly-chart";
import type { SystemMetrics, NetworkTraffic } from "@shared/schema";

export default function MainDashboard() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: currentMetrics } = useQuery<SystemMetrics>({
    queryKey: ["/api/metrics/current"],
    refetchInterval: 5000,
  });

  const { data: trafficData = [] } = useQuery<NetworkTraffic[]>({
    queryKey: ["/api/traffic"],
    refetchInterval: 2000,
  });

  const filteredTraffic = (trafficData || []).filter(traffic =>
    traffic && (
      traffic.sourceIp?.includes(searchTerm) ||
      traffic.destinationIp?.includes(searchTerm) ||
      traffic.protocol?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "BLOCKED":
        return "destructive";
      case "FLAGGED":
        return "secondary";
      case "ALLOWED":
        return "default";
      default:
        return "outline";
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 7) return "text-destructive";
    if (score >= 4) return "text-accent";
    return "text-chart-4";
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-6">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="metric-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Traffic Volume</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="metric-traffic-volume">
                    {currentMetrics?.trafficVolume ? `${currentMetrics.trafficVolume.toFixed(1)} GB/s` : "0 GB/s"}
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
                    {currentMetrics?.activeConnections ? currentMetrics.activeConnections.toLocaleString() : "0"}
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
                    {currentMetrics?.modelAccuracy ? `${(currentMetrics.modelAccuracy * 100).toFixed(1)}%` : "0%"}
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

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="chart-container border border-border">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Network Traffic Analysis</h3>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="secondary" data-testid="button-1h">1H</Button>
                  <Button size="sm" variant="default" data-testid="button-24h">24H</Button>
                  <Button size="sm" variant="secondary" data-testid="button-7d">7D</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <TrafficChart />
            </CardContent>
          </Card>

          <Card className="chart-container border border-border">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Anomaly Detection</h3>
                <div className="flex items-center space-x-2">
                  <Badge variant="destructive" className="text-xs">Critical: 3</Badge>
                  <Badge variant="secondary" className="text-xs">Warning: 12</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <AnomalyChart />
            </CardContent>
          </Card>
        </div>

        {/* Traffic Analysis Table */}
        <Card className="chart-container border border-border">
          <CardHeader className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Traffic Analysis</h3>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search traffic..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                </div>
                <Button data-testid="button-export">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Source IP
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Destination IP
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Protocol
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Bytes
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border" data-testid="traffic-table-body">
                {filteredTraffic.slice(0, 50).map((traffic) => (
                  <tr key={traffic.id} className="hover:bg-secondary/30 transition-colors" data-testid="traffic-row">
                    <td className="py-3 px-6 text-sm text-foreground" data-testid="traffic-timestamp">
                      {traffic.timestamp ? new Date(traffic.timestamp).toLocaleTimeString() : "-"}
                    </td>
                    <td className="py-3 px-6 text-sm text-foreground font-mono" data-testid="traffic-source-ip">
                      {traffic.sourceIp}
                    </td>
                    <td className="py-3 px-6 text-sm text-foreground font-mono" data-testid="traffic-dest-ip">
                      {traffic.destinationIp}
                    </td>
                    <td className="py-3 px-6 text-sm text-foreground">
                      <Badge variant="secondary" className="text-xs" data-testid="traffic-protocol">
                        {traffic.protocol}
                      </Badge>
                    </td>
                    <td className="py-3 px-6 text-sm text-foreground" data-testid="traffic-bytes">
                      {traffic.bytes && traffic.bytes < 1024 ? `${traffic.bytes} B` : `${((traffic.bytes || 0) / 1024).toFixed(1)} KB`}
                    </td>
                    <td className="py-3 px-6 text-sm" data-testid="traffic-risk-score">
                      <span className={`font-medium ${getRiskScoreColor(traffic.riskScore)}`}>
                        {traffic.riskScore?.toFixed(1) || "0.0"}
                      </span>
                    </td>
                    <td className="py-3 px-6" data-testid="traffic-status">
                      <Badge 
                        variant={getStatusBadgeVariant(traffic.status)}
                        className="text-xs font-medium"
                      >
                        {traffic.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground" data-testid="pagination-info">
              Showing <span className="text-foreground font-medium">1-{Math.min(50, filteredTraffic.length)}</span> of{" "}
              <span className="text-foreground font-medium">{filteredTraffic.length}</span> entries
            </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="secondary" disabled data-testid="button-previous">
                Previous
              </Button>
              <Button size="sm" variant="default" data-testid="button-page-1">1</Button>
              <Button size="sm" variant="secondary" data-testid="button-page-2">2</Button>
              <Button size="sm" variant="secondary" data-testid="button-page-3">3</Button>
              <Button size="sm" variant="secondary" data-testid="button-next">
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
