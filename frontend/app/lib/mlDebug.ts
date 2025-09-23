/**
 * Debug utilities for ML API interactions
 * This file provides functions to debug ML API responses
 */

// Define the ML API base URL
const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8001';

/**
 * Debug function to fetch and log raw anomaly detection data
 * @returns Raw anomaly data from the ML API
 */
export async function debugAnomalyData() {
  try {
    console.log('Fetching anomaly data from ML API for debugging...');
    const response = await fetch(`${ML_API_URL}/ml/anomaly-detection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      console.error(`ML API error: ${response.status}`);
      return null;
    }
    
    const rawData = await response.json();
    
    // Log the raw data structure
    console.log('Raw anomaly data:', JSON.stringify(rawData, null, 2));
    
    // Log anomaly array if it exists
    if (rawData.anomalies && Array.isArray(rawData.anomalies)) {
      console.log(`Found ${rawData.anomalies.length} anomaly records`);
      
      // Log the first anomaly record in detail if it exists
      if (rawData.anomalies.length > 0) {
        console.log('First anomaly record:', JSON.stringify(rawData.anomalies[0], null, 2));
        
        // Extract and log key metrics
        const firstRecord = rawData.anomalies[0];
        console.log('Key metrics from first record:');
        console.log('- Equipment ID:', firstRecord.equipment_id);
        console.log('- Engine Hours:', firstRecord.engine_hours || firstRecord.engine_hours_per_day);
        console.log('- Idle Hours:', firstRecord.idle_hours || firstRecord.idle_hours_per_day);
        console.log('- Utilization:', firstRecord.utilization_ratio);
        console.log('- Alert Type:', firstRecord.alert_type);
        console.log('- Severity:', firstRecord.severity);
      }
    } else {
      console.log('No anomalies array found in response');
    }
    
    return rawData;
  } catch (error) {
    console.error('Error debugging anomaly data:', error);
    return null;
  }
}

/**
 * Debug function to fetch and log raw demand forecast data
 * @returns Raw demand forecast data from the ML API
 */
export async function debugDemandForecastData() {
  try {
    console.log('Fetching demand forecast data from ML API for debugging...');
    const response = await fetch(`${ML_API_URL}/ml/demand-forecast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ days_ahead: 7 })
    });
    
    if (!response.ok) {
      console.error(`ML API error: ${response.status}`);
      return null;
    }
    
    const rawData = await response.json();
    
    // Log the raw data structure
    console.log('Raw demand forecast data:', JSON.stringify(rawData, null, 2));
    
    return rawData;
  } catch (error) {
    console.error('Error debugging demand forecast data:', error);
    return null;
  }
}

/**
 * Debug function to fetch and log raw equipment statistics data
 * @returns Raw equipment statistics data from the ML API
 */
export async function debugEquipmentStatsData() {
  try {
    console.log('Fetching equipment stats data from ML API for debugging...');
    const response = await fetch(`${ML_API_URL}/ml/equipment-stats`);
    
    if (!response.ok) {
      console.error(`ML API error: ${response.status}`);
      return null;
    }
    
    const rawData = await response.json();
    
    // Log the raw data structure
    console.log('Raw equipment stats data:', JSON.stringify(rawData, null, 2));
    
    return rawData;
  } catch (error) {
    console.error('Error debugging equipment stats data:', error);
    return null;
  }
}