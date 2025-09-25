'use client'

import { useState, useEffect } from 'react'
import { getAnomalyDetection, getMLServiceHealth } from '../../lib/mlApiDirect'
import { debugAnomalyData } from '../../lib/mlDebug'

import { Anomaly, AnomalyData } from '../../lib/anomalyUtils'

export default function AnomalyAlerts() {
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [serviceAvailable, setServiceAvailable] = useState(true)
  const [databaseChangeNotification, setDatabaseChangeNotification] = useState<string | null>(null)
  const [lastDatabaseChange, setLastDatabaseChange] = useState<string | null>(null)

  useEffect(() => {
    checkServiceHealth()
    loadAnomalyData()
    
    let interval: NodeJS.Timeout | null = null
    
    // Start checking for database changes after initial load
    const startMonitoring = setTimeout(() => {
      checkDatabaseStatus()
      
      // Set up polling for database changes (less frequent to reduce overhead)
      interval = setInterval(() => {
        checkDatabaseStatus()
      }, 10000) // Check every 10 seconds
    }, 5000) // Wait 5 seconds before starting to monitor for changes
    
    return () => {
      clearTimeout(startMonitoring)
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [])

  const checkServiceHealth = async () => {
    try {
      const health = await getMLServiceHealth()
      setServiceAvailable(health.status === 'healthy' && health.ml_system_available)
    } catch (err) {
      console.error('ML service health check failed:', err)
      setServiceAvailable(false)
    }
  }

  const checkDatabaseStatus = async () => {
    try {
      const response = await fetch('http://localhost:8001/ml/database-status')
      if (response.ok) {
        const dbStatus = await response.json()
        
        // Only show notification if there's a genuinely new database change that's recent
        if (dbStatus.last_change && 
            dbStatus.last_change !== lastDatabaseChange && 
            !databaseChangeNotification) { // Don't show if already showing a notification
          
          // Check if the change was recent (within last 2 minutes)
          const changeTime = new Date(dbStatus.last_change)
          const now = new Date()
          const timeDiff = now.getTime() - changeTime.getTime()
          const twoMinutesInMs = 2 * 60 * 1000
          
          if (timeDiff <= twoMinutesInMs) {
            setLastDatabaseChange(dbStatus.last_change)
            const timeString = changeTime.toLocaleTimeString()
            setDatabaseChangeNotification(`Database updated at ${timeString} - ML system reloaded`)
            
            // Clear notification after 5 seconds
            setTimeout(() => {
              setDatabaseChangeNotification(null)
            }, 5000)
            
            // Reload anomaly data to show updated results
            setTimeout(() => {
              loadAnomalyData()
            }, 1500)
          } else {
            // Just update the last change without showing notification for old changes
            setLastDatabaseChange(dbStatus.last_change)
          }
        }
      }
    } catch (err) {
      console.error('Database status check failed:', err)
    }
  }

  // Process ML data to identify anomalies
  const processAndIdentifyAnomalies = (rawData: any): AnomalyData => {
    // Make sure data structure exists
    const anomalies = Array.isArray(rawData.anomalies) ? rawData.anomalies : [];
    
    // Track anomaly counts by counting existing alert types
    const anomalyCounts = {
      high_idle_time: 0,
      low_utilization: 0,
      no_usage: 0,
      overdue: 0
    };
    
    // Process each equipment record to format anomaly data
    const processedAnomalies = anomalies.map(anomaly => {
      // Use the alert_type provided by the ML service
      const alertType = anomaly.alert_type || 'unknown';
      const severity = anomaly.severity || 'medium';
      
      // Count this anomaly type
      if (anomalyCounts.hasOwnProperty(alertType)) {
        anomalyCounts[alertType]++;
      }
      
      // Try to parse numerical values
      const engineHours = parseFloat(anomaly.engine_hours) || parseFloat(anomaly.engine_hours_per_day) || 0;
      const idleHours = parseFloat(anomaly.idle_hours) || parseFloat(anomaly.idle_hours_per_day) || 0;
      
      // Use utilization from ML service
      const utilization = anomaly.utilization || anomaly.utilization_ratio;
      
      return {
        equipment_id: anomaly.equipment_id || 'Unknown',
        type: anomaly.type || anomaly.equipment_type || 'Equipment',
        alert_type: alertType,
        severity: severity,
        anomaly_score: anomaly.anomaly_score || 0,
        site_id: anomaly.site_id || 'UNASSIGNED',
        engine_hours_per_day: engineHours || 'N/A',
        idle_hours_per_day: idleHours || 'N/A',
        utilization_ratio: utilization,
        check_out_date: anomaly.check_out_date || 'N/A',
        check_in_date: anomaly.check_in_date || 'N/A'
      };
    }).filter(anomaly => anomaly.alert_type !== 'unknown'); // Filter out unknown anomalies
    
    // Return processed data with proper counts
    return {
      summary: {
        total_anomalies: processedAnomalies.length,
        total_records: rawData.summary?.total_records || rawData.total_records || 0,
        anomaly_types: anomalyCounts
      },
      anomalies: processedAnomalies
    };
  };

  const loadAnomalyData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try to use the ML API directly
      try {
        // Check if ML service is available first
        await checkServiceHealth()
        
        if (serviceAvailable) {
          // Debug the raw data first
          const rawData = await debugAnomalyData();
          
          if (rawData) {
            // Process the data to identify anomalies
            const processedData = processAndIdentifyAnomalies(rawData);
            setAnomalyData(processedData as any);
            return;
          }
          
          // If debug fails, try normal method
          const data = await getAnomalyDetection();
          setAnomalyData(data as any);
          return;
        }
      } catch (mlError) {
        console.error('Error using direct ML API:', mlError)
        // If ML service fails, fall back to Node.js backend
      }
      
      // Fallback to Node.js backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://cat-v7yf.onrender.com'}/dashboard`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setAnomalyData(data.anomalies)
    } catch (err) {
      console.error('Error loading anomaly data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load anomaly data')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string | undefined) => {
    if (!severity) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityBadgeColor = (severity: string | undefined) => {
    if (!severity) return 'bg-gray-500 text-white';
    
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-red-500 text-white'
      case 'medium':
        return 'bg-yellow-500 text-white'
      case 'low':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getAnomalyTypeLabel = (type: string | undefined) => {
    if (!type) return 'Unknown'
    
    switch (type) {
      case 'high_idle_time':
        return 'High Idle Time'
      case 'low_utilization':
        return 'Low Utilization'
      case 'high_usage':
        return 'High Usage'
      case 'overdue':
        return 'Overdue'
      default:
        try {
          return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        } catch (e) {
          return 'Unknown'
        }
    }
  }

  const getAnomalyIcon = (type: string | undefined) => {
    if (!type) return '❓'
    
    switch (type) {
      case 'high_idle_time':
        return '⏰'
      case 'low_utilization':
        return '📉'
      case 'high_usage':
        return '🔥'
      case 'overdue':
        return '⏰'
      default:
        return '⚠️'
    }
  }

  const totalPages = anomalyData ? Math.ceil(anomalyData.anomalies.length / 2) : 0
  const startIndex = currentPage * 2
  const endIndex = startIndex + 2
  const currentAnomalies = anomalyData ? anomalyData.anomalies.slice(startIndex, endIndex) : []

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Anomaly Detection Alerts</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Anomaly Detection Alerts</h3>
        <div className="text-red-600 bg-red-50 p-4 rounded-lg">
          <p className="font-medium">Error loading anomaly data</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={loadAnomalyData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!anomalyData) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Anomaly Detection Alerts</h3>
        <div className="text-gray-600 bg-gray-50 p-4 rounded-lg">
          <p className="font-medium">No Anomalies Detected</p>
          <p className="text-sm mt-1">
            The anomaly detection system is currently unavailable. This could be due to:
          </p>
          <ul className="text-sm mt-2 list-disc list-inside space-y-1">
            <li>Backend server not running</li>
            <li>CSV data file not accessible</li>
            <li>ML models not loaded properly</li>
          </ul>
          <button 
            onClick={loadAnomalyData}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Refresh Data
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Database Change Notification */}
      {databaseChangeNotification && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{databaseChangeNotification}</span>
          <button 
            onClick={() => setDatabaseChangeNotification(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Anomaly Detection Alerts</h3>
        <button 
          onClick={loadAnomalyData}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 p-3 rounded-lg">
          <p className="text-sm text-red-600 font-medium">Total Anomalies</p>
          <p className="text-2xl font-bold text-red-800">{anomalyData.summary?.total_anomalies || 0}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total Records</p>
          <p className="text-2xl font-bold text-blue-800">{anomalyData.summary?.total_records || 0}</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <p className="text-sm text-yellow-600 font-medium">High Idle Time</p>
          <p className="text-2xl font-bold text-yellow-800">{anomalyData.summary?.anomaly_types?.high_idle_time || 0}</p>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg">
          <p className="text-sm text-orange-600 font-medium">Low Utilization</p>
          <p className="text-2xl font-bold text-orange-800">{anomalyData.summary?.anomaly_types?.low_utilization || 0}</p>
        </div>
      </div>

      {/* Anomaly Carousel */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-gray-700">Detected Anomalies</h4>
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 0}
                className={`p-2 rounded-full ${
                  currentPage === 0 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                ←
              </button>
              <span className="text-sm text-gray-600">
                {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages - 1}
                className={`p-2 rounded-full ${
                  currentPage === totalPages - 1 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                →
              </button>
            </div>
          )}
        </div>

        {anomalyData.anomalies.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
            <p className="text-sm text-gray-600">No anomalies detected in your equipment data.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentAnomalies.map((anomaly, index) => (
              <div key={startIndex + index} className={`border rounded-lg p-4 ${getSeverityColor(anomaly.severity)} hover:shadow-md transition-shadow`}>
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getAnomalyIcon(anomaly.alert_type)}</span>
                    <div>
                      <h5 className="font-semibold text-gray-800">{anomaly.equipment_id}</h5>
                      <p className="text-sm text-gray-600 capitalize">{anomaly.type}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityBadgeColor(anomaly.severity)}`}>
                    {anomaly.severity?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
                
                {/* Anomaly Type */}
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700">Issue Type</p>
                  <p className="text-lg font-semibold text-gray-800">{getAnomalyTypeLabel(anomaly.alert_type)}</p>
                </div>
                
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white bg-opacity-50 p-2 rounded">
                    <p className="text-xs text-gray-600 font-medium">Engine Hours</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {typeof anomaly.engine_hours_per_day === 'number'
                        ? anomaly.engine_hours_per_day.toFixed(1)
                        : anomaly.engine_hours_per_day || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-50 p-2 rounded">
                    <p className="text-xs text-gray-600 font-medium">Idle Hours</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {typeof anomaly.idle_hours_per_day === 'number'
                        ? anomaly.idle_hours_per_day.toFixed(1)
                        : anomaly.idle_hours_per_day || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-50 p-2 rounded">
                    <p className="text-xs text-gray-600 font-medium">Utilization</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {anomaly.utilization_ratio !== undefined && !isNaN(anomaly.utilization_ratio) 
                        ? `${(anomaly.utilization_ratio * 100).toFixed(1)}%` 
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-50 p-2 rounded">
                    <p className="text-xs text-gray-600 font-medium">Site</p>
                    <p className="text-sm font-semibold text-gray-800">{anomaly.site_id || 'UNASSIGNED'}</p>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="text-xs text-gray-500 border-t pt-2">
                  <p>Check-out: {anomaly.check_out_date || 'N/A'} | Check-in: {anomaly.check_in_date || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
