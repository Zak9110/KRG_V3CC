'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Hide language switcher on government pages (English-only)
  const isGovernmentPage = pathname?.includes('/login') || 
                          pathname?.includes('/government') || 
                          pathname?.includes('/dashboard') || 
                          pathname?.includes('/checkpoint') ||
                          pathname?.includes('/unauthorized');

  if (isGovernmentPage) {
    return null;
  }

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en';
    
    startTransition(() => {
      // Store language preference
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
      
      // Update HTML dir attribute
      document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = newLocale;
      
      // Navigate to the new locale
      const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
      // Use window.location for a full page reload to ensure translations load correctly
      window.location.href = newPath;
    });
  };

  return (
    <button
      onClick={toggleLanguage}
      disabled={isPending}
      className="fixed top-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition flex items-center gap-2 disabled:opacity-50"
      aria-label="Toggle language"
    >
      <span className="text-lg">🌐</span>
      <span className="font-medium">
        {locale === 'en' ? 'العربية' : 'English'}
      </span>
    </button>
  );
}
