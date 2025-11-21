'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function HtmlAttributes() {
  const pathname = usePathname();

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Extract locale from pathname (e.g., /en/... or /ar/...)
    const locale = pathname?.split('/')[1] || 'en';
    const isArabic = locale === 'ar';

    // Set HTML attributes
    if (document.documentElement) {
      document.documentElement.lang = locale;
      document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    }
  }, [pathname]);

  return null;
}

