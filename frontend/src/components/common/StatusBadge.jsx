import React from 'react'

const StatusBadge = ({ status, variant = 'default', size = 'sm' }) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'info':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'px-2 py-1 text-xs'
      case 'sm':
        return 'px-2.5 py-0.5 text-xs'
      case 'md':
        return 'px-3 py-1 text-sm'
      case 'lg':
        return 'px-4 py-2 text-base'
      default:
        return 'px-2.5 py-0.5 text-xs'
    }
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${getVariantClasses()} ${getSizeClasses()}`}>
      {status}
    </span>
  )
}

export default StatusBadge
