/**
 * Evolution API Service
 * For fetching WhatsApp messages from Evolution API
 */

const EVOLUTION_API_URL = 'https://evo.pyramedia.info';
const EVOLUTION_API_KEY = 'D765376E8FF7-4964-A295-BDDA9B2186E9';

// Message types from Evolution API
export interface EvolutionMessage {
  id: string;
  key: {
    id: string;
    fromMe: boolean;
    remoteJid: string; // Phone number with @s.whatsapp.net
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
 */
export function extractPhoneNumber(jid: string): string {
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
 * Detect if message is from bot/automated system
 */
export function isFromBot(message: EvolutionMessage): boolean {
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
 * Transform Evolution API message to our ChatMessage format
 */
export function transformMessage(msg: EvolutionMessage): ChatMessage {
  const { content, mediaType, mediaUrl } = extractMessageContent(msg.message);

  // Safely get timestamp (default to current time if missing)
  const timestamp = (msg.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000;

  // Safely extract remoteJid
  const remoteJid = msg.key?.remoteJid || '';

  return {
    id: msg.id || `msg-${Date.now()}`,
    message_key_id: msg.key?.id || '',
    whatsapp_number: extractPhoneNumber(remoteJid),
    sender_name: msg.pushName || extractPhoneNumber(remoteJid) || 'Unknown',
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
 */
export async function fetchGroupedConversations(
  instanceName: string = 'elite-shahd',
  limit: number = 500
): Promise<GroupedConversation[]> {
  try {
    // Fetch messages
    const { messages: rawMessages } = await fetchMessages(instanceName, { limit });

    // Transform and group messages
    const messagesMap = new Map<string, ChatMessage[]>();
    const contactNames = new Map<string, string>();

    rawMessages.forEach(msg => {
      // Skip invalid messages (missing key or remoteJid)
      if (!msg || !msg.key || !msg.key.remoteJid) {
        console.warn('Skipping invalid message:', msg?.id);
        return;
      }

      // Skip group messages
      if (msg.key.remoteJid.includes('@g.us')) return;

      // Skip messages with empty content
      const transformed = transformMessage(msg);
      if (!transformed.message_content && transformed.message_media_type === 'other') {
        return; // Skip empty messages
      }

      const phone = transformed.whatsapp_number;

      if (!messagesMap.has(phone)) {
        messagesMap.set(phone, []);
      }
      messagesMap.get(phone)!.push(transformed);

      // Store contact name (prefer incoming message names as they're from the contact)
      if (!msg.key.fromMe && msg.pushName) {
        contactNames.set(phone, msg.pushName);
      }
    });

    // Build grouped conversations
    const grouped: GroupedConversation[] = [];

    messagesMap.forEach((messages, phone) => {
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
