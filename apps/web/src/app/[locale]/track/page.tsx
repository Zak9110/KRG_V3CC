'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import DigitalResidencyCard from '@/components/DigitalResidencyCard';

export default function TrackPage() {
  const t = useTranslations('track');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!referenceNumber.trim()) return;
    
    setLoading(true);
    setError('');
    setApplication(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/status/${referenceNumber}`);
      const result = await response.json();

      if (result.success) {
        setApplication(result.data);
      } else {
        setError(t('notFound'));
      }
    } catch (err) {
      setError(t('notFound'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SUBMITTED: 'bg-blue-100 text-blue-800',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      ACTIVE: 'bg-purple-100 text-purple-800',
      EXPIRED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{t('title')}</h1>
          <p className="text-gray-600">{t('description')}</p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('referenceLabel')}
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value.toUpperCase())}
                placeholder={t('referencePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !referenceNumber.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? t('loading') : t('checkStatus')}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Application Details */}
        {application && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{t('applicationDetails')}</h2>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(application.status)}`}>
                    {t(`statusLabels.${application.status}`)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t('referenceNumber')}</p>
                    <p className="font-semibold text-gray-900">{application.referenceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('fullName')}</p>
                    <p className="font-semibold text-gray-900">{application.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('visitPurpose')}</p>
                    <p className="font-semibold text-gray-900">{application.visitPurpose}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('submittedDate')}</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(application.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Digital Residency Card - Show only when APPROVED */}
            {application.status === 'APPROVED' && (
              <DigitalResidencyCard application={application} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
