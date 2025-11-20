'use client';

import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';

function GovernmentHubContent({ user }: { user: { id: string; email: string; fullName: string; role: string } }) {
  const renderRoleSpecificContent = () => {
    switch (user.role) {
      case 'officer':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">👮 Officer Dashboard</h3>
              <p className="text-blue-800">Welcome, {user.fullName}. You have access to application review and processing tools.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Application Review */}
              <Link href="/dashboard/officer">
                <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-blue-500">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Application Review</h3>
                  <p className="text-gray-600 mb-4">Review and approve submitted applications</p>
                  <div className="flex items-center text-blue-600 font-medium">
                    Review Applications
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Reports */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Reports</h3>
                <p className="text-gray-600 mb-4">View processing statistics and reports</p>
                <div className="text-green-600 font-medium">Coming Soon</div>
              </div>
            </div>
          </div>
        );

      case 'supervisor':
        return (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">👨‍💼 Supervisor Dashboard</h3>
              <p className="text-purple-800">Welcome, {user.fullName}. You have access to team management and advanced processing tools.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Application Management */}
              <Link href="/dashboard/supervisor">
                <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-purple-500">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Team Management</h3>
                  <p className="text-gray-600 mb-4">Manage officers, assign applications, and oversee team performance</p>
                  <div className="flex items-center text-purple-600 font-medium">
                    Manage Team
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Bulk Operations */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Bulk Operations</h3>
                <p className="text-gray-600 mb-4">Process multiple applications and manage workflows</p>
                <div className="text-indigo-600 font-medium">Available in Dashboard</div>
              </div>

              {/* Analytics */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Team Analytics</h3>
                <p className="text-gray-600 mb-4">View team performance and processing metrics</p>
                <div className="text-teal-600 font-medium">Available in Dashboard</div>
              </div>
            </div>
          </div>
        );

      case 'director':
        return (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">📊 Director Dashboard</h3>
              <p className="text-red-800">Welcome, {user.fullName}. You have executive access to all system analytics and management tools.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Executive Analytics */}
              <Link href="/dashboard/director">
                <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-red-500">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Executive Analytics</h3>
                  <p className="text-gray-600 mb-4">Comprehensive system analytics and executive reports</p>
                  <div className="flex items-center text-red-600 font-medium">
                    View Analytics
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* System Management */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">System Management</h3>
                <p className="text-gray-600 mb-4">Configure system settings and manage users</p>
                <div className="text-gray-600 font-medium">Coming Soon</div>
              </div>

              {/* Audit Logs */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Audit Logs</h3>
                <p className="text-gray-600 mb-4">Review system activity and compliance logs</p>
                <div className="text-yellow-600 font-medium">Coming Soon</div>
              </div>
            </div>
          </div>
        );

      case 'checkpoint_officer':
        return (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-orange-900 mb-2">🚔 Checkpoint Officer Dashboard</h3>
              <p className="text-orange-800">Welcome, {user.fullName}. You have access to border control and permit verification tools.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* QR Code Scanner */}
              <Link href="/checkpoint">
                <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-orange-500 relative">
                  <div className="absolute top-4 right-4 bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">
                    SECURE
                  </div>
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Border Control Station</h3>
                  <p className="text-gray-600 mb-3">
                    QR code scanning and permit verification for border entry points.
                  </p>
                  <div className="space-y-1 mb-4">
                    <div className="flex items-center text-xs text-gray-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      QR Code Scanner
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Manual Entry Verification
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      Entry/Exit Logging
                    </div>
                  </div>
                  <div className="flex items-center text-orange-600 font-medium">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Access Border Control
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Entry Logs */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Entry Logs</h3>
                <p className="text-gray-600 mb-4">View recent border crossing records and activity</p>
                <div className="text-blue-600 font-medium">Available in Scanner</div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Role Not Recognized</h3>
            <p className="text-gray-600">Your account role is not properly configured. Please contact system administrator.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🏛️ Government Portal
          </h1>
          <p className="text-xl text-gray-600">
            Welcome back, {user.fullName} ({user.role})
          </p>
        </div>

        {/* Role-specific Content */}
        {renderRoleSpecificContent()}

        {/* Common Footer */}
        <div className="mt-16 bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Kurdistan Regional Government</h3>
            <p className="text-gray-600 mb-6">
              Official e-Visit Immigration Management System
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <span>🔒 Secure Access</span>
              <span>📊 Real-time Data</span>
              <span>⚡ Fast Processing</span>
              <span>🛡️ Role-based Security</span>
              <span>📱 Mobile Ready</span>
              <span>🌐 Multi-language</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GovernmentHubPage() {
  return (
    <AuthGuard provideUser={true}>
      {(user) => <GovernmentHubContent user={user} />}
    </AuthGuard>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🏛️ Government Portal
          </h1>
          <p className="text-xl text-gray-600">
            Authorized personnel access and management tools
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Apply for Permit */}
          <Link href="/apply/landing">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-blue-500">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Applicant Portal</h2>
              <p className="text-gray-600 mb-4">
                View the public applicant landing page and application process
              </p>
              <div className="flex items-center text-blue-600 font-medium">
                View Public Page
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Track Status */}
          <Link href="/track">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-green-500">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Track Applications</h2>
              <p className="text-gray-600 mb-4">
                Monitor application status and processing progress
              </p>
              <div className="flex items-center text-green-600 font-medium">
                Access Tracking
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Border Control - Checkpoint Access */}
          <Link href="/checkpoint">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border-2 border-orange-200 hover:border-orange-400 relative">
              <div className="absolute top-4 right-4 bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">
                SECURE
              </div>
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Border Control Station</h2>
              <p className="text-gray-600 mb-3">
                Authorized checkpoint officers only. QR code scanning and permit verification for border entry.
              </p>
              <div className="space-y-1 mb-4">
                <div className="flex items-center text-xs text-gray-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  QR Code Scanner
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Manual Entry Verification
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  Entry/Exit Logging
                </div>
              </div>
              <div className="flex items-center text-orange-600 font-medium">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Authorized Access Only
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Officer Dashboard */}
          <Link href="/dashboard/officer">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-purple-500">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Officer Dashboard</h2>
              <p className="text-gray-600 mb-4">
                Review and approve individual permit applications
              </p>
              <div className="flex items-center text-purple-600 font-medium">
                Access Dashboard
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Supervisor Dashboard */}
          <Link href="/dashboard/supervisor">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-indigo-500">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Supervisor Dashboard</h2>
              <p className="text-gray-600 mb-4">
                Team management, bulk approvals, and workload distribution
              </p>
              <div className="flex items-center text-indigo-600 font-medium">
                Access Dashboard
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Director Analytics */}
          <Link href="/dashboard/director">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-pink-500">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Director Analytics</h2>
              <p className="text-gray-600 mb-4">
                Executive reports, performance metrics, and system analytics
              </p>
              <div className="flex items-center text-pink-600 font-medium">
                Access Analytics
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Staff Login */}
          <Link href="/login">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Staff Authentication</h2>
              <p className="text-gray-600 mb-4">
                Secure login portal for government personnel
              </p>
              <div className="flex items-center text-gray-600 font-medium">
                Login Portal
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Back to Public Site */}
          <Link href="/">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl shadow-lg p-8 hover:shadow-xl transition cursor-pointer border-2 border-gray-300 hover:border-gray-400">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Public Website</h2>
              <p className="text-gray-600 mb-4">
                Return to the main applicant portal and public information
              </p>
              <div className="flex items-center text-gray-700 font-medium">
                ← Back to Public
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Security Notice */}
        <div className="mt-16 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl shadow-lg p-8 border border-red-200">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-900 mb-2">🔐 Authorized Personnel Only</h3>
              <p className="text-red-800 mb-3">
                This government portal contains sensitive immigration and border control information.
                Access is restricted to authorized KRG personnel only.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center text-red-700">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  JWT Authentication Required
                </div>
                <div className="flex items-center text-red-700">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Role-Based Access Control
                </div>
                <div className="flex items-center text-red-700">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Audit Trail Logging
                </div>
                <div className="flex items-center text-red-700">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  24/7 Security Monitoring
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Kurdistan Regional Government</h3>
            <p className="text-gray-600 mb-6">
              Official e-Visit Immigration Management System
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <span>🔒 Secure Access</span>
              <span>📊 Real-time Data</span>
              <span>⚡ Fast Processing</span>
              <span>🛡️ Role-based Security</span>
              <span>📱 Mobile Ready</span>
              <span>🌐 Multi-language</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
