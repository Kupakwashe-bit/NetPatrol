import Header from "@/components/header";
import AlertsSidebar from "@/components/alerts-sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Bell, Network, Database, Save } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Configuration() {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    alertsEnabled: true,
    realTimeMonitoring: true,
    dataRetention: "30",
    maxConnections: "10000",
    scanInterval: "5",
    threatThreshold: "7",
    emailNotifications: true,
    slackNotifications: false,
    autoBlock: false,
    logLevel: "INFO"
  });

  const handleSave = () => {
    toast({
      title: "Configuration Saved",
      description: "Your settings have been successfully updated.",
    });
  };

  const updateConfig = (key: string, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
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
                <h1 className="text-2xl font-bold text-foreground mb-2">System Configuration</h1>
                <p className="text-muted-foreground">Manage NetGuard AI settings and preferences</p>
              </div>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Security Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Security Settings</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Real-time Monitoring</p>
                      <p className="text-xs text-muted-foreground">Enable continuous traffic analysis</p>
                    </div>
                    <Switch 
                      checked={config.realTimeMonitoring}
                      onCheckedChange={(checked) => updateConfig("realTimeMonitoring", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Auto-block Threats</p>
                      <p className="text-xs text-muted-foreground">Automatically block high-risk connections</p>
                    </div>
                    <Switch 
                      checked={config.autoBlock}
                      onCheckedChange={(checked) => updateConfig("autoBlock", checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Threat Detection Threshold</p>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={config.threatThreshold}
                        onChange={(e) => updateConfig("threatThreshold", e.target.value)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">/ 10</span>
                      <Badge variant={Number(config.threatThreshold) >= 7 ? "destructive" : "secondary"}>
                        {Number(config.threatThreshold) >= 7 ? "High" : "Medium"} Sensitivity
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Scan Interval (seconds)</p>
                    <Input
                      type="number"
                      min="1"
                      max="60"
                      value={config.scanInterval}
                      onChange={(e) => updateConfig("scanInterval", e.target.value)}
                      className="w-32"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Alert Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Bell className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Alert Settings</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Enable Alerts</p>
                      <p className="text-xs text-muted-foreground">Show security alerts in dashboard</p>
                    </div>
                    <Switch 
                      checked={config.alertsEnabled}
                      onCheckedChange={(checked) => updateConfig("alertsEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Send alerts via email</p>
                    </div>
                    <Switch 
                      checked={config.emailNotifications}
                      onCheckedChange={(checked) => updateConfig("emailNotifications", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Slack Notifications</p>
                      <p className="text-xs text-muted-foreground">Send alerts to Slack channel</p>
                    </div>
                    <Switch 
                      checked={config.slackNotifications}
                      onCheckedChange={(checked) => updateConfig("slackNotifications", checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Log Level</p>
                    <select 
                      value={config.logLevel}
                      onChange={(e) => updateConfig("logLevel", e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    >
                      <option value="DEBUG">DEBUG</option>
                      <option value="INFO">INFO</option>
                      <option value="WARNING">WARNING</option>
                      <option value="ERROR">ERROR</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Network Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Network className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Network Settings</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Max Concurrent Connections</p>
                    <Input
                      type="number"
                      min="1000"
                      max="100000"
                      value={config.maxConnections}
                      onChange={(e) => updateConfig("maxConnections", e.target.value)}
                      className="w-32"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Network Interfaces</p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="default">eth0</Badge>
                        <span className="text-sm text-muted-foreground">192.168.1.0/24</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">wlan0</Badge>
                        <span className="text-sm text-muted-foreground">10.0.0.0/24</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Monitored Ports</p>
                    <div className="flex flex-wrap gap-1">
                      {[80, 443, 22, 21, 25, 53, 3389].map(port => (
                        <Badge key={port} variant="outline" className="text-xs">
                          {port}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Database Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Database Settings</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Data Retention (days)</p>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={config.dataRetention}
                      onChange={(e) => updateConfig("dataRetention", e.target.value)}
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Data older than this will be automatically deleted
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Database Status</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">Connected</Badge>
                      <span className="text-sm text-muted-foreground">PostgreSQL 15.3</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Storage Usage</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Traffic logs</span>
                        <span className="text-foreground">2.4 GB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Alert history</span>
                        <span className="text-foreground">156 MB</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">System metrics</span>
                        <span className="text-foreground">89 MB</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Information */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">System Information</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Version</p>
                    <p className="text-sm text-muted-foreground">NetGuard AI v2.1.0</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Uptime</p>
                    <p className="text-sm text-muted-foreground">5 days, 14 hours</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Last Updated</p>
                    <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
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