'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ApplicationReviewModal from './ApplicationReviewModal'
import WatchlistTab from './WatchlistTab'

// Governorates for filtering
const IRAQ_GOVERNORATES = [
  'Baghdad',
  'Basra',
  'Nineveh',
  'Dhi Qar',
  'Al-Anbar',
  'Babylon',
  'Diyala',
  'Karbala',
  'Kirkuk',
  'Maysan',
  'Muthanna',
  'Najaf',
  'Qadisiyyah',
  'Salah al-Din',
  'Wasit'
]

const KRG_GOVERNORATES = [
  'Erbil',
  'Sulaymaniyah',
  'Dohuk',
  'Halabja'
]

// Check authentication
function useAuth() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')

      if (!token || !user) {
        router.push('/login')
        return
      }

      const userData = JSON.parse(user)
      if (userData.role !== 'OFFICER' && userData.role !== 'SUPERVISOR' && userData.role !== 'DIRECTOR') {
        router.push('/login')
      }
    }
  }, [router])
}

interface Application {
  id: string
  referenceNumber: string
  fullName: string
  motherFullName?: string | null
  gender?: string
  nationalId: string
  phoneNumber: string
  email: string | null
  dateOfBirth: string
  nationality: string
  originGovernorate: string
  destinationGovernorate: string
  visitPurpose: string
  visitStartDate: string
  visitEndDate: string
  declaredAccommodation: string | null
  status: string
  priorityLevel: string
  securityRiskScore: number
  securityFlags: string | null
  createdAt: string
  processingDeadline: string | null
  documents?: Array<{
    id: string
    documentType: string
    fileName: string
    fileUrl: string
    uploadedAt: string
  }>
}

export default function OfficerDashboard() {
  useAuth() // Check authentication

  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'watchlist'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [userName, setUserName] = useState('Officer')
  const [currentTime, setCurrentTime] = useState('')
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    documentsRequested: 0,
    today: 0,
    thisWeek: 0,
    reviewedToday: 0,
    reviewedThisWeek: 0,
    avgReviewTime: 0
  })
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    governorate: '',
    dateFrom: '',
    dateTo: '',
    riskScoreMin: '',
    riskScoreMax: ''
  })

  useEffect(() => {
    // Set user name from localStorage (client-side only)
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        setUserName(userData.fullName || 'Officer')
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }

    fetchApplications()
    const interval = setInterval(fetchApplications, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  // Update current time every second on client side only
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString())
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/applications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        const apps: Application[] = result.data

        // Filter applications based on user role and active tab
        let filteredApps = apps
        switch (activeTab) {
          case 'pending':
            filteredApps = apps.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW')
            break
          case 'approved':
            filteredApps = apps.filter(a => a.status === 'APPROVED')
            break
          case 'rejected':
            filteredApps = apps.filter(a => a.status === 'REJECTED')
            break
          case 'all':
            // Show all applications
            break
        }

        setApplications(filteredApps)

        // Calculate stats
        const pending = apps.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length
        const approved = apps.filter(a => a.status === 'APPROVED').length
        const rejected = apps.filter(a => a.status === 'REJECTED').length
        const documentsRequested = apps.filter(a => a.status === 'PENDING_DOCUMENTS').length

        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const today = apps.filter(a => {
          const created = new Date(a.createdAt)
          return created.toDateString() === now.toDateString()
        }).length

        const thisWeek = apps.filter(a => {
          const created = new Date(a.createdAt)
          return created >= weekStart
        }).length

        // Calculate reviewed today and this week (APPROVED or REJECTED)
        const reviewedToday = apps.filter(a => {
          const updated = new Date(a.createdAt) // In production, use updatedAt
          return (a.status === 'APPROVED' || a.status === 'REJECTED') && updated >= todayStart
        }).length

        const reviewedThisWeek = apps.filter(a => {
          const updated = new Date(a.createdAt) // In production, use updatedAt
          return (a.status === 'APPROVED' || a.status === 'REJECTED') && updated >= weekStart
        }).length

        let avgReviewTime = 0
        if (reviewedThisWeek > 0) {
          const reviewedApps = apps.filter(a => {
            const updated = new Date(a.createdAt)
            return (a.status === 'APPROVED' || a.status === 'REJECTED') && updated >= weekStart
          })

          if (reviewedApps.length > 0) {
            const totalHours = reviewedApps.reduce((sum, app) => {
              const created = new Date(app.createdAt)
              const reviewed = new Date() // In production, use approvalDate or rejectionDate
              const hours = (reviewed.getTime() - created.getTime()) / (1000 * 60 * 60)
              return sum + Math.min(hours, 240) // Cap at 10 days for realistic average
            }, 0)
            avgReviewTime = totalHours / reviewedApps.length
          }
        }

        setStats({
          pending,
          approved,
          rejected,
          documentsRequested,
          today,
          thisWeek,
          reviewedToday,
          reviewedThisWeek,
          avgReviewTime
        })
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredApplications = () => {
    let filtered = applications

    // Filter by tab
    switch (activeTab) {
      case 'pending':
        filtered = applications.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW')
        break
      case 'approved':
        filtered = applications.filter(a => a.status === 'APPROVED')
        break
      case 'rejected':
        filtered = applications.filter(a => a.status === 'REJECTED')
        break
      case 'all':
        // Show all
        break
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(a =>
        a.fullName.toLowerCase().includes(query) ||
        a.nationalId.toLowerCase().includes(query) ||
        a.referenceNumber.toLowerCase().includes(query) ||
        a.phoneNumber.includes(query)
      )
    }

    // Advanced filters
    if (filters.status) {
      filtered = filtered.filter(a => a.status === filters.status)
    }
    if (filters.priority) {
      filtered = filtered.filter(a => a.priorityLevel === filters.priority)
    }
    if (filters.governorate) {
      filtered = filtered.filter(a => a.originGovernorate === filters.governorate)
    }
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filtered = filtered.filter(a => new Date(a.createdAt) >= fromDate)
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      toDate.setHours(23, 59, 59, 999) // End of day
      filtered = filtered.filter(a => new Date(a.createdAt) <= toDate)
    }
    if (filters.riskScoreMin) {
      const minScore = parseInt(filters.riskScoreMin)
      filtered = filtered.filter(a => a.securityRiskScore >= minScore)
    }
    if (filters.riskScoreMax) {
      const maxScore = parseInt(filters.riskScoreMax)
      filtered = filtered.filter(a => a.securityRiskScore <= maxScore)
    }

    // Sort applications
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'priority':
          // Sort by priority level first, then by risk score, then by deadline
          const priorityOrder: Record<string, number> = { 'URGENT': 0, 'HIGH': 1, 'NORMAL': 2, 'LOW': 3 }
          const aPriority = priorityOrder[a.priorityLevel] || 2
          const bPriority = priorityOrder[b.priorityLevel] || 2
          if (aPriority !== bPriority) return aPriority - bPriority
          // If same priority, sort by risk score (higher first)
          if (a.securityRiskScore !== b.securityRiskScore) {
            return b.securityRiskScore - a.securityRiskScore
          }
          // If same risk, sort by deadline (sooner first)
          if (a.processingDeadline && b.processingDeadline) {
            return new Date(a.processingDeadline).getTime() - new Date(b.processingDeadline).getTime()
          }
          return 0
        default:
          return 0
      }
    })

    return filtered
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SUBMITTED: 'bg-blue-100 text-blue-800',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PENDING_DOCUMENTS: 'bg-orange-100 text-orange-800',
      ACTIVE: 'bg-purple-100 text-purple-800',
      EXPIRED: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600 font-bold'
    if (score >= 50) return 'text-orange-600 font-semibold'
    if (score >= 30) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getTimeRemaining = (deadline: string | null) => {
    if (!deadline) return null
    const now = new Date()
    const end = new Date(deadline)
    const hours = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60))

    if (hours < 0) return <span className="text-red-600 font-bold">OVERDUE</span>
    if (hours < 12) return <span className="text-red-600">{hours}h remaining</span>
    if (hours < 24) return <span className="text-orange-600">{hours}h remaining</span>
    return <span className="text-gray-600">{Math.floor(hours / 24)}d remaining</span>
  }

  const filteredApps = getFilteredApplications()

  const navItems = [
    {
      id: 'pending' as const,
      label: 'Pending Review',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      count: stats.pending,
      color: 'yellow'
    },
    {
      id: 'approved' as const,
      label: 'Approved',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      count: stats.approved,
      color: 'green'
    },
    {
      id: 'rejected' as const,
      label: 'Rejected',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      count: stats.rejected,
      color: 'red'
    },
    {
      id: 'watchlist' as const,
      label: 'Watchlist',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      count: 0,
      color: 'orange'
    },
    {
      id: 'all' as const,
      label: 'All Applications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      count: applications.length,
      color: 'blue'
    }
  ]

  const getNavItemColors = (color: string, isActive: boolean) => {
    const colors = {
      yellow: isActive
        ? 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-900'
        : 'text-gray-700 hover:bg-yellow-50 hover:text-yellow-900',
      green: isActive
        ? 'bg-green-50 border-l-4 border-green-500 text-green-900'
        : 'text-gray-700 hover:bg-green-50 hover:text-green-900',
      red: isActive
        ? 'bg-red-50 border-l-4 border-red-500 text-red-900'
        : 'text-gray-700 hover:bg-red-50 hover:text-red-900',
      orange: isActive
        ? 'bg-orange-50 border-l-4 border-orange-500 text-orange-900'
        : 'text-gray-700 hover:bg-orange-50 hover:text-orange-900',
      blue: isActive
        ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-900'
        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-900',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedApps.size === filteredApps.length) {
      setSelectedApps(new Set())
    } else {
      setSelectedApps(new Set(filteredApps.map(app => app.id)))
    }
  }

  const handleSelectApp = (appId: string) => {
    const newSelected = new Set(selectedApps)
    if (newSelected.has(appId)) {
      newSelected.delete(appId)
    } else {
      newSelected.add(appId)
    }
    setSelectedApps(newSelected)
  }

  // Bulk actions
  const handleBulkApprove = async () => {
    if (selectedApps.size === 0) return

    setBulkActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Authentication required')
        return
      }

      const promises = Array.from(selectedApps).map(appId =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/applications/${appId}/approve`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      )

      const results = await Promise.allSettled(promises)
      const successCount = results.filter(result => result.status === 'fulfilled').length
      const failCount = results.length - successCount

      if (successCount > 0) {
        alert(`Successfully approved ${successCount} application${successCount > 1 ? 's' : ''}`)
      }
      if (failCount > 0) {
        alert(`Failed to approve ${failCount} application${failCount > 1 ? 's' : ''}`)
      }

      setSelectedApps(new Set())
      fetchApplications()
    } catch (error) {
      console.error('Bulk approve error:', error)
      alert('Failed to perform bulk approval')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkReject = async () => {
    if (selectedApps.size === 0) return

    const reason = prompt('Please enter rejection reason:')
    if (!reason || !reason.trim()) return

    setBulkActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Authentication required')
        return
      }

      const promises = Array.from(selectedApps).map(appId =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/applications/${appId}/reject`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason: reason.trim() })
        })
      )

      const results = await Promise.allSettled(promises)
      const successCount = results.filter(result => result.status === 'fulfilled').length
      const failCount = results.length - successCount

      if (successCount > 0) {
        alert(`Successfully rejected ${successCount} application${successCount > 1 ? 's' : ''}`)
      }
      if (failCount > 0) {
        alert(`Failed to reject ${failCount} application${failCount > 1 ? 's' : ''}`)
      }

      setSelectedApps(new Set())
      fetchApplications()
    } catch (error) {
      console.error('Bulk reject error:', error)
      alert('Failed to perform bulk rejection')
    } finally {
      setBulkActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white shadow-lg border-r flex flex-col transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Sidebar Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div className="text-white">
              <h1 className="text-lg font-bold">Officer Portal</h1>
              <p className="text-xs text-blue-100">Application Management</p>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-white">
            <p className="text-xs text-blue-100">Logged in as</p>
            <p className="font-semibold text-sm truncate">
              {userName}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
            Application Queue
          </p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${getNavItemColors(item.color, activeTab === item.id)}`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === item.id
                  ? 'bg-white/50'
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {item.count}
              </span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t space-y-2">
          <button
            onClick={fetchApplications}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              router.push('/login')
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">

        {/* Header */}
        <header className="bg-white shadow-sm border-b px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900 flex items-center gap-2 lg:gap-3 flex-wrap">
                  {navItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
                  {!loading && activeTab !== 'watchlist' && (
                    <span className="px-2 lg:px-3 py-1 bg-blue-100 text-blue-800 text-xs lg:text-sm font-semibold rounded-full">
                      {filteredApps.length}
                    </span>
                  )}
                </h2>
                <p className="text-xs lg:text-sm text-gray-600 mt-1">
                  {activeTab === 'watchlist'
                    ? 'Internal security watchlist - read-only access'
                    : `Manage and review applications efficiently`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {currentTime}
              </div>
              {activeTab !== 'watchlist' && filteredApps.length > 0 && (
                <button
                  onClick={() => {
                    const csvContent = [
                      ['Reference', 'Name', 'National ID', 'Status', 'Origin', 'Destination', 'Purpose', 'Risk Score'].join(','),
                      ...filteredApps.map(app =>
                        [app.referenceNumber, app.fullName, app.nationalId, app.status, app.originGovernorate, app.destinationGovernorate, app.visitPurpose, app.securityRiskScore].join(',')
                      )
                    ].join('\n')
                    const blob = new Blob([csvContent], { type: 'text/csv' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `applications-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`
                    a.click()
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {/* Quick Alerts */}
          {stats.pending > 10 && activeTab === 'pending' && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg p-4 mb-6 flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-semibold text-yellow-900">High Volume Alert</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  You have {stats.pending} pending applications. Consider prioritizing urgent cases and applications nearing their processing deadline.
                </p>
              </div>
            </div>
          )}

          {stats.today > 5 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6 flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-900">Daily Activity Update</h4>
                <p className="text-sm text-blue-800 mt-1">
                  {stats.today} new applications received today. System is operating normally.
                </p>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 lg:mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Reviewed Today</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{stats.reviewedToday}</p>
                <p className="text-xs text-blue-600 mt-1">Applications processed</p>
              </div>
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Approved</p>
                <p className="text-3xl font-bold text-green-900 mt-2">{stats.approved}</p>
                <p className="text-xs text-green-600 mt-1">Total approved</p>
              </div>
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-md p-6 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Rejected</p>
                <p className="text-3xl font-bold text-red-900 mt-2">{stats.rejected}</p>
                <p className="text-xs text-red-600 mt-1">Total rejected</p>
              </div>
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-md p-6 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Pending</p>
                <p className="text-3xl font-bold text-yellow-900 mt-2">{stats.pending}</p>
                <p className="text-xs text-yellow-600 mt-1">Awaiting review</p>
              </div>
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          </div>

          {/* Search and Sort Bar for Applications */}
          {activeTab !== 'watchlist' && (
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, national ID, reference number, or phone..."
                    className="w-full pl-10 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'priority')}
                    className="w-full sm:w-auto px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="priority">Priority (Urgent → Low)</option>
                  </select>
                </div>
              </div>

              {/* Advanced Filters Toggle */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition"
                >
                  <svg className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Advanced Filters
                  {Object.values(filters).some(v => v) && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Active
                    </span>
                  )}
                </button>
              </div>

              {/* Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">All Statuses</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="UNDER_REVIEW">Under Review</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="PENDING_DOCUMENTS">Pending Documents</option>
                        <option value="ACTIVE">Active</option>
                        <option value="EXPIRED">Expired</option>
                      </select>
                    </div>

                    {/* Priority Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <select
                        value={filters.priority}
                        onChange={(e) => setFilters({...filters, priority: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">All Priorities</option>
                        <option value="URGENT">Urgent</option>
                        <option value="HIGH">High</option>
                        <option value="NORMAL">Normal</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>

                    {/* Governorate Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Governorate</label>
                      <select
                        value={filters.governorate}
                        onChange={(e) => setFilters({...filters, governorate: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="">All Governorates</option>
                        {[...IRAQ_GOVERNORATES, ...KRG_GOVERNORATES].map(gov => (
                          <option key={gov} value={gov}>{gov}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date From */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Date To */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Risk Score Min */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Risk Score Min</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={filters.riskScoreMin}
                        onChange={(e) => setFilters({...filters, riskScoreMin: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>

                    {/* Risk Score Max */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Risk Score Max</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={filters.riskScoreMax}
                        onChange={(e) => setFilters({...filters, riskScoreMax: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="100"
                      />
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setFilters({
                        status: '',
                        priority: '',
                        governorate: '',
                        dateFrom: '',
                        dateTo: '',
                        riskScoreMin: '',
                        riskScoreMax: ''
                      })}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content Area */}
        {activeTab === 'watchlist' ? (
          <WatchlistTab />
        ) : (
          <>
            {/* Bulk Actions Bar */}
            {selectedApps.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-blue-900">
                    {selectedApps.size} application{selectedApps.size > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleBulkApprove}
                    disabled={bulkActionLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkActionLoading && (
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Approve Selected
                  </button>
                  <button
                    onClick={handleBulkReject}
                    disabled={bulkActionLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkActionLoading && (
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject Selected
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow">
              <div className="px-4 lg:px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Application Queue ({filteredApps.length})
                  </h2>
                  {filteredApps.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {selectedApps.size === filteredApps.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading applications...</p>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="p-16 text-center text-gray-500">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No applications found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery
                    ? 'Try adjusting your search terms or filters'
                    : activeTab === 'pending'
                    ? 'All applications have been processed'
                    : `No ${activeTab} applications at this time`
                  }
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    className={`p-6 hover:bg-gray-50 cursor-pointer transition ${selectedApps.has(app.id) ? 'bg-blue-50' : ''}`}
                    onClick={(e) => {
                      // Don't open modal if clicking checkbox
                      if ((e.target as HTMLElement).type === 'checkbox') return
                      setSelectedApp(app)
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedApps.has(app.id)}
                          onChange={() => handleSelectApp(app.id)}
                          className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {app.fullName}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                            {app.status.replace('_', ' ')}
                          </span>
                          {app.priorityLevel && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              app.priorityLevel === 'URGENT' ? 'bg-red-100 text-red-800' :
                              app.priorityLevel === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                              app.priorityLevel === 'NORMAL' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {app.priorityLevel}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                            <span>National ID: {app.nationalId}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>Phone: {app.phoneNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>From: {app.originGovernorate} → To: {app.destinationGovernorate}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 8v4a2 2 0 002 2h4a2 2 0 002-2v-4m0-4V7a2 2 0 012-2h4a2 2 0 012 2v4M9 7h6m0 0v4a2 2 0 01-2 2H9a2 2 0 01-2-2V7" />
                            </svg>
                            <span>Purpose: {app.visitPurpose.replace('_', ' ')}</span>
                          </div>
                          {/* Document Status Indicator */}
                          <div className="flex items-center gap-2">
                            <svg className={`w-4 h-4 ${app.documents && app.documents.length > 0 ? 'text-green-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className={app.documents && app.documents.length > 0 ? 'text-green-600 font-medium' : 'text-gray-500'}>
                              Documents: {app.documents ? app.documents.length : 0} uploaded
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-gray-600">Submitted:</span>
                          <span>{new Date(app.createdAt).toLocaleDateString()}</span>
                          {app.processingDeadline && (
                            <>
                              <span className="text-gray-600 ml-4">Deadline:</span>
                              <span className={`font-medium ${getTimeRemaining(app.processingDeadline) ? 'text-red-600' : 'text-gray-600'}`}>
                                {new Date(app.processingDeadline).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedApp(app)
                          }}
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm hover:shadow flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Review
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard.writeText(app.referenceNumber)
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 transition"
                            title="Copy Reference Number"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <div className="flex items-center gap-1 text-sm">
                            <span className="text-gray-500">Risk:</span>
                            <span className={`font-medium ${getRiskColor(app.securityRiskScore)}`}>
                              {app.securityRiskScore}/100
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </>
        )}
        </main>
      </div>

      {/* Application Review Modal */}
      {selectedApp && (
        <ApplicationReviewModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdate={fetchApplications}
        />
      )}
    </div>
  )
}