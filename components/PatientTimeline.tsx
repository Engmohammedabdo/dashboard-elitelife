'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MessageCircle,
  Star,
  Bell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  User,
  MapPin,
  Activity,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  CreditCard,
  FileText,
  X,
  Loader2
} from 'lucide-react';
import type { Patient, PatientProfile, Appointment, PatientTimelineEntry } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface PatientTimelineProps {
  patientId?: string;
  patient?: Patient | PatientProfile;
  onClose?: () => void;
}

export default function PatientTimeline({
  patientId,
  patient: initialPatient,
  onClose
}: PatientTimelineProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [patient, setPatient] = useState<PatientProfile | null>(initialPatient as PatientProfile || null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('upcoming');

  // Fetch patient data and appointments
  useEffect(() => {
    if (patientId || initialPatient?.id) {
      fetchPatientData(patientId || initialPatient?.id || '');
    }
  }, [patientId, initialPatient?.id]);

  const fetchPatientData = async (id: string) => {
    setLoading(true);
    try {
      // Fetch patient profile
      const { data: patientData, error: patientError } = await supabase
        .from('patient_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (patientError) {
        // Try regular patients table
        const { data: basicPatient } = await supabase
          .from('patients')
          .select('*')
          .eq('id', id)
          .single();

        if (basicPatient) {
          setPatient(basicPatient as PatientProfile);
        }
      } else if (patientData) {
        setPatient(patientData);
      }

      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors(*),
          department:departments(*),
          service:services(*)
        `)
        .eq('patient_id', id)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (!appointmentsError && appointmentsData) {
        setAppointments(appointmentsData);
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate timeline entries
  const timelineEntries = useMemo((): PatientTimelineEntry[] => {
    const entries: PatientTimelineEntry[] = [];

    appointments.forEach(apt => {
      const doctorName = isRTL ? apt.doctor?.name_ar : apt.doctor?.name_en;
      const serviceName = isRTL ? apt.service?.name_ar : apt.service?.name_en;
      const deptName = isRTL ? apt.department?.name_ar : apt.department?.name_en;

      let status = apt.status;
      let icon = 'calendar';
      let description = '';

      if (apt.attended) {
        status = 'completed';
        description = isRTL
          ? `حضر الموعد - ${serviceName || deptName || ''} مع ${doctorName || ''}`
          : `Attended - ${serviceName || deptName || ''} with ${doctorName || ''}`;
      } else if (apt.status === 'no_show') {
        description = isRTL
          ? `لم يحضر الموعد - ${serviceName || deptName || ''}`
          : `No show - ${serviceName || deptName || ''}`;
      } else if (apt.status === 'cancelled') {
        description = isRTL
          ? `تم إلغاء الموعد - ${serviceName || deptName || ''}`
          : `Cancelled - ${serviceName || deptName || ''}`;
      } else {
        description = isRTL
          ? `${serviceName || deptName || 'موعد'} مع ${doctorName || ''}`
          : `${serviceName || deptName || 'Appointment'} with ${doctorName || ''}`;
      }

      entries.push({
        id: apt.id,
        type: 'appointment',
        date: apt.date,
        time: apt.time,
        title: isRTL ? 'موعد' : 'Appointment',
        description,
        status,
        metadata: {
          appointment: apt,
          doctor: apt.doctor,
          service: apt.service,
          department: apt.department
        }
      });

      // Add reminder entries
      if (apt.reminder_sent_24h) {
        entries.push({
          id: `${apt.id}-reminder-24h`,
          type: 'reminder',
          date: apt.date,
          title: isRTL ? 'تذكير 24 ساعة' : '24h Reminder',
          description: isRTL ? 'تم إرسال تذكير قبل 24 ساعة' : '24-hour reminder sent',
          metadata: { appointmentId: apt.id }
        });
      }

      // Add review entry
      if (apt.review_request_sent) {
        entries.push({
          id: `${apt.id}-review`,
          type: 'review',
          date: apt.review_request_time?.split('T')[0] || apt.date,
          title: isRTL ? 'طلب تقييم' : 'Review Request',
          description: apt.rating
            ? (isRTL ? `تم التقييم: ${apt.rating} نجوم` : `Rated: ${apt.rating} stars`)
            : (isRTL ? 'تم إرسال طلب التقييم' : 'Review request sent'),
          status: apt.rating ? 'completed' : 'pending',
          metadata: { rating: apt.rating }
        });
      }
    });

    // Sort by date descending
    return entries.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
      return dateB.getTime() - dateA.getTime();
    });
  }, [appointments, isRTL]);

  // Separate upcoming and past entries
  const { upcoming, past } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      upcoming: timelineEntries.filter(e => e.date >= today && e.status !== 'cancelled'),
      past: timelineEntries.filter(e => e.date < today || e.status === 'cancelled')
    };
  }, [timelineEntries]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = appointments.length;
    const attended = appointments.filter(a => a.attended).length;
    const noShow = appointments.filter(a => a.status === 'no_show').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

    return { total, attended, noShow, cancelled, attendanceRate };
  }, [appointments]);

  // Reliability trend
  const reliabilityTrend = useMemo(() => {
    const score = patient?.reliability_score;
    if (score === 'high') return { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100', label: isRTL ? 'عالي' : 'High' };
    if (score === 'low') return { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100', label: isRTL ? 'منخفض' : 'Low' };
    return { icon: Activity, color: 'text-amber-600', bg: 'bg-amber-100', label: isRTL ? 'متوسط' : 'Medium' };
  }, [patient?.reliability_score, isRTL]);

  const getStatusIcon = (status?: string, type?: string) => {
    if (type === 'reminder') return Bell;
    if (type === 'review') return Star;
    if (type === 'message') return MessageCircle;

    switch (status) {
      case 'completed': return CheckCircle2;
      case 'no_show': return XCircle;
      case 'cancelled': return XCircle;
      case 'pending': return Clock;
      case 'confirmed': return CheckCircle2;
      default: return Calendar;
    }
  };

  const getStatusColor = (status?: string, type?: string) => {
    if (type === 'reminder') return 'bg-blue-500';
    if (type === 'review') return 'bg-yellow-500';
    if (type === 'message') return 'bg-purple-500';

    switch (status) {
      case 'completed': return 'bg-emerald-500';
      case 'no_show': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-400';
      case 'pending': return 'bg-amber-500';
      case 'confirmed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <User className="w-12 h-12 mb-3 opacity-30" />
        <p>{isRTL ? 'لم يتم العثور على المريض' : 'Patient not found'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {patient.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>

            {/* Info */}
            <div>
              <h2 className="text-xl font-bold text-gray-800">{patient.name}</h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span dir="ltr">{patient.whatsapp_number}</span>
              </div>
              {patient.age && (
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{patient.age} {isRTL ? 'سنة' : 'years'}</span>
                  {patient.gender && (
                    <span className="text-gray-400">
                      ({(patient.gender as string) === 'male' || (patient.gender as string) === 'ذكر' ? (isRTL ? 'ذكر' : 'Male') : (isRTL ? 'أنثى' : 'Female')})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-gray-600">{isRTL ? 'إجمالي المواعيد' : 'Total Appointments'}</p>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.attended}</p>
            <p className="text-xs text-gray-600">{isRTL ? 'حضر' : 'Attended'}</p>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.noShow}</p>
            <p className="text-xs text-gray-600">{isRTL ? 'لم يحضر' : 'No Show'}</p>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 text-center">
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${reliabilityTrend.bg}`}>
              <reliabilityTrend.icon className={`w-4 h-4 ${reliabilityTrend.color}`} />
              <span className={`text-sm font-medium ${reliabilityTrend.color}`}>
                {reliabilityTrend.label}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">{isRTL ? 'الموثوقية' : 'Reliability'}</p>
          </div>
        </div>
      </div>

      {/* Timeline Sections */}
      <div className="p-6 space-y-4">
        {/* Upcoming Section */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'upcoming' ? null : 'upcoming')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-800">
                {isRTL ? 'المواعيد القادمة' : 'Upcoming Appointments'}
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                {upcoming.length}
              </span>
            </div>
            {expandedSection === 'upcoming' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          <AnimatePresence>
            {expandedSection === 'upcoming' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {upcoming.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>{isRTL ? 'لا توجد مواعيد قادمة' : 'No upcoming appointments'}</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {upcoming.map((entry, index) => {
                      const Icon = getStatusIcon(entry.status, entry.type);
                      const colorClass = getStatusColor(entry.status, entry.type);

                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-800">{entry.title}</h4>
                              <span className="text-xs text-gray-400">
                                {new Date(entry.date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                                {entry.time && ` - ${entry.time.slice(0, 5)}`}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History Section */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'history' ? null : 'history')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-800">
                {isRTL ? 'السجل' : 'History'}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                {past.length}
              </span>
            </div>
            {expandedSection === 'history' ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          <AnimatePresence>
            {expandedSection === 'history' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {past.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>{isRTL ? 'لا يوجد سجل' : 'No history'}</p>
                  </div>
                ) : (
                  <div className="p-4">
                    {/* Timeline */}
                    <div className="relative">
                      {/* Vertical line */}
                      <div className={`absolute top-0 bottom-0 w-0.5 bg-gray-200 ${isRTL ? 'right-5' : 'left-5'}`} />

                      <div className="space-y-4">
                        {past.slice(0, 20).map((entry, index) => {
                          const Icon = getStatusIcon(entry.status, entry.type);
                          const colorClass = getStatusColor(entry.status, entry.type);

                          return (
                            <motion.div
                              key={entry.id}
                              initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="relative flex items-start gap-4"
                            >
                              {/* Dot */}
                              <div className={`relative z-10 w-10 h-10 rounded-full ${colorClass} flex items-center justify-center shadow-sm`}>
                                <Icon className="w-4 h-4 text-white" />
                              </div>

                              {/* Content */}
                              <div className="flex-1 pb-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-gray-800">{entry.title}</h4>
                                  <span className="text-xs text-gray-400">
                                    {new Date(entry.date).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{entry.description}</p>

                                {/* Notes */}
                                {entry.type === 'appointment' && (entry.metadata as { appointment?: Appointment })?.appointment?.visit_notes && (
                                  <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500">
                                      {isRTL ? 'ملاحظات:' : 'Notes:'} {(entry.metadata as { appointment: Appointment }).appointment.visit_notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {past.length > 20 && (
                      <p className="text-center text-sm text-gray-500 mt-4">
                        {isRTL
                          ? `+${past.length - 20} عناصر أخرى`
                          : `+${past.length - 20} more items`}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Additional Info */}
        {(patient.total_spent && patient.total_spent > 0) && (
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">
                {isRTL ? 'إجمالي الإنفاق' : 'Total Spent'}
              </span>
            </div>
            <span className="text-lg font-bold text-emerald-600">
              {patient.total_spent.toLocaleString()} AED
            </span>
          </div>
        )}

        {patient.google_review_given && (
          <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-xl">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span className="text-sm font-medium text-gray-700">
              {isRTL ? 'قدم تقييم على Google' : 'Left a Google Review'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
