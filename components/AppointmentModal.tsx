'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { X, User, Phone, Calendar, CheckCircle, Loader2, XCircle, Clock, UserX } from 'lucide-react';
import type { Appointment } from '@/types/database';
import { formatDate, formatTime } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface AppointmentModalProps {
  appointment: Appointment;
  onClose: () => void;
  onUpdate: (updated: Appointment) => void;
}

export default function AppointmentModal({ appointment, onClose, onUpdate }: AppointmentModalProps) {
  const t = useTranslations('appointment');
  const locale = useLocale();
  const [status, setStatus] = useState(appointment.status);
  const [attended, setAttended] = useState(appointment.attended);
  const [notes, setNotes] = useState(appointment.visit_notes || '');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Get patient data from joined relation
  const patient = appointment.patient;
  const service = appointment.service;
  const department = appointment.department;
  const doctor = appointment.doctor;

  // Quick confirm attendance - saves notes and updates DB
  const handleConfirmAttendance = async () => {
    setActionLoading('attended');
    try {
      // 1. First save visit notes if any
      const visitNotes = notes.trim() || null;

      // 2. Update appointment in database
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          attended: true,
          status: 'completed',
          visit_notes: visitNotes
        })
        .eq('id', appointment.id);

      if (updateError) throw updateError;

      // 3. Update patient stats (total_visits, last_visit_date)
      if (patient?.id) {
        await supabase
          .from('patients')
          .update({
            total_visits: (patient.total_visits || 0) + 1,
            last_visit_date: new Date().toISOString().split('T')[0]
          })
          .eq('id', patient.id);
      }

      // 4. Update local state
      setAttended(true);
      setStatus('completed');
      onUpdate({ ...appointment, attended: true, status: 'completed', visit_notes: visitNotes });

    } catch (error) {
      console.error('Error confirming attendance:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Mark as no-show
  const handleMarkNoShow = async () => {
    setActionLoading('no_show');
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'no_show', attended: false })
        .eq('id', appointment.id);

      if (error) throw error;

      setStatus('no_show');
      setAttended(false);
      onUpdate({ ...appointment, status: 'no_show', attended: false });
    } catch (error) {
      console.error('Error marking no-show:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Cancel appointment
  const handleCancel = async () => {
    setActionLoading('cancelled');
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointment.id);

      if (error) throw error;

      setStatus('cancelled');
      onUpdate({ ...appointment, status: 'cancelled' });
    } catch (error) {
      console.error('Error cancelling:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Confirm pending appointment
  const handleConfirm = async () => {
    setActionLoading('confirmed');
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed', confirmation_status: 'confirmed', confirmation_time: new Date().toISOString() })
        .eq('id', appointment.id);

      if (error) throw error;

      setStatus('confirmed');
      onUpdate({ ...appointment, status: 'confirmed' });
    } catch (error) {
      console.error('Error confirming:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ visit_notes: notes })
        .eq('id', appointment.id);

      if (error) throw error;

      onUpdate({ ...appointment, visit_notes: notes });
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (statusVal: string) => {
    switch (statusVal) {
      case 'completed':
        return <span className="badge badge-success">{t('statusCompleted')}</span>;
      case 'confirmed':
        return <span className="badge badge-success">{t('statusConfirmed')}</span>;
      case 'pending':
        return <span className="badge badge-warning">{t('statusPending')}</span>;
      case 'cancelled':
        return <span className="badge badge-danger">{t('statusCancelled')}</span>;
      case 'no_show':
        return <span className="badge badge-danger">{t('statusNoShow')}</span>;
      default:
        return null;
    }
  };

  const getGenderText = (gender: string | null) => {
    if (!gender) return null;
    if (gender === 'female' || gender === 'أنثى') return t('female');
    return t('male');
  };

  const isActionable = status !== 'cancelled' && status !== 'no_show';
  const canConfirmAttendance = isActionable && !attended;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 modal-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t('details')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Quick Actions - Main Focus */}
          {canConfirmAttendance && (
            <div className="bg-success/5 border border-success/20 rounded-xl p-4">
              <p className="text-sm text-success font-medium mb-3">{t('quickActions')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleConfirmAttendance}
                  disabled={actionLoading !== null}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-success text-white rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 font-medium"
                >
                  {actionLoading === 'attended' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  {t('markAttended')}
                </button>
                <button
                  onClick={handleMarkNoShow}
                  disabled={actionLoading !== null}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 font-medium"
                >
                  {actionLoading === 'no_show' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UserX className="w-5 h-5" />
                  )}
                  {t('markNoShow')}
                </button>
              </div>
            </div>
          )}

          {/* Attended Badge */}
          {attended && (
            <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-success" />
              <div>
                <p className="font-semibold text-success">{t('patientAttended')}</p>
                <p className="text-sm text-success/70">{t('attendanceRecorded')}</p>
              </div>
            </div>
          )}

          {/* Patient Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <User className="w-4 h-4" />
              {t('patient')}
            </div>
            <div className="bg-background rounded-lg p-3">
              <p className="font-semibold text-foreground">{patient?.name || '-'}</p>
              {patient?.whatsapp_number && (
                <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${patient.whatsapp_number}`} className="hover:text-primary">
                    {patient.whatsapp_number}
                  </a>
                  <a
                    href={`https://wa.me/${patient.whatsapp_number.replace(/\s/g, '').replace(/\+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-success hover:text-success/80 ms-2"
                  >
                    WhatsApp
                  </a>
                </div>
              )}
              {(patient?.gender || patient?.age) && (
                <p className="text-sm text-text-secondary mt-1">
                  {getGenderText(patient?.gender)}
                  {patient?.age && ` - ${patient.age} ${t('years')}`}
                </p>
              )}
              {patient?.total_visits !== undefined && patient.total_visits > 0 && (
                <p className="text-xs text-primary mt-1">
                  {t('totalVisits')}: {patient.total_visits}
                </p>
              )}
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">📅 {t('appointmentDetails')}</p>
            <div className="bg-background rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">{t('date')}:</span>
                <span className="text-sm font-medium text-foreground">
                  {formatDate(appointment.date, locale)} - {formatTime(appointment.time, locale)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">{t('status')}:</span>
                {getStatusBadge(status)}
              </div>
              {doctor && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">{t('doctor')}:</span>
                  <span className="text-sm text-foreground">
                    {locale === 'ar' ? doctor.name_ar : doctor.name_en}
                  </span>
                </div>
              )}
              {department && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">{t('category')}:</span>
                  <span className="text-sm text-foreground">
                    {locale === 'ar' ? department.name_ar : department.name_en}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Service Details */}
          {service && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">💆 {t('serviceDetails')}</p>
              <div className="bg-background rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">{t('service')}:</span>
                  <span className="text-sm font-medium text-foreground">
                    {locale === 'ar' ? (service?.name_ar || '-') : (service?.name_en || service?.name_ar || '-')}
                  </span>
                </div>
                {(service?.duration_minutes || appointment.duration_minutes) && (
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">{t('duration')}:</span>
                    <span className="text-sm text-foreground">
                      {service?.duration_minutes || appointment.duration_minutes} {t('minutes')}
                    </span>
                  </div>
                )}
                {service?.price && (
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">{t('price')}:</span>
                    <span className="text-sm font-medium text-primary">
                      {service.currency || 'AED'} {service.price}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">
              📝 {t('notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notesPlaceholder')}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              rows={3}
            />
            {notes !== (appointment.visit_notes || '') && (
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {t('saveNotes')}
              </button>
            )}
          </div>

          {/* Status Actions */}
          {isActionable && status === 'pending' && (
            <div className="pt-2 border-t border-border">
              <p className="text-sm text-text-secondary mb-2">{t('statusActions')}</p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  disabled={actionLoading !== null}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                >
                  {actionLoading === 'confirmed' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {t('confirmAppointment')}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading !== null}
                  className="flex items-center justify-center gap-2 px-3 py-2 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 text-sm"
                >
                  {actionLoading === 'cancelled' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {t('cancelAppointment')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
