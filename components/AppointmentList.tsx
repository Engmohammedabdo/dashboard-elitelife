'use client';

import { useTranslations } from 'next-intl';
import type { Appointment, AppointmentFilter } from '@/types/database';
import AppointmentCard from './AppointmentCard';

interface AppointmentListProps {
  appointments: Appointment[];
  filter: AppointmentFilter;
  onFilterChange: (filter: AppointmentFilter) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export default function AppointmentList({
  appointments,
  filter,
  onFilterChange,
  onAppointmentClick
}: AppointmentListProps) {
  const t = useTranslations('dashboard');

  const filters: { key: AppointmentFilter; label: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'today', label: t('today') },
    { key: 'confirmed', label: t('confirmed') },
    { key: 'pending', label: t('pending') }
  ];

  return (
    <div className="card p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {t('appointmentsList')}
      </h2>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === f.key
                ? 'bg-primary text-white'
                : 'bg-background text-foreground hover:bg-gray-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {appointments.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-text-secondary">
            {t('noAppointments')}
          </div>
        ) : (
          appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onClick={() => onAppointmentClick(appointment)}
            />
          ))
        )}
      </div>
    </div>
  );
}
