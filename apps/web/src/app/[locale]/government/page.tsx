'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import AuthGuard from '@/components/AuthGuard';

function GovernmentRedirect({ user }: { user: { id: string; email: string; fullName: string; role: string } }) {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    // Redirect to appropriate dashboard based on role
    const userRole = user.role?.toLowerCase();
    let dashboardPath = '';

    switch (userRole) {
      case 'officer':
        dashboardPath = `/${locale}/dashboard/officer`;
        break;
      case 'supervisor':
        dashboardPath = `/${locale}/dashboard/supervisor`;
        break;
      case 'director':
        dashboardPath = `/${locale}/dashboard/director`;
        break;
      case 'checkpoint_officer':
        dashboardPath = `/${locale}/checkpoint`;
        break;
      default:
        // Fallback to officer dashboard
        dashboardPath = `/${locale}/dashboard/officer`;
    }

    router.push(dashboardPath);
  }, [user.role, locale, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}

export default function GovernmentHubPage() {
  return (
    <AuthGuard provideUser={true}>
      {(user) => <GovernmentRedirect user={user} />}
    </AuthGuard>
  );
}
