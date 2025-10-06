import Header from "@/components/header";
import AlertsSidebar from "@/components/alerts-sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Activity, TrendingUp, Settings, Play, Pause, RotateCcw, Database } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import AnomalyChart from "@/components/anomaly-chart";
import type { SystemMetrics } from "@shared/schema";
import { useState } from "react";

interface ModelMetrics {
  isTraining: boolean;
  accuracy: number;
  dataPoints: number;
  anomalies: number;
  cellsMonitored: number;
}

export default function MLModels() {
  const [modelStatus, setModelStatus] = useState<"running" | "paused" | "training">("running");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: currentMetrics } = useQuery<SystemMetrics>({
    queryKey: ["/api/metrics/current"],
    refetchInterval: 5000,
  });

  const { data: modelMetrics } = useQuery<ModelMetrics>({
    queryKey: ["/api/model/metrics"],
    refetchInterval: 10000,
  });

  const { data: monitoredCells = [] } = useQuery<string[]>({
    queryKey: ["/api/model/cells"],
    refetchInterval: 30000,
  });

  const modelAccuracy = modelMetrics?.accuracy ? (modelMetrics.accuracy * 100).toFixed(1) : "0.0";
  const isModelTraining = modelMetrics?.isTraining ?? false;
  
  const handleModelAction = async (action: string) => {
    try {
      if (action === "pause") {
        await fetch("/api/model/pause", { method: "POST" });
        setModelStatus("paused");
      } else if (action === "resume") {
        await fetch("/api/model/resume", { method: "POST" });
        setModelStatus("running");
      } else if (action === "retrain") {
        setModelStatus("training");
        await fetch("/api/model/retrain", { method: "POST" });
        setModelStatus("running");
      }
      // refresh metrics after actions
      queryClient.invalidateQueries({ queryKey: ["/api/model/metrics"] });
    } catch (e) {
      // no-op
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    setUploadError(null);
    setUploadSuccess(null);
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    // basic validation
    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
    const isJson = file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
    if (!isCsv && !isJson) {
      setUploadError("Please upload a CSV or JSON file.");
      return;
    }
    if (file.size > 80 * 1024 * 1024) {
      setUploadError("File too large. Max 80MB.");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    try {
      const res = await fetch("/api/model/upload", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      setUploadSuccess("Dataset uploaded. You can now retrain the model.");
      // refresh metrics to reflect new dataset counts
      queryClient.invalidateQueries({ queryKey: ["/api/model/metrics"] });
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({ onDrop, multiple: false });

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
                <Badge variant={isModelTraining ? "secondary" : "default"}>
                  {isModelTraining ? "Training" : "Active"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {modelMetrics?.dataPoints?.toLocaleString() || "0"} data points
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {modelMetrics?.anomalies || "0"} anomalies
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
                        {modelMetrics?.anomalies || 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Total from dataset</p>
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
                      <p className="text-sm text-muted-foreground mb-1">Data Sources</p>
                      <p className="text-2xl font-bold text-foreground">{modelMetrics?.cellsMonitored || 0}</p>
                      <p className="text-xs text-chart-4 mt-1">cell towers monitored</p>
                    </div>
                    <div className="w-12 h-12 bg-chart-4/20 rounded-lg flex items-center justify-center">
                      <Database className="text-chart-4" />
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
                
                {/* Upload Dataset */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-foreground mb-3">Upload Dataset (CSV or JSON)</h4>
                  <div
                    {...getRootProps()}
                    className={`border border-dashed rounded-md p-6 text-center cursor-pointer ${isDragActive ? 'bg-secondary/20' : 'bg-transparent'}`}
                  >
                    <input {...getInputProps()} />
                    {isDragActive ? (
                      <p className="text-sm">Drop the file here…</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Drag & drop a file here, or click to select</p>
                    )}
                    {acceptedFiles && acceptedFiles[0] && (
                      <p className="text-xs mt-2">Selected: {acceptedFiles[0].name}</p>
                    )}
                  </div>
                  <div className="mt-2">
                    {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
                    {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
                    {uploadSuccess && <p className="text-xs text-chart-4">{uploadSuccess}</p>}
                  </div>
                </div>
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