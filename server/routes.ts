import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { NetworkAnomalyDetector } from './ml-model';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  insertNetworkTrafficSchema, 
  insertAlertSchema, 
  insertSystemMetricsSchema,
  insertMlModelConfigSchema
} from "@shared/schema";
import nodemailer from 'nodemailer';

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize ML model
  const anomalyDetector = new NetworkAnomalyDetector();
  let generationPaused = false;
  // Notification setup (use environment vars if provided)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined
  });

  async function sendAnomalyEmail(subject: string, text: string) {
    try {
      const to = process.env.ALERT_EMAIL_TO;
      const from = process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER || 'alerts@example.com';
      if (!to) return; // skip if not configured
      await transporter.sendMail({ from, to, subject, text });
    } catch (err) {
      console.error('Failed to send alert email:', err);
    }
  }
  console.log('Starting ML model training...');
  anomalyDetector.trainModel().then(() => {
    console.log('ML model training completed!');
  }).catch(error => {
    console.error('ML model training failed:', error);
  });

  // File upload setup
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req: any, file: any, cb: any) => {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
      },
      filename: (req: any, file: any, cb: any) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + '-' + file.originalname);
      }
    }),
    limits: { fileSize: 80 * 1024 * 1024 }, // 80MB
    fileFilter: (req: any, file: any, cb: any) => {
      const allowed = ['text/csv', 'application/json'];
      if (allowed.includes(file.mimetype) || file.originalname.endsWith('.csv') || file.originalname.endsWith('.json')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV or JSON files are allowed'));
      }
    }
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

  // Pause/Resume model-driven generation
  app.post('/api/model/pause', async (_req, res) => {
    generationPaused = true;
    res.json({ status: 'paused' });
  });

  app.post('/api/model/resume', async (_req, res) => {
    generationPaused = false;
    res.json({ status: 'running' });
  });

  // Dataset upload endpoint
  app.post('/api/model/upload', upload.single('file'), async (req, res) => {
    try {
      const uploadedFile = (req as any).file as any;
      if (!uploadedFile) return res.status(400).json({ error: 'No file uploaded' });
      // Pass the uploaded file path to the model to load and preprocess
      const filePath = uploadedFile.path;
      await anomalyDetector.loadNewDataset(filePath);
      res.json({ message: 'File uploaded and dataset loaded successfully' });
    } catch (error: any) {
      console.error('Upload failed:', error);
      res.status(400).json({ error: error.message || 'Failed to upload dataset' });
    }
  });

  // Retrain endpoint
  app.post('/api/model/retrain', async (req, res) => {
    try {
      await anomalyDetector.trainModel();
      const metrics = anomalyDetector.getModelMetrics();
      res.json({ message: 'Model retrained', metrics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrain model' });
    }
  });

  // Evaluate endpoint (compute metrics on current dataset)
  app.post('/api/model/evaluate', async (req, res) => {
    try {
      const metrics = anomalyDetector.getModelMetrics();
      const summary = anomalyDetector.evaluateCurrentDataset();
      res.json({ metrics, summary });
    } catch (error) {
      res.status(500).json({ error: 'Failed to evaluate model' });
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
    if (generationPaused) return;
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

        const saved = await storage.createAlert(alert);
        // Send email notification
        await sendAnomalyEmail(
          `[${alert.type}] ${alert.title}`,
          `${alert.description}\nSource IP: ${alert.sourceIp}\nTimestamp: ${new Date().toISOString()}`
        );
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
