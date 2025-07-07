import React, { useState, useEffect } from 'react'
import api from '../../services/api'

const RuleEditor = ({ rule, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'keyword',
    isActive: true,
    conditions: {
      keywords: [],
      allowedHours: { start: 9, end: 17 },
      documentTypes: [],
      userRoles: [],
      departments: [],
      maxFrequency: { count: 10, timeWindow: 60 },
      fileExtensions: [],
      minFileSize: 0,
      maxFileSize: 0
    },
    actions: {
      severity: 'medium',
      notify: true,
      block: false,
      requireApproval: false
    },
    priority: 1
  })

  const [keywordInput, setKeywordInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (rule) {
      setFormData(rule)
    }
  }, [rule])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (rule) {
        await api.put(`/rules/${rule._id}`, formData)
      } else {
        await api.post('/rules', formData)
      }
      onSave()
    } catch (error) {
      console.error('Failed to save rule:', error)
    } finally {
      setLoading(false)
    }
  }

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setFormData(prev => ({
        ...prev,
        conditions: {
          ...prev.conditions,
          keywords: [...prev.conditions.keywords, keywordInput.trim()]
        }
      }))
      setKeywordInput('')
    }
  }

  const removeKeyword = (index) => {
    setFormData(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        keywords: prev.conditions.keywords.filter((_, i) => i !== index)
      }
    }))
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {rule ? 'Edit Rule' : 'Create New Rule'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Type
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="keyword">Keyword Detection</option>
              <option value="time">Time-based</option>
              <option value="document">Document Type</option>
              <option value="behavioral">Behavioral Analysis</option>
              <option value="frequency">Frequency-based</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        {/* Conditions */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Conditions</h4>
          
          {formData.type === 'keyword' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Enter keyword"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.conditions.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(index)}
                      className="ml-2 text-primary-600 hover:text-primary-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {formData.type === 'time' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Hour (24h format)
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.conditions.allowedHours.start}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      allowedHours: {
                        ...prev.conditions.allowedHours,
                        start: parseInt(e.target.value)
                      }
                    }
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Hour (24h format)
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={formData.conditions.allowedHours.end}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      allowedHours: {
                        ...prev.conditions.allowedHours,
                        end: parseInt(e.target.value)
                      }
                    }
                  }))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Actions</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity Level
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={formData.actions.severity}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  actions: { ...prev.actions, severity: e.target.value }
                }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <input
                type="number"
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={formData.actions.notify}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  actions: { ...prev.actions, notify: e.target.checked }
                }))}
              />
              <span className="ml-2 text-sm text-gray-700">Send notifications</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={formData.actions.block}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  actions: { ...prev.actions, block: e.target.checked }
                }))}
              />
              <span className="ml-2 text-sm text-gray-700">Block action</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={formData.actions.requireApproval}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  actions: { ...prev.actions, requireApproval: e.target.checked }
                }))}
              />
              <span className="ml-2 text-sm text-gray-700">Require approval</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              />
              <span className="ml-2 text-sm text-gray-700">Rule is active</span>
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (rule ? 'Update Rule' : 'Create Rule')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default RuleEditor
