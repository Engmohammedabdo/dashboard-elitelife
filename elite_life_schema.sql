-- ============================================================
-- 🏥 ELITE LIFE MEDICAL CENTRE - DATABASE SCHEMA
-- ============================================================
-- Created: 2025-01-30
-- Database: Supabase (PostgreSQL)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- 📱 PATIENTS (ملفات المرضى)
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whatsapp_number TEXT NOT NULL,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT CHECK (gender IN ('male', 'female', 'ذكر', 'أنثى')),
    source_instance TEXT, -- which WhatsApp number they came from
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    reliability_score TEXT DEFAULT 'medium' CHECK (reliability_score IN ('high', 'medium', 'low')),
    last_visit_date DATE,
    google_review_given BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(whatsapp_number, name)
);

-- Index for fast lookup by phone
CREATE INDEX IF NOT EXISTS idx_patients_whatsapp ON patients(whatsapp_number);

-- ============================================================
-- 🏢 DEPARTMENTS (الأقسام)
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL, -- 'facial', 'ems', 'dental'
    description_ar TEXT,
    description_en TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 👨‍⚕️ DOCTORS (الأطباء والأخصائيين)
-- ============================================================
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    department_id UUID REFERENCES departments(id),
    specialization_ar TEXT,
    specialization_en TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 📅 DOCTOR_SCHEDULES (جدول الأطباء الشهري)
-- ============================================================
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doctor_id, date)
);

-- Index for schedule lookups
CREATE INDEX IF NOT EXISTS idx_schedules_doctor_date ON doctor_schedules(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON doctor_schedules(date);

-- ============================================================
-- 💆 SERVICES (الخدمات)
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES departments(id),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    duration_minutes INTEGER DEFAULT 60, -- 30 for consultation, 60 for procedure
    service_type TEXT DEFAULT 'procedure' CHECK (service_type IN ('consultation', 'procedure')),
    price DECIMAL(10,2), -- NULL means "after consultation"
    currency TEXT DEFAULT 'AED',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 📅 APPOINTMENTS (المواعيد)
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    doctor_id UUID REFERENCES doctors(id),
    service_id UUID REFERENCES services(id),
    
    -- Booking details
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    booking_type TEXT DEFAULT 'procedure' CHECK (booking_type IN ('consultation', 'procedure')),
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    confirmation_status TEXT DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'cancelled')),
    confirmation_time TIMESTAMP WITH TIME ZONE,
    
    -- Source tracking
    source_instance TEXT, -- which WhatsApp number
    
    -- Reminders
    reminder_sent_24h BOOLEAN DEFAULT FALSE,
    reminder_sent_today BOOLEAN DEFAULT FALSE,
    followup_sent BOOLEAN DEFAULT FALSE,
    clinic_notified BOOLEAN DEFAULT FALSE,
    
    -- Visit completion
    attended BOOLEAN DEFAULT FALSE,
    visit_notes TEXT,
    
    -- Review
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_request_sent BOOLEAN DEFAULT FALSE,
    review_request_time TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for appointments
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ============================================================
-- ⚙️ CONFIG (الإعدادات)
-- ============================================================
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 📱 WHATSAPP_INSTANCES (أرقام الواتساب)
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    department_id UUID REFERENCES departments(id), -- optional link
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 📚 FAQ_EMBEDDINGS (Vector Store للأسئلة الشائعة)
-- ============================================================
CREATE TABLE IF NOT EXISTS faq_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES departments(id),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[], -- for additional search
    embedding vector(1536), -- OpenAI embedding size
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for vector search
CREATE INDEX IF NOT EXISTS idx_faq_embedding ON faq_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 📊 CONVERSATION_LOGS (سجل المحادثات) - Optional
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whatsapp_number TEXT NOT NULL,
    patient_id UUID REFERENCES patients(id),
    message_type TEXT CHECK (message_type IN ('incoming', 'outgoing')),
    message_content TEXT,
    source_instance TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 🔄 UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 📥 INITIAL DATA - DEPARTMENTS
-- ============================================================
INSERT INTO departments (code, name_ar, name_en, description_ar, description_en) VALUES
('facial', 'قسم العناية بالبشرة', 'Facial Care', 'علاجات الوجه والبشرة والتقشير', 'Facial treatments, skincare, and peeling'),
('ems', 'قسم الأجهزة والليزر', 'EMS & Laser', 'أجهزة التنحيف وإزالة الشعر بالليزر', 'Body contouring machines and laser hair removal'),
('dental', 'قسم الأسنان', 'Dental', 'تجميل وعلاج الأسنان', 'Cosmetic and general dentistry')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 📥 INITIAL DATA - DOCTORS
-- ============================================================
INSERT INTO doctors (name_ar, name_en, department_id, specialization_ar, specialization_en)
SELECT 'أ. شيماء', 'Shaimaa', id, 'أخصائية العناية بالبشرة', 'Skincare Specialist'
FROM departments WHERE code = 'facial'
ON CONFLICT DO NOTHING;

INSERT INTO doctors (name_ar, name_en, department_id, specialization_ar, specialization_en)
SELECT 'د. إياد', 'Dr. Iyad', id, 'طبيب أسنان', 'Dentist'
FROM departments WHERE code = 'dental'
ON CONFLICT DO NOTHING;

INSERT INTO doctors (name_ar, name_en, department_id, specialization_ar, specialization_en)
SELECT 'د. منير', 'Dr. Monir', id, 'طبيب أسنان', 'Dentist'
FROM departments WHERE code = 'dental'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 📥 INITIAL DATA - CONFIG
-- ============================================================
INSERT INTO config (key, value, description) VALUES
('working_hours_start', '09:00', 'Clinic opening time'),
('working_hours_end', '20:00', 'Clinic closing time'),
('consultation_duration', '30', 'Consultation duration in minutes'),
('procedure_duration', '60', 'Procedure duration in minutes'),
('timezone', 'Asia/Dubai', 'Clinic timezone'),
('clinic_name_ar', 'مركز ايليت لايف الطبي', 'Clinic name in Arabic'),
('clinic_name_en', 'Elite Life Medical Centre', 'Clinic name in English'),
('clinic_phone', '+971 4 3495363', 'Clinic phone number'),
('clinic_address', 'Jumeirah Beach Road, Near Jumeirah Plaza Villa No.87', 'Clinic address'),
('google_maps_link', 'https://maps.app.goo.gl/ZNCn5KmogNX1eMnX6', 'Google Maps link'),
('google_review_link', 'https://www.google.com/search?q=Elite+Life+Medical+Center+Reviews', 'Google Review link'),
('instagram', 'https://www.instagram.com/elitelifemedicalcentre', 'Instagram link'),
('website', 'https://elitelifemedicalcentre.com/dubai/', 'Website URL'),
('assistant_name_ar', 'بايرا', 'AI Assistant name in Arabic'),
('assistant_name_en', 'Pyra', 'AI Assistant name in English'),
('logo_url', 'https://dialanail.com/web/wp-content/uploads/2025/03/elite-life-medical-centre-1-1.png', 'Logo URL')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================
-- 📥 INITIAL DATA - SERVICES (Facial)
-- ============================================================
INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'استشارة مجانية', 'Free Consultation', 'استشارة مجانية لتقييم البشرة', 'consultation', 30
FROM departments d WHERE d.code = 'facial';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'فيشيال كلاسيكي', 'Classic Facial', 'تنظيف وترطيب عميق للبشرة', 'procedure', 60
FROM departments d WHERE d.code = 'facial';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'ديرمابلانينج ياباني', 'Japanese Dermaplaning', 'تقشير بالتقنية اليابانية', 'procedure', 60
FROM departments d WHERE d.code = 'facial';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'تقشير كيميائي', 'Chemical Peeling', 'تقشير كيميائي للوجه أو الجسم', 'procedure', 60
FROM departments d WHERE d.code = 'facial';

-- ============================================================
-- 📥 INITIAL DATA - SERVICES (EMS)
-- ============================================================
INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'استشارة مجانية', 'Free Consultation', 'استشارة مجانية لتحديد العلاج المناسب', 'consultation', 30
FROM departments d WHERE d.code = 'ems';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'جلسة EMS', 'EMS Session', 'تحفيز العضلات الكهربائي لشد الجسم', 'procedure', 60
FROM departments d WHERE d.code = 'ems';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'جلسة Onda', 'Onda Session', 'إذابة الدهون بتقنية Coolwaves', 'procedure', 60
FROM departments d WHERE d.code = 'ems';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'جلسة Venus', 'Venus Session', 'شد البشرة وعلاج السيلوليت', 'procedure', 60
FROM departments d WHERE d.code = 'ems';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'إزالة الشعر بالليزر', 'Laser Hair Removal', 'إزالة الشعر بجهاز Deka الإيطالي', 'procedure', 60
FROM departments d WHERE d.code = 'ems';

-- ============================================================
-- 📥 INITIAL DATA - SERVICES (Dental)
-- ============================================================
INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'استشارة مجانية', 'Free Consultation', 'فحص وتقييم مجاني للأسنان', 'consultation', 30
FROM departments d WHERE d.code = 'dental';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'تنظيف الأسنان', 'Dental Cleaning', 'تنظيف احترافي للأسنان', 'procedure', 30
FROM departments d WHERE d.code = 'dental';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'تبييض الأسنان', 'Teeth Whitening', 'تبييض بمواد بريطانية NANO WHITENING', 'procedure', 60
FROM departments d WHERE d.code = 'dental';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'حشو الأسنان', 'Dental Filling', 'حشو بمواد كومبوزيت عالية الجودة', 'procedure', 30
FROM departments d WHERE d.code = 'dental';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'علاج عصب', 'Root Canal', 'علاج عصب السن', 'procedure', 60
FROM departments d WHERE d.code = 'dental';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'فينير', 'Veneers', 'فينير Emax سويسري/ألماني - ضمان 10 سنوات', 'procedure', 60
FROM departments d WHERE d.code = 'dental';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'تيجان وجسور', 'Crowns & Bridges', 'تيجان Emax أو Zirconia', 'procedure', 60
FROM departments d WHERE d.code = 'dental';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'زراعة الأسنان', 'Dental Implants', 'زراعة إيطالية/سويسرية/كورية', 'procedure', 60
FROM departments d WHERE d.code = 'dental';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'تقويم شفاف', 'Clear Aligners', 'تقويم شفاف - أسرع وأسهل', 'procedure', 30
FROM departments d WHERE d.code = 'dental';

INSERT INTO services (department_id, name_ar, name_en, description_ar, service_type, duration_minutes)
SELECT d.id, 'إزالة فينير بالليزر', 'Laser Veneer Removal', 'إزالة الفينير بالليزر في 15 دقيقة', 'procedure', 30
FROM departments d WHERE d.code = 'dental';


-- ============================================================
-- 🔍 VIEWS - Smart Data Access
-- ============================================================

-- View: Available slots for booking
CREATE OR REPLACE VIEW available_slots AS
SELECT 
    ds.id as schedule_id,
    ds.doctor_id,
    d.name_ar as doctor_name_ar,
    d.name_en as doctor_name_en,
    dept.id as department_id,
    dept.code as department_code,
    dept.name_ar as department_name_ar,
    ds.date,
    ds.start_time,
    ds.end_time
FROM doctor_schedules ds
JOIN doctors d ON ds.doctor_id = d.id
JOIN departments dept ON d.department_id = dept.id
WHERE ds.date >= CURRENT_DATE
AND ds.is_available = TRUE
AND d.is_active = TRUE
ORDER BY ds.date, ds.start_time;

-- View: Today's appointments
CREATE OR REPLACE VIEW todays_appointments AS
SELECT 
    a.*,
    p.name as patient_name,
    p.whatsapp_number,
    d.name_ar as doctor_name_ar,
    dept.name_ar as department_name_ar,
    s.name_ar as service_name_ar
FROM appointments a
JOIN patients p ON a.patient_id = p.id
LEFT JOIN doctors d ON a.doctor_id = d.id
LEFT JOIN departments dept ON a.department_id = dept.id
LEFT JOIN services s ON a.service_id = s.id
WHERE a.date = CURRENT_DATE
AND a.status NOT IN ('cancelled')
ORDER BY a.time;

-- View: Upcoming appointments needing reminders
CREATE OR REPLACE VIEW appointments_needing_reminders AS
SELECT 
    a.*,
    p.name as patient_name,
    p.whatsapp_number,
    d.name_ar as doctor_name_ar,
    s.name_ar as service_name_ar
FROM appointments a
JOIN patients p ON a.patient_id = p.id
LEFT JOIN doctors d ON a.doctor_id = d.id
LEFT JOIN services s ON a.service_id = s.id
WHERE a.status IN ('pending', 'confirmed')
AND a.date >= CURRENT_DATE
AND (
    (a.date = CURRENT_DATE + INTERVAL '1 day' AND a.reminder_sent_24h = FALSE)
    OR (a.date = CURRENT_DATE AND a.reminder_sent_today = FALSE)
);

-- View: Appointments needing review request
CREATE OR REPLACE VIEW appointments_needing_review AS
SELECT 
    a.*,
    p.name as patient_name,
    p.whatsapp_number,
    p.google_review_given
FROM appointments a
JOIN patients p ON a.patient_id = p.id
WHERE a.attended = TRUE
AND a.review_request_sent = FALSE
AND p.google_review_given = FALSE
AND a.updated_at <= NOW() - INTERVAL '2 hours';

-- View: Patient full profile
CREATE OR REPLACE VIEW patient_profiles AS
SELECT 
    p.*,
    COUNT(a.id) as appointment_count,
    COUNT(CASE WHEN a.attended = TRUE THEN 1 END) as attended_count,
    COUNT(CASE WHEN a.status = 'no_show' THEN 1 END) as noshow_count,
    MAX(a.date) as last_appointment_date,
    STRING_AGG(DISTINCT dept.name_ar, ', ') as departments_visited
FROM patients p
LEFT JOIN appointments a ON p.id = a.patient_id
LEFT JOIN departments dept ON a.department_id = dept.id
GROUP BY p.id;

-- ============================================================
-- 🔧 FUNCTIONS - Smart Operations
-- ============================================================

-- Function: Get or create patient
CREATE OR REPLACE FUNCTION get_or_create_patient(
    p_whatsapp_number TEXT,
    p_name TEXT DEFAULT NULL,
    p_age INTEGER DEFAULT NULL,
    p_gender TEXT DEFAULT NULL,
    p_source_instance TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_patient patients%ROWTYPE;
    v_result JSON;
BEGIN
    -- Try to find existing patient
    SELECT * INTO v_patient 
    FROM patients 
    WHERE whatsapp_number = p_whatsapp_number
    LIMIT 1;
    
    IF v_patient.id IS NOT NULL THEN
        -- Return existing patient
        SELECT json_build_object(
            'status', 'existing',
            'patient', row_to_json(v_patient)
        ) INTO v_result;
    ELSIF p_name IS NOT NULL THEN
        -- Create new patient
        INSERT INTO patients (whatsapp_number, name, age, gender, source_instance)
        VALUES (p_whatsapp_number, p_name, p_age, p_gender, p_source_instance)
        RETURNING * INTO v_patient;
        
        SELECT json_build_object(
            'status', 'created',
            'patient', row_to_json(v_patient)
        ) INTO v_result;
    ELSE
        -- Patient not found and no data to create
        SELECT json_build_object(
            'status', 'not_found',
            'message', 'Patient not found. Please provide name, age, and gender to register.'
        ) INTO v_result;
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function: Get patient context (all info for AI)
CREATE OR REPLACE FUNCTION get_patient_context(p_whatsapp_number TEXT)
RETURNS JSON AS $$
DECLARE
    v_patient JSON;
    v_appointments JSON;
    v_result JSON;
BEGIN
    -- Get patient info
    SELECT row_to_json(p) INTO v_patient
    FROM patient_profiles p
    WHERE p.whatsapp_number = p_whatsapp_number;
    
    -- Get upcoming and recent appointments
    SELECT json_agg(apt) INTO v_appointments
    FROM (
        SELECT 
            a.id,
            a.date,
            a.time,
            a.status,
            a.booking_type,
            a.attended,
            a.visit_notes,
            d.name_ar as doctor_name,
            dept.name_ar as department_name,
            s.name_ar as service_name
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN departments dept ON a.department_id = dept.id
        LEFT JOIN services s ON a.service_id = s.id
        WHERE a.patient_id = (SELECT id FROM patients WHERE whatsapp_number = p_whatsapp_number LIMIT 1)
        ORDER BY a.date DESC, a.time DESC
        LIMIT 10
    ) apt;
    
    SELECT json_build_object(
        'patient', COALESCE(v_patient, '{}'::json),
        'appointments', COALESCE(v_appointments, '[]'::json),
        'has_patient', v_patient IS NOT NULL
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function: Get available slots
CREATE OR REPLACE FUNCTION get_available_slots(
    p_department_code TEXT DEFAULT NULL,
    p_doctor_id UUID DEFAULT NULL,
    p_date DATE DEFAULT NULL,
    p_days_ahead INTEGER DEFAULT 7
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(slot) INTO v_result
    FROM (
        SELECT DISTINCT
            ds.date,
            ds.start_time,
            ds.end_time,
            d.id as doctor_id,
            d.name_ar as doctor_name_ar,
            d.name_en as doctor_name_en,
            dept.code as department_code,
            dept.name_ar as department_name_ar
        FROM doctor_schedules ds
        JOIN doctors d ON ds.doctor_id = d.id
        JOIN departments dept ON d.department_id = dept.id
        WHERE ds.date >= CURRENT_DATE
        AND ds.date <= CURRENT_DATE + (p_days_ahead || ' days')::INTERVAL
        AND ds.is_available = TRUE
        AND d.is_active = TRUE
        AND (p_department_code IS NULL OR dept.code = p_department_code)
        AND (p_doctor_id IS NULL OR d.id = p_doctor_id)
        AND (p_date IS NULL OR ds.date = p_date)
        -- Exclude already booked times
        AND NOT EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.doctor_id = d.id
            AND a.date = ds.date
            AND a.status NOT IN ('cancelled')
            AND a.time >= ds.start_time
            AND a.time < ds.end_time
        )
        ORDER BY ds.date, ds.start_time
    ) slot;
    
    RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- Function: Book appointment
CREATE OR REPLACE FUNCTION book_appointment(
    p_whatsapp_number TEXT,
    p_patient_name TEXT,
    p_department_code TEXT DEFAULT NULL,
    p_doctor_id UUID DEFAULT NULL,
    p_service_id UUID DEFAULT NULL,
    p_date DATE DEFAULT NULL,
    p_time TIME DEFAULT NULL,
    p_booking_type TEXT DEFAULT 'procedure',
    p_source_instance TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_patient_id UUID;
    v_department_id UUID;
    v_doctor_id UUID;
    v_service_id UUID;
    v_duration INTEGER;
    v_appointment_id UUID;
    v_result JSON;
BEGIN
    -- Get or create patient
    SELECT id INTO v_patient_id
    FROM patients
    WHERE whatsapp_number = p_whatsapp_number
    LIMIT 1;
    
    IF v_patient_id IS NULL THEN
        INSERT INTO patients (whatsapp_number, name, source_instance)
        VALUES (p_whatsapp_number, p_patient_name, p_source_instance)
        RETURNING id INTO v_patient_id;
    END IF;
    
    -- Get department
    IF p_department_code IS NOT NULL THEN
        SELECT id INTO v_department_id
        FROM departments WHERE code = p_department_code;
    END IF;
    
    -- Get doctor
    IF p_doctor_id IS NOT NULL THEN
        v_doctor_id := p_doctor_id;
        -- Also get department from doctor if not specified
        IF v_department_id IS NULL THEN
            SELECT department_id INTO v_department_id
            FROM doctors WHERE id = p_doctor_id;
        END IF;
    END IF;
    
    -- Get service
    IF p_service_id IS NOT NULL THEN
        v_service_id := p_service_id;
        -- Get department from service if not specified
        IF v_department_id IS NULL THEN
            SELECT department_id INTO v_department_id
            FROM services WHERE id = p_service_id;
        END IF;
    END IF;
    
    -- Determine duration
    IF p_booking_type = 'consultation' THEN
        v_duration := 30;
    ELSE
        v_duration := 60;
    END IF;
    
    -- Create appointment
    INSERT INTO appointments (
        patient_id,
        department_id,
        doctor_id,
        service_id,
        date,
        time,
        duration_minutes,
        booking_type,
        source_instance,
        status
    ) VALUES (
        v_patient_id,
        v_department_id,
        v_doctor_id,
        v_service_id,
        p_date,
        p_time,
        v_duration,
        p_booking_type,
        p_source_instance,
        'confirmed'
    ) RETURNING id INTO v_appointment_id;
    
    -- Return confirmation
    SELECT json_build_object(
        'status', 'success',
        'appointment_id', v_appointment_id,
        'patient_id', v_patient_id,
        'date', p_date,
        'time', p_time,
        'duration', v_duration,
        'booking_type', p_booking_type,
        'message', 'تم حجز موعدك بنجاح!'
    ) INTO v_result;
    
    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'status', 'error',
        'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Cancel appointment
CREATE OR REPLACE FUNCTION cancel_appointment(
    p_appointment_id UUID,
    p_whatsapp_number TEXT
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    UPDATE appointments a
    SET status = 'cancelled',
        updated_at = NOW()
    FROM patients p
    WHERE a.id = p_appointment_id
    AND a.patient_id = p.id
    AND p.whatsapp_number = p_whatsapp_number;
    
    IF FOUND THEN
        SELECT json_build_object(
            'status', 'success',
            'message', 'تم إلغاء الموعد بنجاح'
        ) INTO v_result;
    ELSE
        SELECT json_build_object(
            'status', 'error',
            'message', 'لم يتم العثور على الموعد'
        ) INTO v_result;
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function: Confirm attendance (from Dashboard)
CREATE OR REPLACE FUNCTION confirm_attendance(p_appointment_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    UPDATE appointments
    SET attended = TRUE,
        status = 'completed',
        updated_at = NOW()
    WHERE id = p_appointment_id;
    
    -- Update patient stats
    UPDATE patients p
    SET total_visits = total_visits + 1,
        last_visit_date = CURRENT_DATE,
        updated_at = NOW()
    FROM appointments a
    WHERE a.id = p_appointment_id
    AND a.patient_id = p.id;
    
    SELECT json_build_object(
        'status', 'success',
        'message', 'تم تأكيد حضور المريض'
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function: Get services by department
CREATE OR REPLACE FUNCTION get_services(p_department_code TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(srv) INTO v_result
    FROM (
        SELECT 
            s.id,
            s.name_ar,
            s.name_en,
            s.description_ar,
            s.service_type,
            s.duration_minutes,
            d.code as department_code,
            d.name_ar as department_name_ar
        FROM services s
        JOIN departments d ON s.department_id = d.id
        WHERE s.is_active = TRUE
        AND (p_department_code IS NULL OR d.code = p_department_code)
        ORDER BY d.code, s.service_type, s.name_ar
    ) srv;
    
    RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- Function: Get doctors
CREATE OR REPLACE FUNCTION get_doctors(p_department_code TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(doc) INTO v_result
    FROM (
        SELECT 
            d.id,
            d.name_ar,
            d.name_en,
            d.specialization_ar,
            dept.code as department_code,
            dept.name_ar as department_name_ar
        FROM doctors d
        JOIN departments dept ON d.department_id = dept.id
        WHERE d.is_active = TRUE
        AND (p_department_code IS NULL OR dept.code = p_department_code)
        ORDER BY dept.code, d.name_ar
    ) doc;
    
    RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

