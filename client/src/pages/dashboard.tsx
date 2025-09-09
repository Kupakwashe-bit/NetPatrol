import { useState } from "react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">NetGuard AI</h1>
        <p className="text-muted-foreground">Network Security Monitoring Dashboard</p>
        <div className="mt-8 p-4 bg-card rounded-lg border">
          <p className="text-sm">System initializing...</p>
        </div>
      </div>
    </div>
  );
}
