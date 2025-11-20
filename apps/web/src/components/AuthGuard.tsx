'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthGuardProps {
  children: React.ReactNode | ((user: User) => React.ReactNode);
  allowedRoles?: string[];
  requireAuth?: boolean;
  redirectTo?: string;
  provideUser?: boolean;
}

export default function AuthGuard({
  children,
  allowedRoles = ['officer', 'supervisor', 'director', 'checkpoint_officer'],
  requireAuth = true,
  redirectTo = '/en/login',
  provideUser = false
}: AuthGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (requireAuth) {
      checkAuthorization();
    } else {
      setIsAuthorized(true);
      setLoading(false);
    }
  }, []);

  const checkAuthorization = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        router.push(redirectTo);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        if (allowedRoles.includes(userData.role)) {
          setIsAuthorized(true);
          if (provideUser) {
            setUser(userData);
          }
        } else {
          router.push('/en/unauthorized');
        }
      } else {
        // Token invalid/expired
        localStorage.removeItem('token');
        router.push(redirectTo);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push(redirectTo);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Verifying access...</span>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect
  }

  if (provideUser && user) {
    return <>{typeof children === 'function' ? children(user) : children}</>;
  }

  return <>{children}</>;
}
