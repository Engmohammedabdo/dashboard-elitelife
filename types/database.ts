// Patients table
export interface Patient {
  id: string;
  code: string;                    // PAT-0001
  whatsapp_number: string;
  name: string;
  age: number | null;
  gender: 'male' | 'female' | 'ذكر' | 'أنثى' | null;
  source_instance: string | null;
  total_visits: number;
  total_spent: number;
  reliability_score: 'high' | 'medium' | 'low';
  last_visit_date: string | null;
  google_review_given: boolean;
  created_at: string;
  updated_at: string;
}

// Patient Profile View (includes computed fields)
export interface PatientProfile {
  id: string;
  patient_code: string;
  name: string;
  whatsapp_number: string;
  age: number | null;
  gender: 'male' | 'female' | null;
  total_visits: number;
  total_spent: number;
  reliability_score: 'high' | 'medium' | 'low';
  last_visit_date: string | null;
  google_review_given: boolean;
  created_at: string;
  appointment_count: number;
  attended_count: number;
  noshow_count: number;
  last_appointment_date: string | null;
  departments_visited: string | null;
}

// Departments table
export interface Department {
  id: string;
  name_ar: string;
  name_en: string;
  code: string;
  description_ar: string | null;
  description_en: string | null;
  is_active: boolean;
  created_at: string;
}

// Doctors table
export interface Doctor {
  id: string;
  code: string;                    // DOC-0001
  name_ar: string;
  name_en: string;
  department_id: string | null;
  specialization_ar: string | null;
  specialization_en: string | null;
  is_active: boolean;
  created_at: string;
  // Joined data
  department?: Department;
}

// Services table
export interface Service {
  id: string;
  code: string;                    // SRV-0001
  department_id: string | null;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  duration_minutes: number;
  service_type: 'consultation' | 'procedure';
  price: number | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  // Joined data
  department?: Department;
}

// Appointments table
export interface Appointment {
  id: string;
  code: string;                    // APT-0001
  patient_id: string;
  department_id: string | null;
  doctor_id: string | null;
  service_id: string | null;
  date: string;
  time: string;
  duration_minutes: number;
  booking_type: 'consultation' | 'procedure';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  confirmation_status: 'pending' | 'confirmed' | 'declined';
  confirmation_time: string | null;
  source_instance: string | null;
  reminder_sent_24h: boolean;
  reminder_sent_today: boolean;
  followup_sent: boolean;
  clinic_notified: boolean;
  attended: boolean;
  visit_notes: string | null;
  rating: number | null;
  review_request_sent: boolean;
  review_request_time: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  patient?: Patient;
  doctor?: Doctor;
  department?: Department;
  service?: Service;
}

// Doctor schedules table
export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  schedule_date: string;           // Changed from 'date'
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;   // New field
  is_available: boolean;
  notes: string | null;
  created_at: string;
  // Joined data
  doctor?: Doctor;
}

// Config table
export interface Config {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

// Clinic config object (parsed from config table)
export interface ClinicConfig {
  clinic_name_ar: string;
  clinic_name_en: string;
  clinic_phone: string;
  clinic_address: string;
  working_hours_start: string;
  working_hours_end: string;
  timezone: string;
  google_maps_link: string;
  google_review_link: string;
  instagram: string;
  website: string;
  logo_url: string;
  assistant_name_ar: string;
  assistant_name_en: string;
}

export type AppointmentFilter = 'all' | 'today' | 'confirmed' | 'pending';

// Conversation logs table
export interface ConversationLog {
  id: string;
  whatsapp_number: string;
  patient_id: string | null;
  message_type: 'incoming' | 'outgoing';
  message_content: string;
  source_instance: string | null;
  is_bot_question?: boolean;
  resolved?: boolean;
  resolved_at?: string | null;
  followup_sent?: boolean;
  created_at: string;
  // Joined data
  patient?: Patient;
}

// Conversation analytics interface
export interface ConversationAnalytics {
  total_conversations: number;
  pending_questions: number;
  resolved_today: number;
  avg_response_time: number;
  conversations_today: number;
  followup_needed: number;
  by_source: { source: string; count: number }[];
}

// Patient timeline entry
export interface PatientTimelineEntry {
  id: string;
  type: 'appointment' | 'message' | 'review' | 'reminder';
  date: string;
  time?: string;
  title: string;
  description: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

// Reliability score analytics
export interface ReliabilityAnalytics {
  total_patients: number;
  high_reliability: number;
  medium_reliability: number;
  low_reliability: number;
  avg_attendance_rate: number;
  noshow_trend: { date: string; count: number }[];
  at_risk_patients: PatientProfile[];
}

// Default clinic config since table doesn't exist anymore
export const defaultClinicConfig: ClinicConfig = {
  clinic_name_ar: 'عيادة إيلايت لايف',
  clinic_name_en: 'Elite Life Clinic',
  clinic_phone: '+971 50 269 2725',
  clinic_address: 'Dubai, UAE',
  working_hours_start: '09:00',
  working_hours_end: '21:00',
  timezone: 'Asia/Dubai',
  google_maps_link: '',
  google_review_link: '',
  instagram: '',
  website: '',
  logo_url: '',
  assistant_name_ar: 'بايرا',
  assistant_name_en: 'Baira',
};
