'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { equipmentManagementApi, rentalManagementApi } from '../lib/api'
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  TrendingUp,
  DollarSign,
  Wrench,
  Users,
  Activity,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Upload,
  BarChart3,
  PieChart,
  LineChart,
  Settings,
  Bell,
  Mail,
  Phone,
  X
} from 'lucide-react'
import RentalTimer from './RentalTimer'

interface DashboardData {
  overview: {
    total_equipment: number
    active_rentals: number
    available_equipment: number
    anomalies: number
    utilization_rate: number
  }
  equipment_stats: {
    overview: {
      total_equipment: number
      total_rentals: number
      available_equipment: number
      average_utilization: number
      total_engine_hours: number
    }
    by_equipment_type: Record<string, {
      count: number
      utilization: number
      avg_utilization: number
      avg_efficiency: number
    }>
  }
  anomalies: {
    summary: {
      total_anomalies: number
      total_records: number
      anomaly_types: Record<string, number>
    }
    anomalies: Array<{
      equipment_id: string
      type: string
      anomaly_type: string
      severity: string
      anomaly_score: number
      site_id: string
      engine_hours_per_day: number
      idle_hours_per_day: number
      utilization_ratio: number
      check_out_date: string
      check_in_date: string
      status: 'rented' | 'available'
    }>
  }
  recommendations: string[]
}

interface Props {
  dashboardData: DashboardData | null
}

interface FilterState {
  search: string
  equipmentType: string
  siteId: string
  severity: string
  utilizationRange: [number, number]
  dateRange: [string, string]
}

interface SortState {
  field: string
  direction: 'asc' | 'desc'
}

export default function RentalDashboard({ dashboardData }: Props) {
  const [activeTab, setActiveTab] = useState('active')
  const [loading, setLoading] = useState(false)

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    equipmentType: '',
    siteId: '',
    severity: '',
    utilizationRange: [0, 100], // This range includes all possible values
    dateRange: ['', '']
  })
  const [sorting, setSorting] = useState<SortState>({ field: 'equipment_id', direction: 'asc' })
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'charts'>('cards')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [showFilters, setShowFilters] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Real-time data refresh
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      // Trigger parent refresh
      window.dispatchEvent(new CustomEvent('refreshDashboard'))
    }, refreshInterval * 1000)
    
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1)
  }, [dashboardData])

  // Calculate derived metrics from dashboard data with real-time updates
  const getActiveRentalsCount = useCallback(() => dashboardData?.overview?.active_rentals || 0, [dashboardData])
  const getOverdueCount = useCallback(() => dashboardData?.anomalies?.summary?.total_anomalies || 0, [dashboardData])
  const getMonthlyRevenue = useCallback(() => {
    const totalEquipment = dashboardData?.overview?.total_equipment || 0
    const avgUtilization = dashboardData?.overview?.utilization_rate || 0
    return Math.round(totalEquipment * (avgUtilization / 100) * 500)
  }, [dashboardData])
  const getUtilizationRate = useCallback(() => dashboardData?.overview?.utilization_rate || 0, [dashboardData])

  // Dynamic data filtering and manipulation
  const getActiveRentals = useMemo(() => {
    console.log('🔄 getActiveRentals recalculating with data:', {
      hasData: !!dashboardData,
      anomaliesCount: dashboardData?.anomalies?.anomalies?.length || 0,
      overview: dashboardData?.overview
    })
    
    // Check multiple possible data sources for rentals
    const anomaliesData = dashboardData?.anomalies?.anomalies || []
    const equipmentData = dashboardData?.equipment_stats?.by_equipment_type || {}
    
    console.log('Data Sources Debug:', {
      anomaliesCount: anomaliesData.length,
      equipmentStats: equipmentData,
      overview: dashboardData?.overview
    })
    
    if (!anomaliesData.length) return []
    
    // Filter to show ONLY properly rented equipment (assigned to sites)
    let filtered = anomaliesData
      .filter(anomaly => 
        anomaly.site_id && 
        anomaly.site_id !== 'Unassigned' && 
        anomaly.site_id !== 'Available' &&
        anomaly.site_id.trim() !== '' &&
        anomaly.site_id.length > 0
      )
      .map(anomaly => ({
        id: anomaly.equipment_id,
        equipment_id: anomaly.equipment_id,
        type: anomaly.type,
        site_id: anomaly.site_id,
        check_out_date: anomaly.check_out_date,
        check_in_date: anomaly.check_in_date,
        utilization: Math.round(anomaly.utilization_ratio * 100) || 0,
        engine_hours: anomaly.engine_hours_per_day || 0,
        idle_hours: anomaly.idle_hours_per_day || 0,
        anomaly_score: anomaly.anomaly_score || 0,
        severity: anomaly.severity || 'none',
        status: 'rented'
      }))

    // Only apply filters if they are actually set (not empty/default)
    if (filters.search && filters.search.trim() !== '') {
      filtered = filtered.filter(item => 
        item.equipment_id.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.type.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.site_id.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    if (filters.equipmentType && filters.equipmentType !== '') {
      filtered = filtered.filter(item => item.type === filters.equipmentType)
    }

    if (filters.siteId && filters.siteId !== '') {
      filtered = filtered.filter(item => item.site_id === filters.siteId)
    }

    // Utilization range [0, 100] includes all values, so no filtering needed
    // Only filter if user changes the range from default
    if (filters.utilizationRange[0] !== 0 || filters.utilizationRange[1] !== 100) {
      filtered = filtered.filter(item => {
        const utilization = item.utilization || 0
        return utilization >= filters.utilizationRange[0] && utilization <= filters.utilizationRange[1]
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sorting.field as keyof typeof a]
      const bValue = b[sorting.field as keyof typeof b]
      
      if (sorting.direction === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    console.log('Active Rentals Debug:', {
      totalAnomalies: dashboardData?.anomalies?.anomalies?.length || 0,
      filteredCount: filtered.length,
      filters: filters,
      sorting: sorting,
      sampleData: filtered.slice(0, 3).map(item => ({
        equipment_id: item.equipment_id,
        site_id: item.site_id,
        type: item.type
      }))
    })

    return filtered
  }, [dashboardData, filters, sorting])

  // Get available equipment (not currently rented)
  const getAvailableEquipment = useMemo(() => {
    console.log('🔄 getAvailableEquipment recalculating with data:', {
      hasData: !!dashboardData,
      anomaliesCount: dashboardData?.anomalies?.anomalies?.length || 0,
      overview: dashboardData?.overview,
      sampleAnomaly: dashboardData?.anomalies?.anomalies?.[0]
    })
    
    if (!dashboardData?.anomalies?.anomalies) return []
    
    // Filter for equipment that is NOT assigned to a site (available for rent)
    let filtered = dashboardData.anomalies.anomalies
      .filter(anomaly => 
        !anomaly.site_id || 
        anomaly.site_id === 'Unassigned' || 
        anomaly.site_id === 'Available' ||
        anomaly.site_id.trim() === '' ||
        anomaly.site_id === null
      )
      .map(anomaly => ({
        id: anomaly.equipment_id,
        equipment_id: anomaly.equipment_id,
        type: anomaly.type,
        site_id: 'Available',
        check_out_date: 'N/A',
        check_in_date: 'N/A',
        utilization: 0,
        engine_hours: 0,
        idle_hours: 0,
        anomaly_score: 0,
        severity: 'none',
        status: 'available'
      }))

    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(item => 
        item.equipment_id.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.type.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    // Apply equipment type filter
    if (filters.equipmentType) {
      filtered = filtered.filter(item => item.type === filters.equipmentType)
    }

    return filtered
  }, [dashboardData, filters])

  // Get available equipment count
  const getAvailableEquipmentCount = useCallback(() => getAvailableEquipment.length, [getAvailableEquipment])

  // Get overdue equipment with dynamic filtering
  const getOverdueEquipment = useMemo(() => {
    if (!dashboardData?.anomalies?.anomalies) return []
    
    let filtered = dashboardData.anomalies.anomalies
      .filter(anomaly => anomaly.anomaly_type === 'high_idle_time' && anomaly.severity === 'high')
      .map(anomaly => ({
        id: anomaly.equipment_id,
        equipment_id: anomaly.equipment_id,
        type: anomaly.type,
        site_id: anomaly.site_id,
        check_out_date: anomaly.check_out_date,
        check_in_date: anomaly.check_in_date,
        idle_hours: anomaly.idle_hours_per_day,
        severity: anomaly.severity,
        anomaly_score: anomaly.anomaly_score
      }))

    // Apply filters
    if (filters.search) {
      filtered = filtered.filter(item => 
        item.equipment_id.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.type.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    if (filters.equipmentType) {
      filtered = filtered.filter(item => item.type === filters.equipmentType)
    }

    if (filters.severity) {
      filtered = filtered.filter(item => item.severity === filters.severity)
    }

    return filtered
  }, [dashboardData, filters])

  // Get unique equipment types for filter dropdown
  const equipmentTypes = useMemo(() => {
    if (!dashboardData?.anomalies?.anomalies) return []
    return Array.from(new Set(dashboardData.anomalies.anomalies.map(a => a.type)))
  }, [dashboardData])

  // Get unique site IDs for filter dropdown
  const siteIds = useMemo(() => {
    if (!dashboardData?.anomalies?.anomalies) return []
    return Array.from(new Set(dashboardData.anomalies.anomalies.map(a => a.site_id).filter(id => id !== 'Unassigned')))
  }, [dashboardData])

  // Interactive functions
  const handleSort = (field: string) => {
    setSorting(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedItems.size === getActiveRentals.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(getActiveRentals.map(item => item.id)))
    }
  }

  const handleBulkAction = async (action: string) => {
    try {
      const selectedIds = Array.from(selectedItems)
      console.log(`Performing ${action} on ${selectedIds.length} items:`, selectedIds)
      
      switch (action) {
        case 'send_reminders':
          // Send reminders for selected rentals
          for (const id of selectedIds) {
            try {
              await rentalManagementApi.sendAllReminders()
            } catch (error) {
              console.error(`Error sending reminder for ${id}:`, error)
            }
          }
          showCustomAlert(`Reminders sent for ${selectedIds.length} items`, 'success')
          break
          
        case 'extend_rentals':
          setExtensionData({ days: '', selectedIds: selectedIds })
          setShowExtensionModal(true)
          break
          
        case 'return_equipment':
          // Return selected equipment
          for (const id of selectedIds) {
            try {
              const equipment = getActiveRentals.find(r => r.id === id)
              if (equipment) {
                await equipmentManagementApi.returnEquipment(equipment.equipment_id)
              }
            } catch (error) {
              console.error(`Error returning equipment ${id}:`, error)
            }
          }
          showCustomAlert(`Equipment returned for ${selectedIds.length} items`, 'success')
          window.dispatchEvent(new CustomEvent('refreshDashboard'))
          break
          
        case 'rent_out':
          setBulkRentalData({ siteId: '', selectedIds: selectedIds })
          setShowBulkRentalModal(true)
          break
          
        case 'delete':
          if (confirm(`Are you sure you want to delete ${selectedIds.length} items?`)) {
            for (const id of selectedIds) {
              try {
                const equipment = getAvailableEquipment.find(e => e.id === id)
                if (equipment) {
                  await equipmentManagementApi.deleteEquipment(equipment.equipment_id)
                }
              } catch (error) {
                console.error(`Error deleting equipment ${id}:`, error)
              }
            }
            showCustomAlert(`Equipment deleted for ${selectedIds.length} items`, 'success')
            window.dispatchEvent(new CustomEvent('refreshDashboard'))
          }
          break
          
        default:
          console.log('Unknown action:', action)
      }
      
    setSelectedItems(new Set())
          } catch (error) {
        console.error('Error in bulk action:', error)
        showCustomAlert(`Error performing bulk action: ${error.message}`, 'error')
      }
  }

  const exportData = (format: 'csv' | 'json') => {
    const data = getActiveRentals
    let content = ''
    
    if (format === 'csv') {
      const headers = ['Equipment ID', 'Type', 'Site', 'Utilization', 'Engine Hours', 'Idle Hours']
      const rows = data.map(item => [
        item.equipment_id,
        item.type,
        item.site_id,
        `${item.utilization}%`,
        item.engine_hours,
        item.idle_hours
      ])
      
      content = [headers, ...rows].map(row => row.join(',')).join('\n')
    } else {
      content = JSON.stringify(data, null, 2)
    }
    
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `equipment_data.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Mock functions for buttons (since we don't have actual rental management)
  const sendOverdueAlerts = async () => {
    try {
    console.log('Sending overdue alerts...')
      const response = await rentalManagementApi.sendOverdueAlerts()
      
      if (response.status === 200) {
        showCustomAlert('Overdue alerts sent successfully!', 'success')
      }
    } catch (error) {
      console.error('Error sending overdue alerts:', error)
      showCustomAlert(`Error sending overdue alerts: ${error.response?.data?.detail || 'Unknown error'}`, 'error')
    }
  }

  const [showReminderPopup, setShowReminderPopup] = useState(false)
  const [reminderStatus, setReminderStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [equipmentToReturn, setEquipmentToReturn] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50) // Increased to show more items per page
  
  // Custom alert states
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info')
  
  // Add Equipment modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEquipment, setNewEquipment] = useState({
    equipment_id: '',
    type: '',
    status: 'available',
    site_id: '',
    notes: ''
  })
  
  // Extension modal states
  const [showExtensionModal, setShowExtensionModal] = useState(false)
  const [extensionData, setExtensionData] = useState({
    days: '',
    selectedIds: [] as string[]
  })
  
  // Bulk rental modal states
  const [showBulkRentalModal, setShowBulkRentalModal] = useState(false)
  const [bulkRentalData, setBulkRentalData] = useState({
    siteId: '',
    selectedIds: [] as string[]
  })
  
  // Single rental modal states
  const [showRentalModal, setShowRentalModal] = useState(false)
  const [rentalData, setRentalData] = useState({
    siteId: '',
    days: '',
    equipment: null as any
  })
  
  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [equipmentToDelete, setEquipmentToDelete] = useState<any>(null)
  
  // Force update state for component refresh
  const [forceUpdate, setForceUpdate] = useState(0)

  const sendAllReminders = async () => {
    setShowReminderPopup(true)
    setReminderStatus('sending')
    
    try {
      // Make real API call to send reminders
      const response = await rentalManagementApi.sendAllReminders()
      
      if (response.status === 200) {
        setReminderStatus('sent')
        setTimeout(() => {
          setShowReminderPopup(false)
          setReminderStatus('idle')
        }, 2000)
      }
    } catch (error) {
      console.error('Error sending reminders:', error)
      setReminderStatus('error')
      setTimeout(() => {
        setShowReminderPopup(false)
        setReminderStatus('idle')
      }, 2000)
    }
  }

  const handleViewEquipment = (equipment: any) => {
    setSelectedEquipment(equipment)
    setShowViewModal(true)
  }

  const handleEditEquipment = (equipment: any) => {
    setSelectedEquipment(equipment)
    setShowEditModal(true)
  }

  const handleSaveEdit = async (updatedData: any) => {
    try {
      console.log('Saving updated equipment data:', updatedData)
      
      // Make real API call to update equipment
      const response = await equipmentManagementApi.updateEquipmentStatus(
        updatedData.equipment_id,
        updatedData.status || 'available',
        updatedData
      )
      
      if (response.status === 200) {
        showCustomAlert('Equipment updated successfully!', 'success')
        setShowEditModal(false)
        setSelectedEquipment(null)
        // Trigger refresh to get updated data
        window.dispatchEvent(new CustomEvent('refreshDashboard'))
      }
    } catch (error) {
      console.error('Error updating equipment:', error)
      showCustomAlert(`Error updating equipment: ${error.response?.data?.detail || 'Unknown error'}`, 'error')
    }
  }

  const handleReturnEquipment = (equipment: any) => {
    setEquipmentToReturn(equipment)
    setShowReturnModal(true)
  }

  const confirmReturnEquipment = async () => {
    if (!equipmentToReturn) return
    
    try {
      console.log('Returning equipment:', equipmentToReturn.equipment_id)
      
      // Make real API call to return equipment
      const response = await equipmentManagementApi.returnEquipment(equipmentToReturn.equipment_id)
      
      if (response.status === 200) {
        // Show success message
        showCustomAlert(`Equipment ${equipmentToReturn.equipment_id} has been returned and is now available for rent!`, 'success')
        
        // Refresh dashboard data to get updated counts
        window.dispatchEvent(new CustomEvent('refreshDashboard'))
      }
    } catch (error) {
      console.error('Error returning equipment:', error)
      showCustomAlert(`Error returning equipment: ${error.response?.data?.detail || 'Unknown error'}`, 'error')
    } finally {
      setShowReturnModal(false)
      setEquipmentToReturn(null)
    }
  }

  // Pagination functions
  const getPaginatedData = (data: any[], page: number) => {
    const startIndex = (page - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }

  const getTotalPages = (data: any[]) => {
    return Math.ceil(data.length / itemsPerPage)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedItems(new Set()) // Clear selection when changing pages
  }
  
  // Custom alert function
  const showCustomAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertMessage(message)
    setAlertType(type)
    setShowAlert(true)
    setTimeout(() => setShowAlert(false), 5000) // Auto-hide after 5 seconds
  }
  
  // Add Equipment function
  const handleAddEquipment = async () => {
    if (!newEquipment.equipment_id || !newEquipment.type) {
      showCustomAlert('Equipment ID and Type are required!', 'error')
      return
    }
    
    try {
      const response = await equipmentManagementApi.createEquipment({
        equipment_id: newEquipment.equipment_id,
        type: newEquipment.type,
        status: newEquipment.status,
        site_id: newEquipment.site_id || null,
        notes: newEquipment.notes || null
      })
      
      if (response.status === 200) {
        showCustomAlert('Equipment created successfully!', 'success')
        setShowAddModal(false)
        setNewEquipment({
          equipment_id: '',
          type: '',
          status: 'available',
          site_id: '',
          notes: ''
        })
        // Refresh dashboard data
        triggerDashboardRefresh()
      }
    } catch (error) {
      console.error('Error creating equipment:', error)
      showCustomAlert(`Error creating equipment: ${error.response?.data?.detail || 'Unknown error'}`, 'error')
    }
  }
  
  // Extension function
  const handleExtension = async () => {
    if (!extensionData.days || isNaN(Number(extensionData.days))) {
      showCustomAlert('Please enter a valid number of days', 'error')
      return
    }
    
    showCustomAlert(`Extension functionality would be implemented here for ${extensionData.selectedIds.length} items`, 'info')
    setShowExtensionModal(false)
    setExtensionData({ days: '', selectedIds: [] })
  }
  
  // Bulk rental function
  const handleBulkRental = async () => {
    if (!bulkRentalData.siteId) {
      showCustomAlert('Please enter a Site ID', 'error')
      return
    }
    
    try {
      for (const id of bulkRentalData.selectedIds) {
        const equipment = getAvailableEquipment.find(e => e.id === id)
        if (equipment) {
          await equipmentManagementApi.updateEquipmentStatus(
            equipment.equipment_id,
            'rented',
            { site_id: bulkRentalData.siteId }
          )
        }
      }
      showCustomAlert(`Equipment rented out for ${bulkRentalData.selectedIds.length} items`, 'success')
      setShowBulkRentalModal(false)
      setBulkRentalData({ siteId: '', selectedIds: [] })
      window.dispatchEvent(new CustomEvent('refreshDashboard'))
    } catch (error) {
      console.error('Error in bulk rental:', error)
      showCustomAlert(`Error renting equipment: ${error.response?.data?.detail || 'Unknown error'}`, 'error')
    }
  }
  
  // Single rental function
  const handleSingleRental = async () => {
    if (!rentalData.siteId || !rentalData.days || isNaN(Number(rentalData.days))) {
      showCustomAlert('Please enter both Site ID and valid rental duration', 'error')
      return
    }
    
    try {
      const response = await equipmentManagementApi.updateEquipmentStatus(
        rentalData.equipment.equipment_id,
        'rented',
        { site_id: rentalData.siteId }
      )
      if (response.status === 200) {
        showCustomAlert(`Equipment ${rentalData.equipment.equipment_id} rented out to site ${rentalData.siteId} for ${rentalData.days} days!`, 'success')
        setShowRentalModal(false)
        setRentalData({ siteId: '', days: '', equipment: null })
        window.dispatchEvent(new CustomEvent('refreshDashboard'))
      }
    } catch (error) {
      console.error('Error renting equipment:', error)
      showCustomAlert(`Error renting equipment: ${error.response?.data?.detail || 'Unknown error'}`, 'error')
    }
  }
  
  // Delete equipment function
  const handleDeleteEquipment = async () => {
    if (!equipmentToDelete) return
    
    try {
      const response = await equipmentManagementApi.deleteEquipment(equipmentToDelete.equipment_id)
      if (response.status === 200) {
        showCustomAlert('Equipment deleted successfully!', 'success')
        setShowDeleteModal(false)
        setEquipmentToDelete(null)
        window.dispatchEvent(new CustomEvent('refreshDashboard'))
      }
    } catch (error) {
      console.error('Error deleting equipment:', error)
      showCustomAlert(`Error deleting equipment: ${error.response?.data?.detail || 'Unknown error'}`, 'error')
    }
  }
  
  // Helper function to refresh dashboard with delay
  const triggerDashboardRefresh = () => {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('refreshDashboard'))
    }, 500)
  }
  
  // Direct refresh function for immediate data update
  const refreshDashboardData = async () => {
    try {
      console.log('🔄 RentalDashboard: Refreshing data...')
      // Trigger parent refresh
      window.dispatchEvent(new CustomEvent('refreshDashboard'))
      // Also show a success message
      showCustomAlert('Dashboard data refreshed!', 'success')
    } catch (error) {
      console.error('Error refreshing dashboard:', error)
      showCustomAlert('Error refreshing dashboard data', 'error')
    }
  }
  
  // Force re-render when dashboardData changes
  useEffect(() => {
    console.log('🔄 RentalDashboard: Data updated:', {
      total_equipment: dashboardData?.overview?.total_equipment,
      active_rentals: dashboardData?.overview?.active_rentals,
      available_equipment: dashboardData?.overview?.available_equipment,
      anomalies_count: dashboardData?.anomalies?.anomalies?.length
    })
    
    // Force recalculation of derived data
    if (dashboardData) {
      console.log('🔄 Forcing recalculation of equipment data...')
      // This will trigger the useMemo hooks to recalculate
    }
  }, [dashboardData])
  
  // Function to force component update
  const forceComponentUpdate = () => {
    console.log('🔄 Force updating RentalDashboard component...')
    setForceUpdate(prev => prev + 1)
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Wrench className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
          <p className="mt-1 text-sm text-gray-500">Dashboard data is not loaded yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Custom Alert */}
      {showAlert && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-2">
          <div className={`rounded-lg p-4 shadow-lg border-l-4 ${
            alertType === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
            alertType === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
            'bg-blue-50 border-blue-400 text-blue-800'
          }`}>
            <div className="flex items-center gap-3">
              {alertType === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {alertType === 'error' && <AlertTriangle className="w-5 h-5 text-red-500" />}
              {alertType === 'info' && <Bell className="w-5 h-5 text-blue-500" />}
              <p className="font-medium">{alertMessage}</p>
              <button
                onClick={() => setShowAlert(false)}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Popup */}
      {showReminderPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Send Reminders</h3>
              <button
                onClick={() => setShowReminderPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {reminderStatus === 'sending' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Sending reminders...</p>
              </div>
            )}
            
            {reminderStatus === 'sent' && (
              <div className="text-center py-8">
                <CheckCircle className="w-16 w-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Reminders Sent!</h4>
                <p className="text-gray-600">All reminders have been sent successfully.</p>
              </div>
            )}
            
            {reminderStatus === 'error' && (
              <div className="text-center py-8">
                <AlertTriangle className="w-16 w-16 text-red-500 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Error Sending Reminders</h4>
                <p className="text-gray-600">There was an error sending reminders. Please try again.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Equipment Modal */}
      {showViewModal && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Equipment Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment ID</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEquipment.equipment_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded capitalize">{selectedEquipment.type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  <Badge variant={selectedEquipment.status === 'available' ? 'secondary' : 'outline'} 
                         className={selectedEquipment.status === 'available' ? 'bg-green-100 text-green-800' : ''}>
                    {selectedEquipment.status || 'rented'}
                  </Badge>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEquipment.site_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Utilization</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEquipment.utilization}%</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Engine Hours</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEquipment.engine_hours}h</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Idle Hours</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEquipment.idle_hours}h</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-Out Date</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {selectedEquipment.check_out_date ? new Date(selectedEquipment.check_out_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {selectedEquipment.check_in_date ? new Date(selectedEquipment.check_in_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowViewModal(false)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Return Equipment Confirmation Modal */}
      {showReturnModal && equipmentToReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Return Equipment</h3>
              <button
                onClick={() => setShowReturnModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Are you sure you want to return this equipment?
              </p>
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium">{equipmentToReturn.equipment_id}</p>
                <p className="text-sm text-gray-600">{equipmentToReturn.type}</p>
                <p className="text-sm text-gray-600">Site: {equipmentToReturn.site_id}</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowReturnModal(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={confirmReturnEquipment} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm Return
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium">Add New Equipment</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Equipment ID *</label>
                <input
                  type="text"
                  value={newEquipment.equipment_id}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, equipment_id: e.target.value }))}
                  placeholder="e.g., EQX1010"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Type *</label>
                <select
                  value={newEquipment.type}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Type</option>
                  <option value="Bulldozer">Bulldozer</option>
                  <option value="Excavator">Excavator</option>
                  <option value="Crane">Crane</option>
                  <option value="Loader">Loader</option>
                  <option value="Dump Truck">Dump Truck</option>
                  <option value="Forklift">Forklift</option>
                  <option value="Generator">Generator</option>
                  <option value="Compressor">Compressor</option>
                  <option value="Welder">Welder</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={newEquipment.status}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="available">Available</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="out_of_service">Out of Service</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site ID</label>
                <input
                  type="text"
                  value={newEquipment.site_id}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, site_id: e.target.value }))}
                  placeholder="e.g., SITE001 (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={newEquipment.notes}
                onChange={(e) => setNewEquipment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about the equipment..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <Button 
                onClick={() => setShowAddModal(false)} 
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddEquipment}
                disabled={!newEquipment.equipment_id || !newEquipment.type}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Equipment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Extension Modal */}
      {showExtensionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Extend Rentals</h3>
              <button
                onClick={() => setShowExtensionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Extension Days</label>
              <input
                type="number"
                value={extensionData.days}
                onChange={(e) => setExtensionData(prev => ({ ...prev, days: e.target.value }))}
                placeholder="Enter number of days"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Extending {extensionData.selectedIds.length} selected rental(s)
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button onClick={() => setShowExtensionModal(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleExtension} disabled={!extensionData.days}>
                Extend Rentals
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Rental Modal */}
      {showBulkRentalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Bulk Rent Equipment</h3>
              <button
                onClick={() => setShowBulkRentalModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Site ID</label>
              <input
                type="text"
                value={bulkRentalData.siteId}
                onChange={(e) => setBulkRentalData(prev => ({ ...prev, siteId: e.target.value }))}
                placeholder="Enter Site ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Renting {bulkRentalData.selectedIds.length} selected equipment item(s)
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button onClick={() => setShowBulkRentalModal(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleBulkRental} disabled={!bulkRentalData.siteId}>
                Rent Equipment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Single Rental Modal */}
      {showRentalModal && rentalData.equipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Rent Equipment</h3>
              <button
                onClick={() => setShowRentalModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="font-medium">{rentalData.equipment.equipment_id}</p>
                <p className="text-sm text-gray-600">{rentalData.equipment.type}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site ID *</label>
                <input
                  type="text"
                  value={rentalData.siteId}
                  onChange={(e) => setRentalData(prev => ({ ...prev, siteId: e.target.value }))}
                  placeholder="Enter Site ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (Days) *</label>
                <input
                  type="number"
                  value={rentalData.days}
                  onChange={(e) => setRentalData(prev => ({ ...prev, days: e.target.value }))}
                  placeholder="Enter days"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button onClick={() => setShowRentalModal(false)} variant="outline">
                Cancel
              </Button>
              <Button 
                onClick={handleSingleRental} 
                disabled={!rentalData.siteId || !rentalData.days}
              >
                Rent Equipment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && equipmentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-red-600">Delete Equipment</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-red-800 font-medium mb-2">Are you sure you want to delete this equipment?</p>
                <p className="text-red-700 text-sm">This action cannot be undone.</p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded mt-4">
                <p className="font-medium">{equipmentToDelete.equipment_id}</p>
                <p className="text-sm text-gray-600">{equipmentToDelete.type}</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button onClick={() => setShowDeleteModal(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleDeleteEquipment} variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Equipment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Equipment Modal */}
      {showEditModal && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Edit Equipment</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment ID</label>
                <input
                  type="text"
                  value={selectedEquipment.equipment_id}
                  onChange={(e) => setSelectedEquipment({...selectedEquipment, equipment_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={selectedEquipment.type}
                  onChange={(e) => setSelectedEquipment({...selectedEquipment, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {equipmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={selectedEquipment.status || 'rented'}
                  onChange={(e) => setSelectedEquipment({...selectedEquipment, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="rented">Rented</option>
                  <option value="available">Available</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                <select
                  value={selectedEquipment.site_id}
                  onChange={(e) => setSelectedEquipment({...selectedEquipment, site_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Available">Available</option>
                  {siteIds.map(siteId => (
                    <option key={siteId} value={siteId}>{siteId}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Utilization</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={selectedEquipment.utilization}
                  onChange={(e) => setSelectedEquipment({...selectedEquipment, utilization: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <Button onClick={() => setShowEditModal(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={() => handleSaveEdit(selectedEquipment)}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rental Dashboard</h2>
          <p className="text-gray-600">Manage equipment rentals and track returns with real-time data</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Auto-refresh controls */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1"
            >
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
              <option value={300}>5m</option>
            </select>
          </div>

          

                     <Button onClick={refreshDashboardData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
             Refresh Dashboard
           </Button>
           
           <Button onClick={() => {
             console.log('🔄 Manual refresh triggered from RentalDashboard')
             window.dispatchEvent(new CustomEvent('refreshDashboard'))
           }} variant="outline" size="sm">
             <RefreshCw className="w-4 h-4 mr-2" />
             Force Refresh
           </Button>
           
           <Button onClick={forceComponentUpdate} variant="outline" size="sm">
             <RefreshCw className="w-4 h-4 mr-2" />
             Force Update
          </Button>
          
          <Button onClick={sendAllReminders} variant="outline">
            <Bell className="w-4 h-4 mr-2" />
            Send All Reminders
          </Button>
          
          <Button onClick={sendOverdueAlerts} variant="outline">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Send Overdue Alerts
          </Button>
        </div>
      </div>

      {/* Enhanced Summary Cards with Interactive Elements */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => setActiveTab('active')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Rentals</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 group-hover:text-blue-600 transition-colors">
                  {getActiveRentalsCount()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Click to view details</p>
              </div>
              <div className="p-3 rounded-full text-green-600 bg-green-100 group-hover:bg-green-200 transition-colors">
                <Wrench className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => setActiveTab('overdue')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 group-hover:text-red-600 transition-colors">
                  {getOverdueCount()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Click to view details</p>
              </div>
              <div className="p-3 rounded-full text-red-600 bg-red-100 group-hover:bg-red-200 transition-colors">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-all cursor-pointer group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 group-hover:text-blue-600 transition-colors">
                  ${getMonthlyRevenue().toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Estimated from utilization</p>
              </div>
              <div className="p-3 rounded-full text-blue-600 bg-blue-100 group-hover:bg-blue-200 transition-colors">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => setActiveTab('available')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 group-hover:text-green-600 transition-colors">
                  {getAvailableEquipmentCount()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Click to view details</p>
              </div>
              <div className="p-3 rounded-full text-green-600 bg-green-100 group-hover:bg-green-200 transition-colors">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-all cursor-pointer group">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utilization</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 group-hover:text-yellow-600 transition-colors">
                  {getUtilizationRate()}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Real-time average</p>
              </div>
              <div className="p-3 rounded-full text-yellow-600 bg-yellow-100 group-hover:bg-yellow-200 transition-colors">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Advanced Filters & Search</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search equipment, site, type..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Equipment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
                <select
                  value={filters.equipmentType}
                  onChange={(e) => handleFilterChange('equipmentType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  {equipmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Site ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                <select
                  value={filters.siteId}
                  onChange={(e) => handleFilterChange('siteId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Sites</option>
                  {siteIds.map(siteId => (
                    <option key={siteId} value={siteId}>{siteId}</option>
                  ))}
                </select>
              </div>

              {/* Utilization Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Utilization: {filters.utilizationRange[0]}% - {filters.utilizationRange[1]}%
                </label>
                <div className="flex gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.utilizationRange[0]}
                    onChange={(e) => handleFilterChange('utilizationRange', [Number(e.target.value), filters.utilizationRange[1]])}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.utilizationRange[1]}
                    onChange={(e) => handleFilterChange('utilizationRange', [filters.utilizationRange[0], Number(e.target.value)])}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                Showing {getActiveRentals.length} of {dashboardData.overview.active_rentals} active rentals
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({
                    search: '',
                    equipmentType: '',
                    siteId: '',
                    severity: '',
                    utilizationRange: [0, 100],
                    dateRange: ['', '']
                    })
                    setCurrentPage(1) // Reset to first page when clearing filters
                  }}
                >
                  Clear Filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportData('csv')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportData('json')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Enhanced Tabs with Interactive Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="active">Active Rentals ({getActiveRentalsCount()})</TabsTrigger>
          <TabsTrigger value="available">Available ({getAvailableEquipmentCount()})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({getOverdueCount()})</TabsTrigger>
          <TabsTrigger value="due-soon">Due Soon</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Available Equipment Tab */}
        <TabsContent value="available" className="space-y-4">
          {/* Equipment Management Header */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="h-5 w-5 text-blue-600" />
              <h4 className="text-sm font-medium text-blue-800">Equipment Management</h4>
            </div>
            <p className="text-sm text-blue-700">
              Manage your equipment inventory here. Add new equipment, edit existing ones, or rent them out to customers.
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Available Equipment ({getAvailableEquipment.length})</h3>
            
            <div className="flex items-center gap-2">

              
              {/* Add New Equipment Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Equipment
              </Button>
              
              {/* Bulk Actions */}
              {selectedItems.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('rent_out')}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Rent Out
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('delete')}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Table Header */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedItems.size === getAvailableEquipment.length}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                Equipment
              </div>
              <div>Type</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
          </div>
          
          {getAvailableEquipment.length > 0 ? (
            <div className="space-y-2">
              {getPaginatedData(getAvailableEquipment, currentPage).map((equipment) => (
                <Card key={equipment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-5 gap-4 items-center">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(equipment.id)}
                          onChange={() => handleSelectItem(equipment.id)}
                          className="rounded"
                        />
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-8 w-8 text-green-600" />
                          <div>
                            <p className="font-medium">{equipment.equipment_id}</p>
                            <p className="text-xs text-gray-500">Available for rent</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Badge variant="outline" className="capitalize">
                          {equipment.type}
                        </Badge>
                      </div>
                      
                      <div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Available
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewEquipment(equipment)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditEquipment(equipment)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setRentalData({ siteId: '', days: '', equipment: equipment })
                            setShowRentalModal(true)
                          }}
                        >
                          <Calendar className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setEquipmentToDelete(equipment)
                            setShowDeleteModal(true)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No available equipment</h3>
              <p className="mt-1 text-sm text-gray-500">All equipment is currently rented out.</p>
            </div>
          )}

          {/* Pagination and Show All Options */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getAvailableEquipment.length)} of {getAvailableEquipment.length} results
            </div>
            <div className="flex items-center gap-2">
              {/* Records per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1) // Reset to first page when changing page size
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={getAvailableEquipment.length}>All</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
              

              
              {/* Pagination Controls */}
              {getTotalPages(getAvailableEquipment) > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    
                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {/* First few pages */}
                      {Array.from({ length: Math.min(5, getTotalPages(getAvailableEquipment)) }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                      
                      {/* Ellipsis if more than 5 pages */}
                      {getTotalPages(getAvailableEquipment) > 5 && (
                        <span className="text-sm text-gray-500 px-2">...</span>
                      )}
                      
                      {/* Last few pages if more than 5 */}
                      {getTotalPages(getAvailableEquipment) > 5 && (
                        Array.from({ length: Math.min(3, getTotalPages(getAvailableEquipment) - 5) }, (_, i) => getTotalPages(getAvailableEquipment) - 2 + i).map(page => (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ))
                      )}
                    </div>
                    
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === getTotalPages(getAvailableEquipment)}
                  >
                    Next
                  </Button>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Active Rentals Tab with Enhanced Interactivity */}
        <TabsContent value="active" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
            <h3 className="text-lg font-medium">Active Rentals ({getActiveRentals.length})</h3>
              <p className="text-sm text-gray-500">
                Total in system: {dashboardData?.overview?.active_rentals || 0} | 
                Showing: {getActiveRentals.length} | 
                Filtered: {dashboardData?.overview?.active_rentals !== getActiveRentals.length}
              </p>
            </div>
            
            {/* Bulk Actions */}
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('send_reminders')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reminders
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('extend_rentals')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Extend Rentals
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('return_equipment')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Return Equipment
                </Button>
              </div>
            )}
          </div>

          {/* Table Header with Sorting */}
          <div className="bg-gray-50 rounded-lg p-4">
             <div className="grid grid-cols-8 gap-4 text-sm font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedItems.size === getActiveRentals.length}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                Equipment
              </div>
              <button
                onClick={() => handleSort('type')}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
              >
                Type
                {sorting.field === 'type' && (
                  sorting.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleSort('site_id')}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
              >
                Site
                {sorting.field === 'site_id' && (
                  sorting.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleSort('utilization')}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
              >
                Utilization
                {sorting.field === 'utilization' && (
                  sorting.direction === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                )}
              </button>
              <div>Engine Hours</div>
               <div>Check-Out Date</div>
               <div>Return Date</div>
              <div>Actions</div>
            </div>
          </div>
          
          {getActiveRentals.length > 0 ? (
            <div className="space-y-2">
              {getPaginatedData(getActiveRentals, currentPage).map((rental) => (
                <Card key={rental.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                     <div className="grid grid-cols-8 gap-4 items-center">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(rental.id)}
                          onChange={() => handleSelectItem(rental.id)}
                          className="rounded"
                        />
                        <div className="flex items-center space-x-3">
                          <Wrench className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="font-medium">{rental.equipment_id}</p>
                            <p className="text-xs text-gray-500">ID: {rental.id}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Badge variant="outline" className="capitalize">
                          {rental.type}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="font-medium">{rental.site_id}</p>
                        <p className="text-xs text-gray-500">Site</p>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                rental.utilization > 70 ? 'bg-green-500' :
                                rental.utilization > 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${rental.utilization}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{rental.utilization}%</span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="font-medium">{rental.engine_hours}h</p>
                        <p className="text-xs text-gray-500">Idle: {rental.idle_hours}h</p>
                      </div>
                       
                       <div>
                         <p className="font-medium text-sm">
                           {rental.check_out_date ? new Date(rental.check_out_date).toLocaleDateString() : 'N/A'}
                         </p>
                         <p className="text-xs text-gray-500">Check-Out</p>
                       </div>
                       
                       <div>
                         <p className="font-medium text-sm">
                           {rental.check_in_date ? new Date(rental.check_in_date).toLocaleDateString() : 'N/A'}
                         </p>
                         <p className="text-xs text-gray-500">Return Date</p>
                       </div>
                      
                      <div className="flex items-center gap-2">
                         <Button 
                           size="sm" 
                           variant="outline"
                           onClick={() => handleViewEquipment(rental)}
                         >
                          <Eye className="w-4 h-4" />
                        </Button>
                         <Button 
                           size="sm" 
                           variant="outline"
                           onClick={() => showCustomAlert(`Call contact for ${rental.equipment_id}\nPhone: +1 (555) 123-4567`, 'info')}
                         >
                          <Phone className="w-4 h-4" />
                        </Button>
                         <Button 
                           size="sm" 
                           variant="outline"
                           onClick={() => handleReturnEquipment(rental)}
                         >
                           <CheckCircle className="w-4 h-4" />
                         </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Wrench className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No active rentals found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or search criteria.</p>
            </div>
          )}

          {/* Pagination and Show All Options */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getActiveRentals.length)} of {getActiveRentals.length} results
            </div>
            <div className="flex items-center gap-2">
              {/* Records per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1) // Reset to first page when changing page size
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={getActiveRentals.length}>All</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
              
              {/* Show All Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setItemsPerPage(getActiveRentals.length)
                  setCurrentPage(1)
                }}
                className="mr-2"
              >
                Show All ({getActiveRentals.length})
              </Button>
              
              {/* Pagination Controls */}
              {getTotalPages(getActiveRentals) > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {/* First few pages */}
                    {Array.from({ length: Math.min(5, getTotalPages(getActiveRentals)) }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                    
                    {/* Ellipsis if more than 5 pages */}
                    {getTotalPages(getActiveRentals) > 5 && (
                      <span className="text-sm text-gray-500 px-2">...</span>
                    )}
                    
                    {/* Last few pages if more than 5 */}
                    {getTotalPages(getActiveRentals) > 5 && (
                      Array.from({ length: Math.min(3, getTotalPages(getActiveRentals) - 5) }, (_, i) => getTotalPages(getActiveRentals) - 2 + i).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === getTotalPages(getActiveRentals)}
                  >
                    Next
                  </Button>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Overdue Tab with Enhanced Details */}
        <TabsContent value="overdue" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Overdue Equipment ({getOverdueEquipment.length})</h3>
          </div>
          
          {getOverdueEquipment.length > 0 ? (
            <div className="grid gap-4">
              {getPaginatedData(getOverdueEquipment, currentPage).map((equipment) => (
                <Card key={equipment.id} className="border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                        <div>
                          <p className="font-medium">{equipment.equipment_id}</p>
                          <p className="text-sm text-gray-600">{equipment.type}</p>
                          <p className="text-xs text-red-600">Anomaly Score: {equipment.anomaly_score}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={equipment.severity === 'high' ? 'destructive' : 'secondary'}>
                          {equipment.severity}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">Idle: {equipment.idle_hours}h</p>
                        <div className="flex gap-2 mt-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => alert(`Alert sent for equipment: ${equipment.equipment_id}`)}
                          >
                            <Bell className="w-4 h-4 mr-1" />
                            Alert
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => alert(`Contacting site for ${equipment.equipment_id}\nEmail: site@company.com\nPhone: +1 (555) 987-6543`)}
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Contact
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No overdue equipment</h3>
              <p className="mt-1 text-sm text-gray-500">All equipment is operating normally.</p>
            </div>
          )}

          {/* Pagination */}
          {getTotalPages(getOverdueEquipment) > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getOverdueEquipment.length)} of {getOverdueEquipment.length} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: getTotalPages(getOverdueEquipment) }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === getTotalPages(getOverdueEquipment)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Due Soon Tab */}
        <TabsContent value="due-soon" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Due Soon</h3>
          </div>
          
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No due soon alerts</h3>
            <p className="mt-1 text-sm text-gray-500">All equipment returns are on schedule.</p>
          </div>
        </TabsContent>

        {/* Enhanced Analytics Tab with Interactive Charts */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Rental Analytics</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Equipment Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData.equipment_stats?.by_equipment_type && 
                  Object.entries(dashboardData.equipment_stats.by_equipment_type).map(([type, stats]) => (
                    <div key={type} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2 transition-colors">
                      <span className="capitalize">{type}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stats.count} units</span>
                        <Badge variant="outline">{stats.utilization}% util</Badge>
                      </div>
                    </div>
                  ))
                }
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Equipment Utilization by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.equipment_stats?.by_equipment_type && 
                    Object.entries(dashboardData.equipment_stats.by_equipment_type).map(([type, stats]) => (
                      <div key={type} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{type}</span>
                          <span className="font-medium">{stats.utilization}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              stats.utilization > 70 ? 'bg-green-500' :
                              stats.utilization > 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${stats.utilization}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          {stats.count} unit{stats.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center py-2 hover:bg-gray-50 rounded px-2 transition-colors">
                  <span>Total Equipment:</span>
                  <span className="font-medium">{dashboardData.overview.total_equipment}</span>
                </div>
                <div className="flex justify-between items-center py-2 hover:bg-gray-50 rounded px-2 transition-colors">
                  <span>Active Rentals:</span>
                  <span className="font-medium">{dashboardData.overview.active_rentals}</span>
                </div>
                <div className="flex justify-between items-center py-2 hover:bg-gray-50 rounded px-2 transition-colors">
                  <span>Utilization Rate:</span>
                  <span className="font-medium">{dashboardData.overview.utilization_rate}%</span>
                </div>
                <div className="flex justify-between items-center py-2 hover:bg-gray-50 rounded px-2 transition-colors">
                  <span>Anomalies:</span>
                  <span className="font-medium">{dashboardData.overview.anomalies}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">AI-Powered Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recommendations?.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-blue-800">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
