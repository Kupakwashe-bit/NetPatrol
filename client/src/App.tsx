import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import TrafficAnalysis from "@/pages/traffic-analysis";
import MLModels from "@/pages/ml-models";
import Configuration from "@/pages/configuration";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/traffic-analysis" component={TrafficAnalysis} />
      <Route path="/ml-models" component={MLModels} />
      <Route path="/reports" component={Reports} />
      <Route path="/configuration" component={Configuration} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark min-h-screen bg-background text-foreground">
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
