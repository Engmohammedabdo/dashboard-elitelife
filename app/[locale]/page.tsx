import { setRequestLocale } from 'next-intl/server';
import { supabase } from '@/lib/supabase';
import DashboardClient from '@/components/DashboardClient';
import type { Appointment, ClinicConfig, Department } from '@/types/database';
import { defaultClinicConfig } from '@/types/database';

type Props = {
  params: Promise<{ locale: string }>;
};

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
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }

  return data || [];
}

async function getClinicConfig(): Promise<ClinicConfig> {
  // Config table may not exist, use default values
  try {
    const { data, error } = await supabase
      .from('config')
      .select('key, value');

    if (error) {
      // Table doesn't exist, use defaults
      return defaultClinicConfig;
    }

    const config: Record<string, string> = {};
    if (data) {
      data.forEach((item: { key: string; value: string }) => {
        config[item.key] = item.value;
      });
    }

    return {
      clinic_name_ar: config.clinic_name_ar || defaultClinicConfig.clinic_name_ar,
      clinic_name_en: config.clinic_name_en || defaultClinicConfig.clinic_name_en,
      clinic_phone: config.clinic_phone || defaultClinicConfig.clinic_phone,
      clinic_address: config.clinic_address || defaultClinicConfig.clinic_address,
      working_hours_start: config.working_hours_start || defaultClinicConfig.working_hours_start,
      working_hours_end: config.working_hours_end || defaultClinicConfig.working_hours_end,
      timezone: config.timezone || defaultClinicConfig.timezone,
      google_maps_link: config.google_maps_link || defaultClinicConfig.google_maps_link,
      google_review_link: config.google_review_link || defaultClinicConfig.google_review_link,
      instagram: config.instagram || defaultClinicConfig.instagram,
      website: config.website || defaultClinicConfig.website,
      logo_url: config.logo_url || defaultClinicConfig.logo_url,
      assistant_name_ar: config.assistant_name_ar || defaultClinicConfig.assistant_name_ar,
      assistant_name_en: config.assistant_name_en || defaultClinicConfig.assistant_name_en
    };
  } catch {
    return defaultClinicConfig;
  }
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

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [appointments, clinicConfig, departments] = await Promise.all([
    getAppointments(),
    getClinicConfig(),
    getDepartments()
  ]);

  return (
    <DashboardClient
      initialAppointments={appointments}
      clinicConfig={clinicConfig}
      departments={departments}
    />
  );
}
