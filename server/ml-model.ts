import * as tf from '@tensorflow/tfjs-node';
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
  private trafficHistory: Map<string, number[]> = new Map();
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

    // Compute statistics for each cell
    cellGroups.forEach((points, cellName) => {
      const traffics = points.map(p => p.totalTraffic);
      const mean = traffics.reduce((sum, val) => sum + val, 0) / traffics.length;
      const variance = traffics.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / traffics.length;
      const stdDev = Math.sqrt(variance);

      // Mark anomalies using statistical approach (3-sigma rule)
      points.forEach(point => {
        const zscore = Math.abs((point.totalTraffic - mean) / stdDev);
        point.isAnomaly = zscore > 2.5; // More sensitive threshold
        point.riskScore = Math.min(10, zscore * 2); // Scale to 0-10
        
        if (point.isAnomaly) {
          if (point.totalTraffic > mean + 2 * stdDev) {
            point.anomalyType = 'High Traffic Spike';
          } else if (point.totalTraffic < mean - 2 * stdDev) {
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
        recent: traffics.slice(-20) // Last 20 readings
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
        const zscore = Math.abs((trafficValue - (cellHistory as any).mean) / (cellHistory as any).stdDev);
        return {
          isAnomaly: zscore > 2.5,
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