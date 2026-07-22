# KoloAI Architecture

┌─────────────────────────────────────────────────────────┐
│                      KOLOAI                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────┐    │
│  │ Next.js  │──▶│ Supabase │──▶│   PostgreSQL     │    │
│  │  (UI)    │   │ (Auth)   │   │  (Groups, Users, │    │
│  │          │   │          │   │   Contributions, │    │
│  │          │   │          │   │   Transactions)  │    │
│  └────┬─────┘   └──────────┘   └──────────────────┘    │
│       │                                                 │
│       │ POST /api/monnify/virtual-account              │
│       │ POST /api/monnify/webhook                      │
│       ▼                                                 │
│  ┌──────────────────────────────────────┐              │
│  │         MONNIFY SANDBOX API          │              │
│  │  - Customer Reserved Account         │              │
│  │  - Webhook Verification              │              │
│  └──────────────────────────────────────┘              │
│                                                         │
│  Payment Flow:                                          │
│  User → Select Method → Generate Virtual Account →     │
│  Transfer → Webhook Confirms → Update Group Pool       │
└─────────────────────────────────────────────────────────┘
