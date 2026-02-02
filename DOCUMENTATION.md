# Elite Life Clinic Dashboard - Documentation

## Overview

A comprehensive bilingual (Arabic RTL / English LTR) clinic management dashboard built with modern web technologies. The system manages appointments, patients, doctors, WhatsApp conversations, and reliability scoring.

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | React framework with App Router |
| TypeScript | 5.x | Type-safe JavaScript |
| Tailwind CSS | 4.x | Utility-first CSS framework |
| Supabase | Latest | PostgreSQL database & authentication |
| next-intl | Latest | Internationalization (Arabic/English) |
| Framer Motion | Latest | Animations |
| Lucide React | Latest | Icon library |
| Evolution API | v2 | WhatsApp Business API integration |

---

## Project Structure

```
elitelife2/
├── app/
│   └── [locale]/                    # Locale-based routing (ar/en)
│       ├── layout.tsx               # Root layout with RTL support
│       ├── page.tsx                 # Dashboard (appointments)
│       ├── conversations/
│       │   └── page.tsx             # WhatsApp conversations
│       ├── patients/
│       │   └── page.tsx             # Patient management
│       ├── reliability/
│       │   └── page.tsx             # Reliability scoring
│       └── settings/
│           └── page.tsx             # Settings & doctors
│
├── components/
│   ├── AppointmentList.tsx          # Appointment list with filters
│   ├── AppointmentModal.tsx         # Appointment details modal
│   ├── Calendar.tsx                 # Interactive calendar
│   ├── ConversationDashboard.tsx    # WhatsApp-style chat interface
│   ├── DoctorCard.tsx               # Doctor display card
│   ├── DoctorFormModal.tsx          # Add/edit doctor form
│   ├── Header.tsx                   # App header with navigation
│   ├── LanguageSwitcher.tsx         # AR/EN language toggle
│   ├── PatientTimeline.tsx          # Patient history timeline
│   ├── ReliabilityClient.tsx        # Reliability page wrapper
│   ├── ReliabilityScoreReport.tsx   # Patient reliability analysis
│   ├── SelectedDayAppointments.tsx  # Day view appointments
│   ├── Sidebar.tsx                  # Navigation sidebar
│   ├── SidebarWrapper.tsx           # Sidebar client wrapper
│   └── StatsCards.tsx               # Dashboard statistics
│
├── lib/
│   ├── supabase.ts                  # Supabase client configuration
│   ├── evolution-api.ts             # Evolution API service
│   ├── navigation.ts                # Navigation utilities
│   └── utils.ts                     # Helper functions
│
├── i18n/
│   ├── routing.ts                   # Locale routing config
│   └── request.ts                   # Server-side i18n
│
├── messages/
│   ├── ar.json                      # Arabic translations
│   └── en.json                      # English translations
│
├── types/
│   └── database.ts                  # TypeScript interfaces
│
└── middleware.ts                    # Locale middleware
```

---

## Database Schema (Supabase)

### Tables

#### `doctors`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name_ar | text | Arabic name |
| name_en | text | English name |
| specialty_ar | text | Arabic specialty |
| specialty_en | text | English specialty |
| working_days | text[] | Array of working days |
| working_hours_start | time | Start time |
| working_hours_end | time | End time |
| is_active | boolean | Active status |
| created_at | timestamp | Creation date |

#### `appointments`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| patient_name | text | Patient's name |
| patient_phone | text | Phone number |
| patient_age | integer | Age |
| patient_gender | text | Gender (male/female) |
| service_name | text | Service name |
| service_category | text | Service category |
| service_duration | integer | Duration in minutes |
| service_price | decimal | Price |
| doctor_id | uuid | Foreign key to doctors |
| date | date | Appointment date |
| time | time | Appointment time |
| status | text | confirmed/pending/cancelled |
| payment_status | text | paid/unpaid/partial |
| payment_method | text | cash/card/transfer |
| attended | boolean | Attendance status |
| visit_notes | text | Notes |
| created_at | timestamp | Creation date |

#### `patients`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Patient name |
| whatsapp_number | text | WhatsApp number |
| age | integer | Age |
| gender | text | Gender |
| total_visits | integer | Total visit count |
| completed_visits | integer | Completed visits |
| cancelled_visits | integer | Cancelled visits |
| no_show_visits | integer | No-show count |
| reliability_score | text | high/medium/low |
| google_review_given | boolean | Review status |
| created_at | timestamp | Creation date |

#### `n8n_chat_histories`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| session_id | text | WhatsApp number (phone) |
| message | jsonb | Message content |
| created_at | timestamp | Creation date |

---

## Evolution API Integration

### Configuration

```typescript
// lib/evolution-api.ts
const EVOLUTION_API_URL = 'https://evo.pyramedia.info';
const EVOLUTION_API_KEY = 'D765376E8FF7-4964-A295-BDDA9B2186E9';
const INSTANCE_NAME = 'elite-shahd';
```

### Available Functions

#### `fetchInstances()`
Fetches all WhatsApp instances.

```typescript
const instances = await fetchInstances();
// Returns: EvolutionInstance[]
```

#### `fetchMessages(instanceName, options)`
Fetches messages from Evolution API.

```typescript
const { messages, total, pages } = await fetchMessages('elite-shahd', {
  page: 1,
  limit: 100,
  fromMe: undefined // true = outgoing, false = incoming, undefined = all
});
```

#### `fetchGroupedConversations(instanceName, limit)`
Fetches and groups messages by conversation.

```typescript
const conversations = await fetchGroupedConversations('elite-shahd', 500);
// Returns: GroupedConversation[]
```

#### `fetchMediaBase64(instanceName, messageId, mediaType)`
Fetches media content as base64.

```typescript
const media = await fetchMediaBase64('elite-shahd', 'message-key-id', 'image');
// Returns: { base64: string, mimetype: string } | null
```

#### `getInstanceStats(instanceName)`
Gets instance statistics.

```typescript
const stats = await getInstanceStats('elite-shahd');
// Returns: { totalMessages, totalContacts, totalChats, connectionStatus, profileName, phoneNumber }
```

### Interfaces

```typescript
interface EvolutionMessage {
  id: string;
  key: {
    id: string;
    fromMe: boolean;
    remoteJid: string;
  };
  pushName: string;
  messageType: string;
  message: {
    conversation?: string;
    extendedTextMessage?: { text: string };
    imageMessage?: { caption?: string; url?: string };
    audioMessage?: { url?: string };
    documentMessage?: { fileName?: string; url?: string };
    videoMessage?: { caption?: string; url?: string };
    stickerMessage?: { url?: string };
    locationMessage?: { degreesLatitude?: number; degreesLongitude?: number };
    contactMessage?: { displayName?: string };
    reactionMessage?: { text?: string };
  } | null;
  messageTimestamp: number;
  instanceId: string;
  source: string;
  MessageUpdate?: { status: string }[];
}

interface ChatMessage {
  id: string;
  message_key_id: string;
  whatsapp_number: string;
  sender_name: string;
  message_type: 'incoming' | 'outgoing';
  message_content: string;
  message_media_type: 'text' | 'image' | 'audio' | 'document' | 'video' | 'sticker' | 'other';
  media_url?: string;
  timestamp: number;
  created_at: string;
  status?: string;
  is_from_bot: boolean;
}

interface GroupedConversation {
  whatsapp_number: string;
  contact_name: string;
  profile_pic?: string;
  messages: ChatMessage[];
  last_message: ChatMessage;
  unread_count: number;
}
```

---

## Pages & Features

### 1. Dashboard (`/[locale]`)
- **Stats Cards**: Total, confirmed, pending, paid appointments
- **Appointment List**: Filterable by status, searchable
- **Calendar**: Monthly view with appointment indicators
- **Day View**: Selected day appointments
- **Appointment Modal**: View/edit appointment details, mark attendance

### 2. Conversations (`/[locale]/conversations`)
- **WhatsApp-style Interface**: Chat list + message window
- **Real-time Connection Status**: Shows Evolution API connection
- **Media Support**: Images, audio, video, documents, stickers
- **Bot Detection**: Distinguishes AI assistant from staff messages
- **Filtering**: Only shows conversations from n8n_chat_histories
- **Contact Info Panel**: Patient details, conversation stats

### 3. Patients (`/[locale]/patients`)
- **Patient List**: All registered patients
- **Search & Filter**: By name, phone, reliability
- **Patient Details**: History, visits, reliability score

### 4. Reliability (`/[locale]/reliability`)
- **Reliability Report**: Patient reliability analysis
- **Timeline View**: Patient visit history
- **Scoring**: High/Medium/Low based on attendance

### 5. Settings (`/[locale]/settings`)
- **Doctor Management**: Add, edit, delete doctors
- **Working Hours**: Configure schedules
- **Active Status**: Enable/disable doctors

---

## Internationalization (i18n)

### Supported Locales
- **Arabic (ar)**: Default, RTL layout
- **English (en)**: LTR layout

### Configuration

```typescript
// i18n/routing.ts
export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar'
});
```

### Usage in Components

```typescript
import { useTranslations, useLocale } from 'next-intl';

export default function Component() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className={isRTL ? 'rtl' : 'ltr'}>
      {t('common.title')}
    </div>
  );
}
```

### Translation Files Structure

```json
// messages/ar.json
{
  "common": {
    "dashboard": "لوحة التحكم",
    "appointments": "المواعيد",
    "patients": "المرضى",
    "doctors": "الأطباء",
    "settings": "الإعدادات"
  },
  "appointments": {
    "total": "إجمالي المواعيد",
    "confirmed": "مؤكد",
    "pending": "قيد الانتظار",
    "cancelled": "ملغي"
  }
}
```

---

## Design System

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| Primary | #722F37 | Main brand color (Maroon) |
| Primary Light | #8B4049 | Hover states |
| Secondary | #C5A572 | Accent color (Gold) |
| Background | #FAF9F6 | Page background |
| Card | #FFFFFF | Card backgrounds |
| Success | #10B981 | Success states |
| Warning | #F59E0B | Warning states |
| Danger | #EF4444 | Error states |

### Tailwind Configuration

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      primary: '#722F37',
      'primary-light': '#8B4049',
      secondary: '#C5A572',
    }
  }
}
```

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## API Endpoints (Evolution API)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/instance/fetchInstances` | Get all instances |
| POST | `/chat/findMessages/{instance}` | Get messages |
| POST | `/chat/findChats/{instance}` | Get chat list |
| POST | `/chat/getBase64FromMediaMessage/{instance}` | Get media as base64 |

---

## Running the Project

### Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Type Checking

```bash
npx tsc --noEmit
```

---

## Key Components Documentation

### ConversationDashboard

The main WhatsApp-style conversation interface.

**Features:**
- Chat list with search and filters
- Message display with media support
- Contact info panel
- Audio playback
- Image expansion modal
- Download functionality

**State Management:**
```typescript
const [conversations, setConversations] = useState<GroupedConversation[]>([]);
const [selectedChat, setSelectedChat] = useState<string | null>(null);
const [mediaCache, setMediaCache] = useState<Map<string, MediaData>>(new Map());
const [loadingMedia, setLoadingMedia] = useState<Set<string>>(new Set());
const [playingAudio, setPlayingAudio] = useState<string | null>(null);
```

### MediaMessage Component

Handles rendering of different media types.

**Supported Types:**
- `image` - Displays with zoom and download
- `audio` - Play/pause controls
- `video` - Native video player
- `document` - Download button
- `sticker` - Smaller image display

---

## Bot Detection Logic

Messages are classified as "bot" based on patterns:

```typescript
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
```

---

## Security Notes

1. **API Keys**: Evolution API key is stored in code (consider moving to env)
2. **Supabase**: Uses Row Level Security (RLS)
3. **Client-side**: All API calls are made from client components

---

## Future Improvements

1. [ ] Move Evolution API credentials to environment variables
2. [ ] Add real-time message updates (WebSocket)
3. [ ] Implement message sending capability
4. [ ] Add notification system
5. [ ] Implement user authentication
6. [ ] Add appointment reminders via WhatsApp
7. [ ] Generate reports and analytics
8. [ ] Mobile responsive optimization

---

## Troubleshooting

### Common Issues

1. **Messages not loading**
   - Check Evolution API connection status
   - Verify instance name is correct
   - Check API key validity

2. **Media not displaying**
   - Ensure message has valid `message_key_id`
   - Check network for base64 fetch errors
   - Verify media type is supported

3. **RTL layout issues**
   - Ensure `dir="rtl"` is set on root element
   - Use `start`/`end` instead of `left`/`right`
   - Check Tailwind RTL utilities

---

## Contact & Support

For issues or questions, contact the development team.

---

*Last Updated: February 2025*
