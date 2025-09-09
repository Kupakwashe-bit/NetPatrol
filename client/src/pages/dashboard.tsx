import Header from "@/components/header";
import AlertsSidebar from "@/components/alerts-sidebar";
import MainDashboard from "@/components/main-dashboard";
import { useState } from "react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex h-[calc(100vh-72px)]">
        <AlertsSidebar />
        <MainDashboard />
      </div>
    </div>
  );
}
