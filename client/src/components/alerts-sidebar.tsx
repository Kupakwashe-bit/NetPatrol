import { AlertTriangle, Shield, Info, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Alert } from "@shared/schema";

export default function AlertsSidebar() {
  const [recipientEmail, setRecipientEmail] = useState("nyangurukupakwashe@gmail.com");

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 2000,
  });

  const sendReportMutation = useMutation<any, Error, string>({
    mutationFn: async (email) => {
      const response = await fetch("/api/alerts/send-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send report");
      }

      return response.json();
    },
  });

  const handleSendReport = () => {
    const promise = new Promise<{ message: string }>((resolve, reject) => {
      sendReportMutation.mutate(recipientEmail, {
        onSuccess: (data) => resolve(data),
        onError: (error) => reject(error),
      });
    });

    toast.promise(promise, {
      loading: 'Sending alert report...', 
      success: (data) => data.message || 'Report sent successfully!',
      error: (err) => `Failed to send report: ${err.message}`,
    });
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "CRITICAL":
        return <Shield className="text-destructive text-sm" />;
      case "WARNING":
        return <TriangleAlert className="text-accent text-sm" />;
      case "INFO":
        return <Info className="text-primary text-sm" />;
      default:
        return <AlertTriangle className="text-muted-foreground text-sm" />;
    }
  };

  const getAlertClass = (type: string) => {
    switch (type) {
      case "CRITICAL":
        return "alert-critical";
      case "WARNING":
        return "alert-warning";
      case "INFO":
        return "alert-info";
      default:
        return "";
    }
  };

  const getAlertBadgeVariant = (type: string) => {
    switch (type) {
      case "CRITICAL":
        return "destructive";
      case "WARNING":
        return "secondary";
      case "INFO":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <aside className="w-80 bg-card border-r border-border overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground flex items-center">
          <AlertTriangle className="text-accent mr-2" />
          Active Alerts
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Real-time threat detection</p>
      </div>

      <div className="p-4 space-y-3" data-testid="alerts-container">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No active alerts</p>
          </div>
        ) : (
          alerts.slice(0, 10).map((alert) => (
            <Card 
              key={alert.id} 
              className={cn("p-3 border hover-elevate", getAlertClass(alert.type))}
              data-testid={`alert-${alert.type.toLowerCase()}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {getAlertIcon(alert.type)}
                    <span className="text-sm font-medium text-foreground">
                      {alert.title}
                    </span>
                    <Badge 
                      variant={getAlertBadgeVariant(alert.type)}
                      className="text-xs"
                      data-testid={`badge-${alert.type.toLowerCase()}`}
                    >
                      {alert.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alert.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleString()} - {
                      Math.floor((new Date().getTime() - new Date(alert.timestamp).getTime()) / 60000)
                    } minutes ago
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}

        <Button 
          variant="outline" 
          className="w-full text-sm"
          data-testid="button-view-all-alerts"
        >
          View All Alerts
        </Button>
      </div>

      <div className="p-4 border-t border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">Email Reports</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="sidebar-email-input" className="text-xs text-muted-foreground">Recipient Email</label>
            <Input 
              id="sidebar-email-input"
              type="email" 
              value={recipientEmail} 
              onChange={(e) => setRecipientEmail(e.target.value)} 
              placeholder="Enter email for alerts"
              className="mt-1 h-8 text-xs"
            />
          </div>
          <Button 
            onClick={handleSendReport} 
            disabled={sendReportMutation.isPending}
            className="w-full text-sm"
          >
            {sendReportMutation.isPending ? "Sending..." : "Send Report Now"}
          </Button>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">Alert Configuration</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Threat Detection</span>
            <Switch defaultChecked data-testid="switch-threat-detection" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Anomaly Alerts</span>
            <Switch defaultChecked data-testid="switch-anomaly-alerts" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Performance Alerts</span>
            <Switch data-testid="switch-performance-alerts" />
          </div>
        </div>
      </div>
    </aside>
  );
}
