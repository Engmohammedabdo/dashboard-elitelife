'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Clock, CheckCircle, AlertCircle, User } from 'lucide-react';
import type { Appointment } from '@/types/database';
import { formatTime } from '@/lib/utils';

interface TodaySummaryProps {
  appointments: Appointment[];
  completed: number;
  pending: number;
  onAppointmentClick: (appointment: Appointment) => void;
}

export default function TodaySummary({
  appointments,
  completed,
  pending,
  onAppointmentClick
}: TodaySummaryProps) {
  const t = useTranslations();
  const locale = useLocale();

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // Find current/next appointment
  const currentAppointment = appointments.find((apt) => {
    const aptTime = apt.time;
    const endTime = new Date(`2000-01-01T${aptTime}`);
    endTime.setMinutes(endTime.getMinutes() + (apt.duration_minutes || 60));
    const endTimeStr = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
    return aptTime <= currentTime && currentTime <= endTimeStr && !apt.attended;
  });

  const nextAppointment = appointments.find((apt) => apt.time > currentTime && !apt.attended);

  const getStatusColor = (status: string, attended: boolean) => {
    if (attended) return 'bg-success';
    switch (status) {
      case 'confirmed':
        return 'bg-primary';
      case 'pending':
        return 'bg-warning';
      default:
        return 'bg-gray-400';
    }
  };

  if (appointments.length === 0) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{t('todaySummary.title')}</h2>
        </div>
        <p className="text-text-secondary text-center py-4">{t('dashboard.noAppointments')}</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{t('todaySummary.title')}</h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-success" />
            <span className="text-success font-medium">{completed}</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="w-4 h-4 text-warning" />
            <span className="text-warning font-medium">{pending}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-text-secondary mb-1">
          <span>{t('todaySummary.progress')}</span>
          <span>{completed}/{appointments.length}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all"
            style={{ width: `${(completed / appointments.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current/Next Appointment Highlight */}
      {(currentAppointment || nextAppointment) && (
        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-xs text-primary font-medium mb-1">
            {currentAppointment ? t('todaySummary.currentAppointment') : t('todaySummary.nextUp')}
          </p>
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onAppointmentClick(currentAppointment || nextAppointment!)}
          >
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {(currentAppointment || nextAppointment)?.patient?.name}
              </p>
              <p className="text-sm text-text-secondary">
                {formatTime((currentAppointment || nextAppointment)!.time, locale)} - {
                  locale === 'ar'
                    ? (currentAppointment || nextAppointment)?.service?.name_ar
                    : (currentAppointment || nextAppointment)?.service?.name_en
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {appointments.map((apt, index) => {
          const isPast = apt.time < currentTime;
          const isCurrent = currentAppointment?.id === apt.id;

          return (
            <button
              key={apt.id}
              onClick={() => onAppointmentClick(apt)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-start ${
                isCurrent ? 'bg-primary/10' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex-shrink-0 w-14 text-center">
                <span className={`text-sm font-medium ${isPast && !apt.attended ? 'text-text-secondary' : 'text-foreground'}`}>
                  {formatTime(apt.time, locale)}
                </span>
              </div>
              <div className={`w-2 h-2 rounded-full ${getStatusColor(apt.status, apt.attended)}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${apt.attended ? 'text-text-secondary line-through' : 'text-foreground'}`}>
                  {apt.patient?.name}
                </p>
              </div>
              {apt.attended && <CheckCircle className="w-4 h-4 text-success" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
