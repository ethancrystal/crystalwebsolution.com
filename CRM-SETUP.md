# CRM System Setup Guide

This document provides complete setup instructions for the Crystal Web Solution CRM system, including database schema, authentication, and dashboard implementation.

## Overview

The CRM system includes:
- **Secure Database Schema** with proper RLS (Row Level Security) policies
- **User Authentication** via Supabase Auth
- **Role-Based Access Control** (client, staff, admin)
- **Admin Dashboard** for CRM management
- **User Dashboard** for client access
- **Company, Contact, Deal, and Task Management**

## Prerequisites

1. A Supabase project ([create one here](https://app.supabase.com))
2. Node.js 18+ installed locally
3. The repository cloned and ready to develop

## Security Implementation

### Critical Security Fix

The schema implements a critical security fix for role assignment:
- **Roles use `raw_app_meta_data`** (service-role only) instead of `raw_user_meta_data`
- All new users default to `'client'` role
- Admin/staff roles can only be assigned via the Supabase service-role API
- This prevents unauthenticated users from self-assigning admin privileges

### Database Schema

The schema includes:
- `profiles` - User roles and metadata
- `companies` - Organization records
- `contacts` - Company contacts/leads
- `deals` - Sales opportunities
- `tasks` - Work items and assignments
- `notes` - Activity notes
- `company_members` - Company membership tracking

All tables have comprehensive RLS policies:
- Staff can view and manage all records
- Clients can only view their assigned company's data
- Role-based access control for all operations

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env.local
```

Then update `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Where to find these values:**
1. Go to your Supabase project
2. Settings → API → Project URL (copy to `NEXT_PUBLIC_SUPABASE_URL`)
3. Settings → API → Project API keys → `anon` key (copy to `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Settings → API → Project API keys → `service_role` key (copy to `SUPABASE_SERVICE_ROLE_KEY`)

### 3. Set Up Database Schema

The SQL migration file is located at `supabase/migrations/0001_crm_schema.sql`.

**Option A: Via Supabase Dashboard (Recommended for quick setup)**
1. Go to your Supabase project → SQL Editor
2. Create a new query
3. Copy the entire contents of `supabase/migrations/0001_crm_schema.sql`
4. Paste and run the query

**Option B: Via Supabase CLI (Recommended for production)**
```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Link your project
supabase link --project-ref your_project_ref

# Push migrations
supabase db push
```

### 4. Create an Admin User

After the schema is created, you need to create an admin user. Use the Supabase dashboard or the following steps:

**Via Supabase Dashboard:**
1. Go to Authentication → Users
2. Click "Create new user"
3. Enter email and password
4. Click "User" in the `raw_app_meta_data` column
5. Add: `{"role": "admin"}` to make them an admin

**Via Supabase SQL:**
```sql
-- Create a new user and set admin role
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data)
VALUES (
  'admin@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"role": "admin"}'::jsonb
);
```

### 5. Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## Routes and Access

### Public Routes
- `/` - Homepage
- `/signup` - User registration
- `/login` - User login

### Protected Routes (Authentication Required)
- `/dashboard` - User dashboard (all authenticated users)
- `/admin` - Admin dashboard (admin/staff only)
- `/admin/companies` - Company management
- `/admin/contacts` - Contact management
- `/admin/deals` - Deal management
- `/admin/tasks` - Task management

### Middleware

The middleware (`middleware.js`) enforces:
- Redirect unauthenticated users from protected routes to login
- Redirect staff/admin to `/admin` dashboard
- Redirect clients to `/dashboard`
- Prevent authenticated users from accessing auth pages

## Authentication Flow

### Sign Up
1. User enters email, password, and full name
2. Supabase Auth creates the user account
3. Trigger `handle_new_user()` creates a profile with `role: 'client'`
4. Confirmation email is sent (configure in Supabase settings)

### Sign In
1. User enters email and password
2. Supabase Auth validates credentials
3. Session is established
4. Middleware redirects to appropriate dashboard

### Sign Out
1. User clicks "Sign Out"
2. Session is cleared
3. Redirected to homepage

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Server Actions (app/auth/actions.js)
- `signUp(formData)` - Handle signup form
- `signIn(formData)` - Handle login form
- `signOut()` - Handle logout
- `getUser()` - Get current user
- `getUserProfile()` - Get user profile

## Database Operations

All database operations are in the `lib/crm/` directory:

### Companies (`lib/crm/companies.js`)
- `createCompany(data)` - Create new company
- `getCompanies()` - List all companies (staff only)
- `getCompany(id)` - Get company details with relations
- `updateCompany(id, data)` - Update company
- `deleteCompany(id)` - Delete company

### Contacts (`lib/crm/contacts.js`)
- `createContact(companyId, data)` - Create contact
- `getContacts(companyId)` - List company contacts
- `getContact(id)` - Get contact details
- `updateContact(id, data)` - Update contact
- `deleteContact(id)` - Delete contact

### Deals (`lib/crm/deals.js`)
- `createDeal(companyId, data)` - Create deal
- `getDeals(companyId)` - List company deals
- `getDeal(id)` - Get deal details
- `updateDeal(id, data)` - Update deal
- `deleteDeal(id)` - Delete deal

## Supabase Client Instances

### Browser Client (`lib/supabase/browser.js`)
Used in client components:
```jsx
import { createClient } from '@/lib/supabase/browser';

const supabase = createClient();
const { data, error } = await supabase.from('companies').select();
```

### Server Client (`lib/supabase/server.js`)
Used in server components and actions:
```js
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data, error } = await supabase.from('companies').select();
```

### Admin Client (`lib/supabase/admin.js`)
Used only for service-role operations:
```js
import { createAdminClient } from '@/lib/supabase/admin';

const admin = createAdminClient();
// Can perform unrestricted operations
```

## Role-Based Access Control

### Roles
- **client** - Default role for new users, limited to their assigned company
- **staff** - Can access and manage all companies/contacts/deals
- **admin** - Full system access, can manage users and system settings

### How to Assign Roles

**Promote user to staff:**
```sql
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"staff"')
WHERE email = 'user@example.com';
```

**Promote user to admin:**
```sql
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"admin"')
WHERE email = 'user@example.com';
```

## Troubleshooting

### "Database connection failed"
- Verify your Supabase URL and keys are correct
- Check that your IP is allowed (in Supabase → Database → Network)

### "User not found" or authentication errors
- Ensure the migration was run successfully
- Check that profiles table exists: `SELECT * FROM profiles;`

### RLS policy violations
- Verify the user has the correct role in `raw_app_meta_data`
- Check RLS policies in Supabase dashboard → Table Editor

### Email confirmation not working
- In Supabase dashboard, go to Authentication → Providers → Email
- Set "Email Confirmations Required" to OFF for testing (not recommended for production)

## Production Checklist

Before deploying to production:

- [ ] Set strong admin password
- [ ] Enable email confirmation in Supabase Auth
- [ ] Configure custom SMTP (optional)
- [ ] Set up proper CORS origins in Supabase settings
- [ ] Enable HTTPS everywhere
- [ ] Set up automatic backups
- [ ] Review and test all RLS policies
- [ ] Implement rate limiting on auth endpoints
- [ ] Set up monitoring and logging
- [ ] Document all deployed procedures

## Useful SQL Queries

### List all users with roles
```sql
SELECT id, email, raw_app_meta_data -> 'role' as role 
FROM auth.users;
```

### Count records by status
```sql
SELECT 
  'companies' as entity, COUNT(*) as total FROM companies
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL
SELECT 'deals', COUNT(*) FROM deals
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks;
```

### Find deals in specific stage
```sql
SELECT title, stage, value, expected_close_date 
FROM deals 
WHERE stage = 'negotiation'
ORDER BY expected_close_date;
```

## Next Steps

1. Create additional staff members for testing
2. Build out the contact/deal/task management UI
3. Add reporting and analytics features
4. Implement email notifications
5. Set up integrations (Slack, email, etc.)

## Support

For Supabase documentation: https://supabase.com/docs
For Next.js documentation: https://nextjs.org/docs
