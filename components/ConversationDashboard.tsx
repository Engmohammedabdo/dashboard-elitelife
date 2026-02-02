'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  MessageSquare,
  Clock,
  AlertCircle,
  Phone,
  Search,
  User,
  CheckCheck,
  Check,
  Calendar,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  X,
  ExternalLink,
  Copy,
  Loader2,
  Bot,
  UserCircle,
  Image as ImageIcon,
  FileAudio,
  FileText,
  Wifi,
  WifiOff,
  Video,
  Play,
  Pause,
  Download,
  FileIcon,
  Maximize2
} from 'lucide-react';
import type { Patient } from '@/types/database';
import { supabase } from '@/lib/supabase';
import {
  fetchGroupedConversations,
  getInstanceStats,
  fetchMediaBase64,
  type GroupedConversation,
  type ChatMessage
} from '@/lib/evolution-api';

interface ConversationAnalytics {
  total_conversations: number;
  total_messages: number;
  incoming_messages: number;
  outgoing_messages: number;
  connection_status: string;
  instance_name: string;
}

// Media Message Component
function MediaMessage({
  msg,
  mediaCache,
  loadingMedia,
  playingAudio,
  onLoadMedia,
  onToggleAudio,
  onExpandImage,
  onDownload,
  isRTL
}: {
  msg: ChatMessage;
  mediaCache: Map<string, { base64: string; mimetype: string }>;
  loadingMedia: Set<string>;
  playingAudio: string | null;
  onLoadMedia: () => void;
  onToggleAudio: (base64: string, mimetype: string) => void;
  onExpandImage: (media: { base64: string; mimetype: string }) => void;
  onDownload: (base64: string, mimetype: string, filename: string) => void;
  isRTL: boolean;
}) {
  const media = mediaCache.get(msg.message_key_id);
  const isLoading = loadingMedia.has(msg.message_key_id);
  const isPlaying = playingAudio === msg.message_key_id;

  // Auto-load media when component mounts
  useEffect(() => {
    if (!media && !isLoading) {
      onLoadMedia();
    }
  }, [media, isLoading, onLoadMedia]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-100 rounded-lg min-w-[200px]">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        <span className="text-sm text-gray-500 ms-2">
          {isRTL ? 'جاري التحميل...' : 'Loading...'}
        </span>
      </div>
    );
  }

  if (!media) {
    return (
      <button
        onClick={onLoadMedia}
        className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        {msg.message_media_type === 'image' && <ImageIcon className="w-5 h-5 text-gray-500" />}
        {msg.message_media_type === 'audio' && <FileAudio className="w-5 h-5 text-gray-500" />}
        {msg.message_media_type === 'video' && <Video className="w-5 h-5 text-gray-500" />}
        {msg.message_media_type === 'document' && <FileIcon className="w-5 h-5 text-gray-500" />}
        {msg.message_media_type === 'sticker' && <ImageIcon className="w-5 h-5 text-gray-500" />}
        <span className="text-sm text-gray-600">
          {isRTL ? 'اضغط للتحميل' : 'Click to load'}
        </span>
      </button>
    );
  }

  // Render based on media type
  switch (msg.message_media_type) {
    case 'image':
    case 'sticker':
      return (
        <div className="relative group">
          <img
            src={`data:${media.mimetype};base64,${media.base64}`}
            alt="Media"
            className={`rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${
              msg.message_media_type === 'sticker' ? 'max-w-[150px]' : 'max-w-[280px]'
            }`}
            onClick={() => onExpandImage(media)}
          />
          <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={() => onExpandImage(media)}
              className="p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDownload(media.base64, media.mimetype, `image-${msg.id}.${media.mimetype.split('/')[1]}`)}
              className="p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      );

    case 'audio':
      return (
        <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl min-w-[250px]">
          <button
            onClick={() => onToggleAudio(media.base64, media.mimetype)}
            className={`p-3 rounded-full transition-colors ${
              isPlaying ? 'bg-primary text-white' : 'bg-white text-primary hover:bg-gray-50'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <div className="flex-1">
            <div className="h-1 bg-gray-300 rounded-full overflow-hidden">
              <div
                className={`h-full bg-primary transition-all duration-300 ${
                  isPlaying ? 'animate-pulse' : ''
                }`}
                style={{ width: isPlaying ? '60%' : '0%' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isRTL ? 'رسالة صوتية' : 'Voice message'}
            </p>
          </div>
          <button
            onClick={() => onDownload(media.base64, media.mimetype, `audio-${msg.id}.${media.mimetype.split('/')[1] || 'ogg'}`)}
            className="p-2 hover:bg-gray-200 rounded-full text-gray-500"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      );

    case 'video':
      return (
        <div className="relative">
          <video
            src={`data:${media.mimetype};base64,${media.base64}`}
            controls
            className="rounded-lg max-w-[300px]"
          />
          <button
            onClick={() => onDownload(media.base64, media.mimetype, `video-${msg.id}.${media.mimetype.split('/')[1] || 'mp4'}`)}
            className="absolute top-2 end-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      );

    case 'document':
      return (
        <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl min-w-[200px]">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {msg.message_content || (isRTL ? 'مستند' : 'Document')}
            </p>
            <p className="text-xs text-gray-500">{media.mimetype.split('/')[1]?.toUpperCase()}</p>
          </div>
          <button
            onClick={() => onDownload(media.base64, media.mimetype, msg.message_content || `document-${msg.id}`)}
            className="p-2 hover:bg-gray-200 rounded-full text-primary"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      );

    default:
      return null;
  }
}

export default function ConversationDashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<GroupedConversation[]>([]);
  const [allowedNumbers, setAllowedNumbers] = useState<Set<string>>(new Set());
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('checking');
  const [instanceStats, setInstanceStats] = useState<{
    totalMessages: number;
    totalContacts: number;
    profileName: string;
  } | null>(null);

  // Media state
  const [mediaCache, setMediaCache] = useState<Map<string, { base64: string; mimetype: string }>>(new Map());
  const [loadingMedia, setLoadingMedia] = useState<Set<string>>(new Set());
  const [expandedImage, setExpandedImage] = useState<{ base64: string; mimetype: string } | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  // Scroll to bottom when selecting chat
  useEffect(() => {
    if (selectedChat) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [selectedChat]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get allowed numbers from n8n_chat_histories
      const { data: chatHistories, error: chatError } = await supabase
        .from('n8n_chat_histories')
        .select('session_id')
        .order('created_at', { ascending: false });

      if (chatError) {
        console.error('Error fetching chat histories:', chatError);
      }

      // Extract unique phone numbers
      const numbers = new Set<string>();
      chatHistories?.forEach(ch => {
        if (ch.session_id) {
          numbers.add(ch.session_id);
        }
      });
      setAllowedNumbers(numbers);

      // 2. Fetch patients for matching
      const { data: patientsData } = await supabase
        .from('patients')
        .select('*');
      if (patientsData) {
        setPatients(patientsData);
      }

      // 3. Get instance stats
      const stats = await getInstanceStats('elite-shahd');
      if (stats) {
        setConnectionStatus(stats.connectionStatus);
        setInstanceStats({
          totalMessages: stats.totalMessages,
          totalContacts: stats.totalContacts,
          profileName: stats.profileName,
        });
      }

      // 4. Fetch conversations from Evolution API
      const allConversations = await fetchGroupedConversations('elite-shahd', 1000);

      // 5. Filter to only show numbers from n8n_chat_histories
      const filteredConversations = allConversations.filter(conv =>
        numbers.has(conv.whatsapp_number)
      );

      setConversations(filteredConversations);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get patient by phone number
  const getPatientByPhone = (phone: string): Patient | undefined => {
    const cleanPhone = phone.replace(/\D/g, '');
    return patients.find(p => {
      const patientPhone = p.whatsapp_number?.replace(/\D/g, '') || '';
      return patientPhone.includes(cleanPhone) || cleanPhone.includes(patientPhone);
    });
  };

  // Calculate analytics
  const analytics: ConversationAnalytics = useMemo(() => {
    let incoming = 0;
    let outgoing = 0;

    conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        if (msg.message_type === 'incoming') incoming++;
        else outgoing++;
      });
    });

    return {
      total_conversations: conversations.length,
      total_messages: incoming + outgoing,
      incoming_messages: incoming,
      outgoing_messages: outgoing,
      connection_status: connectionStatus,
      instance_name: 'elite-shahd',
    };
  }, [conversations, connectionStatus]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const matchesSearch = searchQuery === '' ||
        conv.whatsapp_number.includes(searchQuery) ||
        conv.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.messages.some(m => m.message_content.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilter = filterTab === 'all' || conv.unread_count > 0;

      return matchesSearch && matchesFilter;
    });
  }, [conversations, searchQuery, filterTab]);

  // Get selected conversation
  const selectedConversation = useMemo(() => {
    return conversations.find(g => g.whatsapp_number === selectedChat);
  }, [conversations, selectedChat]);

  // Format time for chat list
  const formatChatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (days === 1) {
      return isRTL ? 'أمس' : 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
        day: 'numeric',
        month: 'numeric'
      });
    }
  };

  // Format message time
  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group messages by date
  const messagesByDate = useMemo(() => {
    if (!selectedConversation) return [];

    const groups: { date: string; label: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';

    selectedConversation.messages.forEach(msg => {
      const msgDateRaw = new Date(msg.timestamp);
      const dateKey = msgDateRaw.toDateString();

      if (dateKey !== currentDate) {
        currentDate = dateKey;
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        let label = '';
        if (dateKey === today) {
          label = isRTL ? 'اليوم' : 'Today';
        } else if (dateKey === yesterday) {
          label = isRTL ? 'أمس' : 'Yesterday';
        } else {
          label = msgDateRaw.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }

        groups.push({ date: dateKey, label, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  }, [selectedConversation, locale, isRTL]);

  // Copy phone number
  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
  };

  // Load media for a message
  const loadMedia = async (msg: ChatMessage) => {
    if (mediaCache.has(msg.message_key_id) || loadingMedia.has(msg.message_key_id)) {
      return;
    }

    setLoadingMedia(prev => new Set(prev).add(msg.message_key_id));

    try {
      const mediaType = msg.message_media_type as 'image' | 'audio' | 'video' | 'document' | 'sticker';
      const media = await fetchMediaBase64('elite-shahd', msg.message_key_id, mediaType);

      if (media) {
        setMediaCache(prev => new Map(prev).set(msg.message_key_id, media));
      }
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoadingMedia(prev => {
        const next = new Set(prev);
        next.delete(msg.message_key_id);
        return next;
      });
    }
  };

  // Toggle audio playback
  const toggleAudio = (messageId: string, base64: string, mimetype: string) => {
    const currentAudio = audioRefs.current.get(messageId);

    if (playingAudio === messageId && currentAudio) {
      currentAudio.pause();
      setPlayingAudio(null);
      return;
    }

    // Pause any currently playing audio
    if (playingAudio) {
      const prevAudio = audioRefs.current.get(playingAudio);
      if (prevAudio) {
        prevAudio.pause();
      }
    }

    // Create or play audio
    if (!currentAudio) {
      const audio = new Audio(`data:${mimetype};base64,${base64}`);
      audio.onended = () => setPlayingAudio(null);
      audioRefs.current.set(messageId, audio);
      audio.play();
    } else {
      currentAudio.play();
    }
    setPlayingAudio(messageId);
  };

  // Download media
  const downloadMedia = (base64: string, mimetype: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:${mimetype};base64,${base64}`;
    link.download = filename;
    link.click();
  };

  // Get display name for conversation
  const getDisplayName = (conv: GroupedConversation): string => {
    const patient = getPatientByPhone(conv.whatsapp_number);
    return patient?.name || conv.contact_name || conv.whatsapp_number;
  };

  // Get message status icon
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      default:
        return <Check className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get media type icon
  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'audio':
        return <FileAudio className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-2rem)]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{isRTL ? 'جاري تحميل المحادثات...' : 'Loading conversations...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        {/* Connection Status */}
        <div className={`rounded-xl p-4 border shadow-sm ${
          connectionStatus === 'open' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${connectionStatus === 'open' ? 'bg-emerald-500' : 'bg-red-500'}`}>
              {connectionStatus === 'open' ? (
                <Wifi className="w-5 h-5 text-white" />
              ) : (
                <WifiOff className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <p className={`text-sm font-bold ${connectionStatus === 'open' ? 'text-emerald-700' : 'text-red-700'}`}>
                {connectionStatus === 'open' ? (isRTL ? 'متصل' : 'Connected') : (isRTL ? 'غير متصل' : 'Disconnected')}
              </p>
              <p className="text-xs text-gray-500">elite-shahd</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{analytics.total_conversations}</p>
              <p className="text-xs text-gray-500">{isRTL ? 'المحادثات' : 'Conversations'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{analytics.total_messages}</p>
              <p className="text-xs text-gray-500">{isRTL ? 'الرسائل' : 'Messages'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{analytics.incoming_messages}</p>
              <p className="text-xs text-gray-500">{isRTL ? 'واردة' : 'Incoming'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{analytics.outgoing_messages}</p>
              <p className="text-xs text-gray-500">{isRTL ? 'صادرة' : 'Outgoing'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex flex-1 bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200">
        {/* Chat List */}
        <div className={`w-[380px] flex flex-col border-${isRTL ? 'l' : 'r'} border-gray-200 bg-white`}>
          {/* Header */}
          <div className="p-4 bg-[#f0f2f5] border-b border-gray-200">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'ابحث عن محادثة...' : 'Search chats...'}
                className="w-full ps-10 pe-4 py-2.5 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border-0"
              />
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterTab === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {isRTL ? 'الكل' : 'All'}
              </button>
              <button
                onClick={() => setFilterTab('unread')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterTab === 'unread'
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {isRTL ? 'غير مقروء' : 'Unread'}
              </button>
              <span className="text-xs text-gray-400 ms-auto">
                {filteredConversations.length} {isRTL ? 'محادثة' : 'chats'}
              </span>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-center font-medium">
                  {isRTL ? 'لا توجد محادثات' : 'No conversations'}
                </p>
                <p className="text-sm text-center mt-2">
                  {isRTL ? 'المحادثات مع البوت ستظهر هنا' : 'Bot conversations will appear here'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.whatsapp_number}
                  onClick={() => {
                    setSelectedChat(conv.whatsapp_number);
                    setShowContactInfo(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 ${
                    selectedChat === conv.whatsapp_number
                      ? 'bg-[#f0f2f5]'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                      {getDisplayName(conv) !== conv.whatsapp_number ? (
                        <span className="text-lg font-semibold text-primary">
                          {getDisplayName(conv).charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <User className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {getDisplayName(conv)}
                      </h4>
                      <span className={`text-xs flex-shrink-0 ${
                        conv.unread_count > 0 ? 'text-primary font-semibold' : 'text-gray-400'
                      }`}>
                        {formatChatTime(conv.last_message.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {conv.last_message.message_type === 'outgoing' && (
                        getStatusIcon(conv.last_message.status)
                      )}
                      {getMediaIcon(conv.last_message.message_media_type)}
                      <p className="text-sm text-gray-500 truncate">
                        {conv.last_message.message_content.substring(0, 40)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5" dir="ltr">
                      +{conv.whatsapp_number}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col bg-[#efeae2]">
          {selectedChat && selectedConversation ? (
            <>
              {/* Chat Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] border-b border-gray-200 cursor-pointer"
                onClick={() => setShowContactInfo(!showContactInfo)}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                  {getDisplayName(selectedConversation) !== selectedConversation.whatsapp_number ? (
                    <span className="text-base font-semibold text-primary">
                      {getDisplayName(selectedConversation).charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {getDisplayName(selectedConversation)}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedConversation.messages.length} {isRTL ? 'رسالة' : 'messages'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyPhone(selectedConversation.whatsapp_number);
                    }}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    title={isRTL ? 'نسخ الرقم' : 'Copy number'}
                  >
                    <Copy className="w-5 h-5 text-gray-600" />
                  </button>
                  <a
                    href={`https://wa.me/${selectedConversation.whatsapp_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    title={isRTL ? 'فتح في واتساب' : 'Open in WhatsApp'}
                  >
                    <ExternalLink className="w-5 h-5 text-gray-600" />
                  </a>
                </div>
              </div>

              {/* Messages Area */}
              <div
                className="flex-1 overflow-y-auto p-4"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cfc4' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundColor: '#efeae2'
                }}
              >
                {messagesByDate.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {/* Date Divider */}
                    <div className="flex justify-center my-4">
                      <span className="px-4 py-1.5 bg-white/90 rounded-lg text-xs text-gray-600 shadow-sm font-medium">
                        {group.label}
                      </span>
                    </div>

                    {/* Messages */}
                    {group.messages.map((msg) => {
                      const isOutgoing = msg.message_type === 'outgoing';
                      const patient = getPatientByPhone(selectedConversation.whatsapp_number);

                      return (
                        <div
                          key={msg.id}
                          className={`flex mb-2 ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${
                              isOutgoing ? 'bg-[#d9fdd3]' : 'bg-white'
                            }`}
                          >
                            {/* Sender Label */}
                            <p className={`text-[10px] font-semibold mb-1 flex items-center gap-1 ${
                              isOutgoing ? 'text-emerald-600' : 'text-primary'
                            }`}>
                              {isOutgoing ? (
                                <>
                                  {msg.is_from_bot ? (
                                    <><Bot className="w-3 h-3" /> {isRTL ? 'المساعد الذكي' : 'AI Assistant'}</>
                                  ) : (
                                    <><UserCircle className="w-3 h-3" /> {isRTL ? 'الموظف' : 'Staff'}</>
                                  )}
                                </>
                              ) : (
                                <>{patient?.name || selectedConversation.contact_name}</>
                              )}
                            </p>

                            {/* Media Content */}
                            {msg.message_media_type !== 'text' && msg.message_media_type !== 'other' && (
                              <MediaMessage
                                msg={msg}
                                mediaCache={mediaCache}
                                loadingMedia={loadingMedia}
                                playingAudio={playingAudio}
                                onLoadMedia={() => loadMedia(msg)}
                                onToggleAudio={(base64, mimetype) => toggleAudio(msg.message_key_id, base64, mimetype)}
                                onExpandImage={(media) => setExpandedImage(media)}
                                onDownload={(base64, mimetype, filename) => downloadMedia(base64, mimetype, filename)}
                                isRTL={isRTL}
                              />
                            )}

                            {/* Message Content */}
                            {(msg.message_media_type === 'text' || msg.message_media_type === 'other' || msg.message_content) && (
                              <p className="text-[15px] text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                                {msg.message_media_type === 'text' || msg.message_media_type === 'other'
                                  ? msg.message_content
                                  : msg.message_content && <span className="block mt-1">{msg.message_content}</span>
                                }
                              </p>
                            )}

                            {/* Time and Status */}
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[11px] text-gray-500">
                                {formatMessageTime(msg.timestamp)}
                              </span>
                              {isOutgoing && getStatusIcon(msg.status)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* View Only Notice */}
              <div className="p-3 bg-[#f0f2f5] border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {isRTL ? 'وضع العرض فقط - لمتابعة المحادثات' : 'View mode - for monitoring conversations'}
                </p>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] text-center p-8">
              <div className="w-80 mb-8 opacity-40">
                <svg viewBox="0 0 303 172" className="w-full h-full">
                  <path
                    fill="#722F37"
                    d="M229.565 160.229c32.647-16.996 54.917-51.488 54.917-91.058C284.482 31.096 253.552.166 215.477.166c-28.136 0-52.325 16.848-63.073 40.989h-2.873c-10.749-24.14-34.937-40.99-63.073-40.99C48.383.166 17.453 31.097 17.453 69.17c0 39.57 22.271 74.063 54.919 91.059l.124-.066a91.026 91.026 0 0 0 38.04 11.622l.676.018h79.063l.677-.018a91.035 91.035 0 0 0 38.04-11.622l.573.066z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-light text-gray-700 mb-3">
                {isRTL ? 'لوحة متابعة المحادثات' : 'Conversation Monitor'}
              </h2>
              <p className="text-sm text-gray-500 max-w-md leading-relaxed">
                {isRTL
                  ? 'اختر محادثة من القائمة لعرض الرسائل ومتابعة تفاعل المرضى مع النظام'
                  : 'Select a conversation from the list to view messages and monitor patient interactions'}
              </p>
            </div>
          )}
        </div>

        {/* Contact Info Panel */}
        <AnimatePresence>
          {showContactInfo && selectedConversation && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={`bg-[#f0f2f5] border-${isRTL ? 'r' : 'l'} border-gray-200 flex flex-col overflow-hidden`}
            >
              <div className="p-4 bg-[#f0f2f5] flex items-center gap-4 border-b border-gray-200">
                <button
                  onClick={() => setShowContactInfo(false)}
                  className="p-2 hover:bg-gray-200 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
                <h3 className="font-semibold text-gray-800">
                  {isRTL ? 'معلومات جهة الاتصال' : 'Contact info'}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Profile */}
                <div className="p-8 text-center bg-white">
                  <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center mb-4">
                    {getDisplayName(selectedConversation) !== selectedConversation.whatsapp_number ? (
                      <span className="text-4xl font-semibold text-primary">
                        {getDisplayName(selectedConversation).charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <User className="w-14 h-14 text-primary" />
                    )}
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900">
                    {getDisplayName(selectedConversation)}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1" dir="ltr">
                    <Phone className="w-4 h-4" />
                    +{selectedConversation.whatsapp_number}
                  </p>
                </div>

                {/* Stats */}
                <div className="p-4 bg-white mt-2">
                  <p className="text-xs text-gray-500 uppercase font-medium mb-4">
                    {isRTL ? 'إحصائيات المحادثة' : 'Conversation Stats'}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-primary">{selectedConversation.messages.length}</p>
                      <p className="text-[10px] text-gray-500">{isRTL ? 'الإجمالي' : 'Total'}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-blue-600">
                        {selectedConversation.messages.filter(m => m.message_type === 'incoming').length}
                      </p>
                      <p className="text-[10px] text-gray-500">{isRTL ? 'واردة' : 'In'}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-emerald-600">
                        {selectedConversation.messages.filter(m => m.message_type === 'outgoing').length}
                      </p>
                      <p className="text-[10px] text-gray-500">{isRTL ? 'صادرة' : 'Out'}</p>
                    </div>
                  </div>
                </div>

                {/* Patient Info */}
                {(() => {
                  const patient = getPatientByPhone(selectedConversation.whatsapp_number);
                  if (!patient) return null;

                  return (
                    <div className="p-4 bg-white mt-2">
                      <p className="text-xs text-gray-500 uppercase font-medium mb-4">
                        {isRTL ? 'معلومات المريض' : 'Patient Info'}
                      </p>
                      <div className="space-y-4">
                        {patient.total_visits !== undefined && (
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {patient.total_visits} {isRTL ? 'زيارة' : 'visits'}
                              </p>
                              <p className="text-xs text-gray-500">{isRTL ? 'إجمالي الزيارات' : 'Total visits'}</p>
                            </div>
                          </div>
                        )}
                        {patient.reliability_score && (
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              patient.reliability_score === 'high'
                                ? 'bg-emerald-100'
                                : patient.reliability_score === 'low'
                                ? 'bg-red-100'
                                : 'bg-amber-100'
                            }`}>
                              {patient.reliability_score === 'high' ? (
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                              ) : patient.reliability_score === 'low' ? (
                                <TrendingDown className="w-5 h-5 text-red-600" />
                              ) : (
                                <Activity className="w-5 h-5 text-amber-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {patient.reliability_score === 'high'
                                  ? (isRTL ? 'عالية' : 'High')
                                  : patient.reliability_score === 'low'
                                  ? (isRTL ? 'منخفضة' : 'Low')
                                  : (isRTL ? 'متوسطة' : 'Medium')}
                              </p>
                              <p className="text-xs text-gray-500">{isRTL ? 'الموثوقية' : 'Reliability'}</p>
                            </div>
                          </div>
                        )}
                        {patient.google_review_given && (
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <Star className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {isRTL ? 'تم التقييم' : 'Reviewed'}
                              </p>
                              <p className="text-xs text-gray-500">{isRTL ? 'تقييم Google' : 'Google Review'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Quick Actions */}
                <div className="p-4 bg-white mt-2">
                  <a
                    href={`https://wa.me/${selectedConversation.whatsapp_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {isRTL ? 'فتح في واتساب' : 'Open in WhatsApp'}
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expanded Image Modal */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setExpandedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={`data:${expandedImage.mimetype};base64,${expandedImage.base64}`}
                alt="Expanded"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
              <div className="absolute top-4 end-4 flex gap-2">
                <button
                  onClick={() => downloadMedia(expandedImage.base64, expandedImage.mimetype, `image-${Date.now()}.${expandedImage.mimetype.split('/')[1]}`)}
                  className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setExpandedImage(null)}
                  className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
