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

  const printCard = () => {
    // Create print container
    const printContainer = document.createElement('div');
    printContainer.id = 'print-container';
    printContainer.innerHTML = `
      <style>
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          body * {
            visibility: hidden;
          }
          #print-container, #print-container * {
            visibility: visible;
          }
          #print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
        @media screen {
          #print-container {
            display: none;
          }
        }
        .id-card-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15mm;
          width: 100%;
          height: 100%;
          padding: 10mm;
          box-sizing: border-box;
          background: #f8f9fa;
        }
        .card-label {
          position: absolute;
          top: -8mm;
          left: 50%;
          transform: translateX(-50%);
          font-size: 8pt;
          font-weight: bold;
          color: #333;
          background: white;
          padding: 2mm 6mm;
          border-radius: 2mm;
          box-shadow: 0 1mm 2mm rgba(0,0,0,0.1);
        }
        .id-card-front, .id-card-back {
          width: 85.6mm;
          height: 53.98mm;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%);
          color: #000000;
          padding: 0;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          font-family: 'Arial', 'Helvetica', 'Segoe UI', sans-serif;
          position: relative;
          page-break-inside: avoid;
          border-radius: 3mm;
          box-shadow: 0 3mm 6mm rgba(0,0,0,0.25), 0 1mm 2mm rgba(0,0,0,0.15);
          border: 2px solid #003366;
          overflow: hidden;
        }
        .id-card-back {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%);
        }
        /* Enhanced Security Pattern Background */
        .id-card-front::before, .id-card-back::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            repeating-linear-gradient(45deg, transparent, transparent 1.5px, rgba(0,51,102,0.04) 1.5px, rgba(0,51,102,0.04) 3px),
            repeating-linear-gradient(-45deg, transparent, transparent 1.5px, rgba(0,51,102,0.04) 1.5px, rgba(0,51,102,0.04) 3px),
            radial-gradient(circle at 20% 30%, rgba(0,51,102,0.02) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(0,51,102,0.02) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }
        /* Holographic Effect */
        .id-card-front::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 8mm;
          background: linear-gradient(90deg, 
            rgba(255,255,255,0.3) 0%, 
            rgba(0,51,102,0.2) 25%, 
            rgba(255,255,255,0.3) 50%, 
            rgba(0,51,102,0.2) 75%, 
            rgba(255,255,255,0.3) 100%);
          pointer-events: none;
          z-index: 2;
          opacity: 0.6;
        }
        /* Enhanced Blue Header Bar */
        .id-header-bar {
          background: linear-gradient(135deg, #003366 0%, #004080 50%, #003366 100%);
          color: #ffffff;
          padding: 3mm 4mm;
          box-sizing: border-box;
          position: relative;
          z-index: 1;
          border-bottom: 2px solid #001f3f;
          box-shadow: 0 1mm 2mm rgba(0,0,0,0.2) inset;
        }
        .id-header-bar::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        }
        .id-header-title {
          font-size: 7.5pt;
          font-weight: 900;
          letter-spacing: 1pt;
          margin: 0;
          line-height: 1.2;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          text-transform: uppercase;
        }
        .id-header-subtitle {
          font-size: 6.5pt;
          font-weight: 600;
          margin: 0.8mm 0 0 0;
          opacity: 0.98;
          letter-spacing: 0.3pt;
        }
        /* Enhanced Card Body */
        .id-card-body {
          display: flex;
          flex: 1;
          padding: 3.5mm 4mm;
          box-sizing: border-box;
          position: relative;
          z-index: 1;
          background: rgba(255,255,255,0.7);
        }
        .id-photo-section {
          width: 24mm;
          margin-right: 4.5mm;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .id-card-body[dir="rtl"] .id-photo-section {
          margin-right: 0;
          margin-left: 4.5mm;
        }
        .id-photo {
          width: 24mm;
          height: 30mm;
          border: 2px solid #003366;
          border-radius: 2mm;
          object-fit: cover;
          background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
          display: block;
          box-shadow: 0 1.5mm 3mm rgba(0,0,0,0.2), inset 0 0 2mm rgba(0,51,102,0.1);
          position: relative;
        }
        .id-photo::after {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 2mm;
          pointer-events: none;
        }
        .id-info-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .id-field {
          margin-bottom: 1.8mm;
          padding-bottom: 1.2mm;
          border-bottom: 0.5px solid rgba(0,51,102,0.1);
        }
        .id-field:last-of-type {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }
        .id-label {
          font-size: 5.5pt;
          color: #003366;
          margin-bottom: 0.8mm;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5pt;
          font-family: 'Arial', sans-serif;
        }
        .id-value {
          font-size: 7.5pt;
          font-weight: 600;
          color: #000000;
          line-height: 1.4;
          word-break: break-word;
          font-family: 'Arial', 'Helvetica', sans-serif;
        }
        .id-signature-section {
          margin-top: 2.5mm;
          padding-top: 2.5mm;
          border-top: 1.5px solid #003366;
          background: rgba(255,255,255,0.5);
          padding-left: 1mm;
          padding-right: 1mm;
          border-radius: 1mm;
        }
        .id-signature-label {
          font-size: 5pt;
          color: #003366;
          text-transform: uppercase;
          margin-bottom: 1.2mm;
          font-weight: 700;
          letter-spacing: 0.3pt;
        }
        .id-signature-line {
          height: 9mm;
          border-bottom: 2px solid #000000;
          width: 100%;
          background: linear-gradient(to right, transparent, rgba(0,0,0,0.05), transparent);
        }
        /* Enhanced Footer with Seal and QR */
        .id-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding: 2.5mm 4mm;
          box-sizing: border-box;
          border-top: 2px solid #003366;
          position: relative;
          z-index: 1;
          background: rgba(255,255,255,0.8);
          box-shadow: 0 -1mm 2mm rgba(0,0,0,0.1) inset;
        }
        .id-card-footer[dir="rtl"] {
          flex-direction: row-reverse;
        }
        .id-seal {
          width: 14mm;
          height: 14mm;
          border: 2.5px solid #003366;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
          flex-shrink: 0;
          box-shadow: 0 1.5mm 3mm rgba(0,0,0,0.2), inset 0 0 2mm rgba(0,51,102,0.1);
          position: relative;
        }
        .id-seal::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8mm;
          height: 8mm;
          border: 1px solid #003366;
          border-radius: 50%;
        }
        .id-seal-text {
          font-size: 4pt;
          color: #003366;
          text-align: center;
          font-weight: 900;
          line-height: 1.2;
          padding: 0.5mm;
          z-index: 1;
          position: relative;
        }
        .id-footer-info {
          flex: 1;
          margin: 0 3.5mm;
        }
        .id-ref {
          font-size: 6.5pt;
          font-weight: 900;
          font-family: 'Courier New', 'Consolas', monospace;
          color: #003366;
          margin-bottom: 0.8mm;
          letter-spacing: 0.5pt;
        }
        .id-validity {
          font-size: 5.5pt;
          color: #003366;
          font-weight: 600;
        }
        .id-qr {
          width: 14mm;
          height: 14mm;
          background: #ffffff;
          padding: 1.5mm;
          border: 2px solid #003366;
          border-radius: 2mm;
          flex-shrink: 0;
          box-shadow: 0 1mm 2mm rgba(0,0,0,0.15), inset 0 0 1mm rgba(0,51,102,0.1);
        }
        .id-qr img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .id-back-content {
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: space-between;
          padding: 4.5mm;
          box-sizing: border-box;
          position: relative;
          z-index: 1;
          background: rgba(255,255,255,0.7);
        }
        .id-back-header {
          text-align: center;
          margin-bottom: 3.5mm;
          padding-bottom: 2mm;
          border-bottom: 2px solid #003366;
        }
        .id-back-title {
          font-size: 7.5pt;
          font-weight: 900;
          color: #003366;
          margin-bottom: 1mm;
          text-transform: uppercase;
          letter-spacing: 0.5pt;
        }
        .id-back-subtitle {
          font-size: 6.5pt;
          color: #003366;
          font-weight: 600;
        }
        .id-back-qr {
          text-align: center;
          margin: 3.5mm 0;
        }
        .id-back-qr-box {
          width: 28mm;
          height: 28mm;
          background: #ffffff;
          padding: 2.5mm;
          border: 2.5px solid #003366;
          border-radius: 3mm;
          margin: 0 auto;
          box-shadow: 0 2mm 4mm rgba(0,0,0,0.2), inset 0 0 2mm rgba(0,51,102,0.1);
          position: relative;
        }
        .id-back-qr-box::before {
          content: '';
          position: absolute;
          top: -2.5px;
          left: -2.5px;
          right: -2.5px;
          bottom: -2.5px;
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 3mm;
          pointer-events: none;
        }
        .id-back-qr-box img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .id-back-info {
          font-size: 5.5pt;
          text-align: center;
          color: #003366;
          line-height: 1.6;
          margin: 2.5mm 0;
          font-weight: 600;
        }
        .id-back-official {
          font-size: 5pt;
          text-align: center;
          color: #003366;
          font-style: italic;
          margin-top: 2.5mm;
          padding: 1.5mm;
          background: rgba(0,51,102,0.05);
          border-radius: 1mm;
          border: 1px solid rgba(0,51,102,0.2);
        }
        .id-back-watermark {
          font-size: 4.5pt;
          text-align: center;
          color: #003366;
          margin-top: auto;
          padding-top: 2.5mm;
          border-top: 1.5px solid #003366;
          font-weight: 600;
        }
      </style>
      <div class="id-card-container">
        <div style="position: relative;">
          <div class="card-label">${t('cardFront')}</div>
          <div class="id-card-front" dir="${isRTL ? 'rtl' : 'ltr'}">
            <!-- Blue Header -->
            <div class="id-header-bar">
              <div class="id-header-title">${t('permitType').toUpperCase()}</div>
              <div class="id-header-subtitle">${t('title')}</div>
            </div>
            
            <!-- Card Body -->
            <div class="id-card-body" dir="${isRTL ? 'rtl' : 'ltr'}">
              <!-- Photo Section -->
              <div class="id-photo-section">
                ${application.photoUrl ? `<img src="${application.photoUrl}" alt="Photo" class="id-photo" />` : '<div class="id-photo"></div>'}
              </div>
              
              <!-- Information Section -->
              <div class="id-info-section">
                <div>
                  <div class="id-field">
                    <div class="id-label">${t('fullName')}</div>
                    <div class="id-value">${application.fullName}</div>
                  </div>
                  <div class="id-field">
                    <div class="id-label">${t('nationalId')}</div>
                    <div class="id-value">${application.nationalId}</div>
                  </div>
                  <div class="id-field">
                    <div class="id-label">${t('dateOfBirth')}</div>
                    <div class="id-value">${formatDate(application.dateOfBirth)}</div>
                  </div>
                  <div class="id-field">
                    <div class="id-label">${t('nationality')}</div>
                    <div class="id-value">${application.nationality}</div>
                  </div>
                  <div class="id-field">
                    <div class="id-label">${t('destination')}</div>
                    <div class="id-value">${application.destinationGovernorate || 'N/A'}</div>
                  </div>
                  <div class="id-field">
                    <div class="id-label">${t('purpose')}</div>
                    <div class="id-value">${formatPurpose(application.visitPurpose)}</div>
                  </div>
                </div>
                
                <!-- Signature Section -->
                <div class="id-signature-section">
                  <div class="id-signature-label">Signature</div>
                  <div class="id-signature-line"></div>
                </div>
              </div>
            </div>
            
            <!-- Footer with Seal, Reference, and QR -->
            <div class="id-card-footer" dir="${isRTL ? 'rtl' : 'ltr'}">
              <div class="id-seal">
                <div class="id-seal-text">KRG<br/>${new Date().getFullYear()}</div>
              </div>
              <div class="id-footer-info">
                <div class="id-ref">ID# ${application.referenceNumber}</div>
                <div class="id-validity">Expires: ${formatDate(application.visitEndDate)}</div>
              </div>
              ${application.qrCode ? `<div class="id-qr"><img src="${application.qrCode}" alt="QR" /></div>` : '<div class="id-qr"></div>'}
            </div>
          </div>
        </div>
        
        <div style="position: relative;">
          <div class="card-label">${t('cardBack')}</div>
          <div class="id-card-back" dir="${isRTL ? 'rtl' : 'ltr'}">
            <div class="id-back-content">
              <div class="id-back-header">
                <div class="id-back-title">${t('permitType')}</div>
                <div class="id-back-subtitle">${t('title')}</div>
              </div>
              
              <div class="id-back-qr">
                ${application.qrCode ? `<div class="id-back-qr-box"><img src="${application.qrCode}" alt="QR Code" /></div>` : '<div class="id-back-qr-box"></div>'}
              </div>
              
              <div class="id-back-info">
                <div style="font-weight: bold; margin-bottom: 1.5mm; color: #003366;">${t('officialText')}</div>
                <div style="margin-bottom: 1mm;">${t('verifyUrl')}</div>
                <div style="font-size: 4.5pt; color: #666666;">
                  ${application.approvalDate ? `Approved: ${formatDateShort(application.approvalDate)}` : ''}
                </div>
              </div>
              
              <div class="id-back-official">
                This is an official document issued by the Kurdistan Regional Government
              </div>
              
              <div class="id-back-watermark">
                Valid from ${formatDate(application.visitStartDate)} to ${formatDate(application.visitEndDate)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(printContainer);
    
    // Trigger print
    window.print();
    
    // Clean up after print
    setTimeout(() => {
      document.body.removeChild(printContainer);
    }, 1000);
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

      {/* Download and Print Buttons */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${isRTL ? 'md:grid-flow-row-dense' : ''}`}>
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
        <button
          onClick={printCard}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {t('printCard')}
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


