'use client';

import { useLocale } from 'next-intl';
import SidebarWrapper from './SidebarWrapper';
import ConversationDashboard from './ConversationDashboard';

export default function ConversationsClient() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className={`min-h-screen bg-gray-50/50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Sidebar */}
      <SidebarWrapper />

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isRTL ? 'mr-[260px]' : 'ml-[260px]'}`}>
        <div className="p-6">
          <ConversationDashboard />
        </div>
      </main>
    </div>
  );
}
