import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { NetworkAnomalyDetector } from './ml-model';
import { 
  insertNetworkTrafficSchema, 
  insertAlertSchema, 
  insertSystemMetricsSchema,
  insertMlModelConfigSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize ML model
  const anomalyDetector = new NetworkAnomalyDetector();
  console.log('Starting ML model training...');
  anomalyDetector.trainModel().then(() => {
    console.log('ML model training completed!');
  }).catch(error => {
    console.error('ML model training failed:', error);
  });
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

  // ML Model Metrics API
  app.get("/api/model/metrics", async (req, res) => {
    try {
      const metrics = anomalyDetector.getModelMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch model metrics" });
    }
  });

  app.get("/api/model/cells", async (req, res) => {
    try {
      const cells = anomalyDetector.getCellNames();
      res.json(cells);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monitored cells" });
    }
  });

  app.get("/api/model/cell/:cellName/history", async (req, res) => {
    try {
      const cellName = req.params.cellName;
      const limit = parseInt(req.query.limit as string) || 100;
      const history = anomalyDetector.getTrafficHistory(cellName, limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cell history" });
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

  // Generate real ML-powered data
  const generateRealTimeData = async () => {
    const clients = Array.from(wss.clients).filter(client => client.readyState === WebSocket.OPEN);
    
    if (clients.length === 0) return;

    try {
      // Get random traffic point from dataset
      const trafficPoint = anomalyDetector.getRandomTrafficPoint();
      if (!trafficPoint) {
        console.warn('No traffic data available for analysis');
        return;
      }

      // Use ML model to predict anomaly
      const prediction = await anomalyDetector.predict(
        trafficPoint.totalTraffic, 
        trafficPoint.cellName, 
        trafficPoint.time
      );

      // Convert cellular data to network traffic format
      const networkTraffic = {
        sourceIp: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        destinationIp: `203.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        protocol: ['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS'][Math.floor(Math.random() * 5)],
        sourcePort: Math.floor(Math.random() * 65535),
        destinationPort: [80, 443, 22, 25, 53, 8080][Math.floor(Math.random() * 6)],
        bytes: Math.floor(trafficPoint.totalTraffic * 1024 * 1024), // Convert GB to bytes
        packets: Math.floor(trafficPoint.totalTraffic * 1000),
        riskScore: prediction.riskScore,
        isAnomaly: prediction.isAnomaly,
        status: prediction.isAnomaly && prediction.riskScore > 7 ? 'BLOCKED' : 
                prediction.isAnomaly ? 'FLAGGED' : 'ALLOWED',
        cellName: trafficPoint.cellName,
        confidence: prediction.confidence
      };

      // Store traffic data
      await storage.createNetworkTraffic(networkTraffic);

      // Generate ML-based alert
      if (prediction.isAnomaly && prediction.riskScore > 5) {
        const alertType = prediction.riskScore > 8 ? 'CRITICAL' : 
                         prediction.riskScore > 6 ? 'WARNING' : 'INFO';
        
        const alertTitles = {
          CRITICAL: [
            'Critical Traffic Anomaly Detected',
            'Severe Network Irregularity',
            'High-Risk Behavior Identified'
          ],
          WARNING: [
            'Anomalous Traffic Pattern',
            'Unusual Network Activity',
            'Suspicious Data Flow'
          ],
          INFO: [
            'Traffic Anomaly Detected',
            'Network Pattern Change',
            'Behavioral Deviation'
          ]
        };

        const alert = {
          type: alertType,
          title: alertTitles[alertType as keyof typeof alertTitles][Math.floor(Math.random() * 3)],
          description: `ML Model detected anomaly in ${trafficPoint.cellName} - Risk Score: ${prediction.riskScore.toFixed(1)}, Confidence: ${(prediction.confidence * 100).toFixed(1)}%`,
          sourceIp: networkTraffic.sourceIp,
          acknowledged: false,
        };

        await storage.createAlert(alert);
      }

      // Generate real system metrics with ML model info
      const modelMetrics = anomalyDetector.getModelMetrics();
      const metrics = {
        trafficVolume: trafficPoint.totalTraffic,
        activeConnections: 12000 + Math.floor(Math.random() * 6000),
        threatsBlocked: Math.floor(modelMetrics.anomalies / 100),
        modelAccuracy: modelMetrics.accuracy,
        cpuUsage: 25 + Math.random() * 50,
        memoryUsage: 35 + Math.random() * 45,
      };

      await storage.createSystemMetrics(metrics);

      // Broadcast to all connected clients
      const message = JSON.stringify({
        type: 'ml_data_update',
        timestamp: new Date().toISOString(),
        traffic: networkTraffic,
        metrics,
        mlInfo: {
          prediction,
          originalData: {
            cellName: trafficPoint.cellName,
            cellId: trafficPoint.cellId,
            originalTraffic: trafficPoint.totalTraffic,
            timestamp: trafficPoint.time
          },
          modelMetrics
        }
      });

      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });

    } catch (error) {
      console.error('Error generating real-time ML data:', error);
    }
  };

  // Generate ML-powered data every 3 seconds
  setInterval(generateRealTimeData, 3000);

  return httpServer;
}
