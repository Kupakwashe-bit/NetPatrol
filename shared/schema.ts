import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const networkTraffic = pgTable("network_traffic", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  sourceIp: text("source_ip").notNull(),
  destinationIp: text("destination_ip").notNull(),
  protocol: text("protocol").notNull(),
  sourcePort: integer("source_port"),
  destinationPort: integer("destination_port"),
  bytes: integer("bytes").notNull(),
  packets: integer("packets").notNull(),
  riskScore: real("risk_score").notNull().default(0),
  isAnomaly: boolean("is_anomaly").notNull().default(false),
  status: text("status").notNull().default("ALLOWED"), // ALLOWED, BLOCKED, FLAGGED
  metadata: jsonb("metadata"),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  type: text("type").notNull(), // CRITICAL, WARNING, INFO
  title: text("title").notNull(),
  description: text("description").notNull(),
  sourceIp: text("source_ip"),
  relatedTrafficId: varchar("related_traffic_id").references(() => networkTraffic.id),
  acknowledged: boolean("acknowledged").notNull().default(false),
  metadata: jsonb("metadata"),
});

export const systemMetrics = pgTable("system_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  trafficVolume: real("traffic_volume").notNull(), // GB/s
  activeConnections: integer("active_connections").notNull(),
  threatsBlocked: integer("threats_blocked").notNull(),
  modelAccuracy: real("model_accuracy").notNull(),
  cpuUsage: real("cpu_usage").notNull(),
  memoryUsage: real("memory_usage").notNull(),
});

export const mlModelConfig = pgTable("ml_model_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  detectionThreshold: real("detection_threshold").notNull().default(0.75),
  updateFrequency: text("update_frequency").notNull().default("real-time"),
  dataRetentionPeriod: text("data_retention_period").notNull().default("7days"),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertNetworkTrafficSchema = createInsertSchema(networkTraffic).omit({
  id: true,
  timestamp: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  timestamp: true,
});

export const insertSystemMetricsSchema = createInsertSchema(systemMetrics).omit({
  id: true,
  timestamp: true,
});

export const insertMlModelConfigSchema = createInsertSchema(mlModelConfig).omit({
  id: true,
  lastUpdated: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertNetworkTraffic = z.infer<typeof insertNetworkTrafficSchema>;
export type NetworkTraffic = typeof networkTraffic.$inferSelect;

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export type InsertSystemMetrics = z.infer<typeof insertSystemMetricsSchema>;
export type SystemMetrics = typeof systemMetrics.$inferSelect;

export type InsertMlModelConfig = z.infer<typeof insertMlModelConfigSchema>;
export type MlModelConfig = typeof mlModelConfig.$inferSelect;
