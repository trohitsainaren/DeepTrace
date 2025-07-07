/* eslint-disable no-unused-vars */
import React from 'react'

const UserActivity = ({ stats }) => {
  if (!stats || !stats.topUsers) return <div>Loading user activity...</div>

  return (
    <div className="space-y-6">
      {/* Top Users by Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Users by Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flagged Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.topUsers.map((user, index) => {
                const riskLevel = user.flaggedCount > 5 ? 'High' : user.flaggedCount > 2 ? 'Medium' : 'Low'
                const riskColor = riskLevel === 'High' ? 'text-red-600' : riskLevel === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                
                return (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-gray-600">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.username}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.department || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.eventCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.flaggedCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${riskColor}`}>
                        {riskLevel}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Heatmap</h3>
        <div className="grid grid-cols-7 gap-1">
          {/* Days of week header */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
              {day}
            </div>
          ))}
          
          {/* Activity cells - This would be populated with real data */}
          {Array.from({ length: 35 }, (_, i) => {
            const intensity = Math.floor(Math.random() * 4) // 0-3 intensity levels
            const bgColor = intensity === 0 ? 'bg-gray-100' : 
                           intensity === 1 ? 'bg-green-200' :
                           intensity === 2 ? 'bg-green-400' : 'bg-green-600'
            
            return (
              <div
                key={i}
                className={`w-8 h-8 rounded ${bgColor} cursor-pointer hover:opacity-80`}
                title={`${intensity} events`}
              />
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-100 rounded"></div>
            <div className="w-3 h-3 bg-green-200 rounded"></div>
            <div className="w-3 h-3 bg-green-400 rounded"></div>
            <div className="w-3 h-3 bg-green-600 rounded"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  )
}

export default UserActivity
