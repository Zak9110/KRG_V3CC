'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

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

export default function ApplyFormPage() {
  const router = useRouter();
  const t = useTranslations('apply');
  const locale = useLocale();
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

    // Enhanced Visitor Profiling
    occupation: '',
    educationLevel: '',
    monthlyIncome: '',
    previousVisits: 0,

    // Visit Details
    originGovernorate: '',
    destinationGovernorate: '',
    visitPurpose: 'TOURISM',
    visitStartDate: '',
    visitEndDate: '',
    declaredAccommodation: '',

    // Economic Impact Tracking
    accommodationType: '',
    dailySpending: '',

    // Files
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
      alert(t('errors.invalidPhone'));
      return;
    }

    setLoading(true);
    try {
      // Format phone number (add +964 if not present)
      const formattedPhone = phoneNumber.startsWith('+964')
        ? phoneNumber
        : `+964${phoneNumber.replace(/^0/, '')}`;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          purpose: 'APPLICATION'
        })
      });

      if (!response.ok) {
        // Handle HTTP errors
        const errorData = await response.json().catch(() => ({ error: { message: `Server error: ${response.status}` } }));
        
        // Special handling for rate limit errors (429)
        if (response.status === 429) {
          const rateLimitMessage = errorData.error?.message || 'Please wait before requesting another code';
          alert(t('errors.sendOtpFailed') + ': ' + rateLimitMessage);
        } else {
          alert(t('errors.sendOtpFailed') + ': ' + (errorData.error?.message || `Server error: ${response.status}`));
        }
        return;
      }

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
        alert(t('errors.sendOtpFailed') + ': ' + (data.error?.message || ''));
      }
    } catch (error: any) {
      console.error('OTP send error:', error);
      const errorMessage = error?.message || 'Connection error';
      // Check if it's a network error
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        alert(t('errors.connectionError') + '\n\nMake sure the API server is running on http://localhost:3001');
      } else {
        alert(t('errors.connectionError') + ': ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      alert(t('otp.label'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/otp/verify`, {
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
        alert(t('otp.verified'));
        setStep('form');
      } else {
        alert(t('otp.invalid'));
      }
    } catch (error) {
      alert(t('errors.verifyOtpFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Submit Application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.fullName.trim()) {
      alert(t('form.fullName') + ' ' + t('common.required'));
      return;
    }

    if (!formData.nationalId.trim()) {
      alert(t('form.nationalId') + ' ' + t('common.required'));
      return;
    }

    if (!formData.dateOfBirth) {
      alert(t('form.dateOfBirth') + ' ' + t('common.required'));
      return;
    }

    if (!formData.originGovernorate) {
      alert(t('form.originGovernorate') + ' ' + t('common.required'));
      return;
    }

    if (!formData.destinationGovernorate) {
      alert(t('form.destinationGovernorate') + ' ' + t('common.required'));
      return;
    }

    if (!formData.visitPurpose) {
      alert(t('form.visitPurpose') + ' ' + t('common.required'));
      return;
    }

    if (!formData.visitStartDate) {
      alert(t('form.visitStartDate') + ' ' + t('common.required'));
      return;
    }

    if (!formData.visitEndDate) {
      alert(t('form.visitEndDate') + ' ' + t('common.required'));
      return;
    }

    // Validate dates
    const startDate = new Date(formData.visitStartDate);
    const endDate = new Date(formData.visitEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only

    if (startDate <= today) {
      alert(t('errors.dateMustBeFuture'));
      return;
    }

    if (endDate <= startDate) {
      alert(t('errors.endDateAfterStart'));
      return;
    }

    // Validate required files
    if (!formData.headshotFile) {
      alert(t('form.documents.headshot') + ' ' + t('common.required'));
      return;
    }

    if (!formData.nationalIdFile) {
      alert(t('form.documents.nationalIdFront') + ' ' + t('common.required'));
      return;
    }

    if (!formData.nationalIdBackFile) {
      alert(t('form.documents.nationalIdBack') + ' ' + t('common.required'));
      return;
    }

    setLoading(true);

    try {
      // Step 1: Submit application data (without files)
      const applicationResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/applications`, {
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

          // Enhanced Visitor Profiling
          occupation: formData.occupation || undefined,
          educationLevel: formData.educationLevel || undefined,
          monthlyIncome: formData.monthlyIncome || undefined,
          previousVisits: formData.previousVisits || 0,

          // Visit Details
          originGovernorate: formData.originGovernorate,
          destinationGovernorate: formData.destinationGovernorate,
          visitPurpose: formData.visitPurpose,
          visitStartDate: formData.visitStartDate,
          visitEndDate: formData.visitEndDate,
          declaredAccommodation: formData.declaredAccommodation,

          // Economic Impact Tracking
          accommodationType: formData.accommodationType || undefined,
          dailySpending: formData.dailySpending ? parseFloat(formData.dailySpending) : undefined,

          phoneNumber: verifiedPhone
        })
      });

      // Check if response is ok
      if (!applicationResponse.ok) {
        let errorMessage = 'Network error or server unavailable';
        try {
          const errorData = await applicationResponse.json();
          errorMessage = errorData.error?.message || errorData.message || `Server error (${applicationResponse.status})`;
        } catch (e) {
          // If JSON parsing fails, use default message
          errorMessage = `Server error (${applicationResponse.status})`;
        }
        console.error('Application creation failed:', { status: applicationResponse.status, error: errorMessage });
        alert(`${t('errors.submitFailed')}: ${errorMessage}`);
        setLoading(false);
        return;
      }

      const applicationData = await applicationResponse.json();

      if (!applicationData.success) {
        console.error('Application creation failed:', applicationData);
        const errorMsg = applicationData.error?.message || applicationData.error?.code || 'Unknown error';
        alert(`${t('errors.submitFailed')}: ${errorMsg}`);
        setLoading(false);
        return;
      }

      const applicationId = applicationData.data.id;

      // Step 2: Upload National ID file (front)
      const nationalIdFormData = new FormData();
      nationalIdFormData.append('files', formData.nationalIdFile);
      nationalIdFormData.append('applicationId', applicationId);
      nationalIdFormData.append('documentType', 'NATIONAL_ID');

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
        method: 'POST',
        body: nationalIdFormData
      });

      // Step 3: Upload National ID back file (if provided)
      if (formData.nationalIdBackFile) {
        const nationalIdBackFormData = new FormData();
        nationalIdBackFormData.append('files', formData.nationalIdBackFile);
        nationalIdBackFormData.append('applicationId', applicationId);
        nationalIdBackFormData.append('documentType', 'NATIONAL_ID_BACK');

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
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

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
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

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
          method: 'POST',
          body: passportFormData
        });
      }

      // Success!
      setReferenceNumber(applicationData.data.referenceNumber);
      setStep('success');

    } catch (error: any) {
      console.error('Application submission error:', error);
      const errorMessage = error?.message || 'Network error. Please check your connection.';
      alert(t('errors.submitFailed') + ': ' + errorMessage + '. ' + t('errors.tryAgain'));
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('phone.title')}</h1>
              <p className="text-gray-600">{t('phone.description')}</p>
            </div>

            {/* Phone Input */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('phone.label')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">+964</span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={t('phone.placeholder')}
                    className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={10}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {t('phone.example')}
                </p>
              </div>

              <button
                onClick={handleSendOTP}
                disabled={loading || !phoneNumber}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('phone.sending') : t('phone.sendCode')}
              </button>

              <button
                onClick={() => router.push(`/${locale}/apply`)}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                {t('phone.backToLanding')}
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('otp.title')}</h1>
              <p className="text-gray-600">{t('otp.sentTo')}</p>
              <p className="text-blue-600 font-semibold">{verifiedPhone}</p>
            </div>

            {/* Development OTP Display */}
            {developmentOtp && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800">{t('otp.devMode')}</p>
                <p className="text-xs text-yellow-700 mt-1">{t('otp.yourOtp')} <span className="font-mono font-bold text-lg">{developmentOtp}</span></p>
              </div>
            )}

            {/* OTP Input */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('otp.label')}
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('otp.placeholder')}
                  maxLength={6}
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('otp.verifying') : t('otp.verify')}
              </button>

              {countdown > 0 ? (
                <p className="text-center text-sm text-gray-500">
                  {t('otp.resendIn')} {countdown}s
                </p>
              ) : (
                <button
                  onClick={handleSendOTP}
                  className="w-full text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t('otp.resend')}
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
                {t('otp.changePhone')}
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 lg:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-4 lg:p-8">
            {/* Header */}
            <div className="mb-6 lg:mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{t('form.title')}</h1>
              <p className="text-sm lg:text-base text-gray-600">{t('form.phoneVerified')} {verifiedPhone}</p>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-6 lg:space-y-8">
            {/* Personal Information */}
            <div className="border-b pb-4 lg:pb-6">
              <h2 className="text-lg lg:text-xl font-semibold text-gray-800 mb-4">{t('form.personalInfo')}</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.fullName')}
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('form.fullNamePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.motherFullName')}
                  </label>
                  <input
                    type="text"
                    name="motherFullName"
                    value={formData.motherFullName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('form.motherFullNamePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.gender')}
                  </label>
                  <select
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="MALE">{t('form.male')}</option>
                    <option value="FEMALE">{t('form.female')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.nationalId')}
                  </label>
                  <input
                    type="text"
                    name="nationalId"
                    required
                    value={formData.nationalId}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('form.nationalIdPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.dateOfBirth')}
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.email')}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('form.emailPlaceholder')}
                  />
                </div>

                {/* Enhanced Visitor Profiling */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.occupation')}
                  </label>
                  <select
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('form.selectOccupation')}</option>
                    <option value="STUDENT">{t('form.occupations.STUDENT')}</option>
                    <option value="BUSINESS">{t('form.occupations.BUSINESS')}</option>
                    <option value="TOURISM">{t('form.occupations.TOURISM')}</option>
                    <option value="MEDICAL">{t('form.occupations.MEDICAL')}</option>
                    <option value="ENGINEERING">{t('form.occupations.ENGINEERING')}</option>
                    <option value="TEACHING">{t('form.occupations.TEACHING')}</option>
                    <option value="GOVERNMENT">{t('form.occupations.GOVERNMENT')}</option>
                    <option value="OTHER">{t('form.occupations.OTHER')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.educationLevel')}
                  </label>
                  <select
                    name="educationLevel"
                    value={formData.educationLevel}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('form.selectEducation')}</option>
                    <option value="PRIMARY">{t('form.education.PRIMARY')}</option>
                    <option value="SECONDARY">{t('form.education.SECONDARY')}</option>
                    <option value="UNIVERSITY">{t('form.education.UNIVERSITY')}</option>
                    <option value="POSTGRADUATE">{t('form.education.POSTGRADUATE')}</option>
                    <option value="NONE">{t('form.education.NONE')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.monthlyIncome')}
                  </label>
                  <select
                    name="monthlyIncome"
                    value={formData.monthlyIncome}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('form.selectIncome')}</option>
                    <option value="UNDER_500">{t('form.income.UNDER_500')}</option>
                    <option value="500_1000">{t('form.income.500_1000')}</option>
                    <option value="1000_2000">{t('form.income.1000_2000')}</option>
                    <option value="2000_5000">{t('form.income.2000_5000')}</option>
                    <option value="OVER_5000">{t('form.income.OVER_5000')}</option>
                    <option value="PREFER_NOT_SAY">{t('form.income.PREFER_NOT_SAY')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.previousVisits')}
                  </label>
                  <input
                    type="number"
                    name="previousVisits"
                    min="0"
                    value={formData.previousVisits}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('form.previousVisitsPlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Visit Details */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('form.visitDetails')}</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.originGovernorate')}
                  </label>
                  <select
                    name="originGovernorate"
                    required
                    value={formData.originGovernorate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('form.selectOrigin')}</option>
                    {IRAQ_GOVERNORATES.map(gov => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.destinationGovernorate')}
                  </label>
                  <select
                    name="destinationGovernorate"
                    required
                    value={formData.destinationGovernorate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('form.selectDestination')}</option>
                    {KRG_GOVERNORATES.map(gov => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.visitPurpose')}
                  </label>
                  <select
                    name="visitPurpose"
                    required
                    value={formData.visitPurpose}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="TOURISM">{t('purposes.TOURISM')}</option>
                    <option value="BUSINESS">{t('purposes.BUSINESS')}</option>
                    <option value="FAMILY_VISIT">{t('purposes.FAMILY_VISIT')}</option>
                    <option value="MEDICAL">{t('purposes.MEDICAL')}</option>
                    <option value="EDUCATION">{t('purposes.EDUCATION')}</option>
                    <option value="OTHER">{t('purposes.OTHER')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.visitStartDate')}
                  </label>
                  <input
                    type="date"
                    name="visitStartDate"
                    required
                    value={formData.visitStartDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.visitEndDate')}
                  </label>
                  <input
                    type="date"
                    name="visitEndDate"
                    required
                    value={formData.visitEndDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Economic Impact Tracking */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.accommodationType')}
                  </label>
                  <select
                    name="accommodationType"
                    value={formData.accommodationType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('form.selectAccommodation')}</option>
                    <option value="HOTEL">{t('form.accommodationTypes.HOTEL')}</option>
                    <option value="RENTAL">{t('form.accommodationTypes.RENTAL')}</option>
                    <option value="FAMILY_HOME">{t('form.accommodationTypes.FAMILY_HOME')}</option>
                    <option value="HOSTEL">{t('form.accommodationTypes.HOSTEL')}</option>
                    <option value="OTHER">{t('form.accommodationTypes.OTHER')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.dailySpending')}
                  </label>
                  <input
                    type="number"
                    name="dailySpending"
                    min="0"
                    step="0.01"
                    value={formData.dailySpending}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('form.dailySpendingPlaceholder')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('form.dailySpendingNote')}
                  </p>
                </div>

                {/* Document Upload Section */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    {t('form.documents.title')}
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      {t('form.documents.note')}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Headshot Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('form.documents.headshot')}
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
                      <p className="mt-1 text-xs text-gray-500">{t('form.documents.headshotNote')}</p>
                    </div>

                    {/* National ID Front Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('form.documents.nationalIdFront')}
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
                        {t('form.documents.nationalIdBack')}
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
                        {t('form.documents.passport')}
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
                    {t('form.declaredAccommodation')}
                  </label>
                  <textarea
                    name="declaredAccommodation"
                    value={formData.declaredAccommodation}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('form.accommodationPlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => router.push(`/${locale}/apply`)}
                className="flex-1 px-6 py-3 text-base border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                {t('form.backToLanding')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? t('form.submitting') : t('form.submit')}
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

            <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('success.title')}</h1>
            <p className="text-gray-600 mb-6">{t('success.description')}</p>

            {/* Reference Number */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
              <p className="text-sm text-gray-600 mb-2">{t('success.referenceNumber')}</p>
              <p className="text-3xl font-bold text-blue-600 tracking-wider">{referenceNumber}</p>
              <p className="text-xs text-gray-500 mt-2">{t('success.saveReference')}</p>
            </div>

            {/* SMS Notification */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-green-800">
                {t('success.smsSent')} <strong>{verifiedPhone}</strong>
              </p>
              <p className="text-xs text-green-700 mt-1">
                {t('success.smsUpdates')}
              </p>
            </div>

            {/* Next Steps */}
            <div className="text-left mb-8">
              <h2 className="font-bold text-gray-900 mb-4">{t('success.nextSteps')}</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">1.</span>
                  <span>{t('success.step1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">2.</span>
                  <span>{t('success.step2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">3.</span>
                  <span>{t('success.step3')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">4.</span>
                  <span>{t('success.step4')}</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push(`/${locale}/track?ref=${referenceNumber}`)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                {t('success.trackApplication')}
              </button>
              <button
                onClick={() => router.push(`/${locale}/apply`)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                {t('success.returnToLanding')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
