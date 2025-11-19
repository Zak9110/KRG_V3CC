'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function ServerErrorPage() {
  const t = useTranslations('common')

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">500</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Server Error
          </h2>
          <p className="text-gray-600 mb-8">
            Something went wrong on our end. Please try again later or contact support.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="block w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="block w-full bg-white hover:bg-gray-50 text-red-600 font-semibold py-3 px-6 rounded-lg border-2 border-red-600 transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
