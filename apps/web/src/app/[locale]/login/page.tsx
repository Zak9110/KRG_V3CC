'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

const STAFF_ROLES = [
  { 
    value: 'officer', 
    label: 'Application Officer', 
    email: 'officer@test.com',
    description: 'Review and process permit applications',
    icon: '📋'
  },
  { 
    value: 'supervisor', 
    label: 'Supervisor', 
    email: 'supervisor@test.com',
    description: 'Manage team and oversee operations',
    icon: '👨‍💼'
  },
  { 
    value: 'director', 
    label: 'Director', 
    email: 'director@test.com',
    description: 'Executive analytics and system oversight',
    icon: '📊'
  },
  { 
    value: 'checkpoint_officer', 
    label: 'Checkpoint Officer', 
    email: 'checkpoint@test.com',
    description: 'Border control and permit verification',
    icon: '🚔'
  }
];

export default function LoginPage() {
  const t = useTranslations('login');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get role from URL parameter (for backward compatibility)
  const roleParam = searchParams.get('role');
  const [selectedRole, setSelectedRole] = useState<string>(roleParam || '');

  // Set default credentials based on role
  useEffect(() => {
    if (roleParam) {
      setSelectedRole(roleParam);
      const roleData = STAFF_ROLES.find(r => r.value === roleParam);
      if (roleData) {
        setEmail(roleData.email);
      }
    }
  }, [roleParam]);

  // Handle role selection
  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    const roleData = STAFF_ROLES.find(r => r.value === role);
    if (roleData) {
      setEmail(roleData.email); // Pre-fill email for testing
    } else {
      setEmail(''); // Clear if no role selected
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error?.message || t('failed'));
        setLoading(false);
        return;
      }

      // Store token and user info
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));

      // Redirect directly to role-specific dashboard
      const userRole = result.data.user.role?.toUpperCase();
      let dashboardPath = '';
      
      switch (userRole) {
        case 'OFFICER':
          dashboardPath = `/${locale}/dashboard/officer`;
          break;
        case 'SUPERVISOR':
          dashboardPath = `/${locale}/dashboard/supervisor`;
          break;
        case 'DIRECTOR':
          dashboardPath = `/${locale}/dashboard/director`;
          break;
        case 'CHECKPOINT_OFFICER':
          dashboardPath = `/${locale}/checkpoint`;
          break;
        default:
          // Fallback to officer dashboard
          dashboardPath = `/${locale}/dashboard/officer`;
      }

      // Use window.location for a full page navigation to ensure auth state is properly initialized
      window.location.href = dashboardPath;
    } catch (err: any) {
      setError(t('connectionError'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold">KRG e-Visit System</h1>
                <p className="text-sm text-blue-100">Kurdistan Regional Government</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-2 text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Secure Portal</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Side - Information */}
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                🏛️ Government Portal
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Secure access to the Kurdistan Regional Government e-Visit Immigration Management System
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-gray-900">Secure Authentication</h3>
                    <p className="text-sm text-gray-600">JWT-based security with role-based access control</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-gray-900">Role-Based Access</h3>
                    <p className="text-sm text-gray-600">Each role has access to specific tools and functions</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-purple-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-gray-900">Audit Trail</h3>
                    <p className="text-sm text-gray-600">All actions are logged for compliance and security</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Information */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Available Roles</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {STAFF_ROLES.map((role) => (
                  <div key={role.value} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{role.icon}</span>
                      <h4 className="font-semibold text-gray-900">{role.label}</h4>
                    </div>
                    <p className="text-sm text-gray-600">{role.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* System Info */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-8 border border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">System Information</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="font-medium">System Version:</span>
                  <span>v3.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Last Updated:</span>
                  <span>November 2025</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span className="text-green-600 font-semibold">● Operational</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-200">

              {/* Login Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Staff Authentication
                </h2>
                <p className="text-gray-600">
                  Sign in to access your dashboard
                </p>
              </div>

              {/* Role Selection */}
              <div className="mb-6">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Select Your Role
                  </span>
                </label>
                <select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                >
                  <option value="">Choose your role...</option>
                  {STAFF_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.icon} {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email Address
                    </span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="your.email@krg-evisit.gov"
                    disabled={loading}
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Password
                    </span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Sign In to Portal
                    </>
                  )}
                </button>
              </form>

              {/* Test Credentials Notice */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Test Credentials
                    </p>
                    <p className="text-xs text-blue-700 mb-3">
                      Select a role above to auto-fill email. Password for all test accounts: <strong>password123</strong>
                    </p>
                    <div className="text-xs text-blue-700 space-y-1">
                      {STAFF_ROLES.map((role) => (
                        <div key={role.value} className="flex justify-between items-center py-1">
                          <span className="font-medium">{role.icon} {role.label}:</span>
                          <span className="font-mono">{role.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center text-xs text-gray-500">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>This is a secure government portal. All access is logged and monitored.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-300">
            <p>© 2025 Kurdistan Regional Government. All rights reserved.</p>
            <p className="mt-1">Official e-Visit Immigration Management System</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
