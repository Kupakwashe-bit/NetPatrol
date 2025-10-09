import Header from "@/components/header";
import AlertsSidebar from "@/components/alerts-sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export default function Reports() {
  const { data: summary } = useQuery<any>({ queryKey: ["/api/reports/summary"], refetchInterval: 30000 });
  const { data: trends } = useQuery<any>({ queryKey: ["/api/reports/trends"], refetchInterval: 60000 });

  const onExport = async () => {
    const token = localStorage.getItem('jwt') || '';
    const res = await fetch('/api/reports/export', { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anomalies.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex h-[calc(100vh-72px)]">
        <AlertsSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Reports & Insights</h1>
              <Button onClick={onExport} variant="outline">Export CSV</Button>
            </div>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Summary</h3>
              </CardHeader>
              <CardContent>
                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(summary, null, 2)}</pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Trends (last 30 days)</h3>
              </CardHeader>
              <CardContent>
                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(trends, null, 2)}</pre>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

