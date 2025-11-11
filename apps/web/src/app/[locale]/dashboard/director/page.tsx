'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Menu, X, Download, Filter, TrendingUp, TrendingDown, Users, 
  FileText, CheckCircle, XCircle, Clock, Activity, MapPin, Calendar,
  User, Globe, Briefcase, Home, School, Heart, ChevronDown, RefreshCw
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

// Color palette
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  teal: '#14b8a6',
  indigo: '#6366f1',
};

const CHART_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.purple, COLORS.pink];

interface AnalyticsData {
  summary: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    active: number;
    approvalRate: number;
    avgProcessingTime: number;
    last30Days: number;
    trend: string;
  };
  applicationsPerDay: { date: string; applications: number }[];
  statusBreakdown: Record<string, number>;
  demographics: {
    gender: { male: number; female: number };
    ageGroups: Record<string, number>;
    nationalities: { country: string; count: number; percentage: number }[];
  };
  geographic: {
    originGovernorates: { name: string; count: number; percentage: number }[];
  };
  purposes: Record<string, number>;
  officerPerformance: {
    id: string;
    name: string;
    assigned: number;
    approved: number;
    rejected: number;
    pending: number;
    efficiency: number;
  }[];
  recentActivity: {
    id: string;
    applicant: string;
    action: string;
    timestamp: string;
    officer: string;
    status: string;
  }[];
}

export default function ProfessionalDirectorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    dateRange: '30',
    governorate: 'all',
    gender: 'all',
    ageGroup: 'all',
    purpose: 'all',
    duration: 'all'
  });

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:3001/api/analytics/director-pro', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    alert('PDF export feature coming soon!');
  };

  const exportToCSV = () => {
    if (!data) return;
    const csv = data.applicationsPerDay.map(d => `${d.date},${d.applications}`).join('\n');
    const blob = new Blob([`Date,Applications\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics.csv';
    a.click();
  };

  const exportToExcel = () => {
    alert('Excel export feature coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center">Failed to load data</div>;
  }

  // Prepare data for visualizations
  const genderData = [
    { name: 'Male', value: data.demographics.gender.male, color: COLORS.primary },
    { name: 'Female', value: data.demographics.gender.female, color: COLORS.pink },
  ];

  const ageData = Object.entries(data.demographics.ageGroups).map(([age, count]) => ({
    age,
    count
  }));

  const purposeData = Object.entries(data.purposes).map(([purpose, count]) => ({
    purpose: purpose.charAt(0) + purpose.slice(1).toLowerCase(),
    count,
    percentage: Math.round((count / data.summary.total) * 100)
  }));

  const statusData = Object.entries(data.statusBreakdown).map(([status, count], index) => ({
    status: status.replace('_', ' '),
    count,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));

  // Sidebar navigation items
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'demographics', label: 'Demographics', icon: Users },
    { id: 'geographic', label: 'Geographic', icon: MapPin },
    { id: 'temporal', label: 'Trends', icon: Calendar },
    { id: 'purposes', label: 'Visit Purposes', icon: Briefcase },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'activity', label: 'Recent Activity', icon: Clock },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`bg-white shadow-lg transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && <h2 className="text-xl font-bold text-gray-800">Analytics</h2>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Director Analytics Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Real-time insights and performance metrics</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
              
              <div className="relative">
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {/* Export dropdown would go here */}
              </div>
              
              <button 
                onClick={fetchAnalytics}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {filterOpen && (
            <div className="px-8 py-4 border-t bg-gray-50">
              <div className="grid grid-cols-6 gap-4">
                <select className="px-3 py-2 border rounded-lg">
                  <option>All Governorates</option>
                  <option>Erbil</option>
                  <option>Duhok</option>
                  <option>Sulaymaniyah</option>
                </select>
                
                <select className="px-3 py-2 border rounded-lg">
                  <option>All Genders</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
                
                <select className="px-3 py-2 border rounded-lg">
                  <option>All Ages</option>
                  <option>18-25</option>
                  <option>26-35</option>
                  <option>36-45</option>
                  <option>46-55</option>
                  <option>56+</option>
                </select>
                
                <select className="px-3 py-2 border rounded-lg">
                  <option>All Purposes</option>
                  <option>Tourism</option>
                  <option>Business</option>
                  <option>Family</option>
                  <option>Medical</option>
                  <option>Education</option>
                </select>
                
                <select className="px-3 py-2 border rounded-lg">
                  <option>All Durations</option>
                  <option>1-7 days</option>
                  <option>8-30 days</option>
                  <option>31-90 days</option>
                  <option>90+ days</option>
                </select>
                
                <select className="px-3 py-2 border rounded-lg">
                  <option>Last 30 days</option>
                  <option>Last 7 days</option>
                  <option>Last 90 days</option>
                  <option>This month</option>
                  <option>Custom range</option>
                </select>
              </div>
            </div>
          )}
        </header>

        <div className="p-8">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-6">
                <StatCard
                  title="Total Applications"
                  value={data.summary.total.toLocaleString()}
                  change={`+${data.summary.last30Days}`}
                  trend="up"
                  icon={FileText}
                  color="blue"
                />
                <StatCard
                  title="Approved"
                  value={data.summary.approved.toLocaleString()}
                  change={`${data.summary.approvalRate}%`}
                  trend="up"
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  title="Pending Review"
                  value={data.summary.pending.toLocaleString()}
                  change="Processing"
                  trend="neutral"
                  icon={Clock}
                  color="yellow"
                />
                <StatCard
                  title="Avg Processing"
                  value={`${data.summary.avgProcessingTime} days`}
                  change="Current"
                  trend="down"
                  icon={Activity}
                  color="purple"
                />
              </div>

              {/* Applications Trend */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Applications Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.applicationsPerDay.slice(-30)}>
                    <defs>
                      <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="applications" 
                      stroke={COLORS.primary} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorApplications)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Status Distribution</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Top Officers</h3>
                  <div className="space-y-3">
                    {data.officerPerformance.slice(0, 5).map(officer => (
                      <div key={officer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{officer.name}</p>
                            <p className="text-sm text-gray-500">{officer.assigned} assigned</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{officer.efficiency}%</p>
                          <p className="text-xs text-gray-500">Efficiency</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Demographics Section */}
          {activeSection === 'demographics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Gender Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Age Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="age" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Top Nationalities</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Country</th>
                        <th className="text-right py-3 px-4">Applications</th>
                        <th className="text-right py-3 px-4">Percentage</th>
                        <th className="py-3 px-4">Distribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.demographics.nationalities.map((nat, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{nat.country}</td>
                          <td className="py-3 px-4 text-right">{nat.count.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">{nat.percentage}%</td>
                          <td className="py-3 px-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${nat.percentage}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Geographic Section */}
          {activeSection === 'geographic' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Top Origin Governorates</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.geographic.originGovernorates} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.teal} radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Temporal Section */}
          {activeSection === 'temporal' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Application Trends (90 Days)</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={data.applicationsPerDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="applications" 
                      stroke={COLORS.primary} 
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Purposes Section */}
          {activeSection === 'purposes' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Visit Purpose Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={purposeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ purpose, percentage }) => `${purpose}: ${percentage}%`}
                        outerRadius={90}
                        dataKey="count"
                      >
                        {purposeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Purpose Breakdown</h3>
                  <div className="space-y-3">
                    {purposeData.map((purpose, index) => (
                      <div key={purpose.purpose} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="font-medium">{purpose.purpose}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{purpose.count.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">{purpose.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Section */}
          {activeSection === 'performance' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Officer Performance Metrics</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4">Officer</th>
                        <th className="text-right py-3 px-4">Assigned</th>
                        <th className="text-right py-3 px-4">Approved</th>
                        <th className="text-right py-3 px-4">Rejected</th>
                        <th className="text-right py-3 px-4">Pending</th>
                        <th className="text-right py-3 px-4">Efficiency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.officerPerformance.map(officer => (
                        <tr key={officer.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{officer.name}</td>
                          <td className="py-3 px-4 text-right">{officer.assigned}</td>
                          <td className="py-3 px-4 text-right text-green-600">{officer.approved}</td>
                          <td className="py-3 px-4 text-right text-red-600">{officer.rejected}</td>
                          <td className="py-3 px-4 text-right text-yellow-600">{officer.pending}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              officer.efficiency >= 80 ? 'bg-green-100 text-green-700' :
                              officer.efficiency >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {officer.efficiency}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Workload Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.officerPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="approved" fill={COLORS.success} name="Approved" />
                    <Bar dataKey="pending" fill={COLORS.warning} name="Pending" />
                    <Bar dataKey="rejected" fill={COLORS.danger} name="Rejected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Activity Section */}
          {activeSection === 'activity' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity Feed</h3>
              <div className="space-y-3">
                {data.recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'APPROVED' ? 'bg-green-500' :
                        activity.status === 'REJECTED' ? 'bg-red-500' :
                        activity.status === 'UNDER_REVIEW' ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">{activity.applicant}</p>
                        <p className="text-sm text-gray-500">{activity.action.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{activity.officer}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, change, trend, icon: Icon, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
        {trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500" />}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-2">{change}</p>
    </div>
  );
}
