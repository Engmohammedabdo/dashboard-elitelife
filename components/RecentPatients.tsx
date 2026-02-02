'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Phone, Filter, Search, User } from 'lucide-react';
import type { Appointment } from '@/types/database';

// Safe function to get first character (handles emojis and special characters)
function getInitial(name: string | undefined | null): string {
  if (!name || name.length === 0) return '?';
  // Use Array.from to properly handle emojis and unicode characters
  const chars = Array.from(name.trim());
  if (chars.length === 0) return '?';
  // Get first non-whitespace character
  const firstChar = chars[0];
  // Check if it's an emoji or special character - if so, return a default
  if (firstChar && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(firstChar)) {
    return '★';
  }
  return firstChar?.toUpperCase() || '?';
}

interface RecentPatientsProps {
  appointments: Appointment[];
  onPatientClick?: (appointment: Appointment) => void;
}

export default function RecentPatients({ appointments, onPatientClick }: RecentPatientsProps) {
  const t = useTranslations();
  const locale = useLocale();

  // Get unique recent patients
  const recentPatients = useMemo(() => {
    const patientMap = new Map<string, Appointment>();

    // Sort by date desc and get unique patients
    const sorted = [...appointments].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sorted.forEach((apt) => {
      if (apt.patient && !patientMap.has(apt.patient.id)) {
        patientMap.set(apt.patient.id, apt);
      }
    });

    return Array.from(patientMap.values()).slice(0, 5);
  }, [appointments]);

  const getGenderBadge = (gender: string | null | undefined) => {
    if (!gender) return null;
    const isFemale = gender === 'female' || gender === 'أنثى';
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${
        isFemale ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
      }`}>
        {isFemale ? t('appointment.female') : t('appointment.male')}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{t('dashboard.recentPatients')}</h3>
          <p className="text-sm text-gray-500">{t('dashboard.recentPatientsDesc')}</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
          <Filter className="w-4 h-4" />
          {t('common.filter')}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={t('common.searchPatients')}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-start text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                #
              </th>
              <th className="text-start text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                {t('appointment.patient')}
              </th>
              <th className="text-start text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                {t('appointment.gender')}
              </th>
              <th className="text-start text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                {t('appointment.date')}
              </th>
              <th className="text-start text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                {t('appointment.phone')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recentPatients.map((apt, index) => (
              <motion.tr
                key={apt.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => onPatientClick?.(apt)}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 text-sm text-gray-500">{index + 1}</td>
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {getInitial(apt.patient?.name)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      {apt.patient?.name || '-'}
                    </span>
                  </div>
                </td>
                <td className="py-3">
                  {getGenderBadge(apt.patient?.gender)}
                </td>
                <td className="py-3 text-sm text-gray-600">
                  {new Date(apt.date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </td>
                <td className="py-3">
                  {apt.patient?.whatsapp_number && (
                    <a
                      href={`tel:${apt.patient.whatsapp_number}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {apt.patient.whatsapp_number}
                    </a>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {recentPatients.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {t('common.noData')}
        </div>
      )}
    </motion.div>
  );
}
