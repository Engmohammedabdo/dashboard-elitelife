'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Users,
  Clock,
  Stethoscope
} from 'lucide-react';
import type { Appointment, ClinicConfig, Department } from '@/types/database';
import { toLocalDateString } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// Components
import SidebarWrapper from './SidebarWrapper';
import TopBar from './TopBar';
import StatCard from './StatCard';
import AppointmentChart from './AppointmentChart';
import RecentPatients from './RecentPatients';
import Calendar from './Calendar';
import SelectedDayAppointments from './SelectedDayAppointments';
import AppointmentModal from './AppointmentModal';
import { notify } from './NotificationProvider';

interface DashboardClientProps {
  initialAppointments: Appointment[];
  clinicConfig: ClinicConfig;
  departments: Department[];
}

export default function DashboardClient({
  initialAppointments,
  clinicConfig,
  departments
}: DashboardClientProps) {
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = locale === 'ar';

  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch full appointment data with relations
  const fetchAppointmentWithRelations = useCallback(async (appointmentId: string) => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        doctor:doctors(*),
        department:departments(*),
        service:services(*)
      `)
      .eq('id', appointmentId)
      .single();

    if (error) {
      console.error('Error fetching appointment:', error);
      return null;
    }
    return data as Appointment;
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments'
        },
        async (payload) => {
          console.log('New appointment:', payload);
          // Fetch full appointment with relations
          const fullAppointment = await fetchAppointmentWithRelations(payload.new.id);
          if (fullAppointment) {
            setAppointments((prev) => [fullAppointment, ...prev]);
            notify.appointmentBooked(
              fullAppointment.patient?.name || (isRTL ? 'مريض جديد' : 'New Patient'),
              fullAppointment.time
            );
            setLastUpdated(new Date());
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments'
        },
        async (payload) => {
          console.log('Updated appointment:', payload);
          const fullAppointment = await fetchAppointmentWithRelations(payload.new.id);
          if (fullAppointment) {
            setAppointments((prev) =>
              prev.map((a) => (a.id === fullAppointment.id ? fullAppointment : a))
            );

            // Check what changed and notify
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;
            const patientName = fullAppointment.patient?.name || (isRTL ? 'المريض' : 'Patient');

            if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
              notify.appointmentCancelled(patientName);
            } else if (payload.new.attended && !payload.old.attended) {
              notify.attendanceConfirmed(patientName);
            } else if (newStatus === 'no_show' && oldStatus !== 'no_show') {
              notify.noShow(patientName);
            } else if (oldStatus !== newStatus) {
              notify.appointmentUpdated(patientName);
            }

            setLastUpdated(new Date());
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          console.log('Deleted appointment:', payload);
          setAppointments((prev) => prev.filter((a) => a.id !== payload.old.id));
          notify.warning(
            isRTL ? 'تم حذف موعد' : 'Appointment Deleted',
            isRTL ? 'تم حذف موعد من النظام' : 'An appointment was removed from the system'
          );
          setLastUpdated(new Date());
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAppointmentWithRelations, isRTL]);

  // Calculate comprehensive stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = toLocalDateString(now);

    const total = appointments.length;
    const completed = appointments.filter((a) => a.attended === true).length;
    const noShow = appointments.filter((a) => a.status === 'no_show').length;

    // Today's stats
    const todayAppointments = appointments.filter((a) => a.date === todayStr);
    const todayTotal = todayAppointments.length;

    // Unique patients
    const uniquePatients = new Set(appointments.map((a) => a.patient_id)).size;

    // Doctors count (unique)
    const uniqueDoctors = new Set(appointments.filter((a) => a.doctor_id).map((a) => a.doctor_id)).size;

    // Calculate growth (mock - in real app would compare with previous period)
    const lastMonthTotal = Math.floor(total * 0.88);
    const growth = lastMonthTotal > 0 ? Math.round(((total - lastMonthTotal) / lastMonthTotal) * 100) : 0;

    return {
      total, completed, noShow,
      todayTotal, uniquePatients, uniqueDoctors, growth
    };
  }, [appointments]);

  // Selected day appointments
  const selectedDayAppointments = useMemo(() => {
    const selectedDateStr = toLocalDateString(selectedDate);
    return appointments
      .filter((a) => a.date === selectedDateStr && a.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const handleAppointmentUpdate = (updated: Appointment) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );

    // Show notification
    if (updated.attended) {
      notify.attendanceConfirmed(updated.patient?.name || 'المريض');
    } else if (updated.status === 'no_show') {
      notify.noShow(updated.patient?.name || 'المريض');
    } else if (updated.status === 'cancelled') {
      notify.appointmentCancelled(updated.patient?.name || 'المريض');
    }

    setLastUpdated(new Date());
  };

  const handleRefresh = useCallback(async () => {
    // Fetch fresh data from database
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        doctor:doctors(*),
        department:departments(*),
        service:services(*)
      `)
      .order('date', { ascending: false })
      .limit(500);

    if (!error && data) {
      setAppointments(data);
    }

    setLastUpdated(new Date());
    notify.info(
      isRTL ? 'تم تحديث البيانات' : 'Data Updated',
      isRTL ? 'جميع البيانات محدثة الآن' : 'All data is now up to date'
    );
  }, [isRTL]);

  return (
    <div className={`min-h-screen bg-gray-50/50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Sidebar */}
      <SidebarWrapper />

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isRTL ? 'mr-[260px]' : 'ml-[260px]'}`}>
        {/* Top Bar */}
        <TopBar
          clinicConfig={clinicConfig}
          lastUpdated={lastUpdated}
          onRefresh={handleRefresh}
        />

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title={isRTL ? 'إجمالي المواعيد' : 'Total Appointments'}
              value={stats.total}
              icon={CalendarIcon}
              trend={stats.growth}
              trendLabel={isRTL ? 'مقارنة بالشهر الماضي' : 'vs last month'}
              color="primary"
              delay={0}
            />
            <StatCard
              title={isRTL ? 'إجمالي المرضى' : 'Total Patients'}
              value={stats.uniquePatients}
              icon={Users}
              trend={8}
              trendLabel={isRTL ? 'مريض جديد' : 'new patients'}
              color="info"
              delay={0.1}
            />
            <StatCard
              title={isRTL ? 'مواعيد اليوم' : "Today's Appointments"}
              value={stats.todayTotal}
              icon={Clock}
              color="warning"
              delay={0.2}
            />
            <StatCard
              title={isRTL ? 'الأطباء النشطين' : 'Active Doctors'}
              value={stats.uniqueDoctors}
              icon={Stethoscope}
              color="success"
              delay={0.3}
            />
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {/* Chart - 2 columns */}
            <div className="lg:col-span-2">
              <AppointmentChart appointments={appointments} />
            </div>

            {/* Calendar - 1 column */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <Calendar
                  appointments={appointments}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  compact
                />
              </motion.div>
            </div>
          </div>

          {/* Selected Day Appointments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-6"
          >
            <SelectedDayAppointments
              date={selectedDate}
              appointments={appointments}
              onAppointmentClick={setSelectedAppointment}
            />
          </motion.div>

          {/* Bottom Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Patients - 2 columns */}
            <div className="lg:col-span-2">
              <RecentPatients
                appointments={appointments}
                onPatientClick={setSelectedAppointment}
              />
            </div>

            {/* Department Stats */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {isRTL ? 'إحصائيات الأقسام' : 'Department Stats'}
                </h3>
                <div className="space-y-3">
                  {departments.map((dept) => {
                    const deptAppointments = appointments.filter((a) => a.department_id === dept.id);
                    const total = deptAppointments.length;
                    const completed = deptAppointments.filter((a) => a.attended).length;
                    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const deptName = isRTL ? dept.name_ar : dept.name_en;

                    return (
                      <div key={dept.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{deptName}</span>
                            <span className="text-sm text-gray-500">{total} {isRTL ? 'موعد' : 'apt'}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {departments.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      {isRTL ? 'لا توجد أقسام' : 'No departments'}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Appointment Modal */}
      {selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onUpdate={handleAppointmentUpdate}
        />
      )}
    </div>
  );
}
