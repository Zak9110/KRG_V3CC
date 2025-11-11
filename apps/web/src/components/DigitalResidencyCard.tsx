'use client'

import { useRef } from 'react'
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
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Digital Card Preview */}
      <div 
        ref={cardRef}
        className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-2xl"
        style={{ minHeight: '400px' }}
      >
        {/* Header */}
        <div className="border-b border-white/20 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Kurdistan Region</h1>
              <p className="text-blue-100 text-sm">Ministry of Interior</p>
              <p className="text-blue-200 text-xs mt-1">Electronic Residency Permit</p>
            </div>
            {/* Applicant Photo */}
            <div className="flex flex-col items-center gap-2">
              {application.photoUrl ? (
                <div className="w-28 h-28 rounded-xl overflow-hidden border-4 border-white/30 shadow-xl bg-white">
                  <img 
                    src={application.photoUrl} 
                    alt={application.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-28 h-28 rounded-xl border-4 border-white/30 shadow-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Full Name</p>
              <p className="text-xl font-bold">{application.fullName}</p>
              {application.motherFullName && (
                <p className="text-sm text-blue-100 mt-1">Mother: {application.motherFullName}</p>
              )}
            </div>
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Nationality</p>
              <p className="text-xl font-bold">{application.nationality}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">National ID</p>
              <p className="text-lg font-semibold font-mono">{application.nationalId}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Date of Birth</p>
              <p className="text-lg font-semibold">{formatDate(application.dateOfBirth)}</p>
            </div>
          </div>

          {/* Visit Details */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Purpose</p>
                <p className="font-semibold">{application.visitPurpose}</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Destination</p>
                <p className="font-semibold">{application.destinationGovernorate || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Validity Period */}
          <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-4 border border-green-400/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-green-200 text-xs uppercase tracking-wide mb-1">Valid From</p>
                <p className="font-bold text-green-100">{formatDate(application.visitStartDate)}</p>
              </div>
              <div>
                <p className="text-green-200 text-xs uppercase tracking-wide mb-1">Valid Until</p>
                <p className="font-bold text-green-100">{formatDate(application.visitEndDate)}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-white/20">
            <div className="flex-1">
              <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Reference Number</p>
              <p className="font-mono font-bold text-lg">{application.referenceNumber}</p>
              {application.approvalDate && (
                <p className="text-blue-200 text-xs mt-1">
                  Approved: {formatDate(application.approvalDate)}
                </p>
              )}
            </div>
            
            {/* QR Code */}
            <div className="bg-white p-3 rounded-lg shadow-lg">
              {application.qrCode ? (
                <img 
                  src={application.qrCode} 
                  alt="QR Code" 
                  className="w-20 h-20"
                  onError={(e) => {
                    // Hide image if it fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="w-20 h-20 bg-gray-100 rounded flex items-center justify-center"><svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg></div>';
                  }}
                />
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Watermark */}
        <div className="text-center mt-6 pt-4 border-t border-white/20">
          <p className="text-blue-200 text-xs">
            This is an official electronic residency permit issued by the Kurdistan Regional Government
          </p>
          <p className="text-blue-300 text-xs mt-1">
            Verify authenticity at: evisit.krg.gov
          </p>
        </div>
      </div>

      {/* Download Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={downloadAsImage}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Download as Image
        </button>
        <button
          onClick={downloadAsPDF}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Download as PDF
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📱 How to Use Your Digital Residency Card</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Download and save this card to your device</li>
          <li>• Present it at checkpoints when requested</li>
          <li>• Keep a digital copy on your phone for easy access</li>
          <li>• The QR code can be scanned to verify authenticity</li>
          <li>• Valid only during the dates shown above</li>
        </ul>
      </div>
    </div>
  )
}
