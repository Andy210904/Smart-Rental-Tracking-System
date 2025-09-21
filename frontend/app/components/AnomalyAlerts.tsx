'use client'

import { useState, useEffect } from 'react'

interface Anomaly {
  equipment_id: string
  type: string
  alert_type: string
  severity: string
  anomaly_score: number
  site_id: string
  engine_hours_per_day: number
  idle_hours_per_day: number
  utilization_ratio: number
  check_out_date: string
  check_in_date: string
}

interface AnomalyData {
  summary: {
    total_anomalies: number
    total_records: number
    anomaly_types: {
      high_idle_time: number
      low_utilization: number
    }
  }
  anomalies: Anomaly[]
}

export default function AnomalyAlerts() {
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    loadAnomalyData()
  }, [])

  const loadAnomalyData = async () => {
    try {
      setLoading(true)
      setError(null)
      
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

  const getSeverityColor = (severity: string) => {
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

  const getSeverityBadgeColor = (severity: string) => {
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

  const getAnomalyTypeLabel = (type: string) => {
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
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const getAnomalyIcon = (type: string) => {
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
          <p className="text-2xl font-bold text-red-800">{anomalyData.summary.total_anomalies}</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-600 font-medium">Total Records</p>
          <p className="text-2xl font-bold text-blue-800">{anomalyData.summary.total_records}</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <p className="text-sm text-yellow-600 font-medium">High Idle Time</p>
          <p className="text-2xl font-bold text-yellow-800">{anomalyData.summary.anomaly_types.high_idle_time}</p>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg">
          <p className="text-sm text-orange-600 font-medium">Low Utilization</p>
          <p className="text-2xl font-bold text-orange-800">{anomalyData.summary.anomaly_types.low_utilization}</p>
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
                    {anomaly.severity.toUpperCase()}
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
                    <p className="text-sm font-semibold text-gray-800">{anomaly.engine_hours_per_day}</p>
                  </div>
                  <div className="bg-white bg-opacity-50 p-2 rounded">
                    <p className="text-xs text-gray-600 font-medium">Idle Hours</p>
                    <p className="text-sm font-semibold text-gray-800">{anomaly.idle_hours_per_day}</p>
                  </div>
                  <div className="bg-white bg-opacity-50 p-2 rounded">
                    <p className="text-xs text-gray-600 font-medium">Utilization</p>
                    <p className="text-sm font-semibold text-gray-800">{(anomaly.utilization_ratio * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-white bg-opacity-50 p-2 rounded">
                    <p className="text-xs text-gray-600 font-medium">Site</p>
                    <p className="text-sm font-semibold text-gray-800">{anomaly.site_id}</p>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="text-xs text-gray-500 border-t pt-2">
                  <p>Check-out: {anomaly.check_out_date} | Check-in: {anomaly.check_in_date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
