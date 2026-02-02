import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { supabase } from '@/lib/supabase';
import SettingsClient from '@/components/SettingsClient';
import type { Doctor, DoctorSchedule, Department, Appointment } from '@/types/database';

type Props = {
  params: Promise<{ locale: string }>;
};

async function getDoctors(): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      *,
      department:departments(*)
    `)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching doctors:', error);
    return [];
  }

  return data || [];
}

async function getDoctorSchedules(): Promise<DoctorSchedule[]> {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('doctor_schedules')
    .select(`
      *,
      doctor:doctors(*)
    `)
    .gte('schedule_date', todayStr)
    .order('schedule_date', { ascending: true });

  if (error) {
    console.error('Error fetching schedules:', error);
    return [];
  }

  return data || [];
}

async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .order('name_ar');

  if (error) {
    console.error('Error fetching departments:', error);
    return [];
  }

  return data || [];
}

async function getAppointments(): Promise<Appointment[]> {
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

  if (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }

  return data || [];
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [doctors, schedules, departments, appointments] = await Promise.all([
    getDoctors(),
    getDoctorSchedules(),
    getDepartments(),
    getAppointments()
  ]);

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
      <SettingsClient
        initialDoctors={doctors}
        initialSchedules={schedules}
        departments={departments}
        appointments={appointments}
      />
    </Suspense>
  );
}
