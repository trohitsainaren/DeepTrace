import React, { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import api from '../../services/api'

const EventTable = ({ events, onEventUpdate }) => {
  const [filter, setFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [flaggedFilter, setFlaggedFilter] = useState('')
  const [selectedEvents, setSelectedEvents] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [sortField, setSortField] = useState('createdAt')
  const [sortDirection, setSortDirection] = useState('desc')

  // Filter events based on search criteria
  const filteredEvents = events.filter(event => {
    const matchesFilter = !filter || 
      event.type.toLowerCase().includes(filter.toLowerCase()) ||
      event.userId?.username?.toLowerCase().includes(filter.toLowerCase()) ||
      event.data?.filename?.toLowerCase().includes(filter.toLowerCase()) ||
      event.data?.content?.toLowerCase().includes(filter.toLowerCase())
    
    const matchesSeverity = !severityFilter || event.severity === severityFilter
    const matchesType = !typeFilter || event.type === typeFilter
    const matchesFlagged = !flaggedFilter || 
      (flaggedFilter === 'flagged' && event.flagged) ||
      (flaggedFilter === 'unflagged' && !event.flagged)

    return matchesFilter && matchesSeverity && matchesType && matchesFlagged
  })

  // Sort events
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    let aValue = a[sortField]
    let bValue = b[sortField]

    if (sortField === 'createdAt') {
      aValue = new Date(aValue)
      bValue = new Date(bValue)
    }

    if (sortField === 'userId') {
      aValue = a.userId?.username || ''
      bValue = b.userId?.username || ''
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // Pagination
  const totalPages = Math.ceil(sortedEvents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedEvents = sortedEvents.slice(startIndex, startIndex + itemsPerPage)

  // Clear messages after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleSelectEvent = (eventId) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  const handleSelectAll = () => {
    if (selectedEvents.length === paginatedEvents.length && paginatedEvents.length > 0) {
      setSelectedEvents([])
    } else {
      setSelectedEvents(paginatedEvents.map(event => event._id))
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const validateObjectId = (id) => {
    return id && typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)
  }

  const handleBulkAction = async (action, value) => {
    if (selectedEvents.length === 0) {
      setError('No events selected')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Validate ObjectIds on frontend before sending
      const validEventIds = selectedEvents.filter(validateObjectId)

      if (validEventIds.length === 0) {
        setError('No valid event IDs selected')
        setLoading(false)
        return
      }

      if (validEventIds.length !== selectedEvents.length) {
        setError(`${selectedEvents.length - validEventIds.length} invalid event IDs were skipped`)
      }

      // Use centralized API service
      const response = await api.post('/events/bulk-action', {
        eventIds: validEventIds,
        action,
        value
      })

      if (response.status === 200) {
        setSuccessMessage(`${response.data.modifiedCount} events updated successfully`)
        onEventUpdate && onEventUpdate()
        setSelectedEvents([])
      }
    } catch (error) {
      console.error('Bulk action failed:', error)
      setError(error.response?.data?.error || 'Bulk action failed')
    } finally {
      setLoading(false)
    }
  }

  const handleEventAction = async (eventId, action) => {
    if (!validateObjectId(eventId)) {
      setError('Invalid event ID')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (action === 'view') {
        // Handle view action - could open modal or navigate
        console.log(`Viewing event ${eventId}`)
        // You could implement a modal or navigation here
        setSuccessMessage('Event details loaded')
      } else if (action === 'flag') {
        // Handle individual flag/unflag action
        const event = events.find(e => e._id === eventId)
        if (event) {
          await api.patch(`/events/${eventId}`, {
            flagged: !event.flagged
          })
          setSuccessMessage(`Event ${event.flagged ? 'unflagged' : 'flagged'} successfully`)
          onEventUpdate && onEventUpdate()
        }
      } else if (action === 'review') {
        await api.patch(`/events/${eventId}`, {
          reviewed: true
        })
        setSuccessMessage('Event marked as reviewed')
        onEventUpdate && onEventUpdate()
      }
    } catch (error) {
      console.error(`Action ${action} failed:`, error)
      setError(error.response?.data?.error || `${action} action failed`)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'clipboard': return '📋'
      case 'file_access': return '📁'
      case 'ocr_detection': return '👁️'
      case 'file_download': return '⬇️'
      case 'document_print': return '🖨️'
      default: return '📄'
    }
  }

  const clearFilters = () => {
    setFilter('')
    setSeverityFilter('')
    setTypeFilter('')
    setFlaggedFilter('')
    setCurrentPage(1)
  }

  return (
    <div className="bg-white shadow rounded-lg w-full">
      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border-l-4 border-green-400">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">❌</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search events..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          
          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="clipboard">Clipboard</option>
            <option value="file_access">File Access</option>
            <option value="ocr_detection">OCR Detection</option>
            <option value="file_download">File Download</option>
            <option value="document_print">Document Print</option>
          </select>

          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <select
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={flaggedFilter}
            onChange={(e) => setFlaggedFilter(e.target.value)}
          >
            <option value="">All Events</option>
            <option value="flagged">Flagged Only</option>
            <option value="unflagged">Unflagged Only</option>
          </select>

          <button
            onClick={clearFilters}
            className="px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
          >
            Clear Filters
          </button>
        </div>

        {/* Results Summary */}
        <div className="text-sm text-gray-600 mb-2">
          Showing {sortedEvents.length} of {events.length} events
          {(filter || severityFilter || typeFilter || flaggedFilter) && (
            <span className="ml-2 text-blue-600">(filtered)</span>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedEvents.length > 0 && (
          <div className="mt-4 flex gap-2 items-center p-3 bg-blue-50 rounded-md">
            <span className="text-sm text-blue-700 font-medium">
              {selectedEvents.length} event{selectedEvents.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => handleBulkAction('review', true)}
              disabled={loading}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Mark Reviewed'}
            </button>
            <button
              onClick={() => handleBulkAction('flag', true)}
              disabled={loading}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Flag'}
            </button>
            <button
              onClick={() => handleBulkAction('flag', false)}
              disabled={loading}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Unflag'}
            </button>
            <button
              onClick={() => setSelectedEvents([])}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedEvents.length === paginatedEvents.length && paginatedEvents.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('type')}
              >
                Type {getSortIcon('type')}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('userId')}
              >
                User {getSortIcon('userId')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Content/File
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('severity')}
              >
                Severity {getSortIcon('severity')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                Time {getSortIcon('createdAt')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedEvents.map((event) => (
              <tr 
                key={event._id} 
                className={`${event.flagged ? 'bg-red-50' : 'hover:bg-gray-50'} transition-colors duration-150`}
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event._id)}
                    onChange={() => handleSelectEvent(event._id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="mr-2 text-lg">{getTypeIcon(event.type)}</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {event.type.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-medium">
                    {event.userId?.username || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {event.userId?.department || 'No Department'}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {event.data?.filename || event.data?.content || 'No content'}
                  </div>
                  {event.data?.documentId && (
                    <div className="text-xs text-blue-600 mt-1">
                      Doc ID: {event.data.documentId}
                    </div>
                  )}
                  {event.data?.keywords && event.data.keywords.length > 0 && (
                    <div className="text-xs text-purple-600 mt-1">
                      Keywords: {event.data.keywords.join(', ')}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(event.severity)}`}>
                    {event.severity}
                  </span>
                  {(event.riskScore || event.riskScore === 0) && (
                    <div className="text-xs text-gray-500 mt-1">
                      Risk: {event.riskScore}/100
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    {event.flagged && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        🚩 Flagged
                      </span>
                    )}
                    {event.reviewed ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        ✅ Reviewed
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        ⏳ Pending
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="font-medium">
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(event.createdAt).toLocaleString()}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEventAction(event._id, 'view')}
                      className="text-primary-600 hover:text-primary-900 disabled:opacity-50"
                      disabled={loading}
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEventAction(event._id, 'flag')}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      disabled={loading}
                    >
                      {event.flagged ? 'Unflag' : 'Flag'}
                    </button>
                    {!event.reviewed && (
                      <button
                        onClick={() => handleEventAction(event._id, 'review')}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        disabled={loading}
                      >
                        Review
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedEvents.length)} of {sortedEvents.length} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page
              if (totalPages <= 5) {
                page = i + 1
              } else if (currentPage <= 3) {
                page = i + 1
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i
              } else {
                page = currentPage - 2 + i
              }
              
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded text-sm ${
                    currentPage === page 
                      ? 'bg-primary-500 text-white border-primary-500' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            })}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {sortedEvents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">
            {events.length === 0 ? 'No events found' : 'No events match your filters'}
          </div>
          <div className="text-gray-400 mb-4">
            {events.length === 0 
              ? 'Events will appear here once the agent starts monitoring' 
              : 'Try adjusting your filters or check back later'
            }
          </div>
          {(filter || severityFilter || typeFilter || flaggedFilter) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-2 text-gray-600">Processing...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventTable
