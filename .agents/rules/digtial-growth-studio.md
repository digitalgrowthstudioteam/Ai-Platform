---
trigger: manual
---

# DIGITAL GROWTH STUDIO — MASTER AI DEVELOPMENT WORKFLOW

## 1. PRODUCT GOAL

Build **Digital Growth Studio – AI Ads Optimizer**, a SaaS that connects to a user's Meta Ads account and intelligently analyzes campaigns, ad sets, ads, creatives, copy, audiences and placements.

Core value:

**CONNECT META → COLLECT DATA → ANALYZE → IDENTIFY WINNERS → IDENTIFY WASTAGE → EXPLAIN WHY → RECOMMEND WHAT TO DO NEXT.**

V1 is strictly **READ-ONLY**. Never create, edit, pause, resume, delete or modify Meta campaigns, ad sets, ads, creatives, budgets or targeting.

Do NOT implement `ads_management` in V1.

Initial business goal: get **20–30 real paying users at ₹99/month** and validate the product.

Long-term:

**READ → ANALYZE → RECOMMEND → USER APPROVES → APPLY → MONITOR → LEARN → AUTO-OPTIMIZE.**

---

## 2. LOCKED TECHNOLOGY STACK

### Frontend

Next.js + TypeScript + App Router + Tailwind CSS + shadcn/ui + Lucide React + Recharts + React Hook Form + Zod.

### Authentication

**Firebase Authentication ONLY.**

Use Firebase for email/password, Google login, email verification, password reset and authentication/session handling.

### Database

**Supabase PostgreSQL ONLY.**

Supabase must ONLY provide PostgreSQL.

Do NOT use Supabase Auth, Storage, Edge Functions, Realtime or hosting.

### Backend

FastAPI + Python + SQLAlchemy + asyncpg.

### Background jobs

Celery + Redis or equivalent reliable worker system.

### Payments

Razorpay.

### Meta

Meta Marketing API, read-only initially.

### AI/ML

Rules + statistics first, LLM for explanation, ML later after sufficient historical data.

---

## 3. SYSTEM ARCHITECTURE

```text id="j8qz8k"
User
 ↓
Next.js
 ↓
Firebase Authentication
 ↓
FastAPI
 ├── PostgreSQL / Supabase
 ├── Meta Marketing API
 └── Analytics + AI/ML
```

The browser must NEVER call Meta directly.

The browser must NEVER receive Meta access tokens.

FastAPI handles all Meta communication.

FastAPI must verify Firebase ID tokens server-side.

Never trust a `user_id` supplied by the frontend; derive identity from the verified Firebase token.

---

## 4. META READ-ONLY INTEGRATION

V1 should support:

* Meta OAuth
* Find accessible ad accounts
* User selects ad account
* Campaign retrieval
* Ad Set retrieval
* Ad retrieval
* Creative retrieval
* Insights retrieval
* Supported breakdowns
* Historical synchronization

Flow:

**Connect Meta → Meta Authorization → Backend Callback → Validate → Find Ad Accounts → Select Account → Securely Store Credentials → Initial Sync → Dashboard.**

Store Meta credentials encrypted.

Never log tokens or expose them to frontend.

Request only the minimum permissions required for the read-only product.

Do NOT request/use `ads_management` in V1.

Design the Meta integration so write access can be added later without rewriting the system.

---

## 5. DATABASE + DATA PIPELINE

Core database entities:

**users, subscriptions, meta_connections, meta_ad_accounts, campaigns, ad_sets, ads, creatives, daily_metrics, breakdown_metrics, aggregates, ai_recommendations, sync_jobs, audit_logs.**

Relationship:

**User → Meta Account → Campaign → Ad Set → Ad → Creative.**

Store daily performance including, where applicable:

spend, impressions, reach, frequency, clicks, CTR, CPC, CPM, leads, purchases, revenue, CPL/CPA and ROAS.

Store supported breakdowns such as age, gender, country, region, placement, platform, device and hour.

Use proper foreign keys, indexes and unique constraints.

Meta synchronization must be **idempotent**. Re-syncing the same entity/date must update existing records, not create duplicates. Use UPSERT logic.

Use precomputed aggregates for:

**1d, 3d, 7d, 14d, 30d, 90d, lifetime.**

---

## 6. SYNC ARCHITECTURE

Never call Meta API every time the dashboard loads.

Use:

```text id="oj11q6"
Scheduled Sync
 ↓
Meta API
 ↓
PostgreSQL
 ↓
Metric Processing
 ↓
Aggregates
 ↓
Analytics
 ↓
AI Recommendations
 ↓
Dashboard
```

Initial sync should normally import around 30 days of history.

Run daily synchronization afterward.

Heavy operations must run through background workers.

The dashboard should primarily read prepared database/aggregate data.

Do not recalculate large historical datasets on every page load.

---

## 7. ANALYTICS + AI ENGINE

V1 should NOT start with complex ML.

Start with:

**RULES + STATISTICS + AI EXPLANATION.**

Detect:

* Best-performing ads
* Worst-performing ads
* Winning creatives
* Creative fatigue
* High CPL/CPA
* Low CTR
* High CPC
* High CPM
* Budget opportunities
* Audience opportunities
* Placement opportunities
* Copy opportunities
* Performance drops
* Learning-phase concerns

Example:

If an ad has enough spend/conversions and its CPL is significantly above the account average, flag it as underperforming.

Every recommendation must include:

* title
* reason
* confidence
* priority
* supporting metrics
* suggested next step

Never make recommendations from insufficient data.

If there is not enough data, say:

**"Not enough data to make a reliable recommendation."**

The AI must NEVER invent metrics. Analytics determines the facts; AI explains them.

Do not call an LLM on every dashboard load. Generate/store/cache insights when required.

---

## 8. CREATIVE + COPY INTELLIGENCE

The product must analyze more than campaign metrics.

For creatives, analyze:

* image/video
* format
* duration where available
* headline
* primary text
* description
* CTA
* placement
* audience
* performance

Eventually derive characteristics such as:

* headline length
* copy length
* offer/price
* question hook
* problem hook
* benefit hook
* social proof
* CTA style
* creative format

For copy, analyze:

**Primary text:** hook, length, problem, benefit, offer, CTA, social proof.

**Headline:** length, offer, benefit, urgency, price, question, outcome.

The goal is to answer:

**"Why is this creative/copy working?"**

Do not claim causation unless data supports it. Use language such as "associated with better performance."

---

## 9. DASHBOARD + UI/UX

The supplied reference screenshot is the primary UI/UX direction.

The product should feel like:

**Shopify Admin + modern SaaS analytics.**

Use:

* light theme
* white cards
* light grey background
* rounded corners
* subtle borders/shadows
* blue primary accent
* green success
* orange warning
* red critical
* clean typography
* spacious layout
* professional tables
* charts
* KPI cards

Do not make it look like a generic developer dashboard.

Sidebar:

```text id="c2o8ef"
Digital Growth Studio
AI Ads Optimizer

Overview

Analytics
  Campaigns
  Ad Sets
  Ads
  Creatives
  Audiences
  Placements
  Demographics

AI & Insights
  AI Recommendations
  Performance Insights
  Creative Analyzer
  Copy Analyzer

Automation
  Rules — Coming Soon
  Auto Optimize — Coming Soon

Settings
  Ad Accounts
  Billing & Plans
  Team Members
  Account Settings

Help & Support
```

Overview should contain:

* account selector
* search
* sync status
* notifications
* profile
* date range
* KPI cards
* AI recommendations
* performance chart
* top campaigns
* top ads
* account health score

KPI examples:

**Spend, Results, Cost per Result, ROAS, Impressions, CTR, CPC.**

Metrics must adapt to the campaign objective.

---

## 10. AD INTELLIGENCE + ACCOUNT HEALTH

Ads page should show:

* creative preview
* ad
* campaign
* spend
* impressions
* CTR
* CPC
* CPL/CPA
* ROAS
* status
* AI score

Clicking an ad opens **Ad Intelligence** with:

* creative
* primary text
* headline
* CTA
* performance
* trend
* placement performance
* audience performance
* demographic performance
* why it is working
* why it may be declining
* what to test next

Create **Account Health Score 0–100** based on actual data, including performance trend, budget allocation, creative fatigue, audience/placement performance, data quality and campaign health.

---

## 11. BILLING + MULTI-TENANCY + SECURITY

Initial plan:

**₹99/month Early Access.**

Payment:

**Firebase Signup → Razorpay Checkout → Server-side verification → Subscription Active → Connect Meta.**

Use Razorpay webhooks. Never activate subscriptions based only on frontend payment success.

Do not hardcode ₹99 throughout the codebase. Use plans/feature entitlements so pricing can change later.

The application is multi-tenant.

User A must NEVER access User B's Meta account, campaigns, ads, metrics, recommendations or billing.

Every backend query must be scoped to the authenticated Firebase user.

Security requirements:

* encrypt Meta credentials
* never expose tokens
* never log secrets
* environment variables for secrets
* verify Firebase tokens server-side
* validate API input
* proper authorization on every endpoint
* never commit secrets to GitHub

---

## 12. DEVELOPMENT WORKFLOW + FUTURE ROADMAP

Build sequentially. Do NOT build the entire application in one shot.

### Phase 0

Project foundation: Next.js, FastAPI, Firebase, PostgreSQL, environment configuration, GitHub and base UI.

### Phase 1

Firebase authentication and protected routes.

### Phase 2

PostgreSQL models, relationships, indexes and migrations.

### Phase 3

Shopify-style UI shell.

### Phase 4

Meta read-only OAuth and ad account selection.

### Phase 5

Meta historical/daily synchronization.

### Phase 6

Metrics, aggregates, comparisons and analytics.

### Phase 7

Dashboard pages and Ad Intelligence.

### Phase 8

Rules, AI recommendations, Creative/Copy Intelligence and Account Health.

### Phase 9

Razorpay ₹99 subscription.

### Phase 10

Admin dashboard, monitoring and error handling.

### Phase 11

Security, multi-tenant and full QA.

### Phase 12

Meta read-only App Review preparation.

Development rules:

* Inspect existing code before changing it.
* Do not blindly overwrite files.
* Do not create duplicate models/components/services.
* Use database migrations for every schema change.
* Never manually modify production tables as a shortcut.
* Never skip migrations.
* Keep frontend/backend responsibilities separate.
* Keep Meta, billing, analytics and AI logic modular.
* Do not build fake production data.
* Do not build fake AI recommendations.
* Use real Meta data.

V1 success means:

**Firebase Login → ₹99 Subscription → Meta Read-only Connection → Data Sync → Accurate Dashboard → Creative/Copy Analysis → AI Recommendations → Account Health → Secure Multi-tenant SaaS → Meta App Review Ready.**

Future roadmap:

**Rules → Account Learning → Cross-account ML → Predictive Optimization → `ads_management` → User-approved actions → AI Active → Automatic Optimization → Monitoring → Rollback → Continuous Learning.**

Core principle:

**V1 = READ → ANALYZE → RECOMMEND.**

Build the architecture correctly so it can later become:

**READ → ANALYZE → DECIDE → APPLY → MONITOR → ROLLBACK → LEARN → OPTIMIZE.**
