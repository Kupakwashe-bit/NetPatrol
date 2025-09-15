import Header from "@/components/header";
import AlertsSidebar from "@/components/alerts-sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Activity, TrendingUp, Settings, Play, Pause, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import AnomalyChart from "@/components/anomaly-chart";
import type { SystemMetrics } from "@shared/schema";
import { useState } from "react";

export default function MLModels() {
  const [modelStatus, setModelStatus] = useState<"running" | "paused" | "training">("running");

  const { data: currentMetrics } = useQuery<SystemMetrics>({
    queryKey: ["/api/metrics/current"],
    refetchInterval: 5000,
  });

  const modelAccuracy = currentMetrics?.modelAccuracy ? (currentMetrics.modelAccuracy * 100).toFixed(1) : "0.0";
  
  const handleModelAction = (action: string) => {
    if (action === "pause") {
      setModelStatus("paused");
    } else if (action === "resume") {
      setModelStatus("running");
    } else if (action === "retrain") {
      setModelStatus("training");
      // Simulate training completion after 5 seconds
      setTimeout(() => setModelStatus("running"), 5000);
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
                <h1 className="text-2xl font-bold text-foreground mb-2">ML Models & Anomaly Detection</h1>
                <p className="text-muted-foreground">Monitor and configure machine learning models for threat detection</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={modelStatus === "running" ? "default" : modelStatus === "training" ? "secondary" : "outline"}>
                  {modelStatus === "running" ? "Active" : modelStatus === "training" ? "Training" : "Paused"}
                </Badge>
              </div>
            </div>

            {/* Model Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Model Accuracy</p>
                      <p className="text-2xl font-bold text-foreground">{modelAccuracy}%</p>
                      <p className="text-xs text-chart-4 mt-1">↑ 2.3% improvement</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Anomalies Detected</p>
                      <p className="text-2xl font-bold text-foreground">
                        {currentMetrics?.threatsBlocked || 0}
                      </p>
                      <p className="text-xs text-destructive mt-1">↑ 15% this hour</p>
                    </div>
                    <div className="w-12 h-12 bg-destructive/20 rounded-lg flex items-center justify-center">
                      <Activity className="text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Processing Speed</p>
                      <p className="text-2xl font-bold text-foreground">1.2K/s</p>
                      <p className="text-xs text-chart-4 mt-1">packets analyzed</p>
                    </div>
                    <div className="w-12 h-12 bg-chart-4/20 rounded-lg flex items-center justify-center">
                      <Brain className="text-chart-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Model Controls */}
            <Card className="mb-6">
              <CardHeader>
                <h3 className="text-lg font-semibold text-foreground">Model Controls</h3>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Button 
                    onClick={() => handleModelAction(modelStatus === "running" ? "pause" : "resume")}
                    variant={modelStatus === "running" ? "secondary" : "default"}
                    disabled={modelStatus === "training"}
                  >
                    {modelStatus === "running" ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause Model
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Resume Model
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={() => handleModelAction("retrain")}
                    variant="outline"
                    disabled={modelStatus === "training"}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retrain Model
                  </Button>
                  
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>

                {modelStatus === "training" && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Training Progress</p>
                      <p className="text-sm text-foreground">75%</p>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Anomaly Detection Chart */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Anomaly Detection Visualization</h3>
                  <div className="flex items-center space-x-2">
                    <Badge variant="destructive" className="text-xs">High Risk: 3</Badge>
                    <Badge variant="secondary" className="text-xs">Medium Risk: 12</Badge>
                    <Badge variant="outline" className="text-xs">Low Risk: 45</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AnomalyChart />
              </CardContent>
            </Card>

            {/* Model Configuration */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-foreground">Model Configuration</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">Detection Thresholds</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Critical Threshold</span>
                        <Badge variant="destructive">≥ 8.0</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Warning Threshold</span>
                        <Badge variant="secondary">≥ 5.0</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Normal Threshold</span>
                        <Badge variant="outline">&lt; 5.0</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">Model Parameters</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Learning Rate</span>
                        <span className="text-sm text-foreground font-mono">0.001</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Batch Size</span>
                        <span className="text-sm text-foreground font-mono">32</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Window Size</span>
                        <span className="text-sm text-foreground font-mono">100 packets</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}