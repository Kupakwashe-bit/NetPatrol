import Header from "@/components/header";
import AlertsSidebar from "@/components/alerts-sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download, Activity } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import TrafficChart from "@/components/traffic-chart";
import OfflineTrafficChart from "@/components/offline-traffic-chart";
import type { NetworkTraffic } from "@shared/schema";

interface Anomaly {
  base_station_id: string;
  anomaly_type: string;
  timestamp: string;
  severity: string;
  details: string;
}

interface ChartData {
  timestamp: string;
  traffic_volume: number;
}

interface AnalysisResponse {
  anomalies: Anomaly[];
  chartData: ChartData[];
  emailStatus: string;
}

export default function TrafficAnalysis() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProtocol, setSelectedProtocol] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: trafficData = [] } = useQuery<NetworkTraffic[]>({ 
    queryKey: ["/api/traffic"],
    refetchInterval: 2000,
  });

  const anomalyMutation = useMutation<AnalysisResponse, Error, File>({ 
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:5001/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze file");
      }

      return response.json();
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleAnalyzeClick = () => {
    if (selectedFile) {
      anomalyMutation.mutate(selectedFile);
    }
  };

  const filteredTraffic = trafficData.filter(traffic =>
    traffic && (
      traffic.sourceIp?.includes(searchTerm) ||
      traffic.destinationIp?.includes(searchTerm) ||
      traffic.protocol?.toLowerCase().includes(searchTerm.toLowerCase())
    ) && (
      !selectedProtocol || traffic.protocol === selectedProtocol
    )
  );

  const protocols = Array.from(new Set(trafficData.map(t => t?.protocol).filter(Boolean)));

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "BLOCKED": return "destructive";
      case "FLAGGED": return "secondary";
      case "ALLOWED": return "default";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex h-[calc(100vh-72px)]">
        <AlertsSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Traffic Analysis</h1>
                <p className="text-muted-foreground">Deep dive into network traffic patterns and behaviors</p>
              </div>
              <Button data-testid="button-export">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>

            {/* Offline Anomaly Detection */}
            <Card className="mb-6">
              <CardHeader>
                <h3 className="text-lg font-semibold text-foreground">Offline Anomaly Detection</h3>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Input type="file" onChange={handleFileChange} className="flex-1" />
                  <Button onClick={handleAnalyzeClick} disabled={!selectedFile || anomalyMutation.isPending}>
                    {anomalyMutation.isPending ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
                {anomalyMutation.isError && (
                  <p className="text-destructive mt-2">Error: {anomalyMutation.error.message}</p>
                )}
                {anomalyMutation.data && (
                  <div className="mt-4">
                    <h4 className="font-semibold">Analysis Results:</h4>
                    <div className="my-4">
                      <OfflineTrafficChart data={anomalyMutation.data.chartData} anomalies={anomalyMutation.data.anomalies} />
                    </div>
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Base Station ID</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Anomaly Type</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Timestamp</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Severity</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {anomalyMutation.data.anomalies.map((anomaly, index) => (
                            <tr key={index} className="hover:bg-secondary/30 transition-colors">
                              <td className="py-3 px-4 text-sm text-foreground font-mono">{anomaly.base_station_id}</td>
                              <td className="py-3 px-4 text-sm text-foreground">{anomaly.anomaly_type}</td>
                              <td className="py-3 px-4 text-sm text-foreground">{new Date(anomaly.timestamp).toLocaleString()}</td>
                              <td className="py-3 px-4 text-sm">
                                <Badge variant={anomaly.severity === 'high' ? 'destructive' : 'secondary'}>
                                  {anomaly.severity}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm text-muted-foreground">{anomaly.details}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Base Station Map Placeholder */}
            <Card className="mb-6">
              <CardHeader>
                <h3 className="text-lg font-semibold text-foreground">Base Station Status Map</h3>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-secondary/50 flex items-center justify-center rounded-md">
                  <p className="text-muted-foreground">Map visualization will be implemented here.</p>
                </div>
              </CardContent>
            </Card>

            {/* Traffic Chart */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Real-time Traffic Flow</h3>
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Live</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TrafficChart />
              </CardContent>
            </Card>

            {/* Filters and Search */}
            <Card className="mb-6">
              <CardHeader>
                <h3 className="text-lg font-semibold text-foreground">Filters & Search</h3>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search by IP address or protocol..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                        data-testid="input-traffic-search"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select 
                      value={selectedProtocol}
                      onChange={(e) => setSelectedProtocol(e.target.value)}
                      className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    >
                      <option value="">All Protocols</option>
                      {protocols.map(protocol => (
                        <option key={protocol} value={protocol}>{protocol}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Traffic Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Network Traffic Details</h3>
                  <Badge variant="secondary" className="text-xs">
                    {filteredTraffic.length} connections
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Time</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Source</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Destination</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Protocol</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Port</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Bytes</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Risk</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredTraffic.slice(0, 100).map((traffic) => (
                        <tr key={traffic.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="py-3 px-4 text-sm text-foreground">
                            {traffic.timestamp ? new Date(traffic.timestamp).toLocaleTimeString() : "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-foreground font-mono">
                            {traffic.sourceIp}
                          </td>
                          <td className="py-3 px-4 text-sm text-foreground font-mono">
                            {traffic.destinationIp}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <Badge variant="secondary" className="text-xs">
                              {traffic.protocol}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-foreground font-mono">
                            {traffic.destinationPort}
                          </td>
                          <td className="py-3 px-4 text-sm text-foreground">
                            {traffic.bytes && traffic.bytes < 1024 
                              ? `${traffic.bytes} B` 
                              : `${((traffic.bytes || 0) / 1024).toFixed(1)} KB`}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className={`font-medium ${
                              traffic.riskScore >= 7 ? "text-destructive" :
                              traffic.riskScore >= 4 ? "text-accent" : "text-chart-4"
                            }`}>
                              {traffic.riskScore?.toFixed(1) || "0.0"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant={getStatusBadgeVariant(traffic.status)}
                              className="text-xs"
                            >
                              {traffic.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}