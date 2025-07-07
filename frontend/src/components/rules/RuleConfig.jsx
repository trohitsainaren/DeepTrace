import React, { useState, useEffect } from 'react'
import RuleEditor from './RuleEditor'
import api from '../../services/api'

const RuleConfig = () => {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingRule, setEditingRule] = useState(null)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const response = await api.get('/rules')
      setRules(response.data)
    } catch (error) {
      console.error('Failed to fetch rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleRule = async (ruleId) => {
    try {
      await api.patch(`/rules/${ruleId}/toggle`)
      fetchRules()
    } catch (error) {
      console.error('Failed to toggle rule:', error)
    }
  }

  const handleDeleteRule = async (ruleId) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await api.delete(`/rules/${ruleId}`)
        fetchRules()
      } catch (error) {
        console.error('Failed to delete rule:', error)
      }
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading rules...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Detection Rules</h2>
        <button
          onClick={() => {
            setEditingRule(null)
            setShowEditor(true)
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Add New Rule
        </button>
      </div>

      {showEditor && (
        <RuleEditor
          rule={editingRule}
          onSave={() => {
            setShowEditor(false)
            setEditingRule(null)
            fetchRules()
          }}
          onCancel={() => {
            setShowEditor(false)
            setEditingRule(null)
          }}
        />
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rule Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rules.map((rule) => (
                <tr key={rule._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                    <div className="text-sm text-gray-500">{rule.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {rule.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      rule.actions.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      rule.actions.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      rule.actions.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {rule.actions.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleRule(rule._id)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        rule.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setEditingRule(rule)
                        setShowEditor(true)
                      }}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default RuleConfig
