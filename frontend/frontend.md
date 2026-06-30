# Brain-Dump Task Organizer — Frontend Architecture & Implementation Plan

---

## PHASE 1: Frontend Architecture Overview

### 1.1 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 14+ (App Router) | Server components, streaming, file-based routing |
| **Language** | TypeScript | Type safety across components, API calls, and state |
| **Styling** | Tailwind CSS v3 (user-requested) | Utility-first, rapid iteration, design system tokens |
| **State** | React `useState` + `useContext` | Lightweight — no Redux needed for this scope |
| **HTTP** | Native `fetch` with custom wrapper | No axios dependency, built-in AbortController support |
| **Animations** | `framer-motion` | Smooth layout transitions, skeleton loaders, micro-interactions |
| **Icons** | `lucide-react` | Tree-shakeable, consistent, modern icon set |
| **Toasts** | `sonner` | Lightweight, accessible notification toasts |
| **Fonts** | Google Fonts — Inter (sans), JetBrains Mono (mono) | Premium, highly legible typography |

---

### 1.2 Application Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND DATA FLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

  User types brain dump           User views organized tasks
        │                                   ▲
        ▼                                   │
┌───────────────┐                  ┌────────────────┐
│  INPUT MODE   │   state toggle   │ DASHBOARD MODE │
│               │ ◄──────────────► │                │
│ • TextArea    │                  │ • Kanban Board │
│ • Submit btn  │                  │ • 3 columns    │
│ • Char count  │                  │ • Task cards   │
└───────┬───────┘                  └────────▲───────┘
        │                                   │
        ▼                                   │
┌───────────────┐                  ┌────────────────┐
│  API Service  │ ──── fetch ────► │  Express API   │
│  (lib/api.ts) │                  │  :5000         │
│               │ ◄──── JSON ───── │                │
└───────┬───────┘                  └────────────────┘
        │
        ▼
┌───────────────┐
│  TaskContext   │
│  (global state)│
│               │
│ • tasks[]     │
│ • loading     │
│ • error       │
│ • actions     │
└───────────────┘
```

---

### 1.3 Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx               # Root layout: fonts, metadata, providers
│   ├── page.tsx                 # Main page: mode toggle + content
│   ├── globals.css              # Tailwind directives + custom design tokens
│   ├── loading.tsx              # Suspense fallback (animated skeleton)
│   └── error.tsx                # Error boundary (global)
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx           # App header: logo, nav, user menu
│   │   └── Footer.tsx           # Minimal footer
│   │
│   ├── input/
│   │   ├── BrainDumpInput.tsx   # Main textarea + submit button
│   │   ├── CharCounter.tsx      # Live character count indicator
│   │   └── VoiceInput.tsx       # (Future) Web Speech API capture
│   │
│   ├── dashboard/
│   │   ├── KanbanBoard.tsx      # 3-column layout container
│   │   ├── KanbanColumn.tsx     # Single column (Today/This Week/Backlog)
│   │   ├── TaskCard.tsx         # Individual task card with actions
│   │   ├── PriorityBadge.tsx    # Color-coded priority indicator
│   │   ├── TagChip.tsx          # Styled tag display
│   │   └── EmptyColumn.tsx      # Empty state illustration
│   │
│   ├── shared/
│   │   ├── LoadingSkeleton.tsx  # Animated pulse skeleton
│   │   ├── ErrorDisplay.tsx     # Error state with retry
│   │   ├── ModeToggle.tsx       # Input ↔ Dashboard toggle switch
│   │   └── Button.tsx           # Shared button variants
│   │
│   └── auth/
│       ├── LoginForm.tsx        # Login form
│       └── RegisterForm.tsx     # Registration form
│
├── context/
│   └── TaskContext.tsx          # React Context for task state
│
├── lib/
│   ├── api.ts                  # Fetch wrapper with auth headers
│   ├── types.ts                # TypeScript interfaces (Task, User, etc.)
│   └── constants.ts            # API URLs, config values
│
├── hooks/
│   ├── useTasks.ts             # Custom hook: fetch + CRUD tasks
│   └── useAuth.ts              # Custom hook: auth state + actions
│
├── public/
│   └── (static assets)
│
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── package.json
```

---

## PHASE 2: Frontend Implementation Plan

### 2.1 Development Steps (Ordered)

#### Step 1 — Project Scaffolding

```bash
npx -y create-next-app@latest ./ \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --use-npm
```

Additional dependencies:
```bash
npm install framer-motion lucide-react sonner
```

#### Step 2 — Design System (`globals.css`)

Define the complete design token system:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* ── Color System (HSL) ── */
    --bg-primary: 222 47% 6%;        /* Deep navy-black */
    --bg-secondary: 222 44% 9%;      /* Slightly lighter */
    --bg-card: 222 41% 12%;          /* Card surfaces */
    --bg-card-hover: 222 38% 15%;    /* Card hover state */

    --text-primary: 210 40% 96%;     /* Near-white */
    --text-secondary: 215 20% 65%;   /* Muted gray */
    --text-tertiary: 215 15% 45%;    /* Dimmed */

    --border-default: 215 25% 18%;   /* Subtle borders */
    --border-active: 215 25% 25%;    /* Active borders */

    /* ── Priority Colors ── */
    --priority-urgent: 0 84% 60%;     /* Red */
    --priority-high: 25 95% 53%;      /* Orange */
    --priority-medium: 45 93% 47%;    /* Amber */
    --priority-low: 142 71% 45%;      /* Green */

    /* ── Category Colors ── */
    --category-today: 262 83% 58%;    /* Purple */
    --category-week: 199 89% 48%;     /* Cyan */
    --category-backlog: 215 20% 50%;  /* Slate */

    /* ── Accent ── */
    --accent: 262 83% 58%;            /* Primary purple */
    --accent-hover: 262 83% 65%;
    --accent-glow: 262 83% 58% / 0.2;

    /* ── Spacing Scale ── */
    --radius-sm: 0.375rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
  }
}
```

#### Step 3 — TypeScript Interfaces (`lib/types.ts`)

```typescript
export interface Task {
  _id: string;
  userId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'today' | 'this_week' | 'backlog';
  tags: string[];
  estimatedMinutes: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  isCompleted: boolean;
  completedAt: string | null;
  sourceText: string;
  dumpBatchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
  preferences: {
    timezone: string;
    defaultPriority: Task['priority'];
  };
  dumpCount: number;
  lastDumpAt: string | null;
}

export interface ProcessDumpResponse {
  success: boolean;
  batchId: string;
  tasks: Task[];
  count: number;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ViewMode = 'input' | 'dashboard';
```

#### Step 4 — API Service Layer (`lib/api.ts`)

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // ── Tasks ──
  processDump: (rawText: string) =>
    fetchAPI<ProcessDumpResponse>('/tasks/process-dump', {
      method: 'POST',
      body: JSON.stringify({ rawText }),
    }),

  getTasks: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchAPI<{ success: true; tasks: Task[]; count: number }>(
      `/tasks${query}`
    );
  },

  toggleTask: (taskId: string) =>
    fetchAPI<{ success: true; task: Task }>(`/tasks/${taskId}/toggle`, {
      method: 'PATCH',
    }),

  deleteTask: (taskId: string) =>
    fetchAPI<{ success: true }>(`/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  // ── Auth ──
  login: (email: string, password: string) =>
    fetchAPI<{ success: true; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    fetchAPI<{ success: true; token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  getMe: () => fetchAPI<{ success: true; user: User }>('/auth/me'),
};
```

#### Step 5 — Task Context (`context/TaskContext.tsx`)

State shape:
```typescript
interface TaskState {
  tasks: Task[];
  loading: boolean;
  processing: boolean;  // True while AI is processing a dump
  error: string | null;
  viewMode: ViewMode;
}

interface TaskContextValue extends TaskState {
  // Actions
  processDump: (rawText: string) => Promise<void>;
  fetchTasks: () => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  clearError: () => void;

  // Derived
  todayTasks: Task[];
  weekTasks: Task[];
  backlogTasks: Task[];
}
```

The context provider wraps the entire app in `layout.tsx`, uses `useState` for all state slices, and derives filtered lists via `useMemo`.

#### Step 6 — Core Components

##### 6a. `ModeToggle.tsx` — View Switcher

- Pill-shaped toggle with two segments: "Brain Dump" (input icon) and "Dashboard" (grid icon)
- Active segment has filled background with accent color glow
- Animated sliding indicator using `framer-motion layoutId`
- Keyboard accessible (arrow keys, space/enter)

##### 6b. `BrainDumpInput.tsx` — Input Mode

```
┌──────────────────────────────────────────────────────────┐
│  🧠 What's on your mind?                                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                                                    │   │
│  │  (Large textarea, auto-resize, placeholder text)  │   │
│  │  "Just dump everything — meetings, todos, ideas,  │   │
│  │   errands, shower thoughts..."                     │   │
│  │                                                    │   │
│  │                                                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  234 / 5000 chars                   [ ⚡ Organize Now ]  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Features:
- Auto-expanding textarea (grows with content)
- Live character counter with color transitions (green → amber → red)
- Submit button with gradient + icon
- Disabled state while processing (animated spinner replaces icon)
- Success: auto-switch to Dashboard mode, show toast
- Error: inline error message + retry suggestion

##### 6c. `KanbanBoard.tsx` — Dashboard Mode

```
┌────────────────────┬────────────────────┬────────────────────┐
│  ☀️ TODAY   (3)    │  📅 THIS WEEK (5)  │  📦 BACKLOG  (8)  │
│                    │                    │                    │
│  ┌──────────────┐  │  ┌──────────────┐  │  ┌──────────────┐  │
│  │ Task Card    │  │  │ Task Card    │  │  │ Task Card    │  │
│  │  🔴 urgent   │  │  │  🟠 high     │  │  │  🟢 low      │  │
│  │  [checkbox]  │  │  │  [checkbox]  │  │  │  [checkbox]  │  │
│  │  #tag #tag   │  │  │  #tag        │  │  │  #tag #tag   │  │
│  │  ⏱ 30min     │  │  │  ⏱ 2hrs      │  │  │              │  │
│  └──────────────┘  │  └──────────────┘  │  └──────────────┘  │
│                    │                    │                    │
│  ┌──────────────┐  │  ┌──────────────┐  │  ┌──────────────┐  │
│  │ Task Card    │  │  │ Task Card    │  │  │ Task Card    │  │
│  └──────────────┘  │  └──────────────┘  │  └──────────────┘  │
│                    │                    │                    │
└────────────────────┴────────────────────┴────────────────────┘
```

- Responsive: 3 columns on desktop → 1 column stacked on mobile
- Column headers with task count badges
- Column-specific accent colors (purple/cyan/slate)
- Animated card entrance with staggered `framer-motion` transitions
- Empty state per column with illustration + helpful text

##### 6d. `TaskCard.tsx` — Individual Card

```
┌──────────────────────────────┐
│ ☐  Fix login bug in prod     │  ← Checkbox + Title
│                              │
│ Login is breaking production │  ← Description (truncated)
│                              │
│ 🔴 urgent    ⏱ 60 min       │  ← Priority badge + estimate
│                              │
│ #bugfix  #production  #auth  │  ← Tag chips
│                              │
│              [🗑]            │  ← Delete action (hover reveal)
└──────────────────────────────┘
```

Features:
- Glass-morphism card style (`bg-white/5 backdrop-blur-sm border border-white/10`)
- Hover: subtle lift (`translate-y-[-2px]`) + border brightening
- Checkbox toggle with strikethrough animation on complete
- Priority badge: dot + label with priority-specific colors
- Tags: small chips with muted background
- Time estimate: clock icon + formatted duration
- Delete: revealed on hover, confirmation toast before action
- Completed state: reduced opacity, checked styling

##### 6e. `LoadingSkeleton.tsx` — Processing State

- Shown when AI is processing a brain dump
- 3-column skeleton layout mimicking the Kanban board
- Animated pulse gradient (`animate-pulse` with custom gradient)
- Overlay text: "🧠 Organizing your thoughts..." with typing animation
- Auto-dismisses when tasks arrive

#### Step 7 — Layout & Root Page

**`app/layout.tsx`:**
- Import Inter + JetBrains Mono from `next/font/google`
- Set metadata (title, description, theme-color)
- Wrap children in `<TaskProvider>` and `<Toaster>`
- Dark theme body class

**`app/page.tsx`:**
- Reads `viewMode` from TaskContext
- Renders `<Header>` → `<ModeToggle>` → conditional content
- `viewMode === 'input'` → `<BrainDumpInput />`
- `viewMode === 'dashboard'` → `<KanbanBoard />`
- Initial data fetch via `useEffect` on mount

#### Step 8 — Loading & Error States

| State | UX |
|-------|----|
| **Initial load** | Full-page skeleton (3 column shimmer) |
| **Processing dump** | Input disabled, button shows spinner, progress text |
| **Empty dashboard** | Friendly illustration: "No tasks yet — dump your thoughts!" |
| **API error** | Inline error banner with retry button |
| **Network offline** | Toast notification, disabled submit |
| **Rate limited** | Toast with countdown to next available request |

---

### 2.2 Tailwind Configuration Extensions (`tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'hsl(var(--bg-primary))',
          secondary: 'hsl(var(--bg-secondary))',
          card: 'hsl(var(--bg-card))',
          'card-hover': 'hsl(var(--bg-card-hover))',
        },
        text: {
          primary: 'hsl(var(--text-primary))',
          secondary: 'hsl(var(--text-secondary))',
          tertiary: 'hsl(var(--text-tertiary))',
        },
        border: {
          default: 'hsl(var(--border-default))',
          active: 'hsl(var(--border-active))',
        },
        priority: {
          urgent: 'hsl(var(--priority-urgent))',
          high: 'hsl(var(--priority-high))',
          medium: 'hsl(var(--priority-medium))',
          low: 'hsl(var(--priority-low))',
        },
        category: {
          today: 'hsl(var(--category-today))',
          week: 'hsl(var(--category-week))',
          backlog: 'hsl(var(--category-backlog))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          hover: 'hsl(var(--accent-hover))',
          glow: 'hsl(var(--accent-glow))',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

### 2.3 Component Interaction Map

```
app/page.tsx
  │
  ├── <Header />
  │     └── Logo + UserMenu
  │
  ├── <ModeToggle viewMode={} setViewMode={} />
  │
  ├── if viewMode === 'input':
  │     └── <BrainDumpInput
  │           onSubmit={processDump}
  │           processing={processing}
  │           error={error}
  │         />
  │           ├── <CharCounter current={} max={5000} />
  │           └── <Button variant="primary" loading={processing} />
  │
  └── if viewMode === 'dashboard':
        └── <KanbanBoard>
              ├── <KanbanColumn
              │     title="Today" icon={Sun} color="purple"
              │     tasks={todayTasks}
              │   >
              │     ├── <TaskCard /> (mapped)
              │     └── <EmptyColumn /> (if empty)
              │
              ├── <KanbanColumn
              │     title="This Week" icon={Calendar} color="cyan"
              │     tasks={weekTasks}
              │   >
              │     └── ...
              │
              └── <KanbanColumn
                    title="Backlog" icon={Archive} color="slate"
                    tasks={backlogTasks}
                  >
                    └── ...
```

---

### 2.4 Responsive Breakpoints

| Breakpoint | Layout | Behavior |
|------------|--------|----------|
| `< 640px` (mobile) | Single column, stacked | Cards full-width, swipeable columns |
| `640–1024px` (tablet) | 2 columns | Today + This Week side-by-side, Backlog below |
| `> 1024px` (desktop) | 3 columns | Full Kanban layout |

---

### 2.5 Performance Considerations

| Technique | Implementation |
|-----------|---------------|
| **Server Components** | Layout, Header, Footer are server components (no `'use client'`) |
| **Client boundary** | Only interactive components (`BrainDumpInput`, `KanbanBoard`, `TaskCard`) use `'use client'` |
| **Lazy loading** | Dashboard components loaded only when switching to dashboard mode |
| **Optimistic UI** | Toggle completion immediately, revert on error |
| **Debounced input** | Character counter updates debounced at 100ms |
| **Memoization** | Task filtering via `useMemo`, card rendering via `React.memo` |

---

### 2.6 Implementation Order Checklist

```
[ ] 1. Scaffold Next.js project with TypeScript + Tailwind
[ ] 2. Configure globals.css with design tokens
[ ] 3. Extend tailwind.config.ts with custom theme
[ ] 4. Create lib/types.ts — all TypeScript interfaces
[ ] 5. Create lib/constants.ts — API URL, config
[ ] 6. Create lib/api.ts — fetch wrapper
[ ] 7. Create context/TaskContext.tsx — global state
[ ] 8. Create components/shared/Button.tsx
[ ] 9. Create components/shared/ModeToggle.tsx
[ ] 10. Create components/shared/LoadingSkeleton.tsx
[ ] 11. Create components/shared/ErrorDisplay.tsx
[ ] 12. Create components/input/BrainDumpInput.tsx + CharCounter.tsx
[ ] 13. Create components/dashboard/PriorityBadge.tsx + TagChip.tsx
[ ] 14. Create components/dashboard/TaskCard.tsx
[ ] 15. Create components/dashboard/KanbanColumn.tsx + EmptyColumn.tsx
[ ] 16. Create components/dashboard/KanbanBoard.tsx
[ ] 17. Create components/layout/Header.tsx
[ ] 18. Create app/layout.tsx — root layout with providers
[ ] 19. Create app/page.tsx — main page with mode toggle
[ ] 20. Create app/loading.tsx + app/error.tsx
[ ] 21. Integration test with running backend
[ ] 22. Responsive testing across breakpoints
[ ] 23. Accessibility audit (keyboard nav, screen reader)
```
