'use client'

import { useState, useEffect } from 'react'

interface WatchlistEntry {
  id: string
  fullName: string
  nationalId: string
  motherFullName?: string | null
  dateOfBirth?: string | null
  phoneNumber?: string | null
  nationality?: string | null
  governorate?: string | null
  reason: string
  flagType: string
  severity: string
  notes: string | null
  isActive: boolean
  createdAt: string
}

type SortField = 'fullName' | 'nationalId' | 'governorate' | 'severity' | 'reason' | 'flagType' | 'createdAt'
type SortDirection = 'asc' | 'desc'

export default function WatchlistTab() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  
  // Individual column filters
  const [nameFilter, setNameFilter] = useState('')
  const [idFilter, setIdFilter] = useState('')
  const [governorateFilter, setGovernorateFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [flagTypeFilter, setFlagTypeFilter] = useState<string>('all')
  const [reasonFilter, setReasonFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  
  // Global search
  const [globalSearch, setGlobalSearch] = useState('')
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    fetchWatchlist()
  }, [])

  const fetchWatchlist = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        setLoading(false)
        return
      }

      const response = await fetch('${process.env.NEXT_PUBLIC_API_URL}/api/watchlist?isActive=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        const watchlistData = result.data || result
        setWatchlist(Array.isArray(watchlistData) ? watchlistData : [])
      } else {
        console.error('Failed to fetch watchlist:', response.statusText)
        setWatchlist([])
      }
    } catch (error) {
      console.error('Failed to fetch watchlist:', error)
      setWatchlist([])
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getFilteredAndSortedWatchlist = () => {
    let filtered = watchlist

    // Global search across all fields
    if (globalSearch.trim()) {
      const searchLower = globalSearch.toLowerCase()
      filtered = filtered.filter(entry =>
        entry.fullName.toLowerCase().includes(searchLower) ||
        entry.nationalId.toLowerCase().includes(searchLower) ||
        entry.reason.toLowerCase().includes(searchLower) ||
        entry.flagType.toLowerCase().includes(searchLower) ||
        entry.severity.toLowerCase().includes(searchLower) ||
        (entry.motherFullName && entry.motherFullName.toLowerCase().includes(searchLower)) ||
        (entry.phoneNumber && entry.phoneNumber.toLowerCase().includes(searchLower)) ||
        (entry.nationality && entry.nationality.toLowerCase().includes(searchLower)) ||
        (entry.governorate && entry.governorate.toLowerCase().includes(searchLower)) ||
        (entry.notes && entry.notes.toLowerCase().includes(searchLower))
      )
    }

    // Filter by name
    if (nameFilter.trim()) {
      filtered = filtered.filter(entry =>
        entry.fullName.toLowerCase().includes(nameFilter.toLowerCase())
      )
    }

    // Filter by national ID
    if (idFilter.trim()) {
      filtered = filtered.filter(entry =>
        entry.nationalId.toLowerCase().includes(idFilter.toLowerCase())
      )
    }

    // Filter by governorate
    if (governorateFilter !== 'all') {
      filtered = filtered.filter(entry => entry.governorate === governorateFilter)
    }

    // Filter by severity
    if (severityFilter !== 'all') {
      filtered = filtered.filter(entry => entry.severity === severityFilter)
    }

    // Filter by flag type
    if (flagTypeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.flagType === flagTypeFilter)
    }

    // Filter by reason
    if (reasonFilter.trim()) {
      filtered = filtered.filter(entry =>
        entry.reason.toLowerCase().includes(reasonFilter.toLowerCase())
      )
    }

    // Filter by date
    if (dateFilter.trim()) {
      filtered = filtered.filter(entry =>
        entry.createdAt.includes(dateFilter)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'createdAt') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }

  const clearAllFilters = () => {
    setGlobalSearch('')
    setNameFilter('')
    setIdFilter('')
    setGovernorateFilter('all')
    setSeverityFilter('all')
    setFlagTypeFilter('all')
    setReasonFilter('')
    setDateFilter('')
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  const filteredWatchlist = getFilteredAndSortedWatchlist()
  const hasActiveFilters = globalSearch || nameFilter || idFilter || governorateFilter || severityFilter !== 'all' || flagTypeFilter !== 'all' || reasonFilter || dateFilter

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Internal Watchlist</h2>
              <p className="text-sm text-gray-600">Read-only access • {filteredWatchlist.length} entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition flex items-center gap-2 ${
                hasActiveFilters 
                  ? 'text-orange-700 bg-orange-50 hover:bg-orange-100' 
                  : 'text-gray-400 bg-gray-50 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
            <button
              onClick={fetchWatchlist}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Global Search */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative">
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search across all fields (name, ID, reason, flag type, etc.)..."
            className="w-full px-4 py-3 pl-11 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
          />
          <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <p className="mt-2 text-gray-600">Loading watchlist...</p>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-lg font-medium">No watchlist entries</p>
            <p className="text-sm mt-2">The watchlist is currently empty</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('fullName')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-orange-600 transition"
                      >
                        Full Name
                        {getSortIcon('fullName')}
                      </button>
                      <input
                        type="text"
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        placeholder="Filter name..."
                        className="mt-2 w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('nationalId')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-orange-600 transition"
                      >
                        National ID
                        {getSortIcon('nationalId')}
                      </button>
                      <input
                        type="text"
                        value={idFilter}
                        onChange={(e) => setIdFilter(e.target.value)}
                        placeholder="Filter ID..."
                        className="mt-2 w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('governorate')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-orange-600 transition"
                      >
                        Governorate
                        {getSortIcon('governorate')}
                      </button>
                      <select
                        value={governorateFilter}
                        onChange={(e) => setGovernorateFilter(e.target.value)}
                        className="mt-2 w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="all">All Governorates</option>
                        <option value="Duhok">Duhok</option>
                        <option value="Erbil">Erbil</option>
                        <option value="Sulaymaniyah">Sulaymaniyah</option>
                        <option value="Halabja">Halabja</option>
                        <option value="Baghdad">Baghdad</option>
                        <option value="Basra">Basra</option>
                        <option value="Mosul">Mosul</option>
                        <option value="Kirkuk">Kirkuk</option>
                        <option value="Anbar">Anbar</option>
                        <option value="Najaf">Najaf</option>
                        <option value="Karbala">Karbala</option>
                        <option value="Babil">Babil</option>
                        <option value="Diyala">Diyala</option>
                        <option value="Wasit">Wasit</option>
                        <option value="Saladin">Saladin</option>
                        <option value="Maysan">Maysan</option>
                        <option value="Dhi Qar">Dhi Qar</option>
                        <option value="Muthanna">Muthanna</option>
                        <option value="Qadisiyyah">Qadisiyyah</option>
                      </select>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('severity')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-orange-600 transition"
                      >
                        Severity
                        {getSortIcon('severity')}
                      </button>
                      <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        className="mt-2 w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="all">All Levels</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('reason')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-orange-600 transition"
                      >
                        Reason
                        {getSortIcon('reason')}
                      </button>
                      <input
                        type="text"
                        value={reasonFilter}
                        onChange={(e) => setReasonFilter(e.target.value)}
                        placeholder="Filter reason..."
                        className="mt-2 w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('flagType')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-orange-600 transition"
                      >
                        Flag Type
                        {getSortIcon('flagType')}
                      </button>
                      <select
                        value={flagTypeFilter}
                        onChange={(e) => setFlagTypeFilter(e.target.value)}
                        className="mt-2 w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      >
                        <option value="all">All Types</option>
                        <option value="SECURITY_CONCERN">Security Concern</option>
                        <option value="OVERSTAY">Overstay</option>
                        <option value="FRAUD">Fraud</option>
                        <option value="DUPLICATE">Duplicate</option>
                      </select>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-orange-600 transition"
                      >
                        Added Date
                        {getSortIcon('createdAt')}
                      </button>
                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="mt-2 w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Notes
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredWatchlist.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <p className="text-lg font-medium">No matching entries found</p>
                          <p className="text-sm mt-2">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredWatchlist.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{entry.fullName}</div>
                          {entry.motherFullName && (
                            <div className="text-xs text-gray-500 mt-0.5">Mother: {entry.motherFullName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-mono text-sm text-gray-900">{entry.nationalId}</div>
                          {entry.phoneNumber && (
                            <div className="text-xs text-gray-500 mt-0.5">{entry.phoneNumber}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {entry.governorate ? (
                            <div className="text-sm text-gray-900">{entry.governorate}</div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${getSeverityColor(entry.severity)}`}>
                            {entry.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700 font-medium max-w-xs">{entry.reason}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {entry.flagType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </div>
                          {entry.dateOfBirth && (
                            <div className="text-xs text-gray-500 mt-0.5">DOB: {new Date(entry.dateOfBirth).toLocaleDateString()}</div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
