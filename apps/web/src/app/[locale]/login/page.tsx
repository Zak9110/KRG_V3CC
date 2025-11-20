'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

const STAFF_ROLES = [
  { value: 'officer', label: 'Application Officer', email: 'officer@test.com' },
  { value: 'supervisor', label: 'Supervisor', email: 'supervisor@test.com' },
  { value: 'director', label: 'Director', email: 'director@test.com' }
];

export default function LoginPage() {
  const t = useTranslations('login');
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

      // Redirect based on role
      const role = result.data.user.role;
      if (role === 'OFFICER') {
        router.push('/dashboard/officer');
      } else if (role === 'SUPERVISOR') {
        router.push('/dashboard/supervisor');
      } else if (role === 'DIRECTOR') {
        router.push('/dashboard/director');
      } else {
        router.push('/dashboard/officer');
      }
    } catch (err: any) {
      setError(t('connectionError'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white shadow-xl rounded-2xl p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('title')}
            </h1>
            <p className="text-gray-600">{t('subtitle')}</p>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Select Your Role
            </label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="">Choose your role...</option>
              {STAFF_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="your.email@krg-evisit.gov"
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('loading') : t('signin')}
            </button>
          </form>

          {/* Test Credentials Notice */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">
              Test Credentials (select role above to auto-fill):
            </p>
            <div className="text-xs text-blue-700 space-y-2">
              {STAFF_ROLES.map((role) => (
                <div key={role.value} className="flex justify-between items-center">
                  <span className="font-medium">{role.label}:</span>
                  <span>{role.email} / password123</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
