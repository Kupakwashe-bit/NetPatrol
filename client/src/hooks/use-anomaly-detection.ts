import { useState, useEffect } from "react";
import { loadAnomalyModel, predictAnomaly } from "@/lib/tensorflow-utils";
import type { NetworkTraffic } from "@shared/schema";

export function useAnomalyDetection() {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    const initializeModel = async () => {
      try {
        await loadAnomalyModel();
        setIsModelLoaded(true);
        console.log("Anomaly detection model loaded successfully");
      } catch (error) {
        console.error("Failed to load anomaly detection model:", error);
        setModelError("Failed to load ML model");
      }
    };

    initializeModel();
  }, []);

  const detectAnomaly = async (traffic: NetworkTraffic): Promise<{
    isAnomaly: boolean;
    confidence: number;
    riskScore: number;
  }> => {
    if (!isModelLoaded) {
      // Fallback to rule-based detection if model not loaded
      return ruleBasedDetection(traffic);
    }

    try {
      const prediction = await predictAnomaly(traffic);
      return prediction;
    } catch (error) {
      console.error("Anomaly prediction failed:", error);
      // Fallback to rule-based detection
      return ruleBasedDetection(traffic);
    }
  };

  const ruleBasedDetection = (traffic: NetworkTraffic): {
    isAnomaly: boolean;
    confidence: number;
    riskScore: number;
  } => {
    let riskScore = 0;
    let anomalyFactors = 0;

    // Check for unusual port combinations
    if (traffic.destinationPort && [22, 23, 135, 445, 1433, 3389].includes(traffic.destinationPort)) {
      riskScore += 2;
      anomalyFactors++;
    }

    // Check for large data transfers
    if (traffic.bytes > 100000) {
      riskScore += 1.5;
      anomalyFactors++;
    }

    // Check for unusual protocols
    if (!['TCP', 'UDP', 'HTTP', 'HTTPS'].includes(traffic.protocol)) {
      riskScore += 1;
      anomalyFactors++;
    }

    // Check for suspicious IP patterns
    if (traffic.sourceIp.startsWith('10.') || traffic.sourceIp.startsWith('169.254.')) {
      riskScore += 0.5;
    }

    // Add some randomness for demonstration
    const randomFactor = Math.random() * 2;
    riskScore += randomFactor;

    const isAnomaly = riskScore > 4 || anomalyFactors >= 2;
    const confidence = Math.min(riskScore / 10, 1);

    return {
      isAnomaly,
      confidence,
      riskScore: Math.min(riskScore, 10),
    };
  };

  return {
    isModelLoaded,
    modelError,
    detectAnomaly,
  };
}
