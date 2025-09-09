import * as tf from "@tensorflow/tfjs";

let anomalyModel: tf.LayersModel | null = null;

export async function loadAnomalyModel(): Promise<void> {
  try {
    // In a real implementation, you would load a pre-trained model
    // For this demo, we'll create a simple synthetic model
    
    // Create a simple sequential model for demonstration
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [6], units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    // Compile the model
    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    // Create some synthetic training data for demonstration
    const trainingData = generateSyntheticTrainingData();
    
    // Train the model briefly (in production, you'd load a pre-trained model)
    await model.fit(trainingData.xs, trainingData.ys, {
      epochs: 5,
      batchSize: 32,
      verbose: 0
    });

    anomalyModel = model;
    console.log("Anomaly detection model initialized");
  } catch (error) {
    console.error("Failed to load anomaly detection model:", error);
    throw error;
  }
}

function generateSyntheticTrainingData() {
  const numSamples = 1000;
  const features: number[][] = [];
  const labels: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    // Generate synthetic network traffic features
    const bytes = Math.random() * 50000;
    const packets = Math.random() * 1000;
    const sourcePort = Math.random() * 65535;
    const destPort = Math.random() * 65535;
    const protocolType = Math.random(); // Simplified protocol encoding
    const timeOfDay = Math.random() * 24;

    features.push([bytes, packets, sourcePort, destPort, protocolType, timeOfDay]);
    
    // Create labels - higher chance of anomaly for certain patterns
    const isAnomaly = (
      bytes > 40000 || 
      sourcePort > 50000 || 
      destPort < 1024 ||
      (protocolType > 0.8 && bytes > 10000)
    ) ? 1 : 0;
    
    labels.push(isAnomaly);
  }

  return {
    xs: tf.tensor2d(features),
    ys: tf.tensor1d(labels)
  };
}

export async function predictAnomaly(traffic: any): Promise<{
  isAnomaly: boolean;
  confidence: number;
  riskScore: number;
}> {
  if (!anomalyModel) {
    throw new Error("Anomaly detection model not loaded");
  }

  try {
    // Prepare input features
    const features = [
      traffic.bytes || 0,
      traffic.packets || 0,
      traffic.sourcePort || 0,
      traffic.destinationPort || 0,
      encodeProtocol(traffic.protocol),
      new Date(traffic.timestamp || Date.now()).getHours()
    ];

    // Make prediction
    const inputTensor = tf.tensor2d([features]);
    const prediction = anomalyModel.predict(inputTensor) as tf.Tensor;
    const predictionData = await prediction.data();
    
    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();

    const confidence = predictionData[0];
    const isAnomaly = confidence > 0.5;
    const riskScore = confidence * 10;

    return {
      isAnomaly,
      confidence,
      riskScore
    };
  } catch (error) {
    console.error("Prediction failed:", error);
    throw error;
  }
}

function encodeProtocol(protocol: string): number {
  const protocols: { [key: string]: number } = {
    'TCP': 0.2,
    'UDP': 0.4,
    'HTTP': 0.6,
    'HTTPS': 0.8,
    'ICMP': 1.0
  };
  
  return protocols[protocol] || 0.0;
}

export async function getModelInfo() {
  if (!anomalyModel) {
    return null;
  }

  const inputShape = Array.isArray(anomalyModel.input) 
    ? anomalyModel.input[0].shape 
    : anomalyModel.input.shape;
  
  const outputShape = Array.isArray(anomalyModel.output) 
    ? anomalyModel.output[0].shape 
    : anomalyModel.output.shape;

  return {
    inputShape,
    outputShape,
    trainableParams: anomalyModel.countParams(),
    layers: anomalyModel.layers.length
  };
}
