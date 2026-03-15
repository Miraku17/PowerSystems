# PowerSystems Inc. — Enterprise Management System

A comprehensive web-based management system for industrial equipment operations, workforce tracking, and service documentation. Built for field and office teams to manage job orders, service forms, employee time and leave, approvals, and reporting — with full offline support for field use.

---

## Features

### Equipment & Customer Management
- Manage **companies**, **customers**, **engines**, and **pumps** with full technical specifications
- Track service history and equipment details per customer

### Service Forms & Documentation
14+ specialized forms covering the full service lifecycle:
- Deutz Commissioning & Service
- Submersible Pump Commissioning, Service & Teardown
- Electric Surface Pump Commissioning, Service & Teardown
- Engine Surface Pump Commissioning & Service
- Engine Teardown, Inspection & Receiving
- Components Teardown / Measuring Report
- Job Order Requests
- Daily Time Sheets

All forms support **file attachments**, **PDF export**, and **digital signatures**.

### Approval Workflows
- Multi-level signatory approval routing
- Digital signature pad per approver
- Status tracking: Draft → Pending → Approved → Completed
- Dedicated pending approvals dashboard per form type

### Time & Leave Management
- Daily Time Sheet submission and approval
- Leave requests (Vacation, Sick, Emergency, LWOP)
- Leave credit tracking and balance management
- Leave approval workflow with admin controls

### Reporting & Analytics
- Dashboard overview with form statistics
- Job order reports: generated, status, WIP, cancelled, manhours, engine-specific
- Date range and equipment filtering
- CSV export

### Knowledge Base
- Searchable, categorized internal documentation
- Rich content with image support

### User & Access Control
- Role-based access control (RBAC) via positions
- Granular per-module, per-action permissions
- User creation and management
- Audit logs for all actions

### AI Assistant
- Integrated OpenAI-powered chatbot for user support

### Offline Support
- IndexedDB-based offline sync for field operations
- Data syncs automatically when connectivity is restored

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand + TanStack React Query |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| PDF | Puppeteer + jsPDF |
| Offline | IndexedDB (idb) |
| AI | OpenAI API |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- (Optional) OpenAI API key for the AI assistant

### Installation

```bash
git clone https://github.com/Miraku17/PowerSystems.git
cd PowerSystems
npm install
```

### Environment Variables

Create a `.env` file in the root with the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_API_KEY=your_internal_api_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
OPENAI_API_KEY=your_openai_api_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment

The application is deployed on **Vercel**. Set the environment variables above in your Vercel project settings and push to `main` to trigger a deployment.

Live URL: [https://power-systems.vercel.app](https://power-systems.vercel.app)

---

## Project Structure

```
src/
  app/          # Next.js pages and API routes
  components/   # Reusable UI components
  hooks/        # Custom React hooks
  lib/          # Utility functions and Supabase client
  services/     # API service layer
  stores/       # Zustand state stores
  types/        # TypeScript type definitions
supabase/
  migrations/   # Database migration scripts
```
