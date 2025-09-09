import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertNetworkTrafficSchema, 
  insertAlertSchema, 
  insertSystemMetricsSchema,
  insertMlModelConfigSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Network Traffic API
  app.get("/api/traffic", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const traffic = await storage.getNetworkTraffic(limit, offset);
      res.json(traffic);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch traffic data" });
    }
  });

  app.post("/api/traffic", async (req, res) => {
    try {
      const validatedData = insertNetworkTrafficSchema.parse(req.body);
      const traffic = await storage.createNetworkTraffic(validatedData);
      res.json(traffic);
    } catch (error) {
      res.status(400).json({ error: "Invalid traffic data" });
    }
  });

  app.get("/api/traffic/anomalies", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const anomalies = await storage.getAnomalousTraffic(limit);
      res.json(anomalies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch anomalous traffic" });
    }
  });

  // Alerts API
  app.get("/api/alerts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const alerts = await storage.getAlerts(limit);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.get("/api/alerts/unacknowledged", async (req, res) => {
    try {
      const alerts = await storage.getUnacknowledgedAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unacknowledged alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const validatedData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(validatedData);
      res.json(alert);
    } catch (error) {
      res.status(400).json({ error: "Invalid alert data" });
    }
  });

  app.patch("/api/alerts/:id/acknowledge", async (req, res) => {
    try {
      const alert = await storage.acknowledgeAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });

  // System Metrics API
  app.get("/api/metrics/current", async (req, res) => {
    try {
      const metrics = await storage.getLatestSystemMetrics();
      res.json(metrics || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch system metrics" });
    }
  });

  app.get("/api/metrics/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const metrics = await storage.getSystemMetricsHistory(limit);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch metrics history" });
    }
  });

  app.post("/api/metrics", async (req, res) => {
    try {
      const validatedData = insertSystemMetricsSchema.parse(req.body);
      const metrics = await storage.createSystemMetrics(validatedData);
      res.json(metrics);
    } catch (error) {
      res.status(400).json({ error: "Invalid metrics data" });
    }
  });

  // ML Model Configuration API
  app.get("/api/model/config", async (req, res) => {
    try {
      const config = await storage.getMlModelConfig();
      res.json(config || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch model config" });
    }
  });

  app.patch("/api/model/config", async (req, res) => {
    try {
      const validatedData = insertMlModelConfigSchema.partial().parse(req.body);
      const config = await storage.updateMlModelConfig(validatedData);
      res.json(config);
    } catch (error) {
      res.status(400).json({ error: "Invalid config data" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');

    // Send initial data
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString()
    }));

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Simulate real-time data generation
  const generateMockData = () => {
    const clients = Array.from(wss.clients).filter(client => client.readyState === WebSocket.OPEN);
    
    if (clients.length === 0) return;

    // Generate mock network traffic
    const mockTraffic = {
      sourceIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
      destinationIp: `203.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      protocol: ['TCP', 'UDP', 'HTTP', 'HTTPS'][Math.floor(Math.random() * 4)],
      sourcePort: Math.floor(Math.random() * 65535),
      destinationPort: [80, 443, 22, 25, 53][Math.floor(Math.random() * 5)],
      bytes: Math.floor(Math.random() * 10000),
      packets: Math.floor(Math.random() * 100),
      riskScore: Math.random() * 10,
      isAnomaly: Math.random() > 0.85,
      status: Math.random() > 0.8 ? 'BLOCKED' : Math.random() > 0.9 ? 'FLAGGED' : 'ALLOWED',
    };

    // Store traffic data
    storage.createNetworkTraffic(mockTraffic);

    // Generate alert if high risk
    if (mockTraffic.riskScore > 7 || mockTraffic.isAnomaly) {
      const alertType = mockTraffic.riskScore > 8.5 ? 'CRITICAL' : mockTraffic.riskScore > 6 ? 'WARNING' : 'INFO';
      const alertTitles = {
        CRITICAL: ['DDoS Attack Detected', 'Malware Communication', 'Data Exfiltration Attempt'],
        WARNING: ['Anomalous Port Scan', 'Suspicious Traffic Pattern', 'Unusual Data Transfer'],
        INFO: ['Model Updated', 'Routine Security Check', 'System Optimization']
      };
      
      const alert = {
        type: alertType,
        title: alertTitles[alertType as keyof typeof alertTitles][Math.floor(Math.random() * 3)],
        description: `Detected from ${mockTraffic.sourceIp} - Risk Score: ${mockTraffic.riskScore.toFixed(1)}`,
        sourceIp: mockTraffic.sourceIp,
        acknowledged: false,
      };
      
      storage.createAlert(alert);
    }

    // Generate system metrics
    const metrics = {
      trafficVolume: 1.5 + Math.random() * 2,
      activeConnections: 14000 + Math.floor(Math.random() * 4000),
      threatsBlocked: Math.floor(Math.random() * 10),
      modelAccuracy: 0.96 + Math.random() * 0.04,
      cpuUsage: 20 + Math.random() * 60,
      memoryUsage: 40 + Math.random() * 40,
    };

    storage.createSystemMetrics(metrics);

    // Broadcast to all connected clients
    const message = JSON.stringify({
      type: 'data_update',
      timestamp: new Date().toISOString(),
      traffic: mockTraffic,
      metrics,
    });

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Generate data every 2 seconds
  setInterval(generateMockData, 2000);

  return httpServer;
}
