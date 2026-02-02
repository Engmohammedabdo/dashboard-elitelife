'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Phone, Info, Clock } from 'lucide-react';
import type { Appointment } from '@/types/database';
import { formatDate, formatTime } from '@/lib/utils';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick: () => void;
}

export default function AppointmentCard({ appointment, onClick }: AppointmentCardProps) {
  const t = useTranslations('appointment');
  const locale = useLocale();

  // Get data from joined relations
  const patient = appointment.patient;
  const service = appointment.service;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return <span className="badge badge-success">{t('statusConfirmed')}</span>;
      case 'pending':
        return <span className="badge badge-warning">{t('statusPending')}</span>;
      case 'cancelled':
      case 'no_show':
        return <span className="badge badge-danger">{t('statusCancelled')}</span>;
      default:
        return null;
    }
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (patient?.whatsapp_number) {
      window.open(`https://wa.me/${patient.whatsapp_number}`, '_blank');
    }
  };

  const serviceName = locale === 'ar'
    ? (service?.name_ar || '-')
    : (service?.name_en || service?.name_ar || '-');

  return (
    <div
      onClick={onClick}
      className="card p-4 cursor-pointer hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {patient?.name || '-'}
          </h3>
          <p className="text-sm text-text-secondary">{serviceName}</p>
        </div>
        {getStatusBadge(appointment.status)}
      </div>

      <div className="flex items-center gap-2 text-sm text-text-secondary mb-3">
        <Clock className="w-4 h-4" />
        <span>{formatDate(appointment.date, locale)}</span>
        <span>-</span>
        <span>{formatTime(appointment.time, locale)}</span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={handleWhatsAppClick}
            className="flex items-center justify-center w-8 h-8 bg-success/10 text-success rounded-full hover:bg-success/20 transition-colors"
            title="WhatsApp"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
            title={t('details')}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {appointment.attended && (
          <span className="text-xs text-success font-medium">
            ✓ {t('attended')}
          </span>
        )}
      </div>
    </div>
  );
}
