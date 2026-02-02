'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, ChevronRight, CalendarCheck } from 'lucide-react';
import type { Appointment } from '@/types/database';
import { formatDate, formatTime, toLocalDateString } from '@/lib/utils';

interface SelectedDayAppointmentsProps {
  date: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}

export default function SelectedDayAppointments({
  date,
  appointments,
  onAppointmentClick
}: SelectedDayAppointmentsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar';

  // Use local date string to avoid UTC timezone issues
  const dateStr = toLocalDateString(date);
  const dayAppointments = appointments
    .filter((apt) => apt.date === dateStr && apt.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));

  const getStatusInfo = (status: string, attended?: boolean) => {
    if (attended) {
      return { color: 'bg-success', textColor: 'text-success', label: isRTL ? 'حضر' : 'Attended' };
    }
    switch (status) {
      case 'confirmed':
        return { color: 'bg-success', textColor: 'text-success', label: isRTL ? 'مؤكد' : 'Confirmed' };
      case 'completed':
        return { color: 'bg-success', textColor: 'text-success', label: isRTL ? 'مكتمل' : 'Completed' };
      case 'pending':
        return { color: 'bg-warning', textColor: 'text-warning', label: isRTL ? 'قيد الانتظار' : 'Pending' };
      case 'no_show':
        return { color: 'bg-danger', textColor: 'text-danger', label: isRTL ? 'لم يحضر' : 'No Show' };
      default:
        return { color: 'bg-gray-400', textColor: 'text-gray-400', label: status };
    }
  };

  // Check if the selected date is today
  const isToday = dateStr === toLocalDateString(new Date());

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">
                {isToday
                  ? (isRTL ? 'مواعيد اليوم' : "Today's Appointments")
                  : (isRTL ? 'مواعيد اليوم المحدد' : 'Selected Day Appointments')
                }
              </h3>
              <p className="text-sm text-gray-500">{formatDate(dateStr, locale)}</p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-primary/10 rounded-full">
            <span className="text-sm font-medium text-primary">
              {dayAppointments.length} {isRTL ? 'موعد' : 'appointments'}
            </span>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {dayAppointments.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-center">
                {isRTL ? 'لا توجد مواعيد في هذا اليوم' : 'No appointments on this day'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {dayAppointments.map((apt, index) => {
                const statusInfo = getStatusInfo(apt.status, apt.attended);
                const serviceName = locale === 'ar'
                  ? (apt.service?.name_ar || apt.service?.name_en || '-')
                  : (apt.service?.name_en || apt.service?.name_ar || '-');
                const doctorName = locale === 'ar'
                  ? (apt.doctor?.name_ar || apt.doctor?.name_en || '-')
                  : (apt.doctor?.name_en || apt.doctor?.name_ar || '-');

                return (
                  <motion.button
                    key={apt.id}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onAppointmentClick(apt)}
                    className="w-full group"
                  >
                    <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-xl hover:bg-gray-100 transition-all duration-200 border border-transparent hover:border-gray-200">
                      {/* Time */}
                      <div className="flex flex-col items-center min-w-[60px]">
                        <div className="text-lg font-bold text-gray-800">
                          {formatTime(apt.time, locale)}
                        </div>
                      </div>

                      {/* Status Line */}
                      <div className={`w-1 h-14 rounded-full ${statusInfo.color}`} />

                      {/* Patient Info */}
                      <div className="flex-1 min-w-0 text-start">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-800 truncate">
                            {apt.patient?.name || '-'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate mb-1">
                          {serviceName}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {doctorName}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}/20 ${statusInfo.textColor}`}>
                          {statusInfo.label}
                        </span>
                        <ChevronRight className={`w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors ${isRTL ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
