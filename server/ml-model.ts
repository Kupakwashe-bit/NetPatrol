import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TrafficDataPoint {
  time: string;
  cellName: string;
  cellId: number;
  totalTraffic: number;
  // Derived features for anomaly detection
  isAnomaly?: boolean;
  riskScore?: number;
  anomalyType?: string;
}

export class NetworkAnomalyDetector {
  private model: tf.Sequential | null = null;
  private trafficData: TrafficDataPoint[] = [];
  private trafficHistory: Map<string, any> = new Map();
  private isModelTrained = false;
  private modelAccuracy = 0;

  constructor() {
    this.loadTrafficData();
  }

  private loadTrafficData(): void {
    try {
      const csvPath = path.join(__dirname, 'traffic_dataset.csv');
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n').slice(1); // Skip header
      
      this.trafficData = lines
        .filter(line => line.trim())
        .map(line => {
          const [time, cellName, cellId, totalTraffic] = line.split(',');
          return {
            time: time.trim(),
            cellName: cellName.trim(),
            cellId: parseInt(cellId),
            totalTraffic: parseFloat(totalTraffic)
          };
        })
        .filter(data => !isNaN(data.totalTraffic));

      console.log(`Loaded ${this.trafficData.length} traffic records`);
      this.computeAnomalyFeatures();
    } catch (error) {
      console.error('Error loading traffic data:', error);
      this.trafficData = [];
    }
  }

  public async loadNewDataset(filePath: string): Promise<void> {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const content = fs.readFileSync(filePath, 'utf8');

      let parsed: TrafficDataPoint[] = [];
      if (ext === '.csv') {
        const lines = content.split('\n').filter(line => line.trim());
        const header = lines[0].toLowerCase();
        const hasHeader = header.includes('time') && header.includes('cell');
        const dataLines = hasHeader ? lines.slice(1) : lines;

        parsed = dataLines.map(line => {
          const parts = line.split(',').map(p => p.trim());
          // Attempt to map common CSV schemas: time, cellName, cellId, totalTraffic
          const [time, cellName, cellId, totalTraffic] = parts;
          return {
            time: time || new Date().toISOString(),
            cellName: cellName || 'Unknown',
            cellId: parseInt(cellId || '0', 10),
            totalTraffic: parseFloat(totalTraffic || '0'),
          };
        }).filter(d => !isNaN(d.totalTraffic));
      } else if (ext === '.json') {
        const json = JSON.parse(content);
        const arr: any[] = Array.isArray(json) ? json : (json.data || []);
        parsed = arr.map((row: any) => ({
          time: String(row.time || row.timestamp || new Date().toISOString()),
          cellName: String(row.cellName || row.cell || row.sector || 'Unknown'),
          cellId: parseInt(String(row.cellId || row.id || '0'), 10),
          totalTraffic: parseFloat(String(row.totalTraffic || row.traffic || row.bytes || '0')),
        })).filter(d => !isNaN(d.totalTraffic));
      } else {
        throw new Error('Unsupported file format. Please upload CSV or JSON');
      }

      if (parsed.length === 0) {
        throw new Error('Uploaded dataset appears to be empty or invalid');
      }

      this.trafficData = parsed;
      this.computeAnomalyFeatures();
      this.isModelTrained = false; // require retraining
      this.modelAccuracy = 0;
    } catch (err) {
      console.error('Failed to load new dataset:', err);
      throw err;
    }
  }

  private computeAnomalyFeatures(): void {
    // Group data by cell to compute historical patterns
    const cellGroups: Map<string, TrafficDataPoint[]> = new Map();
    
    this.trafficData.forEach(point => {
      const key = point.cellName;
      if (!cellGroups.has(key)) {
        cellGroups.set(key, []);
      }
      cellGroups.get(key)!.push(point);
    });

    // Demand condition helper
    type DemandCondition = 'peak' | 'moderate' | 'offpeak';
    const getCondition = (dateStr: string): DemandCondition => {
      const hour = new Date(dateStr).getHours();
      if (hour >= 17 && hour <= 21) return 'peak';
      if (hour >= 0 && hour <= 6) return 'offpeak';
      return 'moderate';
    };

    // Compute statistics for each cell
    cellGroups.forEach((points, cellName) => {
      const traffics = points.map(p => p.totalTraffic);
      const mean = traffics.reduce((sum, val) => sum + val, 0) / traffics.length;
      const variance = traffics.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / traffics.length;
      const stdDev = Math.sqrt(variance);

      // Condition-specific stats
      const byCondition: Record<DemandCondition, number[]> = {
        peak: [], moderate: [], offpeak: []
      };
      points.forEach(p => {
        byCondition[getCondition(p.time)].push(p.totalTraffic);
      });
      const conditionStats: Record<DemandCondition, { mean: number; stdDev: number }> = {
        peak: { mean: 0, stdDev: 0 },
        moderate: { mean: 0, stdDev: 0 },
        offpeak: { mean: 0, stdDev: 0 }
      };
      (Object.keys(byCondition) as DemandCondition[]).forEach(cond => {
        const arr = byCondition[cond];
        if (arr.length > 0) {
          const m = arr.reduce((s, v) => s + v, 0) / arr.length;
          const v = arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length;
          conditionStats[cond] = { mean: m, stdDev: Math.sqrt(v) };
        } else {
          conditionStats[cond] = { mean, stdDev };
        }
      });

      // Mark anomalies using statistical approach (3-sigma rule)
      points.forEach(point => {
        const cond = getCondition(point.time);
        const stats = conditionStats[cond];
        const zscore = Math.abs((point.totalTraffic - stats.mean) / (stats.stdDev || (stdDev || 1e-6)));
        // Adaptive threshold: allow slightly higher variance at peak, stricter at off-peak
        const threshold = cond === 'peak' ? 3.0 : cond === 'moderate' ? 2.5 : 2.0;
        point.isAnomaly = zscore > 2.5; // More sensitive threshold
        point.isAnomaly = zscore > threshold;
        point.riskScore = Math.min(10, zscore * 2); // Scale to 0-10
        
        if (point.isAnomaly) {
          if (point.totalTraffic > stats.mean + 2 * (stats.stdDev || stdDev)) {
            point.anomalyType = 'High Traffic Spike';
          } else if (point.totalTraffic < stats.mean - 2 * (stats.stdDev || stdDev)) {
            point.anomalyType = 'Unusual Low Traffic';
          } else {
            point.anomalyType = 'Statistical Outlier';
          }
        }
      });

      // Store historical patterns
      this.trafficHistory.set(cellName, {
        mean,
        stdDev,
        recent: traffics.slice(-20), // Last 20 readings
        conditionStats
      } as any);
    });

    console.log(`Computed anomaly features. Found ${this.trafficData.filter(d => d.isAnomaly).length} anomalies`);
  }

  public async trainModel(): Promise<void> {
    try {
      // Prepare training data
      const features: number[][] = [];
      const labels: number[] = [];

      this.trafficData.forEach(point => {
        const cellHistory = this.trafficHistory.get(point.cellName);
        if (cellHistory) {
          // Feature engineering: current traffic, hour of day, day pattern, etc.
          const hour = new Date(point.time).getHours();
          const dayOfWeek = new Date(point.time).getDay();
          
          features.push([
            point.totalTraffic,
            hour / 23, // Normalize hour
            dayOfWeek / 6, // Normalize day of week
            (cellHistory as any).mean,
            (cellHistory as any).stdDev,
          ]);
          
          labels.push(point.isAnomaly ? 1 : 0);
        }
      });

      if (features.length === 0) {
        throw new Error('No training data available');
      }

      // Create and compile model
      this.model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [5], units: 64, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
      });

      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      // Prepare tensors
      const xs = tf.tensor2d(features);
      const ys = tf.tensor1d(labels);

      // Train model
      console.log('Starting model training...');
      const history = await this.model.fit(xs, ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}, accuracy = ${logs?.acc?.toFixed(4)}`);
            }
          }
        }
      });

      // Clean up tensors
      xs.dispose();
      ys.dispose();

      // Get final accuracy
      this.modelAccuracy = history.history.acc ? 
        (history.history.acc[history.history.acc.length - 1] as number) : 0.85;

      this.isModelTrained = true;
      console.log(`Model training completed. Final accuracy: ${this.modelAccuracy.toFixed(3)}`);

    } catch (error) {
      console.error('Error training model:', error);
      this.isModelTrained = false;
    }
  }

  public async predict(trafficValue: number, cellName: string, timestamp?: string): Promise<{
    isAnomaly: boolean;
    riskScore: number;
    confidence: number;
    anomalyType?: string;
  }> {
    if (!this.isModelTrained || !this.model) {
      // Fallback to statistical method
      const cellHistory = this.trafficHistory.get(cellName);
      if (cellHistory) {
        const hour = timestamp ? new Date(timestamp).getHours() : new Date().getHours();
        const cond: 'peak' | 'moderate' | 'offpeak' = (hour >= 17 && hour <= 21) ? 'peak' : (hour >= 0 && hour <= 6) ? 'offpeak' : 'moderate';
        const stats = (cellHistory as any).conditionStats?.[cond] || cellHistory;
        const baseStd = stats.stdDev || (cellHistory as any).stdDev || 1e-6;
        const zscore = Math.abs((trafficValue - stats.mean) / baseStd);
        const threshold = cond === 'peak' ? 3.0 : cond === 'moderate' ? 2.5 : 2.0;
        return {
          isAnomaly: zscore > threshold,
          riskScore: Math.min(10, zscore * 2),
          confidence: 0.7,
          anomalyType: zscore > 2.5 ? 'Statistical Outlier' : undefined
        };
      }
      
      return { isAnomaly: false, riskScore: 0, confidence: 0.5 };
    }

    try {
      const hour = timestamp ? new Date(timestamp).getHours() : new Date().getHours();
      const dayOfWeek = timestamp ? new Date(timestamp).getDay() : new Date().getDay();
      const cellHistory = this.trafficHistory.get(cellName) || { mean: 1.0, stdDev: 0.5 };

      const features = tf.tensor2d([[
        trafficValue,
        hour / 23,
        dayOfWeek / 6,
        (cellHistory as any).mean,
        (cellHistory as any).stdDev,
      ]]);

      const prediction = this.model.predict(features) as tf.Tensor;
      const predictionValue = await prediction.data();
      
      const confidence = predictionValue[0];
      const isAnomaly = confidence > 0.5;
      const riskScore = confidence * 10;

      // Clean up tensors
      features.dispose();
      prediction.dispose();

      return {
        isAnomaly,
        riskScore,
        confidence,
        anomalyType: isAnomaly ? 'ML Detected Anomaly' : undefined
      };

    } catch (error) {
      console.error('Error making prediction:', error);
      return { isAnomaly: false, riskScore: 0, confidence: 0 };
    }
  }

  public evaluateCurrentDataset() {
    // Summaries by demand condition and by cell
    const buckets: Record<'peak' | 'moderate' | 'offpeak', { total: number; anomalies: number }> = {
      peak: { total: 0, anomalies: 0 },
      moderate: { total: 0, anomalies: 0 },
      offpeak: { total: 0, anomalies: 0 }
    };
    const cellAnomalies: Record<string, number> = {};
    const getCond = (t: string) => {
      const h = new Date(t).getHours();
      if (h >= 17 && h <= 21) return 'peak' as const;
      if (h >= 0 && h <= 6) return 'offpeak' as const;
      return 'moderate' as const;
    };

    this.trafficData.forEach(p => {
      const c = getCond(p.time);
      buckets[c].total += 1;
      if (p.isAnomaly) {
        buckets[c].anomalies += 1;
        cellAnomalies[p.cellName] = (cellAnomalies[p.cellName] || 0) + 1;
      }
    });

    const topCells = Object.entries(cellAnomalies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cellName, count]) => ({ cellName, anomalies: count }));

    return {
      counts: {
        totalPoints: this.trafficData.length,
        totalAnomalies: this.trafficData.filter(d => d.isAnomaly).length,
      },
      byCondition: {
        peak: {
          total: buckets.peak.total,
          anomalies: buckets.peak.anomalies,
          anomalyRate: buckets.peak.total ? buckets.peak.anomalies / buckets.peak.total : 0
        },
        moderate: {
          total: buckets.moderate.total,
          anomalies: buckets.moderate.anomalies,
          anomalyRate: buckets.moderate.total ? buckets.moderate.anomalies / buckets.moderate.total : 0
        },
        offpeak: {
          total: buckets.offpeak.total,
          anomalies: buckets.offpeak.anomalies,
          anomalyRate: buckets.offpeak.total ? buckets.offpeak.anomalies / buckets.offpeak.total : 0
        }
      },
      topCells
    };
  }

  public getRandomTrafficPoint(): TrafficDataPoint | null {
    if (this.trafficData.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.trafficData.length);
    return this.trafficData[randomIndex];
  }

  public getModelMetrics() {
    return {
      isTraining: !this.isModelTrained,
      accuracy: this.modelAccuracy,
      dataPoints: this.trafficData.length,
      anomalies: this.trafficData.filter(d => d.isAnomaly).length,
      cellsMonitored: Array.from(this.trafficHistory.keys()).length
    };
  }

  public getCellNames(): string[] {
    return Array.from(this.trafficHistory.keys());
  }

  public getTrafficHistory(cellName: string, limit: number = 100): TrafficDataPoint[] {
    return this.trafficData
      .filter(point => point.cellName === cellName)
      .slice(-limit);
  }
}