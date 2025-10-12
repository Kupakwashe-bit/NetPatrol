import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter } from 'recharts';

interface ChartData {
  timestamp: string;
  traffic_volume: number;
}

interface Anomaly {
  timestamp: string;
}

interface OfflineTrafficChartProps {
  data: ChartData[];
  anomalies: Anomaly[];
}

export default function OfflineTrafficChart({ data, anomalies }: OfflineTrafficChartProps) {
  const anomalyPoints = data.filter(d => 
    anomalies.some(a => new Date(a.timestamp).getTime() === new Date(d.timestamp).getTime())
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="timestamp" 
          tickFormatter={(timeStr) => new Date(timeStr).toLocaleTimeString()} 
          label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
        />
        <YAxis label={{ value: 'Traffic Volume (GBs)', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="traffic_volume" stroke="#8884d8" name="Traffic Volume" />
        <Scatter data={anomalyPoints} fill="red" name="Anomalies" />
      </LineChart>
    </ResponsiveContainer>
  );
}
