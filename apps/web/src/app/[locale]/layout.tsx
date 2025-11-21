import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import '../globals.css';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  // Ensure locale is valid (fallback to 'en')
  const validLocale = locale === 'ar' ? 'ar' : 'en';
  
  // Load messages for the current locale
  // Explicitly pass locale to ensure correct messages are loaded
  const messages = await getMessages({ locale: validLocale });

  return (
    <NextIntlClientProvider messages={messages} locale={validLocale} key={validLocale}>
          <LanguageSwitcher />
          {children}
        </NextIntlClientProvider>
  );
}
