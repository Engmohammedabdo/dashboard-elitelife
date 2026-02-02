import { setRequestLocale } from 'next-intl/server';
import { supabase } from '@/lib/supabase';
import PatientsClient from '@/components/PatientsClient';
import type { PatientProfile } from '@/types/database';

type Props = {
  params: Promise<{ locale: string }>;
};

async function getPatients(): Promise<PatientProfile[]> {
  // Try patient_profiles view first
  const { data: profilesData, error: profilesError } = await supabase
    .from('patient_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (!profilesError && profilesData) {
    return profilesData;
  }

  // Fallback to patients table
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching patients:', error);
    return [];
  }

  return (data || []) as PatientProfile[];
}

export default async function PatientsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const patients = await getPatients();

  return <PatientsClient initialPatients={patients} />;
}
