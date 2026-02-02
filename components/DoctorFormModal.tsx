'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Loader2, Save } from 'lucide-react';
import type { Doctor } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface DoctorFormModalProps {
  doctor?: Doctor | null;
  onClose: () => void;
  onSave: (doctor: Doctor) => void;
}

export default function DoctorFormModal({ doctor, onClose, onSave }: DoctorFormModalProps) {
  const t = useTranslations();
  const isEditing = !!doctor;

  const [formData, setFormData] = useState({
    name_ar: doctor?.name_ar || '',
    name_en: doctor?.name_en || '',
    specialization_ar: doctor?.specialization_ar || '',
    specialization_en: doctor?.specialization_en || '',
    is_active: doctor?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name_ar.trim()) {
      setError(t('settings.doctorNameAr') + ' is required');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && doctor) {
        const { data, error: updateError } = await supabase
          .from('doctors')
          .update(formData)
          .eq('id', doctor.id)
          .select()
          .single();

        if (updateError) throw updateError;
        onSave(data);
      } else {
        const { data, error: insertError } = await supabase
          .from('doctors')
          .insert(formData)
          .select()
          .single();

        if (insertError) throw insertError;
        onSave(data);
      }
      onClose();
    } catch (err) {
      console.error('Error saving doctor:', err);
      setError('Failed to save doctor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? t('settings.editDoctor') : t('settings.addDoctor')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-danger/10 text-danger text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Name Arabic */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('settings.doctorNameAr')} *
            </label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="د. أحمد محمد"
              dir="rtl"
            />
          </div>

          {/* Name English */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('settings.doctorNameEn')}
            </label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Dr. Ahmed Mohamed"
              dir="ltr"
            />
          </div>

          {/* Specialization Arabic */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('settings.specializationAr')}
            </label>
            <input
              type="text"
              value={formData.specialization_ar}
              onChange={(e) => setFormData({ ...formData, specialization_ar: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="طبيب أسنان"
              dir="rtl"
            />
          </div>

          {/* Specialization English */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('settings.specializationEn')}
            </label>
            <input
              type="text"
              value={formData.specialization_en}
              onChange={(e) => setFormData({ ...formData, specialization_en: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Dentist"
              dir="ltr"
            />
          </div>

          {/* Active Status */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-primary border-border rounded focus:ring-primary"
            />
            <span className="text-sm font-medium text-foreground">{t('settings.active')}</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-outline"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn btn-primary flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
