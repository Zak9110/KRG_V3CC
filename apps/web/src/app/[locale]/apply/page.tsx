'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'phone' | 'otp' | 'form' | 'success';

// Iraqi Governorates
const IRAQ_GOVERNORATES = [
  'Baghdad',
  'Basra',
  'Nineveh',
  'Dhi Qar',
  'Al-Anbar',
  'Babylon',
  'Diyala',
  'Karbala',
  'Kirkuk',
  'Maysan',
  'Muthanna',
  'Najaf',
  'Qadisiyyah',
  'Salah al-Din',
  'Wasit'
];

// KRG Governorates
const KRG_GOVERNORATES = [
  'Erbil',
  'Sulaymaniyah',
  'Dohuk',
  'Halabja'
];

export default function ApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  
  // Phone verification
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [developmentOtp, setDevelopmentOtp] = useState(''); // For testing

  // Application form data
  const [formData, setFormData] = useState({
    fullName: '',
    motherFullName: '',
    gender: 'MALE',
    nationalId: '',
    email: '',
    dateOfBirth: '',
    nationality: 'Iraq',
    originGovernorate: '',
    destinationGovernorate: '',
    visitPurpose: 'TOURISM',
    visitStartDate: '',
    visitEndDate: '',
    declaredAccommodation: '',
    nationalIdFile: null as File | null,
    nationalIdBackFile: null as File | null,
    passportFile: null as File | null,
    headshotFile: null as File | null
  });

  const [referenceNumber, setReferenceNumber] = useState('');

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      alert('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      // Format phone number (add +964 if not present)
      const formattedPhone = phoneNumber.startsWith('+964') 
        ? phoneNumber 
        : `+964${phoneNumber.replace(/^0/, '')}`;

      const response = await fetch('http://localhost:3001/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          purpose: 'APPLICATION'
        })
      });

      const data = await response.json();

      if (data.success) {
        setCountdown(60); // 60 seconds cooldown
        setVerifiedPhone(formattedPhone);
        
        // In development, show the OTP code
        if (data.data.code) {
          setDevelopmentOtp(data.data.code);
          alert(`✅ SMS sent! Development OTP: ${data.data.code}`);
        } else {
          alert('✅ Verification code sent to your phone!');
        }
        
        setStep('otp');
      } else {
        alert('Error: ' + (data.error?.message || 'Failed to send OTP'));
      }
    } catch (error) {
      alert('Error sending OTP. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      alert('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: verifiedPhone,
          otpCode,
          purpose: 'APPLICATION'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Phone verified successfully!');
        setStep('form');
      } else {
        alert('❌ ' + (data.error?.message || 'Invalid or expired code'));
      }
    } catch (error) {
      alert('Error verifying OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Submit Application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required files
    if (!formData.headshotFile) {
      alert('Please upload your headshot photo');
      return;
    }

    if (!formData.nationalIdFile) {
      alert('Please upload your National ID (front) photo');
      return;
    }

    if (!formData.nationalIdBackFile) {
      alert('Please upload your National ID (back) photo');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Submit application data (without files)
      const applicationResponse = await fetch('http://localhost:3001/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          motherFullName: formData.motherFullName,
          gender: formData.gender,
          nationalId: formData.nationalId,
          email: formData.email,
          dateOfBirth: formData.dateOfBirth,
          nationality: formData.nationality,
          originGovernorate: formData.originGovernorate,
          destinationGovernorate: formData.destinationGovernorate,
          visitPurpose: formData.visitPurpose,
          visitStartDate: formData.visitStartDate,
          visitEndDate: formData.visitEndDate,
          declaredAccommodation: formData.declaredAccommodation,
          phoneNumber: verifiedPhone
        })
      });

      const applicationData = await applicationResponse.json();

      if (!applicationData.success) {
        alert('Error: ' + (applicationData.error?.message || 'Failed to submit application'));
        setLoading(false);
        return;
      }

      const applicationId = applicationData.data.id;

      // Step 2: Upload National ID file (front)
      const nationalIdFormData = new FormData();
      nationalIdFormData.append('files', formData.nationalIdFile);
      nationalIdFormData.append('applicationId', applicationId);
      nationalIdFormData.append('documentType', 'NATIONAL_ID');

      await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: nationalIdFormData
      });

      // Step 3: Upload National ID back file (if provided)
      if (formData.nationalIdBackFile) {
        const nationalIdBackFormData = new FormData();
        nationalIdBackFormData.append('files', formData.nationalIdBackFile);
        nationalIdBackFormData.append('applicationId', applicationId);
        nationalIdBackFormData.append('documentType', 'NATIONAL_ID_BACK');

        await fetch('http://localhost:3001/api/upload', {
          method: 'POST',
          body: nationalIdBackFormData
        });
      }

      // Step 4: Upload Headshot file (if provided)
      if (formData.headshotFile) {
        const headshotFormData = new FormData();
        headshotFormData.append('files', formData.headshotFile);
        headshotFormData.append('applicationId', applicationId);
        headshotFormData.append('documentType', 'VISITOR_PHOTO');

        await fetch('http://localhost:3001/api/upload', {
          method: 'POST',
          body: headshotFormData
        });
      }

      // Step 5: Upload Passport file (if provided)
      if (formData.passportFile) {
        const passportFormData = new FormData();
        passportFormData.append('files', formData.passportFile);
        passportFormData.append('applicationId', applicationId);
        passportFormData.append('documentType', 'PASSPORT');

        await fetch('http://localhost:3001/api/upload', {
          method: 'POST',
          body: passportFormData
        });
      }

      // Success!
      setReferenceNumber(applicationData.data.referenceNumber);
      setStep('success');

    } catch (error) {
      alert('Error submitting application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Render Phone Number Step
  if (step === 'phone') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Phone</h1>
              <p className="text-gray-600">Enter your phone number to receive a verification code</p>
            </div>

            {/* Phone Input */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">+964</span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="7501234567"
                    className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={10}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Example: 7501234567 (without leading 0)
                </p>
              </div>

              <button
                onClick={handleSendOTP}
                disabled={loading || !phoneNumber}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>

              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render OTP Verification Step
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter Verification Code</h1>
              <p className="text-gray-600">We sent a 6-digit code to</p>
              <p className="text-blue-600 font-semibold">{verifiedPhone}</p>
            </div>

            {/* Development OTP Display */}
            {developmentOtp && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800">🔧 Development Mode</p>
                <p className="text-xs text-yellow-700 mt-1">Your OTP: <span className="font-mono font-bold text-lg">{developmentOtp}</span></p>
              </div>
            )}

            {/* OTP Input */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              {countdown > 0 ? (
                <p className="text-center text-sm text-gray-500">
                  Resend code in {countdown}s
                </p>
              ) : (
                <button
                  onClick={handleSendOTP}
                  className="w-full text-blue-600 hover:text-blue-700 font-medium"
                >
                  Resend Code
                </button>
              )}

              <button
                onClick={() => {
                  setStep('phone');
                  setOtpCode('');
                  setDevelopmentOtp('');
                }}
                className="w-full text-gray-600 hover:text-gray-700 font-medium"
              >
                ← Change Phone Number
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Application Form Step
  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">e-Visit Application</h1>
              <p className="text-gray-600">✅ Phone verified: {verifiedPhone}</p>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-6">
            {/* Personal Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Personal Information</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mother's Full Name
                  </label>
                  <input
                    type="text"
                    name="motherFullName"
                    value={formData.motherFullName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter mother's full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    National ID *
                  </label>
                  <input
                    type="text"
                    name="nationalId"
                    required
                    value={formData.nationalId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter national ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Visit Details */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Visit Details</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Origin Governorate *
                  </label>
                  <select
                    name="originGovernorate"
                    required
                    value={formData.originGovernorate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select your governorate</option>
                    {IRAQ_GOVERNORATES.map(gov => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination in KRG *
                  </label>
                  <select
                    name="destinationGovernorate"
                    required
                    value={formData.destinationGovernorate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select destination</option>
                    {KRG_GOVERNORATES.map(gov => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visit Purpose *
                  </label>
                  <select
                    name="visitPurpose"
                    required
                    value={formData.visitPurpose}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="TOURISM">Tourism</option>
                    <option value="BUSINESS">Business</option>
                    <option value="FAMILY_VISIT">Family Visit</option>
                    <option value="MEDICAL">Medical</option>
                    <option value="EDUCATION">Education</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visit Start Date *
                  </label>
                  <input
                    type="date"
                    name="visitStartDate"
                    required
                    value={formData.visitStartDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visit End Date *
                  </label>
                  <input
                    type="date"
                    name="visitEndDate"
                    required
                    value={formData.visitEndDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Document Upload Section */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    📄 Required Documents
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      Please upload clear photos of your documents (JPEG, PNG, or PDF, max 5MB each)
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Headshot Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📸 Headshot Photo *
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({ ...formData, headshotFile: file });
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {formData.headshotFile && (
                        <p className="mt-2 text-sm text-green-600">
                          ✅ {formData.headshotFile.name} ({(formData.headshotFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">Recent passport-style photo</p>
                    </div>

                    {/* National ID Front Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🪪 National ID (Front) *
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({ ...formData, nationalIdFile: file });
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {formData.nationalIdFile && (
                        <p className="mt-2 text-sm text-green-600">
                          ✅ {formData.nationalIdFile.name} ({(formData.nationalIdFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>

                    {/* National ID Back Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🪪 National ID (Back) *
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        required
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({ ...formData, nationalIdBackFile: file });
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {formData.nationalIdBackFile && (
                        <p className="mt-2 text-sm text-green-600">
                          ✅ {formData.nationalIdBackFile.name} ({(formData.nationalIdBackFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>

                    {/* Passport Upload (Optional) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📕 Passport Photo (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({ ...formData, passportFile: file });
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {formData.passportFile && (
                        <p className="mt-2 text-sm text-green-600">
                          ✅ {formData.passportFile.name} ({(formData.passportFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Declared Accommodation
                  </label>
                  <textarea
                    name="declaredAccommodation"
                    value={formData.declaredAccommodation}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Hotel name and address or host information"
                  />
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    );
  }

  // Render Success Step
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
            <p className="text-gray-600 mb-6">Your e-Visit application has been received and is being processed.</p>

            {/* Reference Number */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
              <p className="text-sm text-gray-600 mb-2">Your Reference Number</p>
              <p className="text-3xl font-bold text-blue-600 tracking-wider">{referenceNumber}</p>
              <p className="text-xs text-gray-500 mt-2">Save this number to track your application</p>
            </div>

            {/* SMS Notification */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-green-800">
                📱 We've sent a confirmation SMS to <strong>{verifiedPhone}</strong>
              </p>
              <p className="text-xs text-green-700 mt-1">
                You'll receive updates about your application via SMS
              </p>
            </div>

            {/* Next Steps */}
            <div className="text-left mb-8">
              <h2 className="font-bold text-gray-900 mb-4">What happens next?</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">1.</span>
                  <span>Your application will be reviewed within 72 hours</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">2.</span>
                  <span>You'll receive SMS updates about your application status</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">3.</span>
                  <span>Once approved, download your QR code permit</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">4.</span>
                  <span>Show the QR code at the checkpoint when entering Kurdistan</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push(`/track?ref=${referenceNumber}`)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Track Application
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
