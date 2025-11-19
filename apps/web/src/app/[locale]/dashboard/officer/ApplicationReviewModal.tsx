'use client'

import { useState, useEffect } from 'react'

interface Application {
  id: string
  referenceNumber: string
  fullName: string
  motherFullName?: string | null
  gender?: string
  nationalId: string
  phoneNumber: string
  email: string | null
  dateOfBirth: string
  nationality: string
  originGovernorate: string
  destinationGovernorate: string
  visitPurpose: string
  visitStartDate: string
  visitEndDate: string
  declaredAccommodation: string | null
  status: string
  securityRiskScore: number
  securityFlags: string | null
  createdAt: string
  documents?: Array<{
    id: string
    documentType: string
    fileName: string
    fileUrl: string
    uploadedAt: string
  }>
}

interface ApplicationReviewModalProps {
  application: Application
  onClose: () => void
  onUpdate: () => void
  isSupervisor?: boolean
}

export default function ApplicationReviewModal({
  application,
  onClose,
  onUpdate,
  isSupervisor = false
}: ApplicationReviewModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'security' | 'history'>('details')
  const [loading, setLoading] = useState(false)
  const [showApproveForm, setShowApproveForm] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionNotes, setRejectionNotes] = useState('')
  const [previousVisits, setPreviousVisits] = useState<Application[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [watchlistMatch, setWatchlistMatch] = useState<any>(null)
  const [watchlistLoading, setWatchlistLoading] = useState(false)

  // Check watchlist when modal opens
  useEffect(() => {
    checkWatchlist()
  }, [application.id])

  const handleApprove = async () => {
    console.log('Approve clicked - Application ID:', application.id)
    
    if (!confirm('Are you sure you want to approve this application?')) {
      console.log('Approval cancelled by user')
      return
    }

    console.log('Starting approval process...')
    setLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Authentication required. Please log in again.')
        return
      }

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/applications/${application.id}/approve`
      console.log('Sending PATCH request to:', url)

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          approvalNotes,
          officerId: 'officer-1'
        })
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (data.success) {
        alert('✅ Application approved successfully!')
        onUpdate()
        onClose()
      } else {
        console.error('Approval failed:', data.error)
        alert('Error: ' + (data.error?.message || 'Failed to approve'))
      }
    } catch (error) {
      console.error('Approval error:', error)
      alert('Error approving application: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
      console.log('Approval process completed')
    }
  }

  const handleReject = async () => {
    if (!rejectionReason) {
      alert('Please select a rejection reason')
      return
    }

    console.log('Reject clicked - Application ID:', application.id)
    
    if (!confirm('Are you sure you want to reject this application?')) {
      console.log('Rejection cancelled by user')
      return
    }

    console.log('Starting rejection process...')
    setLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Authentication required. Please log in again.')
        return
      }

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/applications/${application.id}/reject`
      console.log('Sending PATCH request to:', url)

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rejectionReason,
          rejectionNotes,
          officerId: 'officer-1'
        })
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (data.success) {
        alert('❌ Application rejected')
        onUpdate()
        onClose()
      } else {
        console.error('Rejection failed:', data.error)
        alert('Error: ' + (data.error?.message || 'Failed to reject'))
      }
    } catch (error) {
      console.error('Rejection error:', error)
      alert('Error rejecting application: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
      console.log('Rejection process completed')
    }
  }

  const fetchPreviousVisits = async () => {
    setHistoryLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        setHistoryLoading(false)
        return
      }

      // Fetch all applications with the same national ID
      const response = await fetch('http://localhost:3001/api/applications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()

      if (data.success) {
        // Filter applications with same national ID, excluding current one
        const history = (data.data as Application[]).filter(
          app => app.nationalId === application.nationalId && app.id !== application.id
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        
        setPreviousVisits(history)
      }
    } catch (error) {
      console.error('Failed to fetch previous visits:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const checkWatchlist = async () => {
    setWatchlistLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        const result = await response.json()
        const watchlistData = result.data || result
        
        if (Array.isArray(watchlistData)) {
          // Check if applicant is on watchlist
          const match = watchlistData.find((entry: any) => 
            entry.nationalId === application.nationalId && entry.isActive
          )
          setWatchlistMatch(match || null)
        }
      }
    } catch (error) {
      console.error('Failed to check watchlist:', error)
    } finally {
      setWatchlistLoading(false)
    }
  }

  const handleRequestDocuments = async () => {
    const docs = prompt('Enter required documents (comma-separated):')
    if (!docs) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Authentication required. Please log in again.')
        setLoading(false)
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/applications/${application.id}/request-documents`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestedDocuments: docs,
          notes: 'Please upload the requested documents',
          officerId: 'officer-1'
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('📄 Document request sent')
        onUpdate()
        onClose()
      } else {
        alert('Error: ' + (data.error?.message || 'Failed to request documents'))
      }
    } catch (error) {
      alert('Error requesting documents')
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600'
    if (score >= 50) return 'text-orange-600'
    if (score >= 30) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getRiskLabel = (score: number) => {
    if (score >= 80) return 'CRITICAL'
    if (score >= 50) return 'HIGH'
    if (score >= 30) return 'MEDIUM'
    return 'LOW'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col my-4">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-start bg-gray-50">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{application.fullName}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                application.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                application.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                application.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {application.status}
              </span>
            </div>
            <p className="text-gray-600 font-mono">{application.referenceNumber}</p>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span className="text-gray-600">
                Risk: <span className={`font-bold ${getRiskColor(application.securityRiskScore)}`}>
                  {application.securityRiskScore}/100 ({getRiskLabel(application.securityRiskScore)})
                </span>
              </span>
              <span className="text-gray-600">
                Submitted: {new Date(application.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50">
          <div className="flex gap-1 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 font-medium text-sm transition ${
                activeTab === 'details'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Details
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-3 font-medium text-sm transition ${
                activeTab === 'documents'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📎 Documents ({application.documents?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-3 font-medium text-sm transition ${
                activeTab === 'security'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🛡️ Security
            </button>
            <button
              onClick={() => {
                setActiveTab('history')
                if (previousVisits.length === 0 && !historyLoading) {
                  fetchPreviousVisits()
                }
              }}
              className={`px-4 py-3 font-medium text-sm transition ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📜 History
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Watchlist Warning Banner */}
          {watchlistMatch && (
            <div className="mb-6 bg-red-50 border-2 border-red-500 rounded-lg p-5 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 mb-2">⚠️ WATCHLIST MATCH DETECTED</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-red-800">
                      <strong>This applicant is flagged in the security watchlist.</strong>
                    </p>
                    <div className="bg-white bg-opacity-60 rounded p-3 space-y-1">
                      <p><strong className="text-red-900">Flag Type:</strong> <span className="text-red-800">{watchlistMatch.flagType}</span></p>
                      <p><strong className="text-red-900">Severity:</strong> <span className={`font-bold ${
                        watchlistMatch.severity === 'CRITICAL' ? 'text-red-900' :
                        watchlistMatch.severity === 'HIGH' ? 'text-orange-700' :
                        watchlistMatch.severity === 'MEDIUM' ? 'text-yellow-700' : 'text-blue-700'
                      }`}>{watchlistMatch.severity}</span></p>
                      <p><strong className="text-red-900">Reason:</strong> <span className="text-red-800">{watchlistMatch.reason}</span></p>
                      {watchlistMatch.notes && (
                        <p><strong className="text-red-900">Notes:</strong> <span className="text-red-800">{watchlistMatch.notes}</span></p>
                      )}
                    </div>
                    <p className="text-red-900 font-semibold mt-3">
                      ⚠️ Exercise extreme caution when reviewing this application. Consult supervisor if needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Full Name</label>
                    <p className="font-medium">{application.fullName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Mother's Full Name</label>
                    <p className="font-medium">{application.motherFullName || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Gender</label>
                    <p className="font-medium">{application.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">National ID</label>
                    <p className="font-medium font-mono">{application.nationalId}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Date of Birth</label>
                    <p className="font-medium">{new Date(application.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Nationality</label>
                    <p className="font-medium">{application.nationality}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Phone Number</label>
                    <p className="font-medium font-mono">{application.phoneNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <p className="font-medium">{application.email || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Visit Details */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Visit Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Origin</label>
                    <p className="font-medium">{application.originGovernorate}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Destination</label>
                    <p className="font-medium">{application.destinationGovernorate}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Purpose</label>
                    <p className="font-medium">{application.visitPurpose}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Duration</label>
                    <p className="font-medium">
                      {new Date(application.visitStartDate).toLocaleDateString()} → {new Date(application.visitEndDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-gray-600">Declared Accommodation</label>
                    <p className="font-medium">{application.declaredAccommodation || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              {!application.documents || application.documents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Review Instructions:</strong> Compare the applicant's information with the uploaded documents. 
                      Verify that names, dates, and photos match across all documents.
                    </p>
                  </div>

                  {/* Organize documents by type */}
                  {['VISITOR_PHOTO', 'NATIONAL_ID', 'NATIONAL_ID_BACK', 'PASSPORT'].map(docType => {
                    const doc = application.documents?.find(d => d.documentType === docType)
                    if (!doc) return null

                    const getDocTypeLabel = (type: string) => {
                      switch(type) {
                        case 'VISITOR_PHOTO': return '📸 Headshot Photo'
                        case 'NATIONAL_ID': return '🪪 National ID (Front)'
                        case 'NATIONAL_ID_BACK': return '🪪 National ID (Back)'
                        case 'PASSPORT': return '📕 Passport'
                        default: return type
                      }
                    }

                    const isImage = doc.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)

                    return (
                      <div key={doc.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{getDocTypeLabel(doc.documentType)}</p>
                              <p className="text-sm text-gray-600">{doc.fileName}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Uploaded: {new Date(doc.uploadedAt).toLocaleString()}
                              </p>
                            </div>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Open Full Size
                            </a>
                          </div>
                        </div>
                        
                        {isImage ? (
                          <div className="p-4 bg-gray-100 flex justify-center">
                            <img 
                              src={doc.fileUrl} 
                              alt={doc.documentType}
                              className="max-w-full max-h-96 rounded-lg shadow-md object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E'
                              }}
                            />
                          </div>
                        ) : (
                          <div className="p-8 text-center bg-gray-50">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-600">PDF Document</p>
                            <p className="text-sm text-gray-500">Click "Open Full Size" to view</p>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Additional documents */}
                  {application.documents
                    ?.filter(d => !['VISITOR_PHOTO', 'NATIONAL_ID', 'NATIONAL_ID_BACK', 'PASSPORT'].includes(d.documentType))
                    .map(doc => {
                      const isImage = doc.fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                      
                      return (
                        <div key={doc.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                          <div className="bg-gray-50 px-4 py-3 border-b">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">{doc.documentType}</p>
                                <p className="text-sm text-gray-600">{doc.fileName}</p>
                              </div>
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              >
                                View
                              </a>
                            </div>
                          </div>
                          
                          {isImage && (
                            <div className="p-4 bg-gray-100 flex justify-center">
                              <img 
                                src={doc.fileUrl} 
                                alt={doc.documentType}
                                className="max-w-full max-h-96 rounded-lg shadow-md object-contain"
                              />
                            </div>
                          )}
                        </div>
                      )
                    })
                  }
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Assessment</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-700">Risk Score</span>
                    <span className={`text-3xl font-bold ${getRiskColor(application.securityRiskScore)}`}>
                      {application.securityRiskScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        application.securityRiskScore >= 80 ? 'bg-red-600' :
                        application.securityRiskScore >= 50 ? 'bg-orange-500' :
                        application.securityRiskScore >= 30 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${application.securityRiskScore}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Risk Level: <strong className={getRiskColor(application.securityRiskScore)}>
                      {getRiskLabel(application.securityRiskScore)}
                    </strong>
                  </p>
                </div>
              </div>

              {application.securityFlags && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Security Flags</h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">{application.securityFlags}</p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Checks Performed</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Watchlist check completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Duplicate detection completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Recent rejection check completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Overstay history check completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Suspicious pattern check completed</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Visit History</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Applications from the same national ID: <strong className="font-mono">{application.nationalId}</strong>
                </p>
              </div>

              {historyLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading history...</p>
                </div>
              ) : previousVisits.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 font-medium">No Previous Applications</p>
                  <p className="text-sm text-gray-500 mt-2">This is the first application from this applicant</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {previousVisits.map((visit, index) => (
                    <div key={visit.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                            #{previousVisits.length - index}
                          </div>
                          <div>
                            <p className="font-mono text-sm text-gray-600">{visit.referenceNumber}</p>
                            <p className="text-xs text-gray-500">Submitted {new Date(visit.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          visit.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          visit.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          visit.status === 'ACTIVE' ? 'bg-purple-100 text-purple-800' :
                          visit.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {visit.status}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 text-xs">Visit Period</p>
                          <p className="font-medium">
                            {new Date(visit.visitStartDate).toLocaleDateString()} - {new Date(visit.visitEndDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs">Route</p>
                          <p className="font-medium">{visit.originGovernorate} → {visit.destinationGovernorate}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs">Purpose</p>
                          <p className="font-medium">{visit.visitPurpose}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-gray-600">Risk Score: </span>
                          <span className={`font-bold ${
                            visit.securityRiskScore >= 80 ? 'text-red-600' :
                            visit.securityRiskScore >= 50 ? 'text-orange-600' :
                            visit.securityRiskScore >= 30 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {visit.securityRiskScore}/100
                          </span>
                        </div>
                        {visit.securityFlags && (
                          <div className="flex items-center gap-1 text-orange-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>Has Security Flags</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t p-6 bg-gray-50 space-y-4">
          {!showApproveForm && !showRejectForm && (
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleRequestDocuments}
                disabled={loading}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium disabled:opacity-50"
              >
                📄 Request Documents
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
              >
                ❌ Reject
              </button>
              <button
                onClick={() => setShowApproveForm(true)}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
              >
                ✅ Approve
              </button>
            </div>
          )}

          {showApproveForm && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-green-900">Approve Application</h4>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Optional approval notes..."
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowApproveForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          )}

          {showRejectForm && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-red-900">Reject Application</h4>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Select rejection reason...</option>
                <option value="INVALID_DOCUMENTS">Invalid or incomplete documents</option>
                <option value="SECURITY_CONCERN">Security concern</option>
                <option value="FRAUDULENT">Fraudulent application</option>
                <option value="DUPLICATE">Duplicate application</option>
                <option value="INELIGIBLE">Visitor ineligible</option>
                <option value="OTHER">Other reason</option>
              </select>
              <textarea
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Additional notes (optional)..."
                className="w-full px-4 py-2 border rounded-lg"
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || !rejectionReason}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
