'use client';

import { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface PermitDetails {
  referenceNumber: string;
  fullName: string;
  nationality: string;
  visitPurpose: string;
  visitStartDate: string;
  visitEndDate: string;
  status: string;
}

export default function CheckpointScanner() {
  const [scanning, setScanning] = useState(false);
  const [permit, setPermit] = useState<PermitDetails | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkpointName, setCheckpointName] = useState('Erbil Border Checkpoint');
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [entryRecorded, setEntryRecorded] = useState(false);

  const startScanning = async () => {
    try {
      setError('');
      const html5QrCode = new Html5Qrcode('qr-reader');
      setScanner(html5QrCode);

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // Stop scanning immediately when QR detected
          await html5QrCode.stop();
          setScanning(false);
          await handleQRCodeScanned(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors (happens continuously)
        }
      );

      setScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError('Failed to start camera. Please check permissions.');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scanner) {
      try {
        await scanner.stop();
        setScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleQRCodeScanned = async (qrCode: string) => {
    setLoading(true);
    setError('');
    setPermit(null);
    setEntryRecorded(false);

    try {
      // Extract application ID from QR code format: KRG-PERMIT-{id}
      const match = qrCode.match(/^KRG-PERMIT-(.+)$/);
      if (!match) {
        setError('Invalid QR code format');
        setLoading(false);
        return;
      }

      const applicationId = match[1];

      // Fetch application details
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch(`http://localhost:3001/api/applications/${applicationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error?.message || 'Failed to verify permit');
        setLoading(false);
        return;
      }

      const data = await response.json();
      const app = data.application;

      // Validate permit
      if (app.status !== 'APPROVED' && app.status !== 'ACTIVE') {
        setError(`Permit is not valid. Status: ${app.status}`);
        setLoading(false);
        return;
      }

      // Check expiry
      const now = new Date();
      const endDate = new Date(app.visitEndDate);
      if (endDate < now) {
        setError('Permit has expired');
        setLoading(false);
        return;
      }

      setPermit({
        referenceNumber: app.referenceNumber,
        fullName: app.fullName,
        nationality: app.nationality,
        visitPurpose: app.visitPurpose,
        visitStartDate: app.visitStartDate,
        visitEndDate: app.visitEndDate,
        status: app.status,
      });
    } catch (err: any) {
      console.error('Error verifying permit:', err);
      setError('Failed to verify permit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = async () => {
    if (!manualCode.trim()) {
      setError('Please enter a reference number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      // Find application by reference number using authenticated endpoint
      const response = await fetch(`http://localhost:3001/api/applications/checkpoint/${manualCode.trim()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error?.message || 'Application not found');
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (!data.success || !data.data) {
        setError('Application not found');
        setLoading(false);
        return;
      }

      const app = data.data;

      // Validate permit
      if (app.status !== 'APPROVED' && app.status !== 'ACTIVE') {
        setError(`Permit is not valid. Status: ${app.status}`);
        setLoading(false);
        return;
      }

      // Check expiry
      const now = new Date();
      const endDate = new Date(app.visitEndDate);
      if (endDate < now) {
        setError('Permit has expired');
        setLoading(false);
        return;
      }

      setPermit({
        referenceNumber: app.referenceNumber,
        fullName: app.fullName,
        nationality: app.nationality,
        visitPurpose: app.visitPurpose,
        visitStartDate: app.visitStartDate,
        visitEndDate: app.visitEndDate,
        status: app.status
      });

    } catch (err) {
      console.error('Manual entry error:', err);
      setError('Failed to lookup application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const recordEntry = async () => {
    if (!permit) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      // Get the full application data using the checkpoint endpoint
      const response = await fetch(`http://localhost:3001/api/applications/checkpoint/${permit.referenceNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Application not found');
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (!data.success || !data.data) {
        setError('Application not found');
        setLoading(false);
        return;
      }

      const app = data.data;

      // Record entry
      const entryResponse = await fetch('http://localhost:3001/api/checkpoint/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          qrPayload: `KRG-PERMIT-${app.id}`,
          checkpointName,
          action: 'ENTRY',
        }),
      });

      if (!entryResponse.ok) {
        const errorData = await entryResponse.json();
        setError(errorData.error?.message || 'Failed to record entry');
        setLoading(false);
        return;
      }

      setEntryRecorded(true);
      
      // Show success for 3 seconds, then reset
      setTimeout(() => {
        setPermit(null);
        setEntryRecorded(false);
        setManualCode('');
      }, 3000);
    } catch (err: any) {
      console.error('Error recording entry:', err);
      setError('Failed to record entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.stop().catch(console.error);
      }
    };
  }, [scanner]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚧 Checkpoint Scanner
          </h1>
          <p className="text-gray-600">Scan QR codes to verify e-Visit permits</p>
          
          {/* Checkpoint selector */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Checkpoint Location
            </label>
            <select
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option>Erbil Border Checkpoint</option>
              <option>Sulaymaniyah Checkpoint</option>
              <option>Dohuk Checkpoint</option>
              <option>Erbil Airport</option>
              <option>Sulaymaniyah Airport</option>
            </select>
          </div>
        </div>

        {/* Scanner Section */}
        {!permit && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Scan QR Code</h2>
              <button
                onClick={() => setShowManual(!showManual)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showManual ? 'Use Camera' : 'Manual Entry'}
              </button>
            </div>

            {showManual ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter application ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleManualEntry}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Verifying...' : 'Verify Permit'}
                </button>
              </div>
            ) : (
              <>
                {!scanning ? (
                  <div className="text-center">
                    <div className="mb-6 p-8 bg-gray-100 rounded-lg">
                      <svg
                        className="w-24 h-24 mx-auto text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                        />
                      </svg>
                    </div>
                    <button
                      onClick={startScanning}
                      className="bg-green-600 text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-green-700"
                    >
                      📷 Start Camera Scanner
                    </button>
                  </div>
                ) : (
                  <div>
                    <div
                      id="qr-reader"
                      className="rounded-lg overflow-hidden mx-auto"
                      style={{ maxWidth: '500px' }}
                    />
                    <div className="text-center mt-4">
                      <p className="text-gray-600 mb-4">Point camera at QR code</p>
                      <button
                        onClick={stopScanning}
                        className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700"
                      >
                        Stop Scanner
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {loading && (
              <div className="mt-4 text-center text-blue-600">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2">Verifying permit...</p>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">❌ {error}</p>
            <button
              onClick={() => {
                setError('');
                setPermit(null);
                setManualCode('');
              }}
              className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Permit Details */}
        {permit && !entryRecorded && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-green-600">✅ Valid Permit</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  permit.status === 'APPROVED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {permit.status}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Reference Number</p>
                <p className="font-semibold text-lg">{permit.referenceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-semibold text-lg">{permit.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nationality</p>
                <p className="font-semibold">{permit.nationality}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Visit Purpose</p>
                <p className="font-semibold">{permit.visitPurpose}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Valid From</p>
                <p className="font-semibold">
                  {new Date(permit.visitStartDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Valid Until</p>
                <p className="font-semibold">
                  {new Date(permit.visitEndDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={recordEntry}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-md font-semibold hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Recording...' : '✅ Record Entry'}
              </button>
              <button
                onClick={() => {
                  setPermit(null);
                  setError('');
                  setManualCode('');
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-md font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Success Message */}
        {entryRecorded && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">
              Entry Recorded Successfully!
            </h2>
            <p className="text-green-700">
              Welcome to Kurdistan Region! SMS notification sent.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Click "Start Camera Scanner" to begin scanning</li>
            <li>Point camera at visitor's QR code permit</li>
            <li>Review permit details carefully</li>
            <li>Click "Record Entry" to log checkpoint entry</li>
            <li>Use "Manual Entry" if QR code is damaged</li>
          </ul>
        </div>

        {/* Camera Note */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Camera Testing Note</h3>
          <p className="text-sm text-yellow-800 mb-2">
            Camera access requires HTTPS in production. On localhost, use <strong>Manual Entry</strong> for testing.
          </p>
          <p className="text-xs text-yellow-700">
            In production (HTTPS), the camera will work perfectly on all mobile devices and tablets.
          </p>
        </div>
      </div>
    </div>
  );
}
