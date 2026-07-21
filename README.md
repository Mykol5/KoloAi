# KoloAI - AI-Powered Group Savings Platform

KoloAI digitizes traditional Nigerian Ajo group savings using Monnify's payment infrastructure. Built for the API Conference Lagos 2026 Developer Challenge.

## Features

- **Group Creation Wizard** - Create Fixed Savings or Rotating Ajo groups in under 2 minutes
- **Monnify Virtual Accounts** - Generate virtual bank accounts for seamless contributions
- **Webhook Verification** - Real-time payment confirmation and automated reconciliation
- **Rotating Ajo Tracker** - Visual payout rotation timeline showing current recipient and history
- **Member Management** - Invite members via email or shareable links with role assignment
- **Real-time Dashboard** - Contribution analytics, monthly breakdowns, and transaction history
- **Mobile Responsive** - Fully responsive across all screen sizes 

## Tech Stack

- **Framework:** Next.js 16 (App Router + Turbopack)
- **Authentication:** Supabase Auth
- **Database:** Supabase (PostgreSQL)
- **Payments:** Monnify Sandbox API (Customer Reserved Account)
- **Email:** Resend API
- **Styling:** Tailwind CSS with custom design system
- **Deployment:** Netlify

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/monnify/virtual-account` | POST | Generate virtual bank account |
| `/api/monnify/webhook` | POST | Handle payment verification |
| `/api/monnify/verify` | GET | Check transaction status |
| `/api/invite` | POST | Send member invitations |

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn
- Supabase account
- Monnify sandbox account

### Installation

```bash
git clone https://github.com/smarttechhubinc/KoloAi.git
cd KoloAi/kolo-ai
yarn install
cp .env.example .env.local
Environment Variables
Create a .env.local file with:

env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
MONNIFY_API_KEY=your_monnify_api_key
MONNIFY_SECRET_KEY=your_monnify_secret_key
MONNIFY_CONTRACT_CODE=your_monnify_contract_code
RESEND_API_KEY=your_resend_api_key


Database Setup
Run this SQL in your Supabase SQL Editor:

sql
-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  pool_amount DECIMAL(12,2) DEFAULT 0,
  member_count INT DEFAULT 0,
  max_members INT DEFAULT 20,
  contribution_amount DECIMAL(12,2) DEFAULT 50000,
  status TEXT DEFAULT 'active',
  cycle_number INT DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  rotation_order TEXT[] DEFAULT '{}',
  current_rotation_index INT DEFAULT 0,
  next_payout_date TIMESTAMPTZ,
  last_payout_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  rotation_position INT,
  has_received_payout BOOLEAN DEFAULT false,
  payout_received_at TIMESTAMPTZ,
  payout_amount DECIMAL(12,2),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Contributions table
CREATE TABLE IF NOT EXISTS contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_ref TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monnify_ref TEXT UNIQUE,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  type TEXT DEFAULT 'contribution',
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


Run Development Server
bash
yarn dev
Open http://localhost:3000

Build for Production
bash
yarn build
yarn start
Project Structure
text
kolo-ai/
  src/
    app/
      (auth)/login/        # Login/Register page
      (dashboard)/         # Dashboard layout + pages
        dashboard/         # Main dashboard
        groups/            # Groups list, create, detail
        payments/          # Payment flow + history
        settings/          # User settings + profile
        treasurer/         # AI Treasurer chat
      api/                 # API routes
        monnify/           # Monnify integration
        invite/            # Email invites
      join/                # Invite acceptance page
    components/            # Shared components
      Sidebar.tsx          # Desktop sidebar
      DashboardLayout.tsx  # Layout wrapper
      FloatingAI.tsx       # AI assistant button
    lib/                   # Utilities
      supabase/            # Supabase client


Monnify Integration
KoloAI uses Monnify's Customer Reserved Account API for payment processing:

User selects contribution amount and payment method

System generates a virtual Wema Bank account via Monnify

User transfers funds to the virtual account

Monnify webhook confirms the payment

Contribution status updates, transaction recorded, group pool increases

In production, Monnify automatically calls the webhook endpoint. For development, a test webhook mode is available.

License
MIT

Acknowledgments
Built for the API Conference Lagos 2026 Developer Challenge in partnership with Monnify.
