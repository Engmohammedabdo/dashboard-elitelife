'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/lib/navigation';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:bg-gray-50 transition-colors"
      aria-label="Toggle language"
    >
      <Globe className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium text-foreground">
        {locale === 'ar' ? 'EN' : 'عربي'}
      </span>
    </button>
  );
}
