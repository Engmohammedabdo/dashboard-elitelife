'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Edit, Stethoscope } from 'lucide-react';
import type { Doctor } from '@/types/database';

interface DoctorCardProps {
  doctor: Doctor;
  onEdit: () => void;
}

export default function DoctorCard({ doctor, onEdit }: DoctorCardProps) {
  const t = useTranslations();
  const locale = useLocale();

  const doctorName = locale === 'ar' ? doctor.name_ar : (doctor.name_en || doctor.name_ar);
  const specialization = locale === 'ar'
    ? (doctor.specialization_ar || '-')
    : (doctor.specialization_en || doctor.specialization_ar || '-');

  const departmentName = doctor.department
    ? (locale === 'ar' ? doctor.department.name_ar : doctor.department.name_en)
    : null;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${doctor.is_active ? 'bg-success' : 'bg-gray-400'}`} />
          <h3 className="font-semibold text-foreground">{doctorName}</h3>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          <Edit className="w-4 h-4" />
          {t('common.edit')}
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-text-secondary" />
          <span className="text-foreground">{specialization}</span>
        </div>
        {departmentName && (
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">{t('appointment.category')}:</span>
            <span className="text-foreground">{departmentName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
