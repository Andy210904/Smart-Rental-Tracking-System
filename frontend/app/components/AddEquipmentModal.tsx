'use client'

import { useState } from 'react'
import { equipmentApi } from '../lib/api'

interface AddEquipmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface EquipmentFormData {
  equipment_id: string
  type: string
  site_id: string
  check_out_date: string
  check_in_date: string
  engine_hours_per_day: number
  idle_hours_per_day: number
  operating_days: number
  last_operator_id: string
  model: string
  manufacturer: string
  year: number
  status: string
}

const initialFormData: EquipmentFormData = {
  equipment_id: '',
  type: '',
  site_id: '',
  check_out_date: '',
  check_in_date: '',
  engine_hours_per_day: 0,
  idle_hours_per_day: 0,
  operating_days: 0,
  last_operator_id: '',
  model: '',
  manufacturer: 'Caterpillar',
  year: new Date().getFullYear(),
  status: 'available'
}

export default function AddEquipmentModal({ isOpen, onClose, onSuccess }: AddEquipmentModalProps) {
  const [formData, setFormData] = useState<EquipmentFormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'engine_hours_per_day' || name === 'idle_hours_per_day' || name === 'operating_days' || name === 'year'
        ? parseFloat(value) || 0
        : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.equipment_id.trim()) {
      newErrors.equipment_id = 'Equipment ID is required'
    }
    if (!formData.type.trim()) {
      newErrors.type = 'Equipment type is required'
    }
    if (formData.year < 1900 || formData.year > new Date().getFullYear() + 5) {
      newErrors.year = 'Please enter a valid year'
    }
    if (formData.engine_hours_per_day < 0) {
      newErrors.engine_hours_per_day = 'Engine hours cannot be negative'
    }
    if (formData.idle_hours_per_day < 0) {
      newErrors.idle_hours_per_day = 'Idle hours cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      // Convert empty strings to null for optional fields
      const submitData = {
        ...formData,
        site_id: formData.site_id.trim() || null,
        check_out_date: formData.check_out_date || null,
        check_in_date: formData.check_in_date || null,
        last_operator_id: formData.last_operator_id.trim() || null,
        model: formData.model.trim() || null
      }

      await equipmentApi.create(submitData)
      
      // Show success popup
      setShowSuccessPopup(true)
      
      // Reset form
      setFormData(initialFormData)
      setErrors({})
      
      // Hide success popup and close modal after 2 seconds
      setTimeout(() => {
        setShowSuccessPopup(false)
        onSuccess()
        onClose()
      }, 2000)
    } catch (error: any) {
      console.error('Error creating equipment:', error)
      if (error.response?.data?.detail) {
        setErrors({ submit: error.response.data.detail })
      } else {
        setErrors({ submit: 'Failed to create equipment. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData(initialFormData)
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Add New Equipment</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{errors.submit}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Equipment ID */}
            <div>
              <label htmlFor="equipment_id" className="block text-sm font-medium text-gray-700 mb-1">
                Equipment ID *
              </label>
              <input
                type="text"
                id="equipment_id"
                name="equipment_id"
                value={formData.equipment_id}
                onChange={handleInputChange}
                placeholder="e.g., EQX2000"
                className={`input-field ${errors.equipment_id ? 'border-red-500' : ''}`}
              />
              {errors.equipment_id && <p className="text-red-500 text-xs mt-1">{errors.equipment_id}</p>}
            </div>

            {/* Equipment Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Equipment Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className={`input-field ${errors.type ? 'border-red-500' : ''}`}
              >
                <option value="">Select Type</option>
                <option value="Excavator">Excavator</option>
                <option value="Bulldozer">Bulldozer</option>
                <option value="Crane">Crane</option>
                <option value="Grader">Grader</option>
                <option value="Loader">Loader</option>
                <option value="Compactor">Compactor</option>
              </select>
              {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
            </div>

            {/* Site ID */}
            <div>
              <label htmlFor="site_id" className="block text-sm font-medium text-gray-700 mb-1">
                Site ID
              </label>
              <input
                type="text"
                id="site_id"
                name="site_id"
                value={formData.site_id}
                onChange={handleInputChange}
                placeholder="e.g., S010"
                className="input-field"
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="input-field"
              >
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>

            {/* Check-out Date */}
            <div>
              <label htmlFor="check_out_date" className="block text-sm font-medium text-gray-700 mb-1">
                Check-out Date
              </label>
              <input
                type="date"
                id="check_out_date"
                name="check_out_date"
                value={formData.check_out_date}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>

            {/* Check-in Date */}
            <div>
              <label htmlFor="check_in_date" className="block text-sm font-medium text-gray-700 mb-1">
                Check-in Date
              </label>
              <input
                type="date"
                id="check_in_date"
                name="check_in_date"
                value={formData.check_in_date}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>

            {/* Engine Hours per Day */}
            <div>
              <label htmlFor="engine_hours_per_day" className="block text-sm font-medium text-gray-700 mb-1">
                Engine Hours/Day
              </label>
              <input
                type="number"
                id="engine_hours_per_day"
                name="engine_hours_per_day"
                value={formData.engine_hours_per_day}
                onChange={handleInputChange}
                min="0"
                step="0.1"
                className={`input-field ${errors.engine_hours_per_day ? 'border-red-500' : ''}`}
              />
              {errors.engine_hours_per_day && <p className="text-red-500 text-xs mt-1">{errors.engine_hours_per_day}</p>}
            </div>

            {/* Idle Hours per Day */}
            <div>
              <label htmlFor="idle_hours_per_day" className="block text-sm font-medium text-gray-700 mb-1">
                Idle Hours/Day
              </label>
              <input
                type="number"
                id="idle_hours_per_day"
                name="idle_hours_per_day"
                value={formData.idle_hours_per_day}
                onChange={handleInputChange}
                min="0"
                step="0.1"
                className={`input-field ${errors.idle_hours_per_day ? 'border-red-500' : ''}`}
              />
              {errors.idle_hours_per_day && <p className="text-red-500 text-xs mt-1">{errors.idle_hours_per_day}</p>}
            </div>

            {/* Operating Days */}
            <div>
              <label htmlFor="operating_days" className="block text-sm font-medium text-gray-700 mb-1">
                Operating Days
              </label>
              <input
                type="number"
                id="operating_days"
                name="operating_days"
                value={formData.operating_days}
                onChange={handleInputChange}
                min="0"
                className="input-field"
              />
            </div>

            {/* Last Operator ID */}
            <div>
              <label htmlFor="last_operator_id" className="block text-sm font-medium text-gray-700 mb-1">
                Last Operator ID
              </label>
              <input
                type="text"
                id="last_operator_id"
                name="last_operator_id"
                value={formData.last_operator_id}
                onChange={handleInputChange}
                placeholder="e.g., OP500"
                className="input-field"
              />
            </div>

            {/* Model */}
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                placeholder="e.g., 320D"
                className="input-field"
              />
            </div>

            {/* Manufacturer */}
            <div>
              <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                id="manufacturer"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>

            {/* Year */}
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <input
                type="number"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                min="1900"
                max={new Date().getFullYear() + 5}
                className={`input-field ${errors.year ? 'border-red-500' : ''}`}
              />
              {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Create Equipment'
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
      
      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 transform animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Success!</h3>
            <p className="text-gray-600 text-center">Equipment added successfully</p>
          </div>
        </div>
      )}
    </>
  )
}
