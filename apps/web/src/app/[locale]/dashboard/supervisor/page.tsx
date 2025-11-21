'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ApplicationReviewModal from '../officer/ApplicationReviewModal';
import {
  Activity,
  Users,
  FileText,
  AlertTriangle,
  Settings,
  RefreshCw,
  UserCheck,
  Clock,
  Shield,
  Plus,
  Trash2,
  BarChart3,
  LogOut,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface SupervisorData {
  summary: {
    totalApplications: number;
    unassignedApplications: number;
    totalOfficers: number;
    watchlistMatches: number;
    statusBreakdown: Record<string, number>;
  };
  officerWorkload: Array<{
    officer: {
      id: string;
      name: string;
      email: string;
      lastLogin: string | null;
    };
    stats: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      avgProcessingHours: number;
      efficiency: number;
    };
  }>;
  recentAssignments: Array<{
    id: string;
    referenceNumber: string;
    applicant: string;
    officer: string;
    status: string;
    assignedAt: string;
    createdAt: string;
  }>;
  activeOfficers: number;
}

interface WatchlistEntry {
  id: string;
  nationalId: string;
  fullName: string;
  reason: string;
  flagType: string;
  severity: string;
  isActive: boolean;
  createdAt: string;
  motherFullName?: string | null;
  phoneNumber?: string | null;
  nationality?: string | null;
  governorate?: string | null;
  notes?: string | null;
  dateOfBirth?: string | null;
}

type Section = 'overview' | 'workload' | 'applications' | 'assignments' | 'watchlist' | 'settings';

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#3b82f6',
  UNDER_REVIEW: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  ACTIVE: '#8b5cf6',
  PENDING_DOCUMENTS: '#f59e0b',
};

export default function SupervisorDashboard() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [data, setData] = useState<SupervisorData | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const [newEntry, setNewEntry] = useState({
    nationalId: '',
    fullName: '',
    reason: '',
    flagType: 'SECURITY_CONCERN',
    severity: 'MEDIUM',
    motherFullName: '',
    dateOfBirth: '',
    phoneNumber: '',
    nationality: '',
    notes: '',
  });

  // Watchlist filters
  const [watchlistSearch, setWatchlistSearch] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [idFilter, setIdFilter] = useState('');
  const [governorateFilter, setGovernorateFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [flagTypeFilter, setFlagTypeFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<'fullName' | 'nationalId' | 'governorate' | 'severity' | 'reason' | 'flagType' | 'createdAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [assignmentAlgorithm, setAssignmentAlgorithm] = useState('round-robin');
  const [maxApplicationsPerOfficer, setMaxApplicationsPerOfficer] = useState(10);

  // Applications review state
  const [dailyApplications, setDailyApplications] = useState<any[]>([]);
  const [applicationStats, setApplicationStats] = useState({
    totalToday: 0,
    pending: 0,
    withDocuments: 0,
    pendingDocuments: 0
  });

  useEffect(() => {
    fetchData();
    fetchAutoAssignConfig();
    fetchDailyApplications();
    const interval = autoRefresh ? setInterval(fetchData, 30000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/en/login');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const [supervisorRes, watchlistRes] = await Promise.all([
        fetch(`${apiUrl}/api/analytics/supervisor`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/api/watchlist`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (supervisorRes.ok) {
        const result = await supervisorRes.json();
        setData(result.data);
      }

      if (watchlistRes.ok) {
        const watchlistResult = await watchlistRes.json();
        const watchlistData = watchlistResult.data || watchlistResult; // Handle both formats
        console.log('Watchlist data received:', watchlistData);
        setWatchlist(Array.isArray(watchlistData) ? watchlistData.filter((e: WatchlistEntry) => e.isActive) : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAutoAssignConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/auto-assign/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setAutoAssignEnabled(result.data.enabled);
          setAssignmentAlgorithm(result.data.algorithm);
          setMaxApplicationsPerOfficer(result.data.maxApplicationsPerOfficer);
        }
      }
    } catch (error) {
      console.error('Error fetching auto-assign config:', error);
    }
  };

  const fetchDailyApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // Fetch ALL applications for supervisor review (not just today's)
      // Supervisors need to see all applications that need review
      const response = await fetch(`${apiUrl}/api/applications?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const allApps = result.data || [];
          
          // Filter to show today's applications for the "Today's Applications" section
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const todayApps = allApps.filter((app: any) => {
            const created = new Date(app.createdAt);
            return created >= today && created < tomorrow;
          });
          
          // Filter to pending applications (all pending, not just today's)
          const pendingApps = allApps.filter((app: any) => 
            app.status === 'SUBMITTED' || 
            app.status === 'UNDER_REVIEW' || 
            app.status === 'PENDING_DOCUMENTS'
          );
          
          // Show today's applications in the list (but if none today, show all pending)
          const appsToShow = todayApps.length > 0 ? todayApps : pendingApps.slice(0, 50);
          setDailyApplications(appsToShow);
          
          // Calculate stats from the applications being shown
          setApplicationStats({
            totalToday: todayApps.length,
            pending: appsToShow.filter((a: any) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length,
            withDocuments: appsToShow.filter((a: any) => a.documents && a.documents.length > 0).length,
            pendingDocuments: appsToShow.filter((a: any) => a.status === 'PENDING_DOCUMENTS').length
          });
        }
      } else {
        // Fallback: try the daily endpoint
        const dailyResponse = await fetch(`${apiUrl}/api/applications/supervisor/daily`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (dailyResponse.ok) {
          const result = await dailyResponse.json();
          if (result.success) {
            setDailyApplications(result.data);
            setApplicationStats(result.summary || {
              totalToday: 0,
              pending: 0,
              withDocuments: 0,
              pendingDocuments: 0
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching daily applications:', error);
    }
  };

  const saveAutoAssignSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/auto-assign/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: autoAssignEnabled,
          algorithm: assignmentAlgorithm,
          maxApplicationsPerOfficer,
        }),
      });

      if (response.ok) {
        alert('Settings saved successfully!');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    }
  };

  const triggerAutoAssignment = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/auto-assign/trigger`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Auto-assignment complete! Assigned ${result.data.assigned} of ${result.data.total} applications`);
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(error.error?.message || 'Failed to trigger auto-assignment');
      }
    } catch (error) {
      console.error('Error triggering auto-assignment:', error);
      alert('Error triggering auto-assignment');
    }
  };

  const handleAddWatchlistEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newEntry.nationalId || !newEntry.fullName || !newEntry.reason) {
      alert('❌ Please fill in all required fields: National ID, Full Name, and Reason');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('❌ Authentication required. Please login again.');
        router.push('/en/login');
        return;
      }

      console.log('Sending watchlist entry:', newEntry);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEntry),
      });

      const result = await response.json();
      console.log('Watchlist API response:', result);

      if (response.ok && result.success) {
        alert('✅ Watchlist entry added successfully!');
        setNewEntry({
          nationalId: '',
          fullName: '',
          reason: '',
          flagType: 'SECURITY_CONCERN',
          severity: 'MEDIUM',
          motherFullName: '',
          dateOfBirth: '',
          phoneNumber: '',
          nationality: '',
          notes: '',
        });
        fetchData();
      } else {
        alert(`❌ Failed to add watchlist entry: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding watchlist entry:', error);
      alert('❌ Error adding watchlist entry. Please check your connection and try again.');
    }
  };

  const handleRemoveWatchlistEntry = async (id: string) => {
    if (!confirm('Are you sure you want to remove this entry from the watchlist?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('❌ Authentication required. Please login again.');
        router.push('/en/login');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/watchlist/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert('✅ Watchlist entry removed successfully!');
        fetchData();
      } else {
        alert(`❌ Failed to remove watchlist entry: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error removing watchlist entry:', error);
      alert('❌ Error removing watchlist entry. Please check your connection and try again.');
    }
  };

  const handleSort = (field: 'fullName' | 'nationalId' | 'governorate' | 'severity' | 'reason' | 'flagType' | 'createdAt') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getFilteredAndSortedWatchlist = () => {
    let filtered = watchlist;

    // Global search across all fields
    if (watchlistSearch.trim()) {
      const searchLower = watchlistSearch.toLowerCase();
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
      );
    }

    // Filter by name
    if (nameFilter.trim()) {
      filtered = filtered.filter(entry =>
        entry.fullName.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    // Filter by national ID
    if (idFilter.trim()) {
      filtered = filtered.filter(entry =>
        entry.nationalId.toLowerCase().includes(idFilter.toLowerCase())
      );
    }

    // Filter by governorate
    if (governorateFilter !== 'all') {
      filtered = filtered.filter(entry => entry.governorate === governorateFilter);
    }

    // Filter by severity
    if (severityFilter !== 'all') {
      filtered = filtered.filter(entry => entry.severity === severityFilter);
    }

    // Filter by flag type
    if (flagTypeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.flagType === flagTypeFilter);
    }

    // Filter by reason
    if (reasonFilter.trim()) {
      filtered = filtered.filter(entry =>
        entry.reason.toLowerCase().includes(reasonFilter.toLowerCase())
      );
    }

    // Filter by date
    if (dateFilter.trim()) {
      filtered = filtered.filter(entry =>
        entry.createdAt.includes(dateFilter)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const clearAllFilters = () => {
    setWatchlistSearch('');
    setNameFilter('');
    setIdFilter('');
    setGovernorateFilter('all');
    setSeverityFilter('all');
    setFlagTypeFilter('all');
    setReasonFilter('');
    setDateFilter('');
  };

  const filteredWatchlist = getFilteredAndSortedWatchlist();
  const hasActiveFilters = watchlistSearch || nameFilter || idFilter || governorateFilter !== 'all' || severityFilter !== 'all' || flagTypeFilter !== 'all' || reasonFilter || dateFilter;

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSortIcon = (field: 'fullName' | 'nationalId' | 'governorate' | 'severity' | 'reason' | 'flagType' | 'createdAt') => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Prepare chart data with proper error handling
  const statusChartData = Object.entries(data.summary.statusBreakdown || {})
    .filter(([_, count]) => count > 0) // Only show statuses with data
    .map(([status, count]) => ({
      status: status.replace('_', ' '),
      count: count as number,
      color: STATUS_COLORS[status] || '#6b7280',
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending

  const workloadChartData = (data.officerWorkload || [])
    .filter(item => item.stats.total > 0) // Only show officers with workload
    .map((item) => ({
      name: item.officer.name.split(' ')[0] || item.officer.name,
      total: item.stats.total,
      pending: item.stats.pending,
      approved: item.stats.approved,
      rejected: item.stats.rejected,
    }))
    .sort((a, b) => b.total - a.total); // Sort by total descending

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="w-64 bg-white shadow-xl border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Supervisor</h1>
          <p className="text-sm text-gray-500 mt-1">Management Portal</p>
        </div>
        <nav className="p-4 space-y-2">
          {[
            { id: 'overview' as Section, icon: Activity, label: 'Overview' },
            { id: 'workload' as Section, icon: Users, label: 'Officer Workload' },
            { id: 'applications' as Section, icon: UserCheck, label: 'Application Review' },
            { id: 'assignments' as Section, icon: FileText, label: 'Assignments' },
            { id: 'watchlist' as Section, icon: AlertTriangle, label: 'Watchlist' },
            { id: 'settings' as Section, icon: Settings, label: 'Settings' },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeSection === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'}`}>
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200 bg-white">
          <button onClick={fetchData} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors mb-2">
            <RefreshCw size={16} />
            <span className="text-sm">Refresh Data</span>
          </button>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
            <button onClick={() => setAutoRefresh(!autoRefresh)} className="text-blue-600 hover:underline">Toggle</button>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              const pathname = window.location.pathname
              const locale = pathname?.split('/')[1] || 'en'
              router.push(`/${locale}/government`)
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Overview</h2>
                <p className="text-gray-600 mt-1">Real-time system metrics and status</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Applications</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{data.summary.totalApplications}</p>
                    </div>
                    <FileText className="text-blue-500" size={40} />
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Unassigned</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{data.summary.unassignedApplications}</p>
                    </div>
                    <Clock className="text-orange-500" size={40} />
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Officers</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{data.activeOfficers}</p>
                    </div>
                    <UserCheck className="text-green-500" size={40} />
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Watchlist Matches</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{data.summary.watchlistMatches}</p>
                    </div>
                    <Shield className="text-red-500" size={40} />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="mr-2" />Application Status Distribution
                </h3>
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="status" 
                        stroke="#6b7280" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: any) => [value, 'Count']}
                        labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No status data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'workload' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Officer Workload</h2>
                <p className="text-gray-600 mt-1">Monitor officer performance and capacity</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Workload Distribution</h3>
                {workloadChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={workloadChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#6b7280" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: any, name: string) => [value, name]}
                        labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                      />
                      <Legend />
                      <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="approved" fill="#10b981" name="Approved" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="rejected" fill="#ef4444" name="Rejected" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <div className="text-center">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No officer workload data available</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">Officer Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Officer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rejected</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Hours</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.officerWorkload && data.officerWorkload.length > 0 ? (
                        data.officerWorkload
                          .filter(item => item.stats.total > 0) // Only show officers with workload
                          .sort((a, b) => b.stats.total - a.stats.total) // Sort by total descending
                          .map((item) => (
                            <tr key={item.officer.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="font-medium text-gray-900">{item.officer.name || 'Unknown'}</div>
                                  <div className="text-sm text-gray-500">{item.officer.email || 'N/A'}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{item.stats.total || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">{item.stats.pending || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{item.stats.approved || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{item.stats.rejected || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.stats.avgProcessingHours ? `${item.stats.avgProcessingHours.toFixed(1)}h` : '0h'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                    <div 
                                      className="bg-blue-600 h-2.5 rounded-full" 
                                      style={{ width: `${Math.min(item.stats.efficiency || 0, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm text-gray-900 font-medium">
                                    {(item.stats.efficiency || 0).toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p>No officer workload data available</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Applications Review Section */}
          {activeSection === 'applications' && (
            <SupervisorApplicationsReview
              applications={dailyApplications}
              stats={applicationStats}
              onRefresh={fetchDailyApplications}
              loading={loading}
            />
          )}

          {activeSection === 'assignments' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Recent Assignments</h2>
                <p className="text-gray-600 mt-1">Track application assignments to officers</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Officer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned At</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.recentAssignments && data.recentAssignments.length > 0 ? (
                        data.recentAssignments
                          .sort((a, b) => {
                            const aTime = new Date(a.assignedAt).getTime();
                            const bTime = new Date(b.assignedAt).getTime();
                            return bTime - aTime; // Sort by most recent first
                          })
                          .map((assignment) => (
                            <tr key={assignment.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                {assignment.referenceNumber || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {assignment.applicant || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {assignment.officer || 'Unassigned'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span 
                                  className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                                  style={{ 
                                    backgroundColor: (STATUS_COLORS[assignment.status] || '#6b7280') + '20', 
                                    color: STATUS_COLORS[assignment.status] || '#6b7280' 
                                  }}
                                >
                                  {assignment.status?.replace('_', ' ') || 'Unknown'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {assignment.assignedAt 
                                  ? new Date(assignment.assignedAt).toLocaleString() 
                                  : 'N/A'}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p>No assignments yet. Assignments will appear here once applications are assigned to officers.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'watchlist' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Security Watchlist</h2>
                <p className="text-gray-600 mt-1">Manage suspicious persons and security flags</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Plus className="mr-2" />Add Watchlist Entry
                </h3>
                <form onSubmit={handleAddWatchlistEntry} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">National ID *</label>
                      <input type="text" required value={newEntry.nationalId}
                        onChange={(e) => setNewEntry({ ...newEntry, nationalId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter National ID" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input type="text" required value={newEntry.fullName}
                        onChange={(e) => setNewEntry({ ...newEntry, fullName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter Full Name" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                    <textarea required value={newEntry.reason}
                      onChange={(e) => setNewEntry({ ...newEntry, reason: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3} placeholder="Enter reason for flagging" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Flag Type</label>
                      <select value={newEntry.flagType}
                        onChange={(e) => setNewEntry({ ...newEntry, flagType: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="SECURITY_CONCERN">Security Concern</option>
                        <option value="OVERSTAY">Overstay</option>
                        <option value="FRAUD">Fraud</option>
                        <option value="DUPLICATE">Duplicate</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                      <select value={newEntry.severity}
                        onChange={(e) => setNewEntry({ ...newEntry, severity: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Optional Fields Section */}
                  <div className="border-t pt-4 mt-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Additional Information (Optional)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Mother's Full Name</label>
                        <input type="text" value={newEntry.motherFullName}
                          onChange={(e) => setNewEntry({ ...newEntry, motherFullName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Optional" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Date of Birth</label>
                        <input type="date" value={newEntry.dateOfBirth}
                          onChange={(e) => setNewEntry({ ...newEntry, dateOfBirth: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
                        <input type="tel" value={newEntry.phoneNumber}
                          onChange={(e) => setNewEntry({ ...newEntry, phoneNumber: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="+964..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Nationality</label>
                        <input type="text" value={newEntry.nationality}
                          onChange={(e) => setNewEntry({ ...newEntry, nationality: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Optional" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Additional Notes</label>
                      <textarea value={newEntry.notes}
                        onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2} placeholder="Any additional information..." />
                    </div>
                  </div>
                  <button type="submit"
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Add to Watchlist
                  </button>
                </form>
              </div>
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
                      <h2 className="text-lg font-semibold text-gray-900">Security Watchlist</h2>
                      <p className="text-sm text-gray-600">Manage suspicious persons and security flags • {filteredWatchlist.length} entries</p>
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
                      onClick={fetchData}
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
                    value={watchlistSearch}
                    onChange={(e) => setWatchlistSearch(e.target.value)}
                    placeholder="Search across all fields (name, ID, reason, flag type, etc.)..."
                    className="w-full px-4 py-3 pl-11 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  />
                  <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {watchlistSearch && (
                    <button
                      onClick={() => setWatchlistSearch('')}
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
                ) : (
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
                              Actions
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredWatchlist.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-6 py-12 text-center">
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <button onClick={() => handleRemoveWatchlistEntry(entry.id)}
                                  className="text-red-600 hover:text-red-900 flex items-center">
                                  <Trash2 size={16} className="mr-1" />Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Auto-Assignment Settings</h2>
                <p className="text-gray-600 mt-1">Configure automated application assignment</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Enable Auto-Assignment</h3>
                    <p className="text-sm text-gray-600">Automatically assign new applications to available officers</p>
                  </div>
                  <button onClick={() => setAutoAssignEnabled(!autoAssignEnabled)}
                    className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
                      autoAssignEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}>
                    <span className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
                      autoAssignEnabled ? 'translate-x-11' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Algorithm</label>
                  <select value={assignmentAlgorithm}
                    onChange={(e) => setAssignmentAlgorithm(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!autoAssignEnabled}>
                    <option value="round-robin">Round Robin (Equal Distribution)</option>
                    <option value="load-balanced">Load Balanced (Assign to Least Busy)</option>
                    <option value="skill-based">Skill Based (Match Officer Expertise)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Applications Per Officer</label>
                  <input type="number" min="1" max="50" value={maxApplicationsPerOfficer}
                    onChange={(e) => setMaxApplicationsPerOfficer(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!autoAssignEnabled} />
                  <p className="text-sm text-gray-500 mt-1">Prevent officer overload by setting a maximum threshold</p>
                </div>
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <button onClick={saveAutoAssignSettings}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Save Settings
                  </button>
                  <button onClick={triggerAutoAssignment}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!autoAssignEnabled}>
                    Trigger Auto-Assignment Now
                  </button>
                  <p className="text-sm text-gray-500 text-center">Auto-assignment will automatically process unassigned applications</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Supervisor Applications Review Component
function SupervisorApplicationsReview({ applications, stats, onRefresh, loading }: {
  applications: any[];
  stats?: {
    totalToday: number;
    pending: number;
    withDocuments: number;
    pendingDocuments: number;
  };
  onRefresh: () => void;
  loading: boolean;
}) {
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const handleSelectAll = () => {
    if (selectedApplications.size === applications.length) {
      setSelectedApplications(new Set());
    } else {
      setSelectedApplications(new Set(applications.map(app => app.id)));
    }
  };

  const handleSelectApp = (appId: string) => {
    const newSelected = new Set(selectedApplications);
    if (newSelected.has(appId)) {
      newSelected.delete(appId);
    } else {
      newSelected.add(appId);
    }
    setSelectedApplications(newSelected);
  };

  const handleBulkApprove = async () => {
    if (selectedApplications.size === 0) return;

    setBulkActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const promises = Array.from(selectedApplications).map(appId =>
        fetch(`${apiUrl}/api/applications/${appId}/approve`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ notes: 'Approved by supervisor - daily batch review' })
        })
      );

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        alert(`Successfully approved ${successCount} application${successCount > 1 ? 's' : ''}`);
      }
      if (failCount > 0) {
        alert(`Failed to approve ${failCount} application${failCount > 1 ? 's' : ''}`);
      }

      setSelectedApplications(new Set());
      onRefresh();
    } catch (error) {
      console.error('Bulk approve error:', error);
      alert('Failed to perform bulk approval');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SUBMITTED: 'bg-blue-100 text-blue-800',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PENDING_DOCUMENTS: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Application Review</h2>
          <p className="text-gray-600 mt-1">Review and approve today's applications</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Today's Total</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{stats?.totalToday ?? applications.length}</p>
              <p className="text-xs text-blue-600 mt-1">Applications submitted</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700">Pending Review</p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">
                {applicationStats.pending}
              </p>
              <p className="text-xs text-yellow-600 mt-1">Awaiting approval</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">With Documents</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {applicationStats.withDocuments}
              </p>
              <p className="text-xs text-green-600 mt-1">Have uploaded files</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Pending Documents</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">
                {applicationStats.pendingDocuments}
              </p>
              <p className="text-xs text-orange-600 mt-1">Additional docs needed</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedApplications.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {selectedApplications.size} application{selectedApplications.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={handleBulkApprove}
              disabled={bulkActionLoading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkActionLoading && <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <UserCheck className="w-4 h-4" />
              Approve Selected
            </button>
          </div>
        </div>
      )}

      {/* Applications Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Today's Applications ({applications.length})
            </h3>
            {applications.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {selectedApplications.size === applications.length ? 'Deselect All' : 'Select All'}
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
        ) : applications.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No applications today</h3>
            <p className="text-gray-600">No applications have been submitted today for review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedApplications.size === applications.length && applications.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Officer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id} className={`hover:bg-gray-50 ${selectedApplications.has(app.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedApplications.has(app.id)}
                        onChange={() => handleSelectApp(app.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{app.fullName}</div>
                        <div className="text-sm text-gray-500">{app.referenceNumber}</div>
                        <div className="text-sm text-gray-500">{app.nationality}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          app.documents && app.documents.length > 0 ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {app.documents ? app.documents.length : 0} files
                        </span>
                        {app.documents && app.documents.length > 0 && (
                          <UserCheck className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {app.assignedOfficer?.fullName || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs"
                        >
                          Review
                        </button>
                        {app.status === 'SUBMITTED' && (
                          <>
                            <button
                              onClick={async () => {
                                const token = localStorage.getItem('token');
                                if (!token) return;

                                try {
                                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                                  const response = await fetch(`${apiUrl}/api/applications/${app.id}/approve`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ notes: 'Approved by supervisor' })
                                  });

                                  if (response.ok) {
                                    alert('Application approved successfully');
                                    onRefresh();
                                  } else {
                                    alert('Failed to approve application');
                                  }
                                } catch (error) {
                                  console.error('Approval error:', error);
                                  alert('Failed to approve application');
                                }
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={async () => {
                                const reason = prompt('Enter rejection reason:');
                                if (!reason) return;

                                const token = localStorage.getItem('token');
                                if (!token) return;

                                try {
                                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                                  const response = await fetch(`${apiUrl}/api/applications/${app.id}/reject`, {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ reason })
                                  });

                                  if (response.ok) {
                                    alert('Application rejected successfully');
                                    onRefresh();
                                  } else {
                                    alert('Failed to reject application');
                                  }
                                } catch (error) {
                                  console.error('Rejection error:', error);
                                  alert('Failed to reject application');
                                }
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application Review Modal */}
      {selectedApp && (
        <ApplicationReviewModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdate={onRefresh}
          isSupervisor={true}
        />
      )}
    </div>
  );
}
