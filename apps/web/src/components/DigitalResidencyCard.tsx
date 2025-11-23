'use client'

import { useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface DigitalResidencyCardProps {
  application: {
    referenceNumber: string
    fullName: string
    motherFullName?: string
    nationality: string
    nationalId: string
    dateOfBirth: string
    visitPurpose: string
    visitStartDate: string
    visitEndDate: string
    approvalDate?: string
    qrCode?: string
    destinationGovernorate?: string
    photoUrl?: string
  }
}

export default function DigitalResidencyCard({ application }: DigitalResidencyCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('track.residencyCard')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const downloadAsImage = async () => {
    if (!cardRef.current) return

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const link = document.createElement('a')
      link.download = `KRG-Residency-Card-${application.referenceNumber}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Failed to download card as image')
    }
  }

  const downloadAsPDF = async () => {
    if (!cardRef.current) return

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`KRG-Residency-Card-${application.referenceNumber}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to download card as PDF')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const localeString = isRTL ? 'ar-EG' : 'en-GB';
    return date.toLocaleDateString(localeString, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).replace(',', '');
  }

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const localeString = isRTL ? 'ar-EG' : 'en-GB';
    return date.toLocaleDateString(localeString, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  const formatPurpose = (purpose: string) => {
    return purpose.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Digital Card Preview */}
      <div 
        ref={cardRef}
        className={`bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-3xl p-8 md:p-10 text-white shadow-2xl border-4 border-white/20 ${isRTL ? 'text-right' : 'text-left'}`}
        style={{ 
          minHeight: '550px',
          background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #1e3a8a 100%)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Header Section with Photo */}
        <div className={`flex items-start gap-6 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Applicant Photo - Top Left/Right */}
          <div className="flex-shrink-0">
            {application.photoUrl ? (
              <div className="w-36 h-36 rounded-2xl overflow-hidden border-4 border-white/40 shadow-2xl bg-gray-100 ring-4 ring-white/20">
                <img 
                  src={application.photoUrl} 
                  alt={application.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-36 h-36 rounded-2xl border-4 border-white/40 shadow-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/20">
                <svg className="w-24 h-24 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>

          {/* Header Text */}
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 drop-shadow-lg">{t('title')}</h1>
            <p className="text-blue-100 text-xl md:text-2xl mb-2 font-semibold">{t('ministry')}</p>
            <p className="text-blue-200 text-base md:text-lg font-medium">{t('permitType')}</p>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="space-y-6">
          {/* Personal Information - Two Columns */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 ${isRTL ? 'md:grid-flow-row-dense' : ''}`}>
            {/* Left Column */}
            <div className="space-y-5">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-blue-200 text-xs uppercase tracking-wider mb-2 font-semibold">{t('nationality')}</p>
                <p className="text-2xl md:text-3xl font-bold">{application.nationality}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-blue-200 text-xs uppercase tracking-wider mb-2 font-semibold">{t('dateOfBirth')}</p>
                <p className="text-2xl md:text-3xl font-bold">{formatDate(application.dateOfBirth)}</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-blue-200 text-xs uppercase tracking-wider mb-2 font-semibold">{t('fullName')}</p>
                <p className="text-2xl md:text-3xl font-bold leading-tight">{application.fullName}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-blue-200 text-xs uppercase tracking-wider mb-2 font-semibold">{t('nationalId')}</p>
                <p className="text-2xl md:text-3xl font-bold font-mono">{application.nationalId}</p>
              </div>
            </div>
          </div>

          {/* Destination and Purpose - Centered */}
          <div className={`flex flex-col md:flex-row justify-center gap-6 md:gap-12 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <div className="text-center bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex-1">
              <p className="text-blue-200 text-xs uppercase tracking-wider mb-2 font-semibold">{t('destination')}</p>
              <p className="text-xl md:text-2xl font-bold">{application.destinationGovernorate || 'N/A'}</p>
            </div>
            <div className="text-center bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex-1">
              <p className="text-blue-200 text-xs uppercase tracking-wider mb-2 font-semibold">{t('purpose')}</p>
              <p className="text-xl md:text-2xl font-bold">{formatPurpose(application.visitPurpose)}</p>
            </div>
          </div>

          {/* Validity Period - Darker Blue Box */}
          <div className="bg-blue-900/60 backdrop-blur-sm rounded-2xl p-6 md:p-8 border-2 border-blue-400/40 shadow-xl">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${isRTL ? 'md:grid-flow-row-dense' : ''}`}>
              <div>
                <p className="text-blue-200 text-xs uppercase tracking-wider mb-2 font-semibold">{t('validUntil')}</p>
                <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">{formatDate(application.visitEndDate)}</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs uppercase tracking-wider mb-2 font-semibold">{t('validFrom')}</p>
                <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">{formatDate(application.visitStartDate)}</p>
              </div>
            </div>
          </div>

          {/* Footer - QR Code and Reference Number */}
          <div className={`flex flex-col md:flex-row items-start justify-between pt-6 border-t-2 border-white/30 gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl shadow-2xl ring-4 ring-white/30">
              {application.qrCode ? (
                <img 
                  src={application.qrCode} 
                  alt="QR Code" 
                  className="w-28 h-28 md:w-32 md:h-32"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="w-28 h-28 md:w-32 md:h-32 bg-gray-100 rounded-xl flex items-center justify-center"><svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg></div>';
                  }}
                />
              ) : (
                <div className="w-28 h-28 md:w-32 md:h-32 bg-gray-100 rounded-xl flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Reference Number and Approval Date */}
            <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-blue-200 text-xs uppercase tracking-wider mb-2 font-semibold">{t('referenceNumber')}</p>
              <p className="font-mono font-bold text-xl md:text-2xl mb-3 drop-shadow-md">{application.referenceNumber}</p>
              {application.approvalDate && (
                <p className="text-blue-200 text-sm font-medium">
                  {t('approved')}: {formatDateShort(application.approvalDate)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Watermark */}
        <div className="text-center mt-8 pt-6 border-t-2 border-white/30">
          <p className="text-blue-200 text-xs md:text-sm mb-2 font-medium leading-relaxed">
            {t('officialText')}
          </p>
          <p className="text-blue-300 text-xs md:text-sm font-semibold">
            {t('verifyUrl')}
          </p>
        </div>
      </div>

      {/* Download Buttons */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isRTL ? 'md:grid-flow-row-dense' : ''}`}>
        <button
          onClick={downloadAsImage}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {t('downloadImage')}
        </button>
        <button
          onClick={downloadAsPDF}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          {t('downloadPDF')}
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
        <h3 className="font-bold text-blue-900 mb-4 text-lg">{t('instructions')}</h3>
        <ul className={`text-sm text-blue-800 space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>{t('instruction1')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>{t('instruction2')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>{t('instruction3')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>{t('instruction4')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>{t('instruction5')}</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

