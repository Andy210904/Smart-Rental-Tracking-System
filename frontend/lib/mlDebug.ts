/**
 * Debug utility for ML API responses
 * This script will help us understand the structure of the data
 * returned from the ML API for anomaly detection
 */

// Import required types
import { AnomalyParams } from './mlApiDirect';

const ML_API_BASE_URL = process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8001';

/**
 * Get raw anomaly detection from ML service
 */
export async function getRawAnomalyDetection(params?: AnomalyParams) {
  try {
    console.log('Fetching raw anomaly data from:', `${ML_API_BASE_URL}/ml/anomaly-detection`);
    
    const response = await fetch(`${ML_API_BASE_URL}/ml/anomaly-detection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params || {}),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Raw anomaly data structure:', data);
    
    // Check for specific anomaly entries
    if (data && data.anomalies && Array.isArray(data.anomalies) && data.anomalies.length > 0) {
      console.log('Sample anomaly entry:', data.anomalies[0]);
      
      // Check for specific fields
      data.anomalies.forEach((anomaly, index) => {
        if (index < 3) {  // Only check first 3 for brevity
          console.log(`Anomaly ${index} fields:`, {
            id: anomaly.equipment_id,
            type: anomaly.type,
            alert_type: anomaly.alert_type,
            engine_hours: anomaly.engine_hours,
            idle_hours: anomaly.idle_hours,
            engine_hours_per_day: anomaly.engine_hours_per_day,
            idle_hours_per_day: anomaly.idle_hours_per_day,
            utilization_ratio: anomaly.utilization_ratio
          });
        }
      });
    } else {
      console.log('No anomaly entries found in the data');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching raw anomaly detection from ML service:', error);
    throw error;
  }
}

/**
 * Debug function to be called from the component
 */
export async function debugAnomalyData() {
  try {
    const rawData = await getRawAnomalyDetection();
    console.log('Debug complete - check console for raw data structure');
    return rawData;
  } catch (error) {
    console.error('Debug failed:', error);
    return null;
  }
}