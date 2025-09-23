/**
 * Anomaly data processing utilities
 * Helper functions for processing anomaly data from the ML API
 */

export interface Anomaly {
  equipment_id: string;
  type?: string;
  equipment_type?: string;
  alert_type?: string;
  severity?: string;
  anomaly_score?: number | string;
  site_id?: string;
  engine_hours_per_day?: number | string;
  idle_hours_per_day?: number | string;
  engine_hours?: number | string;
  idle_hours?: number | string;
  utilization_ratio?: number;
  check_out_date?: string;
  check_in_date?: string;
  overdue?: boolean;
}

export interface AnomalyData {
  summary?: {
    total_anomalies?: number;
    total_records?: number;
    anomaly_types?: {
      high_idle_time?: number;
      low_utilization?: number;
    };
  };
  anomalies?: Anomaly[];
  total_anomalies?: number;
  total_records?: number;
}

/**
 * Process raw anomaly data from API to ensure it has proper issue types and severity
 */
export function processAnomalyData(data: AnomalyData): AnomalyData {
  // Guard against invalid data
  if (!data) {
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
  
  // Ensure anomalies array exists
  const anomalies = Array.isArray(data.anomalies) ? data.anomalies : 
                   (data.total_anomalies ? [] : []);
  
  // Track anomaly types
  let highIdleCount = 0;
  let lowUtilCount = 0;
  
  // Process each anomaly to ensure it has proper issue type and severity
  const processedAnomalies = anomalies.map(anomaly => {
    // Default values
    let alertType = anomaly.alert_type || 'unknown';
    let severity = anomaly.severity || 'medium';
    
    // Check for null or undefined values and extract numerical values
    const engineHours = extractNumberValue(anomaly.engine_hours_per_day) || 
                        extractNumberValue(anomaly.engine_hours);
    
    const idleHours = extractNumberValue(anomaly.idle_hours_per_day) || 
                      extractNumberValue(anomaly.idle_hours);
    
    // Calculate utilization if not provided
    let utilRatio = anomaly.utilization_ratio;
    if (utilRatio === undefined && engineHours !== undefined && idleHours !== undefined) {
      const totalHours = engineHours + idleHours;
      if (totalHours > 0) {
        utilRatio = engineHours / totalHours;
      }
    }
    
    // High idle time check (> 6 hours)
    if (idleHours !== undefined && idleHours > 6) {
      alertType = 'high_idle_time';
      severity = 'high';
      highIdleCount++;
    }
    // Low utilization check (< 30%)
    else if (utilRatio !== undefined && utilRatio < 0.3 && 
             engineHours !== undefined && idleHours !== undefined && 
             (engineHours + idleHours > 0)) {
      alertType = 'low_utilization';
      severity = 'medium';
      lowUtilCount++;
    }
    // If no specific anomaly detected but it's in the anomalies list
    else if (alertType === 'unknown') {
      // Try to determine type based on available data
      if (idleHours !== undefined && idleHours > 0 && 
          (engineHours === undefined || engineHours === 0)) {
        alertType = 'no_usage';
        severity = 'high';
      } else if (anomaly.overdue) {
        alertType = 'overdue';
        severity = 'high';
      } else {
        alertType = 'maintenance_required';
        severity = 'medium';
      }
    }
    
    // Create processed anomaly with proper data types
    return {
      equipment_id: anomaly.equipment_id || 'Unknown',
      type: anomaly.type || anomaly.equipment_type || 'Equipment',
      alert_type: alertType,
      severity: severity,
      anomaly_score: extractNumberValue(anomaly.anomaly_score) || 0,
      site_id: anomaly.site_id || 'UNASSIGNED',
      engine_hours_per_day: engineHours,
      idle_hours_per_day: idleHours,
      utilization_ratio: utilRatio,
      check_out_date: anomaly.check_out_date || 'N/A',
      check_in_date: anomaly.check_in_date || 'N/A'
    };
  });
  
  // Calculate totals
  const totalAnomalies = processedAnomalies.length;
  const totalRecords = Math.max(
    data.total_records || 0,
    data.summary?.total_records || 0,
    totalAnomalies * 2
  );
  
  // Return properly formatted data
  return {
    summary: {
      total_anomalies: totalAnomalies,
      total_records: totalRecords,
      anomaly_types: {
        high_idle_time: highIdleCount,
        low_utilization: lowUtilCount
      }
    },
    anomalies: processedAnomalies
  };
}

/**
 * Helper function to extract numerical values from various data types
 * @param value The value to convert to a number
 * @returns The numerical value or undefined if not valid
 */
function extractNumberValue(value: any): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return !isNaN(parsed) ? parsed : undefined;
  }
  
  return undefined;
}