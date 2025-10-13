import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { NetworkAnomalyDetector } from './ml-model';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { 
  insertNetworkTrafficSchema, 
  insertAlertSchema, 
  insertSystemMetricsSchema,
  insertMlModelConfigSchema
} from "@shared/schema";
import nodemailer from 'nodemailer';
import axios from 'axios';

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

  // Auth config
  const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
  type JwtUser = { id: string; username: string; role?: string };
  function signToken(user: JwtUser) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '12h' });
  }
  function requireAuth(req: any, res: any, next: any) {
    try {
      const header = req.headers['authorization'] || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const decoded = jwt.verify(token, JWT_SECRET) as JwtUser;
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  // Auth endpoints
  // Seed default admin user if missing
  (async () => {
    try {
      const existingAdmin = await storage.getUserByUsername('admin');
      if (!existingAdmin) {
        const hashed = await bcrypt.hash('admin123', 10);
        await storage.createUser({ username: 'admin', password: hashed });
        console.log('Seeded default admin user: admin / admin123');
      } else {
        // Ensure password matches seed if previously created without hash
        const needsHashFix = !existingAdmin.password.startsWith('$2');
        if (needsHashFix) {
          const hashed = await bcrypt.hash('admin123', 10);
          await storage.updateUser({ id: existingAdmin.id, password: hashed });
          console.log('Updated admin password hash');
        }
      }
    } catch (e) {
      console.warn('Failed to seed default admin user');
    }
  })();

  app.post('/auth/register', async (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });
      const existing = await storage.getUserByUsername(username);
      if (existing) return res.status(409).json({ error: 'Username already exists' });
      const hashed = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, password: hashed });
      const token = signToken({ id: user.id, username: user.username });
      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });
      let user = await storage.getUserByUsername(username);
      if (!user) {
        // Fallback: auto-create default admin if matching credentials
        if (username === 'admin' && password === 'admin123') {
          const hashed = await bcrypt.hash(password, 10);
          user = await storage.createUser({ username, password: hashed });
        } else {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
      }
      let ok: boolean;
      if (user.password && user.password.startsWith('$2')) {
        ok = await bcrypt.compare(password, user.password);
      } else {
        ok = user.password === password;
        if (ok) {
          // upgrade to hash
          const newHash = await bcrypt.hash(password, 10);
          await storage.updateUser({ id: user.id, password: newHash });
        }
      }
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
      const token = signToken({ id: user.id, username: user.username });
      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.get('/auth/me', requireAuth, async (req: any, res) => {
    res.json({ user: req.user });
  });

  // DEV helper: force (re)seed admin credentials
  app.post('/auth/register-admin', async (_req, res) => {
    try {
      const username = 'admin';
      const password = 'admin123';
      const existing = await storage.getUserByUsername(username);
      const hashed = await bcrypt.hash(password, 10);
      if (!existing) {
        await storage.createUser({ username, password: hashed });
      } else {
        await storage.updateUser({ id: existing.id, password: hashed });
      }
      res.json({ message: 'Admin credentials set', username });
    } catch (e) {
      res.status(500).json({ error: 'Failed to set admin credentials' });
    }
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
    // Example: protect traffic endpoints in the future using requireAuth
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

  // Proxy endpoint for sending alert reports
  app.post("/api/proxy/send-alert-report", async (req, res) => {
    try {
      const response = await axios.post('http://localhost:5001/api/alerts/send-report', req.body);
      res.json(response.data);
    } catch (error: any) {
      console.error('Proxy Error:', error.message);
      res.status(error.response?.status || 500).json({ error: 'Failed to proxy request to Python server' });
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

  // Reports endpoints
  app.get('/api/reports/summary', async (req, res) => {
    try {
      const evaluation = anomalyDetector.evaluateCurrentDataset();
      res.json(evaluation);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch report summary' });
    }
  });

  app.get('/api/reports/trends', async (req, res) => {
    try {
      // Build daily anomaly trend from stored traffic
      const now = new Date();
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const traffic = await storage.getTrafficByTimeRange(start, now);
      const daily: Record<string, { total: number; anomalies: number }> = {};
      traffic.forEach(t => {
        const day = new Date(t.timestamp).toISOString().slice(0, 10);
        if (!daily[day]) daily[day] = { total: 0, anomalies: 0 };
        daily[day].total += 1;
        if (t.isAnomaly) daily[day].anomalies += 1;
      });
      const series = Object.entries(daily)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, total: v.total, anomalies: v.anomalies }));
      res.json({ series });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch trends' });
    }
  });

  app.get('/api/reports/export', async (req, res) => {
    try {
      // Export anomalies as CSV
      const anomalies = await storage.getAnomalousTraffic(1000);
      const header = ['timestamp','sourceIp','destinationIp','protocol','bytes','packets','riskScore','status'];
      const rows = anomalies.map(a => [
        a.timestamp.toISOString(), a.sourceIp, a.destinationIp, a.protocol,
        a.bytes, a.packets, a.riskScore, a.status
      ].join(','));
      const csv = [header.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="anomalies.csv"');
      res.send(csv);
    } catch (err) {
      res.status(500).json({ error: 'Failed to export report' });
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
