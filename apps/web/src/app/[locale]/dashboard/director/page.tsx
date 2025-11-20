'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import {
  Menu, X, Download, Filter, TrendingUp, TrendingDown, Users,
  FileText, CheckCircle, XCircle, Clock, Activity, MapPin, Calendar,
  User, Globe, Briefcase, Home, School, Heart, ChevronDown, RefreshCw,
  DollarSign, Eye, LogOut, AlertTriangle
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

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
    occupations: { occupation: string; count: number; percentage: number }[];
    educationLevels: { level: string; count: number; percentage: number }[];
    incomeRanges: { range: string; count: number; percentage: number }[];
  };
  geographic: {
    originGovernorates: { name: string; count: number; percentage: number }[];
  };
  economic: {
    totalEconomicImpact: number;
    averageDailySpending: number;
    accommodationTypes: { type: string; count: number; percentage: number }[];
    spendingByPurpose: { purpose: string; totalSpending: number; avgSpendingPerApplication: number; applications: number }[];
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
  visitorStatus?: {
    activeVisitors: Array<{
      id: string;
      referenceNumber: string;
      fullName: string;
      nationality: string;
      visitPurpose: string;
      entryDate: string;
      checkpointName: string;
      permitExpiryDate: string;
    }>;
    recentExits: Array<{
      id: string;
      referenceNumber: string;
      fullName: string;
      nationality: string;
      exitDate: string;
      checkpointName: string;
    }>;
    checkpointActivity: Record<string, { entries: number; exits: number }>;
    overstayingVisitors: Array<{
      id: string;
      referenceNumber: string;
      fullName: string;
      daysOverstay: number;
      entryDate: string;
    }>;
    summary: {
      totalActive: number;
      totalExited: number;
      overstaying: number;
    };
  };
}

export default function ProfessionalDirectorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [activeVisitorTab, setActiveVisitorTab] = useState('active');
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

  // Reset visitor tab to 'active' when entering visitor status section
  useEffect(() => {
    if (activeSection === 'visitor-status') {
      setActiveVisitorTab('active');
    }
  }, [activeSection]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setLoading(false);
        return;
      }

      // Fetch main analytics data
      const [analyticsResponse, visitorStatusResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/director-pro`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/visitor-status`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      const [analyticsResult, visitorStatusResult] = await Promise.all([
        analyticsResponse.json(),
        visitorStatusResponse.json()
      ]);

      if (analyticsResult.success) {
        const combinedData = {
          ...analyticsResult.data,
          visitorStatus: visitorStatusResult.success ? visitorStatusResult.data : undefined
        };
        setData(combinedData);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!data) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    let yPosition = 20;

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('KRG e-Visit System Analytics Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Date
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on: ${format(new Date(), 'PPP')}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Summary Section
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Executive Summary', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const summaryData = [
      `Total Applications: ${data.summary.total}`,
      `Approved: ${data.summary.approved} (${data.summary.approvalRate.toFixed(1)}%)`,
      `Rejected: ${data.summary.rejected}`,
      `Pending: ${data.summary.pending}`,
      `Active Permits: ${data.summary.active}`,
      `Average Processing Time: ${data.summary.avgProcessingTime.toFixed(1)} days`,
      `Last 30 Days: ${data.summary.last30Days} applications`
    ];

    summaryData.forEach(line => {
      pdf.text(line, 25, yPosition);
      yPosition += 6;
    });

    yPosition += 10;

    // Demographics Section
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Demographics Overview', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Gender Distribution: ${data.demographics.gender.male} Male, ${data.demographics.gender.female} Female`, 25, yPosition);
    yPosition += 8;

    pdf.text(`Top Nationalities: ${data.demographics.nationalities.slice(0, 3).map(n => `${n.country} (${n.count})`).join(', ')}`, 25, yPosition);
    yPosition += 8;

    pdf.text(`Top Occupations: ${data.demographics.occupations.slice(0, 3).map(o => `${o.occupation} (${o.count})`).join(', ')}`, 25, yPosition);
    yPosition += 8;

    pdf.text(`Education Levels: ${data.demographics.educationLevels.slice(0, 3).map(e => `${e.level} (${e.count})`).join(', ')}`, 25, yPosition);
    yPosition += 8;

    // Economic Impact Section
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Economic Impact Analysis', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Economic Impact: $${data.economic.totalEconomicImpact.toLocaleString()}`, 25, yPosition);
    yPosition += 8;

    pdf.text(`Average Daily Spending: $${data.economic.averageDailySpending}`, 25, yPosition);
    yPosition += 8;

    pdf.text(`Top Accommodation Types: ${data.economic.accommodationTypes.slice(0, 3).map(a => `${a.type} (${a.count})`).join(', ')}`, 25, yPosition);
    yPosition += 8;

    // Footer
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.text('This report was generated by the KRG e-Visit System for government analytics and decision-making.', 20, pageHeight - 20);

    pdf.save(`krg-analytics-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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
    if (!data) return;

    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['KRG e-Visit Analytics Report'],
      ['Generated on:', format(new Date(), 'PPP')],
      [''],
      ['Executive Summary'],
      ['Metric', 'Value'],
      ['Total Applications', data.summary.total],
      ['Approved', data.summary.approved],
      ['Rejected', data.summary.rejected],
      ['Pending', data.summary.pending],
      ['Active Permits', data.summary.active],
      ['Approval Rate', `${data.summary.approvalRate.toFixed(1)}%`],
      ['Average Processing Time', `${data.summary.avgProcessingTime.toFixed(1)} days`],
      ['Last 30 Days', data.summary.last30Days],
      [''],
      ['Economic Impact'],
      ['Total Economic Impact', `$${data.economic.totalEconomicImpact.toLocaleString()}`],
      ['Average Daily Spending', `$${data.economic.averageDailySpending}`]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Applications per Day Sheet
    const applicationsData = [
      ['Date', 'Applications'],
      ...data.applicationsPerDay.map(d => [d.date, d.applications])
    ];
    const applicationsSheet = XLSX.utils.aoa_to_sheet(applicationsData);
    XLSX.utils.book_append_sheet(workbook, applicationsSheet, 'Applications per Day');

    // Demographics Sheet
    const demographicsData = [
      ['Demographics Overview'],
      [''],
      ['Gender Distribution'],
      ['Gender', 'Count'],
      ['Male', data.demographics.gender.male],
      ['Female', data.demographics.gender.female],
      [''],
      ['Nationalities'],
      ['Country', 'Count', 'Percentage'],
      ...data.demographics.nationalities.map(n => [n.country, n.count, `${n.percentage}%`]),
      [''],
      ['Occupations'],
      ['Occupation', 'Count', 'Percentage'],
      ...data.demographics.occupations.map(o => [o.occupation, o.count, `${o.percentage}%`]),
      [''],
      ['Education Levels'],
      ['Level', 'Count', 'Percentage'],
      ...data.demographics.educationLevels.map(e => [e.level, e.count, `${e.percentage}%`]),
      [''],
      ['Income Ranges'],
      ['Range', 'Count', 'Percentage'],
      ...data.demographics.incomeRanges.map(i => [i.range, i.count, `${i.percentage}%`])
    ];
    const demographicsSheet = XLSX.utils.aoa_to_sheet(demographicsData);
    XLSX.utils.book_append_sheet(workbook, demographicsSheet, 'Demographics');

    // Economic Impact Sheet
    const economicData = [
      ['Economic Impact Analysis'],
      [''],
      ['Summary'],
      ['Metric', 'Value'],
      ['Total Economic Impact', `$${data.economic.totalEconomicImpact.toLocaleString()}`],
      ['Average Daily Spending', `$${data.economic.averageDailySpending}`],
      [''],
      ['Accommodation Types'],
      ['Type', 'Count', 'Percentage'],
      ...data.economic.accommodationTypes.map(a => [a.type, a.count, `${a.percentage}%`]),
      [''],
      ['Spending by Purpose'],
      ['Purpose', 'Total Spending', 'Avg per Application', 'Applications'],
      ...data.economic.spendingByPurpose.map(s => [
        s.purpose,
        `$${s.totalSpending.toLocaleString()}`,
        `$${s.avgSpendingPerApplication}`,
        s.applications
      ])
    ];
    const economicSheet = XLSX.utils.aoa_to_sheet(economicData);
    XLSX.utils.book_append_sheet(workbook, economicSheet, 'Economic Impact');

    // Geographic Sheet
    const geographicData = [
      ['Geographic Distribution'],
      [''],
      ['Governorates'],
      ['Governorate', 'Count', 'Percentage'],
      ...data.geographic.originGovernorates.map(g => [g.name, g.count, `${g.percentage}%`])
    ];
    const geographicSheet = XLSX.utils.aoa_to_sheet(geographicData);
    XLSX.utils.book_append_sheet(workbook, geographicSheet, 'Geographic');

    XLSX.writeFile(workbook, `krg-analytics-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
    { id: 'economic', label: 'Economic Impact', icon: DollarSign },
    { id: 'geographic', label: 'Geographic', icon: MapPin },
    { id: 'visitor-status', label: 'Visitor Status', icon: Eye },
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
          {activeSection === 'economic' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Economic Impact Analysis</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  <Download className="w-4 h-4 inline mr-2" />
                  Export Report
                </button>
              </div>

              {/* Economic Impact Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Economic Impact</p>
                      <p className="text-2xl font-bold text-gray-900">${data.economic.totalEconomicImpact.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Daily Spending</p>
                      <p className="text-2xl font-bold text-gray-900">${data.economic.averageDailySpending}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Home className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Economic Applications</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {data.economic.spendingByPurpose.reduce((sum, item) => sum + item.applications, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Accommodation Types */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Accommodation Preferences</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.economic.accommodationTypes}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {data.economic.accommodationTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Spending by Purpose */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Economic Impact by Visit Purpose</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.economic.spendingByPurpose}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="purpose" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'totalSpending' ? `$${value.toLocaleString()}` : value,
                          name === 'totalSpending' ? 'Total Spending' : 'Avg per Application'
                        ]}
                      />
                      <Bar dataKey="totalSpending" fill={COLORS.success} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Economic Impact Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Detailed Economic Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Visit Purpose
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Applications
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Spending
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg per Application
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.economic.spendingByPurpose.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.purpose}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.applications}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.totalSpending.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.avgSpendingPerApplication}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'demographics' && (
            <div className="space-y-6">
              {/* Basic Demographics Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Gender Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
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

              {/* Enhanced Demographics Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Occupations</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.demographics.occupations.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="occupation" width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS.success} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Education Levels</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={data.demographics.educationLevels}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="count"
                      >
                        {data.demographics.educationLevels.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Income Ranges</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.demographics.incomeRanges.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="range" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Nationalities Table */}
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

          {/* Visitor Status Section */}
          {activeSection === 'visitor-status' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Active Visitors</p>
                      <p className="text-3xl font-bold text-green-900 mt-2">
                        {data.visitorStatus?.summary.totalActive || 0}
                      </p>
                      <p className="text-xs text-green-600 mt-1">Currently in region</p>
                    </div>
                    <Eye className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Recent Exits (24h)</p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {data.visitorStatus?.recentExits.length || 0}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">Departed in last 24h</p>
                    </div>
                    <LogOut className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-6 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Border Activity (24h)</p>
                      <p className="text-3xl font-bold text-purple-900 mt-2">
                        {Object.keys(data.visitorStatus?.checkpointActivity || {}).length}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">Active checkpoints</p>
                    </div>
                    <Activity className="w-8 h-8 text-purple-600" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm p-6 border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-700">Overstaying Visitors</p>
                      <p className="text-3xl font-bold text-red-900 mt-2">
                        {data.visitorStatus?.summary.overstaying || 0}
                      </p>
                      <p className="text-xs text-red-600 mt-1">Past expiry date</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Visitor Status Tabs */}
              <div className="bg-white rounded-xl shadow-sm">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    {[
                      { id: 'active', label: 'Active Visitors', icon: Eye },
                      { id: 'exits', label: 'Recent Exits', icon: LogOut },
                      { id: 'checkpoints', label: 'Border Activity', icon: Activity },
                      { id: 'overstays', label: 'Overstay Alerts', icon: AlertTriangle }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveVisitorTab(tab.id)}
                          className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            activeVisitorTab === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {tab.label}
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="p-6">
                  {/* Active Visitors Tab */}
                  {activeVisitorTab === 'active' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Active Visitors in Kurdistan Region</h3>
                        <button
                          onClick={() => {
                            if (!data?.visitorStatus?.activeVisitors) return;
                            const csvContent = [
                              ['Reference Number', 'Full Name', 'Nationality', 'Purpose', 'Entry Date', 'Checkpoint', 'Expiry Date'].join(','),
                              ...data.visitorStatus.activeVisitors.map(visitor =>
                                [visitor.referenceNumber, visitor.fullName, visitor.nationality, visitor.visitPurpose,
                                 format(new Date(visitor.entryDate), 'yyyy-MM-dd HH:mm'),
                                 visitor.checkpointName,
                                 visitor.permitExpiryDate ? format(new Date(visitor.permitExpiryDate), 'yyyy-MM-dd') : ''].join(',')
                              )
                            ].join('\n');
                            const blob = new Blob([csvContent], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `active-visitors-${format(new Date(), 'yyyy-MM-dd')}.csv`;
                            a.click();
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Export CSV
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitor</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nationality</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Details</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permit Expiry</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {data.visitorStatus?.activeVisitors.map((visitor) => (
                              <tr key={visitor.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{visitor.fullName}</div>
                                    <div className="text-sm text-gray-500">{visitor.referenceNumber}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{visitor.nationality}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                    {visitor.visitPurpose.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm text-gray-900">
                                      {format(new Date(visitor.entryDate), 'MMM dd, yyyy HH:mm')}
                                    </div>
                                    <div className="text-sm text-gray-500">via {visitor.checkpointName}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className={`text-sm font-medium ${
                                    new Date(visitor.permitExpiryDate) < new Date() ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {format(new Date(visitor.permitExpiryDate), 'MMM dd, yyyy')}
                                  </div>
                                </td>
                              </tr>
                            )) || []}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recent Exits Tab */}
                  {activeVisitorTab === 'exits' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-gray-900">Recent Departures (Last 24 Hours)</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitor</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nationality</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Details</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {data.visitorStatus?.recentExits.map((exit) => (
                              <tr key={exit.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{exit.fullName}</div>
                                    <div className="text-sm text-gray-500">{exit.referenceNumber}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{exit.nationality}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm text-gray-900">
                                      {format(new Date(exit.exitDate), 'MMM dd, yyyy HH:mm')}
                                    </div>
                                    <div className="text-sm text-gray-500">via {exit.checkpointName}</div>
                                  </div>
                                </td>
                              </tr>
                            )) || []}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Border Activity Tab */}
                  {activeVisitorTab === 'checkpoints' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-gray-900">Border Checkpoint Activity (Last 24 Hours)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(data.visitorStatus?.checkpointActivity || {}).map(([checkpoint, activity]) => (
                          <div key={checkpoint} className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">{checkpoint}</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-green-600">Entries</span>
                                <span className="font-bold text-green-600">{activity.entries}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-blue-600">Exits</span>
                                <span className="font-bold text-blue-600">{activity.exits}</span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t">
                                <span className="text-sm font-medium text-gray-700">Total Activity</span>
                                <span className="font-bold text-gray-900">{activity.entries + activity.exits}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overstay Alerts Tab */}
                  {activeVisitorTab === 'overstays' && (
                    <div className="space-y-4">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                          <div>
                            <h4 className="font-semibold text-red-900">Overstay Alert</h4>
                            <p className="text-sm text-red-700">
                              These visitors have exceeded their permitted stay duration and require immediate attention.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitor</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Overstay</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {data.visitorStatus?.overstayingVisitors.map((visitor) => (
                              <tr key={visitor.id} className="hover:bg-gray-50 bg-red-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{visitor.fullName}</div>
                                    <div className="text-sm text-gray-500">{visitor.referenceNumber}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {format(new Date(visitor.entryDate), 'MMM dd, yyyy')}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                    {visitor.daysOverstay} days
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <button className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition">
                                    Take Action
                                  </button>
                                </td>
                              </tr>
                            )) || []}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
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
