'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Clock, ChevronRight } from 'lucide-react';
import type { Appointment } from '@/types/database';
import { formatTime, toLocalDateString } from '@/lib/utils';

interface UpcomingScheduleProps {
  appointments: Appointment[];
  onAppointmentClick?: (appointment: Appointment) => void;
}

export default function UpcomingSchedule({ appointments, onAppointmentClick }: UpcomingScheduleProps) {
  const t = useTranslations();
  const locale = useLocale();

  // Get upcoming appointments for today and tomorrow
  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    const todayStr = toLocalDateString(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toLocalDateString(tomorrow);

    return appointments
      .filter((apt) => {
        const aptDate = apt.date;
        return (aptDate === todayStr || aptDate === tomorrowStr) && apt.status !== 'cancelled';
      })
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      })
      .slice(0, 5);
  }, [appointments]);

  const getStatusColor = (status: string, attended: boolean) => {
    if (attended) return 'bg-emerald-500';
    switch (status) {
      case 'confirmed': return 'bg-emerald-500';
      case 'pending': return 'bg-amber-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{t('dashboard.upcomingSchedule')}</h3>
        <button className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1">
          {t('common.viewAll')}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {upcomingAppointments.map((apt, index) => {
          const doctorName = locale === 'ar' ? apt.doctor?.name_ar : apt.doctor?.name_en;

          return (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => onAppointmentClick?.(apt)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {apt.patient?.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${getStatusColor(apt.status, apt.attended)}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">
                  {doctorName || apt.patient?.name}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {new Date(apt.date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                    month: 'short',
                    day: 'numeric'
                  })} • {formatTime(apt.time, locale)}
                </p>
              </div>

              {/* Time Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg group-hover:bg-white transition-colors">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">
                  {formatTime(apt.time, locale)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {upcomingAppointments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{t('dashboard.noUpcoming')}</p>
        </div>
      )}
    </motion.div>
  );
}
