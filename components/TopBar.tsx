'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Bell, RefreshCw } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import type { ClinicConfig } from '@/types/database';

interface TopBarProps {
  clinicConfig?: ClinicConfig;
  userName?: string;
  onRefresh?: () => void;
  lastUpdated?: Date;
}

export default function TopBar({ clinicConfig, userName, onRefresh, lastUpdated }: TopBarProps) {
  const t = useTranslations();
  const locale = useLocale();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('common.goodMorning');
    if (hour < 18) return t('common.goodAfternoon');
    return t('common.goodEvening');
  };

  const assistantName = locale === 'ar'
    ? clinicConfig?.assistant_name_ar || 'المستخدم'
    : clinicConfig?.assistant_name_en || 'User';

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-30"
    >
      <div className="flex items-center justify-between">
        {/* Left - Greeting */}
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {greeting()}، {userName || assistantName}! 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('common.dashboardSubtitle')}
          </p>
        </div>

        {/* Center - Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 bg-white rounded border border-gray-200">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-3">
          {/* Last Updated */}
          {lastUpdated && (
            <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
              <span>{t('common.lastUpdated')}:</span>
              <span className="font-medium">
                {lastUpdated.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <button
                onClick={onRefresh}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title={t('common.refresh')}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications */}
          <button className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User Avatar */}
          <button className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {(userName || assistantName).charAt(0).toUpperCase()}
              </span>
            </div>
          </button>
        </div>
      </div>
    </motion.header>
  );
}
