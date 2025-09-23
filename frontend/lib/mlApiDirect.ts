/**
 * ML API Service
 * Direct communication with the Python ML service
 */

import { processAnomalyData, AnomalyData } from './anomalyUtils';

const ML_API_BASE_URL = process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8001';

export interface ForecastParams {
  equipment_type?: string;
  site_id?: string;
  days_ahead: number;
}

export interface AnomalyParams {
  equipment_id?: string;
}

/**
 * Get demand forecast from ML service
 */
export async function getDemandForecast(params: ForecastParams) {
  try {
    const response = await fetch(`${ML_API_BASE_URL}/ml/demand-forecast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching forecast from ML service:', error);
    throw error;
  }
}

/**
 * Get anomaly detection from ML service
 */
export async function getAnomalyDetection(params?: AnomalyParams) {
  try {
    console.log('Fetching anomaly detection data from ML service...');
    const endpointUrl = `${ML_API_BASE_URL}/ml/anomaly-detection`;
    console.log('Using endpoint:', endpointUrl);
    
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params || {}),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Get raw data from API
    const rawData = await response.json();
    console.log('Raw anomaly data structure:', JSON.stringify(rawData, null, 2).substring(0, 200) + '...');
    
    if (!rawData || (Array.isArray(rawData.anomalies) && rawData.anomalies.length === 0)) {
      console.warn('No anomaly data returned from ML service');
      return {
        summary: {
          total_anomalies: 0,
          total_records: 0,
          anomaly_types: {
            high_idle_time: 0,
            low_utilization: 0
          }
        },
        anomalies: []
      };
    }
    
    // Process data using our utility function
    const processedData = processAnomalyData(rawData as AnomalyData);
    console.log(`Processed ${processedData.anomalies?.length || 0} anomalies`);
    
    return processedData;
  } catch (error) {
    console.error('Error fetching anomaly detection from ML service:', error);
    throw error;
  }
}

/**
 * Get equipment statistics from ML service
 */
export async function getEquipmentStats() {
  try {
    const response = await fetch(`${ML_API_BASE_URL}/ml/equipment-stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching equipment stats from ML service:', error);
    throw error;
  }
}

/**
 * Get ML service health status
 */
export async function getMLServiceHealth() {
  try {
    const response = await fetch(`${ML_API_BASE_URL}/ml/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return { status: 'unhealthy', ml_system_available: false };
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking ML service health:', error);
    return { status: 'unhealthy', ml_system_available: false, error: String(error) };
  }
}