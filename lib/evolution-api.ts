/**
 * Evolution API Service
 * For fetching WhatsApp messages from Evolution API
 */

import { createClient } from '@supabase/supabase-js';

const EVOLUTION_API_URL = 'https://evo.pyramedia.info';
const EVOLUTION_API_KEY = 'D765376E8FF7-4964-A295-BDDA9B2186E9';

// Supabase client for fetching bot messages
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://elitelifedb.pyramedia.cloud';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Cache for bot messages (to avoid multiple DB calls)
let botMessagesCache: Map<string, Set<string>> = new Map();
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minute cache

// Message types from Evolution API
export interface EvolutionMessage {
  id: string;
  key: {
    id: string;
    fromMe: boolean;
    remoteJid: string; // Phone number with @s.whatsapp.net or LID format
    remoteJidAlt?: string; // Alternative phone number (used when remoteJid is LID)
  };
  pushName: string; // Sender's WhatsApp name
  messageType: string; // 'conversation', 'extendedTextMessage', 'imageMessage', etc.
  message: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
    imageMessage?: {
      caption?: string;
      url?: string;
    };
    audioMessage?: {
      url?: string;
    };
    documentMessage?: {
      fileName?: string;
      url?: string;
    };
    stickerMessage?: {
      url?: string;
    };
    videoMessage?: {
      caption?: string;
      url?: string;
    };
    locationMessage?: {
      degreesLatitude?: number;
      degreesLongitude?: number;
    };
    contactMessage?: {
      displayName?: string;
    };
    reactionMessage?: {
      text?: string;
    };
  } | null;
  messageTimestamp: number;
  instanceId: string;
  source: string; // 'web', 'ios', 'android'
  MessageUpdate?: { status: string }[];
}

export interface EvolutionChat {
  id: string;
  remoteJid: string;
  pushName?: string;
  profilePicUrl?: string;
  lastMessage?: EvolutionMessage;
  unreadCount?: number;
}

export interface EvolutionInstance {
  id: string;
  name: string;
  connectionStatus: string;
  ownerJid: string;
  profileName: string;
  profilePicUrl: string;
  number: string;
  _count: {
    Message: number;
    Contact: number;
    Chat: number;
  };
}

// Transformed message for our app
export interface ChatMessage {
  id: string;
  message_key_id: string; // The key.id for fetching media
  whatsapp_number: string;
  sender_name: string;
  message_type: 'incoming' | 'outgoing';
  message_content: string;
  message_media_type: 'text' | 'image' | 'audio' | 'document' | 'video' | 'sticker' | 'other';
  media_url?: string; // Direct URL if available
  timestamp: number;
  created_at: string;
  status?: string; // 'sent', 'delivered', 'read'
  is_from_bot: boolean;
}

export interface GroupedConversation {
  whatsapp_number: string;
  contact_name: string;
  profile_pic?: string;
  messages: ChatMessage[];
  last_message: ChatMessage;
  unread_count: number;
}

/**
 * Extract phone number from WhatsApp JID
 * Handles both standard format (971xxx@s.whatsapp.net) and LID format (xxx@lid)
 */
export function extractPhoneNumber(jid: string, altJid?: string): string {
  // If this is a LID format and we have an alternative JID, use that
  if (jid.includes('@lid') && altJid) {
    return altJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  }
  // Handle LID format without alternative (shouldn't happen but just in case)
  if (jid.includes('@lid')) {
    return jid.replace('@lid', '');
  }
  return jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
}

/**
 * Extract message content from Evolution message object
 */
export function extractMessageContent(message: EvolutionMessage['message'] | null | undefined): {
  content: string;
  mediaType: ChatMessage['message_media_type'];
  mediaUrl?: string;
} {
  // Handle null or undefined message
  if (!message) {
    return { content: '', mediaType: 'other' };
  }

  if (message.conversation) {
    return { content: message.conversation, mediaType: 'text' };
  }
  if (message.extendedTextMessage?.text) {
    return { content: message.extendedTextMessage.text, mediaType: 'text' };
  }
  if (message.imageMessage) {
    return {
      content: message.imageMessage.caption || '',
      mediaType: 'image',
      mediaUrl: message.imageMessage.url
    };
  }
  if (message.audioMessage) {
    return {
      content: '',
      mediaType: 'audio',
      mediaUrl: message.audioMessage.url
    };
  }
  if (message.documentMessage) {
    return {
      content: message.documentMessage.fileName || 'مستند',
      mediaType: 'document',
      mediaUrl: message.documentMessage.url
    };
  }
  if (message.videoMessage) {
    return {
      content: message.videoMessage?.caption || '',
      mediaType: 'video',
      mediaUrl: message.videoMessage.url
    };
  }
  if (message.stickerMessage) {
    return {
      content: '',
      mediaType: 'sticker',
      mediaUrl: message.stickerMessage.url
    };
  }
  if (message.locationMessage) {
    const lat = message.locationMessage.degreesLatitude;
    const lng = message.locationMessage.degreesLongitude;
    return {
      content: `📍 ${lat?.toFixed(4)}, ${lng?.toFixed(4)}`,
      mediaType: 'other'
    };
  }
  if (message.contactMessage) {
    return {
      content: `👤 ${message.contactMessage.displayName || 'جهة اتصال'}`,
      mediaType: 'other'
    };
  }
  if (message.reactionMessage) {
    return { content: message.reactionMessage?.text || '👍', mediaType: 'other' };
  }
  return { content: '📎 مرفق', mediaType: 'other' };
}

/**
 * Get message status from MessageUpdate array
 */
export function getMessageStatus(updates?: { status: string }[]): string {
  if (!updates || updates.length === 0) return 'sent';
  const lastUpdate = updates[updates.length - 1];
  switch (lastUpdate.status) {
    case 'READ': return 'read';
    case 'DELIVERY_ACK': return 'delivered';
    case 'SERVER_ACK': return 'sent';
    default: return 'sent';
  }
}

/**
 * Fetch bot (AI) messages from n8n_chat_histories
 * Returns a Map of session_id -> Set of message contents
 */
export async function fetchBotMessages(): Promise<Map<string, Set<string>>> {
  // Check cache
  if (Date.now() - cacheTimestamp < CACHE_DURATION && botMessagesCache.size > 0) {
    return botMessagesCache;
  }

  try {
    const { data, error } = await supabase
      .from('n8n_chat_histories')
      .select('session_id, message')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Error fetching bot messages:', error);
      return botMessagesCache;
    }

    const newCache = new Map<string, Set<string>>();

    data?.forEach(row => {
      // Only AI messages (bot responses)
      if (row.message?.type === 'ai' && row.message?.content) {
        const sessionId = row.session_id;
        const content = normalizeMessageContent(row.message.content);

        if (!newCache.has(sessionId)) {
          newCache.set(sessionId, new Set());
        }
        newCache.get(sessionId)!.add(content);
      }
    });

    botMessagesCache = newCache;
    cacheTimestamp = Date.now();

    return newCache;
  } catch (error) {
    console.error('Error in fetchBotMessages:', error);
    return botMessagesCache;
  }
}

/**
 * Normalize message content for comparison
 */
function normalizeMessageContent(content: string): string {
  return content
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .substring(0, 100); // First 100 chars for comparison
}

/**
 * Check if message content matches bot messages from n8n_chat_histories
 */
export function checkIfBotMessage(
  content: string,
  sessionId: string,
  botMessages: Map<string, Set<string>>
): boolean {
  const normalizedContent = normalizeMessageContent(content);
  const sessionBotMessages = botMessages.get(sessionId);

  if (!sessionBotMessages) return false;

  // Check if any bot message starts with the same content
  for (const botContent of sessionBotMessages) {
    if (botContent.startsWith(normalizedContent) || normalizedContent.startsWith(botContent)) {
      return true;
    }
  }

  return false;
}

/**
 * Conversation log from Supabase
 */
interface ConversationLog {
  id: string;
  whatsapp_number: string;
  patient_id: string | null;
  message_type: 'incoming' | 'outgoing';
  message_content: string;
  source_instance: string;
  created_at: string;
  is_bot_question: boolean;
  question_type: string;
  resolved: boolean;
}

/**
 * N8N Chat History message
 */
interface N8NChatHistory {
  id: number;
  session_id: string;
  message: {
    type: 'ai' | 'human' | 'tool';
    content: string;
  };
  created_at: string;
}

/**
 * Get all unique conversation phone numbers from Supabase
 * This includes conversations that might not be in today's Evolution API data
 */
export async function fetchAllConversationNumbers(): Promise<Set<string>> {
  const phoneNumbers = new Set<string>();

  try {
    // Fetch from n8n_chat_histories
    const { data: chatHistories, error: chatError } = await supabase
      .from('n8n_chat_histories')
      .select('session_id')
      .order('created_at', { ascending: false });

    if (!chatError && chatHistories) {
      chatHistories.forEach(row => {
        if (row.session_id) {
          phoneNumbers.add(row.session_id);
        }
      });
    }

    // Fetch from conversation_logs
    const { data: convLogs, error: convError } = await supabase
      .from('conversation_logs')
      .select('whatsapp_number')
      .order('created_at', { ascending: false });

    if (!convError && convLogs) {
      convLogs.forEach(row => {
        if (row.whatsapp_number) {
          phoneNumbers.add(row.whatsapp_number);
        }
      });
    }

    console.log(`Found ${phoneNumbers.size} unique conversation numbers from Supabase`);
    return phoneNumbers;
  } catch (error) {
    console.error('Error fetching conversation numbers:', error);
    return phoneNumbers;
  }
}

/**
 * Fetch conversation messages from Supabase for a specific phone number
 * Combines data from n8n_chat_histories and conversation_logs
 */
export async function fetchSupabaseMessages(phoneNumber: string): Promise<ChatMessage[]> {
  const messages: ChatMessage[] = [];

  try {
    // Fetch from n8n_chat_histories
    const { data: chatHistories, error: chatError } = await supabase
      .from('n8n_chat_histories')
      .select('*')
      .eq('session_id', phoneNumber)
      .order('created_at', { ascending: true });

    if (!chatError && chatHistories) {
      chatHistories.forEach((row: N8NChatHistory) => {
        if (row.message?.content && row.message.type !== 'tool') {
          const isAI = row.message.type === 'ai';
          const isHuman = row.message.type === 'human';

          // Extract actual user message from human type (remove metadata)
          let content = row.message.content;
          if (isHuman && content.includes('User Message:')) {
            // Extract message between "User Message:" and "---" or end of string
            const startIndex = content.indexOf('User Message:') + 'User Message:'.length;
            const endIndex = content.indexOf('\n---');
            if (endIndex > startIndex) {
              content = content.substring(startIndex, endIndex).trim();
            } else {
              content = content.substring(startIndex).trim();
            }
          }

          // Skip tool calls and empty messages
          if (!content || content.includes('Calling ') || content.startsWith('{')) {
            return;
          }

          messages.push({
            id: `n8n-${row.id}`,
            message_key_id: `n8n-${row.id}`,
            whatsapp_number: phoneNumber,
            sender_name: isHuman ? phoneNumber : 'AI Assistant',
            message_type: isAI ? 'outgoing' : 'incoming',
            message_content: content,
            message_media_type: 'text',
            timestamp: new Date(row.created_at).getTime(),
            created_at: row.created_at,
            status: 'read',
            is_from_bot: isAI,
          });
        }
      });
    }

    // Fetch from conversation_logs (these are bot outgoing messages)
    const { data: convLogs, error: convError } = await supabase
      .from('conversation_logs')
      .select('*')
      .eq('whatsapp_number', phoneNumber)
      .order('created_at', { ascending: true });

    if (!convError && convLogs) {
      convLogs.forEach((row: ConversationLog) => {
        // Check if this message already exists (avoid duplicates)
        const exists = messages.some(m =>
          normalizeMessageContent(m.message_content) === normalizeMessageContent(row.message_content) &&
          Math.abs(new Date(m.created_at).getTime() - new Date(row.created_at).getTime()) < 60000 // Within 1 minute
        );

        if (!exists && row.message_content) {
          messages.push({
            id: `conv-${row.id}`,
            message_key_id: `conv-${row.id}`,
            whatsapp_number: phoneNumber,
            sender_name: row.message_type === 'incoming' ? phoneNumber : 'AI Assistant',
            message_type: row.message_type,
            message_content: row.message_content,
            message_media_type: 'text',
            timestamp: new Date(row.created_at).getTime(),
            created_at: row.created_at,
            status: row.resolved ? 'read' : 'delivered',
            is_from_bot: row.is_bot_question,
          });
        }
      });
    }

    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);

    return messages;
  } catch (error) {
    console.error('Error fetching Supabase messages:', error);
    return messages;
  }
}

/**
 * Detect if message is from bot/automated system (legacy - pattern based)
 * This is used as fallback when we can't check against database
 */
export function isFromBotPattern(message: EvolutionMessage): boolean {
  // Safety check
  if (!message || !message.key) return false;

  // Bot messages typically come from 'web' source when fromMe is true
  if (!message.key.fromMe) return false;

  const content = extractMessageContent(message.message).content.toLowerCase();

  // Common bot message patterns
  const botPatterns = [
    'أهلاً',
    'مرحبا',
    'شكراً لتواصلك',
    'يسعدنا تذكيرك',
    'تم حجز موعدك',
    'تم تأكيد',
    'تم إلغاء',
    'للتأكيد رد بـ',
    'أنا موجودة لو عندك',
    'كيف أقدر أساعدك',
  ];

  return botPatterns.some(pattern => content.includes(pattern));
}

/**
 * Detect if message is from bot/automated system
 * Now just a simple check - actual bot detection happens in fetchGroupedConversations
 */
export function isFromBot(message: EvolutionMessage): boolean {
  // Safety check - incoming messages are never from bot
  if (!message || !message.key || !message.key.fromMe) return false;

  // Default to pattern-based detection (will be overridden in fetchGroupedConversations)
  return isFromBotPattern(message);
}

/**
 * Transform Evolution API message to our ChatMessage format
 */
export function transformMessage(msg: EvolutionMessage): ChatMessage {
  const { content, mediaType, mediaUrl } = extractMessageContent(msg.message);

  // Safely get timestamp (default to current time if missing)
  const timestamp = (msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000;

  // Safely extract remoteJid - use remoteJidAlt for LID format messages
  const remoteJid = msg.key?.remoteJid || '';
  const remoteJidAlt = msg.key?.remoteJidAlt;

  // Get phone number - handles both standard and LID formats
  const phoneNumber = extractPhoneNumber(remoteJid, remoteJidAlt);

  return {
    id: msg.id || `msg-${Date.now()}`,
    message_key_id: msg.key?.id || '',
    whatsapp_number: phoneNumber,
    sender_name: msg.pushName || phoneNumber || 'Unknown',
    message_type: msg.key?.fromMe ? 'outgoing' : 'incoming',
    message_content: content,
    message_media_type: mediaType,
    media_url: mediaUrl,
    timestamp,
    created_at: new Date(timestamp).toISOString(),
    status: getMessageStatus(msg.MessageUpdate),
    is_from_bot: isFromBot(msg),
  };
}

/**
 * Fetch instances from Evolution API
 */
export async function fetchInstances(): Promise<EvolutionInstance[]> {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch instances: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching instances:', error);
    return [];
  }
}

/**
 * Fetch messages from Evolution API
 */
export async function fetchMessages(
  instanceName: string = 'elite-shahd',
  options: {
    page?: number;
    limit?: number;
    fromMe?: boolean;
  } = {}
): Promise<{ messages: EvolutionMessage[]; total: number; pages: number }> {
  try {
    const { page = 1, limit = 100, fromMe } = options;

    const whereClause: Record<string, unknown> = {};
    if (fromMe !== undefined) {
      whereClause.key = { fromMe };
    }

    const response = await fetch(`${EVOLUTION_API_URL}/chat/findMessages/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        where: whereClause,
        page,
        limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.status}`);
    }

    const data = await response.json();

    // Handle different response structures from Evolution API
    let messages: EvolutionMessage[] = [];

    if (data.messages?.records) {
      messages = data.messages.records;
    } else if (Array.isArray(data.messages)) {
      messages = data.messages;
    } else if (Array.isArray(data)) {
      messages = data;
    }

    // Filter out any invalid messages
    messages = messages.filter((msg): msg is EvolutionMessage =>
      Boolean(msg && typeof msg === 'object' && msg.key && msg.key.remoteJid)
    );

    console.log(`Fetched ${messages.length} valid messages from Evolution API`);

    return {
      messages,
      total: data.messages?.total || messages.length,
      pages: data.messages?.pages || 1,
    };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { messages: [], total: 0, pages: 0 };
  }
}

/**
 * Fetch all messages and group by conversation
 * Now includes ALL conversations from Supabase (n8n_chat_histories + conversation_logs)
 * merged with Evolution API messages
 */
export async function fetchGroupedConversations(
  instanceName: string = 'elite-shahd',
  limit: number = 1000
): Promise<GroupedConversation[]> {
  try {
    // Fetch Evolution API messages, bot messages, and all conversation numbers in parallel
    const [{ messages: rawMessages }, botMessages, allConversationNumbers] = await Promise.all([
      fetchMessages(instanceName, { limit }),
      fetchBotMessages(),
      fetchAllConversationNumbers()
    ]);

    // Transform and group Evolution API messages
    const messagesMap = new Map<string, ChatMessage[]>();
    const contactNames = new Map<string, string>();
    const processedPhones = new Set<string>();

    rawMessages.forEach(msg => {
      // Skip invalid messages (missing key or remoteJid)
      if (!msg || !msg.key || !msg.key.remoteJid) {
        console.warn('Skipping invalid message:', msg?.id);
        return;
      }

      // Skip group messages (but not LID messages which are individual chats)
      if (msg.key.remoteJid.includes('@g.us')) return;

      // For LID messages, ensure we have remoteJidAlt to get the real phone number
      if (msg.key.remoteJid.includes('@lid') && !msg.key.remoteJidAlt) {
        console.warn('Skipping LID message without remoteJidAlt:', msg?.id);
        return;
      }

      // Skip messages with empty content
      const transformed = transformMessage(msg);
      if (!transformed.message_content && transformed.message_media_type === 'other') {
        return; // Skip empty messages
      }

      const phone = transformed.whatsapp_number;
      processedPhones.add(phone);

      // Check if outgoing message is from bot by comparing with n8n_chat_histories
      if (transformed.message_type === 'outgoing') {
        const isBotMessage = checkIfBotMessage(
          transformed.message_content,
          phone,
          botMessages
        );
        transformed.is_from_bot = isBotMessage;
      }

      if (!messagesMap.has(phone)) {
        messagesMap.set(phone, []);
      }
      messagesMap.get(phone)!.push(transformed);

      // Store contact name (prefer incoming message names as they're from the contact)
      if (!msg.key.fromMe && msg.pushName) {
        contactNames.set(phone, msg.pushName);
      }
    });

    // Fetch messages for conversations that are in Supabase but not in Evolution API
    const missingPhones = Array.from(allConversationNumbers).filter(
      phone => !processedPhones.has(phone)
    );

    console.log(`Found ${missingPhones.length} conversations in Supabase not in Evolution API`);

    // Fetch Supabase messages for missing conversations (in batches)
    const batchSize = 10;
    for (let i = 0; i < missingPhones.length; i += batchSize) {
      const batch = missingPhones.slice(i, i + batchSize);
      const batchPromises = batch.map(phone => fetchSupabaseMessages(phone));
      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach((messages, index) => {
        const phone = batch[index];
        if (messages.length > 0) {
          messagesMap.set(phone, messages);
        }
      });
    }

    // Also merge Supabase messages into existing Evolution API conversations
    // This ensures we have complete message history
    for (const phone of processedPhones) {
      const supabaseMessages = await fetchSupabaseMessages(phone);
      const existingMessages = messagesMap.get(phone) || [];

      // Merge messages, avoiding duplicates
      supabaseMessages.forEach(sbMsg => {
        const exists = existingMessages.some(m =>
          normalizeMessageContent(m.message_content) === normalizeMessageContent(sbMsg.message_content) &&
          Math.abs(m.timestamp - sbMsg.timestamp) < 60000 // Within 1 minute
        );

        if (!exists) {
          existingMessages.push(sbMsg);
        }
      });

      // Re-sort after merging
      existingMessages.sort((a, b) => a.timestamp - b.timestamp);
      messagesMap.set(phone, existingMessages);
    }

    // Build grouped conversations
    const grouped: GroupedConversation[] = [];

    messagesMap.forEach((messages, phone) => {
      if (messages.length === 0) return;

      // Sort messages by timestamp (oldest first)
      messages.sort((a, b) => a.timestamp - b.timestamp);

      const lastMessage = messages[messages.length - 1];
      const unreadCount = messages.filter(m =>
        m.message_type === 'incoming' && m.status !== 'read'
      ).length;

      grouped.push({
        whatsapp_number: phone,
        contact_name: contactNames.get(phone) || phone,
        messages,
        last_message: lastMessage,
        unread_count: unreadCount,
      });
    });

    // Sort by last message time (newest first)
    grouped.sort((a, b) => b.last_message.timestamp - a.last_message.timestamp);

    console.log(`Total conversations: ${grouped.length}`);

    return grouped;
  } catch (error) {
    console.error('Error fetching grouped conversations:', error);
    return [];
  }
}

/**
 * Fetch chats list from Evolution API
 */
export async function fetchChats(instanceName: string = 'elite-shahd'): Promise<EvolutionChat[]> {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/chat/findChats/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chats: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
}

/**
 * Fetch media (image/audio/document) as base64 from Evolution API
 */
export async function fetchMediaBase64(
  instanceName: string,
  messageId: string,
  mediaType: 'image' | 'audio' | 'video' | 'document' | 'sticker'
): Promise<{ base64: string; mimetype: string } | null> {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          key: {
            id: messageId
          }
        },
        convertToMp4: mediaType === 'video'
      }),
    });

    if (!response.ok) {
      console.error(`Failed to fetch media: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return {
      base64: data.base64 || '',
      mimetype: data.mimetype || 'application/octet-stream'
    };
  } catch (error) {
    console.error('Error fetching media:', error);
    return null;
  }
}

/**
 * Get instance statistics
 */
export async function getInstanceStats(instanceName: string = 'elite-shahd'): Promise<{
  totalMessages: number;
  totalContacts: number;
  totalChats: number;
  connectionStatus: string;
  profileName: string;
  phoneNumber: string;
} | null> {
  try {
    const instances = await fetchInstances();
    const instance = instances.find(i => i.name === instanceName);

    if (!instance) return null;

    return {
      totalMessages: instance._count.Message,
      totalContacts: instance._count.Contact,
      totalChats: instance._count.Chat,
      connectionStatus: instance.connectionStatus,
      profileName: instance.profileName,
      phoneNumber: instance.number,
    };
  } catch (error) {
    console.error('Error getting instance stats:', error);
    return null;
  }
}
