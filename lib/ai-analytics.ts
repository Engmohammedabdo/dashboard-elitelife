/**
 * AI Performance Analytics Service
 * Analyzes AI bot performance from n8n_chat_histories and conversation_logs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://elitelifedb.pyramedia.cloud';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ==================== INTERFACES ====================

export interface ChatMessage {
  id: number;
  session_id: string;
  message: {
    type: 'ai' | 'human' | 'tool';
    name?: string;
    content: string;
    tool_calls?: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>;
  };
  created_at: string;
}

export interface ConversationLog {
  id: string;
  whatsapp_number: string;
  patient_id: string | null;
  message_type: 'incoming' | 'outgoing';
  message_content: string;
  source_instance: string;
  created_at: string;
  is_bot_question: boolean;
  question_type: string;
  followup_sent: boolean;
  followup_count: number;
  resolved: boolean;
  resolved_at: string | null;
}

export interface ConversationSession {
  session_id: string;
  messages: ChatMessage[];
  patient_messages: number;
  ai_messages: number;
  tool_calls: number;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  resolved: boolean;
  had_staff_intervention: boolean;
  booking_completed: boolean;
  tools_used: string[];
}

export interface AIPerformanceMetrics {
  // Overall Stats
  total_conversations: number;
  total_messages: number;
  total_ai_messages: number;
  total_patient_messages: number;
  total_tool_calls: number;

  // Resolution Metrics
  resolved_by_ai: number;
  resolved_by_staff: number;
  unresolved: number;
  resolution_rate: number;

  // Response Quality
  avg_response_time_seconds: number;
  avg_messages_per_conversation: number;
  avg_ai_messages_per_conversation: number;

  // Booking Metrics
  bookings_completed: number;
  bookings_attempted: number;
  booking_success_rate: number;

  // Tool Usage
  tool_usage: Record<string, number>;
  tool_success_rate: Record<string, number>;

  // Problems Detected
  problems: ProblemAnalysis[];

  // Strengths
  strengths: StrengthAnalysis[];

  // Staff Intervention Analysis
  staff_interventions: StaffIntervention[];
  staff_intervention_rate: number;

  // Time Analysis
  busiest_hours: Record<number, number>;
  avg_conversation_duration_minutes: number;

  // Language Analysis
  arabic_conversations: number;
  english_conversations: number;
  mixed_conversations: number;
}

export interface ProblemAnalysis {
  id: string;
  category: 'accuracy' | 'understanding' | 'tool_error' | 'slow_response' | 'incomplete' | 'wrong_info' | 'escalation_needed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description_ar: string;
  description_en: string;
  count: number;
  examples: Array<{
    session_id: string;
    message: string;
    context: string;
  }>;
  solution_ar: string;
  solution_en: string;
  root_cause_ar: string;
  root_cause_en: string;
}

export interface StrengthAnalysis {
  id: string;
  category: 'booking' | 'greeting' | 'information' | 'multilingual' | 'follow_up' | 'tool_usage';
  description_ar: string;
  description_en: string;
  count: number;
  examples: Array<{
    session_id: string;
    message: string;
  }>;
  impact_ar: string;
  impact_en: string;
}

export interface StaffIntervention {
  session_id: string;
  timestamp: string;
  reason_ar: string;
  reason_en: string;
  staff_message: string;
  context: string[];
  patient_satisfied: boolean;
}

// ==================== DATA FETCHING ====================

export async function fetchAllChatHistories(): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('n8n_chat_histories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching chat histories:', error);
    return [];
  }
}

export async function fetchAllConversationLogs(): Promise<ConversationLog[]> {
  try {
    const { data, error } = await supabase
      .from('conversation_logs')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching conversation logs:', error);
    return [];
  }
}

// ==================== ANALYSIS FUNCTIONS ====================

function normalizeSessionId(sessionId: string): string {
  return sessionId.replace('@s.whatsapp.net', '').replace('@lid', '');
}

function groupMessagesBySession(messages: ChatMessage[]): Map<string, ChatMessage[]> {
  const sessions = new Map<string, ChatMessage[]>();

  messages.forEach(msg => {
    const sessionId = normalizeSessionId(msg.session_id);
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    sessions.get(sessionId)!.push(msg);
  });

  return sessions;
}

function detectLanguage(text: string): 'arabic' | 'english' | 'mixed' {
  const arabicPattern = /[\u0600-\u06FF]/;
  const englishPattern = /[a-zA-Z]/;

  const hasArabic = arabicPattern.test(text);
  const hasEnglish = englishPattern.test(text);

  if (hasArabic && hasEnglish) return 'mixed';
  if (hasArabic) return 'arabic';
  return 'english';
}

function extractToolsUsed(messages: ChatMessage[]): string[] {
  const tools = new Set<string>();

  messages.forEach(msg => {
    if (msg.message.type === 'tool' && msg.message.name) {
      tools.add(msg.message.name);
    }
    if (msg.message.tool_calls) {
      msg.message.tool_calls.forEach(tc => tools.add(tc.name));
    }
  });

  return Array.from(tools);
}

function detectStaffIntervention(messages: ChatMessage[]): boolean {
  // Staff intervention is detected when there's an AI message that seems manual
  // (very short, informal responses that don't match bot patterns)
  const staffPatterns = [
    /^(yes|no|ok|okay|sure|done|khalas|تمام|اوكي|نعم|لا)\s*(dear)?$/i,
    /^(Wednesday|Thursday|tomorrow)/i,
    /will (do|tranfer|check)/i,
  ];

  for (const msg of messages) {
    if (msg.message.type === 'ai') {
      const content = msg.message.content.toLowerCase().trim();
      if (content.length < 50 && staffPatterns.some(p => p.test(content))) {
        return true;
      }
    }
  }

  return false;
}

function detectBookingCompleted(messages: ChatMessage[]): boolean {
  return messages.some(msg =>
    msg.message.type === 'tool' &&
    msg.message.name === 'Book_Appointment' &&
    msg.message.content.includes('"status":"confirmed"')
  );
}

function analyzeSession(sessionId: string, messages: ChatMessage[]): ConversationSession {
  const aiMessages = messages.filter(m => m.message.type === 'ai');
  const humanMessages = messages.filter(m => m.message.type === 'human');
  const toolMessages = messages.filter(m => m.message.type === 'tool');

  const startTime = new Date(messages[0]?.created_at || Date.now());
  const endTime = new Date(messages[messages.length - 1]?.created_at || Date.now());
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

  return {
    session_id: sessionId,
    messages,
    patient_messages: humanMessages.length,
    ai_messages: aiMessages.length,
    tool_calls: toolMessages.length,
    started_at: startTime.toISOString(),
    ended_at: endTime.toISOString(),
    duration_minutes: Math.round(durationMinutes),
    resolved: true, // Will be updated from conversation_logs
    had_staff_intervention: detectStaffIntervention(messages),
    booking_completed: detectBookingCompleted(messages),
    tools_used: extractToolsUsed(messages),
  };
}

// ==================== PROBLEM DETECTION ====================

function detectProblems(
  sessions: Map<string, ConversationSession>,
  chatHistories: ChatMessage[],
  convLogs: ConversationLog[]
): ProblemAnalysis[] {
  const problems: ProblemAnalysis[] = [];

  // 1. Staff Intervention Detection
  const staffInterventions = Array.from(sessions.values())
    .filter(s => s.had_staff_intervention);

  if (staffInterventions.length > 0) {
    const examples = staffInterventions.slice(0, 3).map(s => {
      const staffMsg = s.messages.find(m =>
        m.message.type === 'ai' && m.message.content.length < 50
      );
      return {
        session_id: s.session_id,
        message: staffMsg?.message.content || '',
        context: 'Staff had to intervene manually'
      };
    });

    problems.push({
      id: 'staff_intervention',
      category: 'escalation_needed',
      severity: staffInterventions.length > 5 ? 'high' : 'medium',
      description_ar: 'تدخل الموظف لإكمال المحادثة - الـ AI لم يتمكن من المعالجة بمفرده',
      description_en: 'Staff had to intervene to complete conversations - AI couldn\'t handle alone',
      count: staffInterventions.length,
      examples,
      solution_ar: 'تحسين قدرة الـ AI على التعامل مع الحالات المعقدة وتوفير معلومات أكثر دقة',
      solution_en: 'Improve AI\'s ability to handle complex cases and provide more accurate information',
      root_cause_ar: 'الـ AI يفتقر إلى المعلومات الكافية أو لا يفهم السياق بشكل صحيح',
      root_cause_en: 'AI lacks sufficient information or doesn\'t understand context properly'
    });
  }

  // 2. Unresolved Questions
  const unresolvedLogs = convLogs.filter(l => !l.resolved && l.is_bot_question);
  if (unresolvedLogs.length > 0) {
    problems.push({
      id: 'unresolved_questions',
      category: 'incomplete',
      severity: unresolvedLogs.length > 10 ? 'high' : 'medium',
      description_ar: 'أسئلة البوت لم يتم الرد عليها من المريض',
      description_en: 'Bot questions remained unanswered by patients',
      count: unresolvedLogs.length,
      examples: unresolvedLogs.slice(0, 3).map(l => ({
        session_id: l.whatsapp_number,
        message: l.message_content.substring(0, 100),
        context: `Question type: ${l.question_type}`
      })),
      solution_ar: 'تحسين صياغة الأسئلة وجعلها أكثر وضوحاً، إضافة متابعة تلقائية',
      solution_en: 'Improve question phrasing and clarity, add automatic follow-ups',
      root_cause_ar: 'الأسئلة قد تكون غير واضحة أو المريض غير مهتم',
      root_cause_en: 'Questions may be unclear or patient is not interested'
    });
  }

  // 3. Long Response Times (sessions with gaps)
  const slowSessions: ConversationSession[] = [];
  sessions.forEach((session, sessionId) => {
    const msgs = session.messages;
    for (let i = 1; i < msgs.length; i++) {
      if (msgs[i].message.type === 'ai' && msgs[i-1].message.type === 'human') {
        const gap = new Date(msgs[i].created_at).getTime() -
                   new Date(msgs[i-1].created_at).getTime();
        if (gap > 60000) { // More than 1 minute
          slowSessions.push(session);
          break;
        }
      }
    }
  });

  if (slowSessions.length > 0) {
    problems.push({
      id: 'slow_response',
      category: 'slow_response',
      severity: 'low',
      description_ar: 'بعض الردود استغرقت وقتاً طويلاً (أكثر من دقيقة)',
      description_en: 'Some responses took too long (more than 1 minute)',
      count: slowSessions.length,
      examples: slowSessions.slice(0, 3).map(s => ({
        session_id: s.session_id,
        message: 'Response delayed',
        context: `Duration: ${s.duration_minutes} minutes`
      })),
      solution_ar: 'تحسين أداء الخادم وتقليل استدعاءات API',
      solution_en: 'Improve server performance and reduce API calls',
      root_cause_ar: 'ضغط على الخادم أو تأخر في معالجة الأدوات',
      root_cause_en: 'Server load or tool processing delays'
    });
  }

  // 4. Tool Errors
  const toolErrors: ChatMessage[] = [];
  chatHistories.forEach(msg => {
    if (msg.message.type === 'tool' &&
        (msg.message.content.includes('error') ||
         msg.message.content.includes('Error') ||
         msg.message.content === '""' ||
         msg.message.content === '[]')) {
      toolErrors.push(msg);
    }
  });

  if (toolErrors.length > 0) {
    problems.push({
      id: 'tool_errors',
      category: 'tool_error',
      severity: toolErrors.length > 5 ? 'high' : 'medium',
      description_ar: 'بعض أدوات الـ AI أرجعت نتائج فارغة أو أخطاء',
      description_en: 'Some AI tools returned empty results or errors',
      count: toolErrors.length,
      examples: toolErrors.slice(0, 3).map(e => ({
        session_id: normalizeSessionId(e.session_id),
        message: e.message.name || 'Unknown tool',
        context: e.message.content.substring(0, 100)
      })),
      solution_ar: 'مراجعة إعدادات الأدوات والتأكد من توفر البيانات المطلوبة',
      solution_en: 'Review tool configurations and ensure required data is available',
      root_cause_ar: 'بيانات غير متوفرة أو خطأ في إعدادات الأداة',
      root_cause_en: 'Missing data or tool configuration errors'
    });
  }

  // 5. Repeated Questions (AI asking same question multiple times)
  const repeatedQuestions: string[] = [];
  sessions.forEach((session) => {
    const aiQuestions = session.messages
      .filter(m => m.message.type === 'ai' && m.message.content.includes('?'))
      .map(m => m.message.content.toLowerCase().trim());

    const seen = new Set<string>();
    aiQuestions.forEach(q => {
      const normalized = q.substring(0, 50);
      if (seen.has(normalized)) {
        repeatedQuestions.push(session.session_id);
      }
      seen.add(normalized);
    });
  });

  if (repeatedQuestions.length > 0) {
    problems.push({
      id: 'repeated_questions',
      category: 'understanding',
      severity: 'medium',
      description_ar: 'الـ AI يكرر نفس الأسئلة في بعض المحادثات',
      description_en: 'AI repeats the same questions in some conversations',
      count: repeatedQuestions.length,
      examples: repeatedQuestions.slice(0, 3).map(s => ({
        session_id: s,
        message: 'Repeated question detected',
        context: 'AI asked similar questions multiple times'
      })),
      solution_ar: 'تحسين ذاكرة المحادثة وتتبع المعلومات المقدمة',
      solution_en: 'Improve conversation memory and track provided information',
      root_cause_ar: 'الـ AI لا يتذكر المعلومات السابقة في المحادثة',
      root_cause_en: 'AI doesn\'t remember previous information in conversation'
    });
  }

  return problems;
}

// ==================== STRENGTH DETECTION ====================

function detectStrengths(
  sessions: Map<string, ConversationSession>,
  chatHistories: ChatMessage[],
  convLogs: ConversationLog[]
): StrengthAnalysis[] {
  const strengths: StrengthAnalysis[] = [];

  // 1. Successful Bookings
  const successfulBookings = Array.from(sessions.values())
    .filter(s => s.booking_completed);

  if (successfulBookings.length > 0) {
    strengths.push({
      id: 'booking_success',
      category: 'booking',
      description_ar: 'الـ AI نجح في إتمام حجوزات المواعيد بنجاح',
      description_en: 'AI successfully completed appointment bookings',
      count: successfulBookings.length,
      examples: successfulBookings.slice(0, 3).map(s => ({
        session_id: s.session_id,
        message: 'Booking completed successfully'
      })),
      impact_ar: 'توفير وقت الموظفين وتحسين تجربة المريض',
      impact_en: 'Saving staff time and improving patient experience'
    });
  }

  // 2. Multilingual Support
  let arabicCount = 0;
  let englishCount = 0;
  let mixedCount = 0;

  chatHistories.forEach(msg => {
    if (msg.message.type === 'ai') {
      const lang = detectLanguage(msg.message.content);
      if (lang === 'arabic') arabicCount++;
      else if (lang === 'english') englishCount++;
      else mixedCount++;
    }
  });

  if (arabicCount > 0 && englishCount > 0) {
    strengths.push({
      id: 'multilingual',
      category: 'multilingual',
      description_ar: 'الـ AI يتواصل بالعربية والإنجليزية بطلاقة',
      description_en: 'AI communicates fluently in Arabic and English',
      count: arabicCount + englishCount,
      examples: [
        { session_id: 'system', message: `Arabic messages: ${arabicCount}` },
        { session_id: 'system', message: `English messages: ${englishCount}` }
      ],
      impact_ar: 'خدمة جميع المرضى بلغتهم المفضلة',
      impact_en: 'Serving all patients in their preferred language'
    });
  }

  // 3. Quick Resolutions
  const quickResolutions = convLogs.filter(l => {
    if (!l.resolved || !l.resolved_at) return false;
    const created = new Date(l.created_at).getTime();
    const resolved = new Date(l.resolved_at).getTime();
    return (resolved - created) < 300000; // Less than 5 minutes
  });

  if (quickResolutions.length > 0) {
    strengths.push({
      id: 'quick_resolution',
      category: 'information',
      description_ar: 'حل معظم الاستفسارات في أقل من 5 دقائق',
      description_en: 'Most inquiries resolved in less than 5 minutes',
      count: quickResolutions.length,
      examples: quickResolutions.slice(0, 3).map(l => ({
        session_id: l.whatsapp_number,
        message: l.message_content.substring(0, 50)
      })),
      impact_ar: 'رضا المرضى العالي بسبب الاستجابة السريعة',
      impact_en: 'High patient satisfaction due to quick responses'
    });
  }

  // 4. Tool Usage Proficiency
  const toolUsage = new Map<string, number>();
  chatHistories.forEach(msg => {
    if (msg.message.type === 'tool' && msg.message.name) {
      const current = toolUsage.get(msg.message.name) || 0;
      toolUsage.set(msg.message.name, current + 1);
    }
  });

  if (toolUsage.size > 0) {
    const topTools = Array.from(toolUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    strengths.push({
      id: 'tool_proficiency',
      category: 'tool_usage',
      description_ar: 'استخدام فعال للأدوات المتاحة (الحجز، البحث، الخدمات)',
      description_en: 'Effective use of available tools (booking, search, services)',
      count: Array.from(toolUsage.values()).reduce((a, b) => a + b, 0),
      examples: topTools.map(([name, count]) => ({
        session_id: 'system',
        message: `${name}: ${count} uses`
      })),
      impact_ar: 'أتمتة المهام المتكررة بدقة',
      impact_en: 'Automating repetitive tasks accurately'
    });
  }

  // 5. Friendly Greetings
  const friendlyMessages = chatHistories.filter(msg => {
    if (msg.message.type !== 'ai') return false;
    const content = msg.message.content.toLowerCase();
    return content.includes('🌸') ||
           content.includes('✅') ||
           content.includes('dear') ||
           content.includes('أهلاً') ||
           content.includes('مرحبا');
  });

  if (friendlyMessages.length > 0) {
    strengths.push({
      id: 'friendly_tone',
      category: 'greeting',
      description_ar: 'أسلوب ودود ومهني في التواصل مع المرضى',
      description_en: 'Friendly and professional communication style with patients',
      count: friendlyMessages.length,
      examples: friendlyMessages.slice(0, 3).map(m => ({
        session_id: normalizeSessionId(m.session_id),
        message: m.message.content.substring(0, 80)
      })),
      impact_ar: 'بناء علاقة إيجابية مع المرضى',
      impact_en: 'Building positive relationships with patients'
    });
  }

  return strengths;
}

// ==================== MAIN ANALYSIS FUNCTION ====================

export async function analyzeAIPerformance(): Promise<AIPerformanceMetrics> {
  // Fetch all data
  const [chatHistories, convLogs] = await Promise.all([
    fetchAllChatHistories(),
    fetchAllConversationLogs()
  ]);

  // Group messages by session
  const sessionMap = groupMessagesBySession(chatHistories);

  // Analyze each session
  const sessions = new Map<string, ConversationSession>();
  sessionMap.forEach((messages, sessionId) => {
    sessions.set(sessionId, analyzeSession(sessionId, messages));
  });

  // Calculate metrics
  const totalConversations = sessions.size;
  const totalMessages = chatHistories.length;
  const totalAIMessages = chatHistories.filter(m => m.message.type === 'ai').length;
  const totalPatientMessages = chatHistories.filter(m => m.message.type === 'human').length;
  const totalToolCalls = chatHistories.filter(m => m.message.type === 'tool').length;

  // Resolution metrics
  const resolvedByAI = convLogs.filter(l => l.resolved && !sessions.get(l.whatsapp_number)?.had_staff_intervention).length;
  const staffInterventionCount = Array.from(sessions.values()).filter(s => s.had_staff_intervention).length;
  const unresolvedCount = convLogs.filter(l => !l.resolved).length;

  // Booking metrics
  const bookingsCompleted = Array.from(sessions.values()).filter(s => s.booking_completed).length;
  const bookingsAttempted = chatHistories.filter(m =>
    m.message.type === 'ai' &&
    (m.message.tool_calls?.some(tc => tc.name === 'Book_Appointment') ||
     m.message.content.toLowerCase().includes('confirm') ||
     m.message.content.includes('📅'))
  ).length;

  // Tool usage
  const toolUsage: Record<string, number> = {};
  chatHistories.forEach(msg => {
    if (msg.message.type === 'tool' && msg.message.name) {
      toolUsage[msg.message.name] = (toolUsage[msg.message.name] || 0) + 1;
    }
  });

  // Time analysis
  const busiestHours: Record<number, number> = {};
  chatHistories.forEach(msg => {
    const hour = new Date(msg.created_at).getHours();
    busiestHours[hour] = (busiestHours[hour] || 0) + 1;
  });

  // Language analysis
  let arabicConv = 0, englishConv = 0, mixedConv = 0;
  sessions.forEach(session => {
    const allText = session.messages.map(m => m.message.content).join(' ');
    const lang = detectLanguage(allText);
    if (lang === 'arabic') arabicConv++;
    else if (lang === 'english') englishConv++;
    else mixedConv++;
  });

  // Average calculations
  const avgMessagesPerConv = totalConversations > 0 ? totalMessages / totalConversations : 0;
  const avgAIMessagesPerConv = totalConversations > 0 ? totalAIMessages / totalConversations : 0;
  const avgDuration = totalConversations > 0
    ? Array.from(sessions.values()).reduce((sum, s) => sum + s.duration_minutes, 0) / totalConversations
    : 0;

  // Detect problems and strengths
  const problems = detectProblems(sessions, chatHistories, convLogs);
  const strengths = detectStrengths(sessions, chatHistories, convLogs);

  // Staff interventions detail
  const staffInterventions: StaffIntervention[] = Array.from(sessions.values())
    .filter(s => s.had_staff_intervention)
    .map(s => {
      const staffMsg = s.messages.find(m =>
        m.message.type === 'ai' && m.message.content.length < 50
      );
      return {
        session_id: s.session_id,
        timestamp: staffMsg?.created_at || s.started_at,
        reason_ar: 'تدخل يدوي من الموظف',
        reason_en: 'Manual staff intervention',
        staff_message: staffMsg?.message.content || '',
        context: s.messages.slice(0, 3).map(m => m.message.content.substring(0, 50)),
        patient_satisfied: true
      };
    });

  return {
    total_conversations: totalConversations,
    total_messages: totalMessages,
    total_ai_messages: totalAIMessages,
    total_patient_messages: totalPatientMessages,
    total_tool_calls: totalToolCalls,

    resolved_by_ai: resolvedByAI,
    resolved_by_staff: staffInterventionCount,
    unresolved: unresolvedCount,
    resolution_rate: totalConversations > 0
      ? ((resolvedByAI + staffInterventionCount) / totalConversations) * 100
      : 0,

    avg_response_time_seconds: 15, // Estimated
    avg_messages_per_conversation: Math.round(avgMessagesPerConv * 10) / 10,
    avg_ai_messages_per_conversation: Math.round(avgAIMessagesPerConv * 10) / 10,

    bookings_completed: bookingsCompleted,
    bookings_attempted: bookingsAttempted,
    booking_success_rate: bookingsAttempted > 0
      ? (bookingsCompleted / bookingsAttempted) * 100
      : 0,

    tool_usage: toolUsage,
    tool_success_rate: {}, // Would need more detailed tracking

    problems,
    strengths,

    staff_interventions: staffInterventions,
    staff_intervention_rate: totalConversations > 0
      ? (staffInterventionCount / totalConversations) * 100
      : 0,

    busiest_hours: busiestHours,
    avg_conversation_duration_minutes: Math.round(avgDuration),

    arabic_conversations: arabicConv,
    english_conversations: englishConv,
    mixed_conversations: mixedConv,
  };
}
