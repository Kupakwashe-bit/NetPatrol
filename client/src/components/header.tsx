import { Shield, Settings, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { Alert } from "@shared/schema";

interface HeaderProps {
  onOpenConfig?: () => void;
}

export default function Header({ onOpenConfig }: HeaderProps) {
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch unacknowledged alerts count
  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/alerts/unacknowledged"],
    refetchInterval: 5000,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-card border-b border-border px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="text-primary-foreground text-sm" />
            </div>
            <h1 className="text-xl font-bold text-foreground">NetGuard AI</h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6 ml-8">
            <a href="#" className="text-primary font-medium border-b-2 border-primary pb-1" data-testid="nav-dashboard">
              Dashboard
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-traffic">
              Traffic Analysis
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-models">
              ML Models
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-config">
              Configuration
            </a>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="live-indicator text-sm text-muted-foreground">
            <span className="ml-3" data-testid="system-status">System Status: Active</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-muted-foreground">Last Updated:</span>
            <span className="text-foreground font-medium" data-testid="last-update">
              {lastUpdate.toLocaleString()}
            </span>
          </div>

          <Button 
            size="icon" 
            variant="secondary" 
            onClick={onOpenConfig}
            disabled={!onOpenConfig}
            data-testid="button-settings"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="secondary" className="relative" data-testid="button-notifications">
            <Bell className="h-4 w-4" />
            {alerts.length > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-destructive text-destructive-foreground flex items-center justify-center"
                data-testid="alert-count"
              >
                {alerts.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
