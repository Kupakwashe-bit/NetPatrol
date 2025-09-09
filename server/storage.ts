import { 
  type User, type InsertUser,
  type NetworkTraffic, type InsertNetworkTraffic,
  type Alert, type InsertAlert,
  type SystemMetrics, type InsertSystemMetrics,
  type MlModelConfig, type InsertMlModelConfig
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Network Traffic
  getNetworkTraffic(limit?: number, offset?: number): Promise<NetworkTraffic[]>;
  createNetworkTraffic(traffic: InsertNetworkTraffic): Promise<NetworkTraffic>;
  getTrafficByTimeRange(startTime: Date, endTime: Date): Promise<NetworkTraffic[]>;
  getAnomalousTraffic(limit?: number): Promise<NetworkTraffic[]>;

  // Alerts
  getAlerts(limit?: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  acknowledgeAlert(id: string): Promise<Alert | undefined>;
  getUnacknowledgedAlerts(): Promise<Alert[]>;

  // System Metrics
  getLatestSystemMetrics(): Promise<SystemMetrics | undefined>;
  createSystemMetrics(metrics: InsertSystemMetrics): Promise<SystemMetrics>;
  getSystemMetricsHistory(limit?: number): Promise<SystemMetrics[]>;

  // ML Model Config
  getMlModelConfig(): Promise<MlModelConfig | undefined>;
  updateMlModelConfig(config: Partial<InsertMlModelConfig>): Promise<MlModelConfig>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private networkTraffic: Map<string, NetworkTraffic>;
  private alerts: Map<string, Alert>;
  private systemMetrics: Map<string, SystemMetrics>;
  private mlModelConfig: MlModelConfig | undefined;

  constructor() {
    this.users = new Map();
    this.networkTraffic = new Map();
    this.alerts = new Map();
    this.systemMetrics = new Map();
    
    // Initialize default ML config
    this.mlModelConfig = {
      id: randomUUID(),
      detectionThreshold: 0.75,
      updateFrequency: "real-time",
      dataRetentionPeriod: "7days",
      lastUpdated: new Date(),
      isActive: true,
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getNetworkTraffic(limit = 100, offset = 0): Promise<NetworkTraffic[]> {
    const traffic = Array.from(this.networkTraffic.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
    return traffic;
  }

  async createNetworkTraffic(insertTraffic: InsertNetworkTraffic): Promise<NetworkTraffic> {
    const id = randomUUID();
    const traffic: NetworkTraffic = {
      ...insertTraffic,
      id,
      timestamp: new Date(),
      status: insertTraffic.status || "ALLOWED",
      sourcePort: insertTraffic.sourcePort || null,
      destinationPort: insertTraffic.destinationPort || null,
      riskScore: insertTraffic.riskScore || 0,
      isAnomaly: insertTraffic.isAnomaly || false,
      metadata: insertTraffic.metadata || null,
    };
    this.networkTraffic.set(id, traffic);
    return traffic;
  }

  async getTrafficByTimeRange(startTime: Date, endTime: Date): Promise<NetworkTraffic[]> {
    return Array.from(this.networkTraffic.values())
      .filter(traffic => traffic.timestamp >= startTime && traffic.timestamp <= endTime)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getAnomalousTraffic(limit = 50): Promise<NetworkTraffic[]> {
    return Array.from(this.networkTraffic.values())
      .filter(traffic => traffic.isAnomaly)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);
  }

  async getAlerts(limit = 50): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const alert: Alert = {
      ...insertAlert,
      id,
      timestamp: new Date(),
      sourceIp: insertAlert.sourceIp || null,
      relatedTrafficId: insertAlert.relatedTrafficId || null,
      acknowledged: insertAlert.acknowledged || false,
      metadata: insertAlert.metadata || null,
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async acknowledgeAlert(id: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.acknowledged = true;
      this.alerts.set(id, alert);
    }
    return alert;
  }

  async getUnacknowledgedAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getLatestSystemMetrics(): Promise<SystemMetrics | undefined> {
    const metrics = Array.from(this.systemMetrics.values());
    if (metrics.length === 0) return undefined;
    
    return metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }

  async createSystemMetrics(insertMetrics: InsertSystemMetrics): Promise<SystemMetrics> {
    const id = randomUUID();
    const metrics: SystemMetrics = {
      ...insertMetrics,
      id,
      timestamp: new Date(),
    };
    this.systemMetrics.set(id, metrics);
    return metrics;
  }

  async getSystemMetricsHistory(limit = 100): Promise<SystemMetrics[]> {
    return Array.from(this.systemMetrics.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getMlModelConfig(): Promise<MlModelConfig | undefined> {
    return this.mlModelConfig;
  }

  async updateMlModelConfig(config: Partial<InsertMlModelConfig>): Promise<MlModelConfig> {
    if (!this.mlModelConfig) {
      throw new Error("ML Model config not initialized");
    }
    
    this.mlModelConfig = {
      ...this.mlModelConfig,
      ...config,
      lastUpdated: new Date(),
    };
    
    return this.mlModelConfig;
  }
}

export const storage = new MemStorage();
