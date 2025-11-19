'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function UnauthorizedPage() {
  const t = useTranslations('common')

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-8">
            You don't have permission to access this page. Please log in with appropriate credentials.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Login
          </Link>
          <Link
            href="/"
            className="block w-full bg-white hover:bg-gray-50 text-yellow-600 font-semibold py-3 px-6 rounded-lg border-2 border-yellow-600 transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
