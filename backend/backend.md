# Brain-Dump Task Organizer — Backend Architecture & Implementation Plan

---

## PHASE 1: Architecture & Data Flow Design

### 1.1 System Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BRAIN-DUMP TASK ORGANIZER                           │
│                         System Data Flow Diagram                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     POST /api/tasks/process-dump      ┌──────────────────┐
│              │  ─────────────────────────────────►    │                  │
│  Next.js     │     { rawText, userId }                │  Express.js      │
│  Frontend    │                                        │  API Server      │
│  (App Router)│  ◄─────────────────────────────────    │  :5000           │
│  :3000       │     { success, tasks[] }               │                  │
└──────────────┘                                        └────────┬─────────┘
                                                                 │
                                          ┌──────────────────────┼──────────────────────┐
                                          │                      │                      │
                                          ▼                      ▼                      ▼
                                   ┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
                                   │ Middleware   │     │  AI Service     │     │  MongoDB      │
                                   │ Stack        │     │  Layer          │     │  Atlas        │
                                   │              │     │                 │     │              │
                                   │ • CORS       │     │ • Prompt Mgr   │     │ • users      │
                                   │ • JSON parse │     │ • OpenAI Client │     │ • tasks      │
                                   │ • Auth (JWT) │     │ • JSON Validator│     │              │
                                   │ • Rate Limit │     │ • Retry Logic   │     │              │
                                   │ • Helmet     │     │                 │     │              │
                                   └─────────────┘     └────────┬────────┘     └──────┬───────┘
                                                                │                      │
                                                                ▼                      │
                                                        ┌───────────────┐              │
                                                        │  OpenAI API   │              │
                                                        │  gpt-4o-mini  │              │
                                                        │               │              │
                                                        │  System Prompt│              │
                                                        │  + Raw Text   │              │
                                                        │  ────────►    │              │
                                                        │  JSON[] Tasks │              │
                                                        └───────┬───────┘              │
                                                                │                      │
                                                                ▼                      │
                                                        ┌───────────────┐              │
                                                        │  Validation   │              │
                                                        │  & Transform  │──────────────┘
                                                        │               │  Task.insertMany()
                                                        │  • Zod schema │
                                                        │  • Sanitize   │
                                                        │  • Defaults   │
                                                        └───────────────┘
```

### 1.2 Request Lifecycle (Detailed)

```
Client POST ──► CORS ──► JSON ──► Auth ──► Rate Limit
                                              │
                                              ▼
                                      taskController.processDump()
                                              │
                                    ┌─────────┴──────────┐
                                    │ 1. Validate input  │
                                    │ 2. Build prompt    │
                                    │ 3. Call OpenAI     │
                                    │ 4. Parse JSON resp │
                                    │ 5. Validate schema │
                                    │ 6. Bulk insert DB  │
                                    │ 7. Return tasks[]  │
                                    └────────────────────┘
```

---

### 1.3 MongoDB Schemas (Mongoose)

#### User Model — `models/User.js`

```javascript
const userSchema = new mongoose.Schema(
  {
    // ─── Identity ───
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Never returned in queries by default
    },

    // ─── Profile ───
    avatar: {
      type: String,
      default: null,
    },

    // ─── Settings ───
    preferences: {
      timezone: { type: String, default: 'UTC' },
      defaultPriority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
      },
    },

    // ─── Usage Tracking ───
    dumpCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastDumpAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: populate all tasks for this user
userSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'userId',
});
```

#### Task Model — `models/Task.js`

```javascript
const taskSchema = new mongoose.Schema(
  {
    // ─── Ownership ───
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must belong to a user'],
      index: true,
    },

    // ─── Core Task Data (LLM-generated) ───
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must not exceed 1000 characters'],
      default: '',
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'medium',
    },
    category: {
      type: String,
      enum: {
        values: ['today', 'this_week', 'backlog'],
        message: '{VALUE} is not a valid category',
      },
      required: [true, 'Category is required'],
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'A task may have at most 10 tags',
      },
    },
    estimatedMinutes: {
      type: Number,
      default: null,
      min: [1, 'Estimate must be at least 1 minute'],
      max: [1440, 'Estimate must not exceed 24 hours'],
    },

    // ─── State ───
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'archived'],
      default: 'pending',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },

    // ─── Provenance ───
    sourceText: {
      type: String,
      required: true,
      maxlength: [5000, 'Source text too long'],
    },
    dumpBatchId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for dashboard queries
taskSchema.index({ userId: 1, category: 1, status: 1 });
taskSchema.index({ userId: 1, createdAt: -1 });
```

---

### 1.4 LLM System Prompt Design

The system prompt is the critical control surface. It must:
- Force **pure JSON array output** (no markdown fences, no explanations)
- Mirror our Task schema constraints exactly
- Handle edge cases (empty input, non-task content, ambiguity)

```javascript
const SYSTEM_PROMPT = `You are a task extraction engine. Your ONLY job is to convert raw, unstructured human thoughts into structured task objects.

RULES:
1. Output ONLY a valid JSON array. No markdown, no backticks, no explanations.
2. Each object in the array MUST have exactly these fields:
   - "title": string (max 200 chars) — clear, actionable task title starting with a verb
   - "description": string (max 1000 chars) — context, details, or notes
   - "priority": one of "low" | "medium" | "high" | "urgent"
   - "category": one of "today" | "this_week" | "backlog"
   - "tags": string[] (max 10 items) — relevant short labels (lowercase, no spaces)
   - "estimatedMinutes": number | null — estimated time in minutes (1-1440)
3. Categorization rules:
   - "today": tasks with explicit urgency, deadlines today, or words like "now", "ASAP", "tonight"
   - "this_week": tasks mentioning specific weekdays, "this week", "soon", "by Friday"
   - "backlog": everything else — ideas, someday tasks, vague intentions
4. Priority inference:
   - "urgent": deadlines, blockers, words like "critical", "ASAP", "emergency"
   - "high": important but not immediate — "important", "need to", "must"
   - "medium": standard tasks with moderate importance
   - "low": nice-to-have, exploratory, "maybe", "someday"
5. If the input contains NO actionable tasks, return an empty array: []
6. Split compound thoughts into separate tasks when they describe distinct actions.
7. Never invent tasks that aren't implied by the input.
8. If a time estimate is unclear, set estimatedMinutes to null.

EXAMPLE INPUT: "I need to fix that login bug today it's breaking prod also should probably update the docs sometime and oh yeah buy groceries on the way home"

EXAMPLE OUTPUT:
[{"title":"Fix login bug in production","description":"Login bug is currently breaking production — investigate and patch immediately","priority":"urgent","category":"today","tags":["bugfix","production","auth"],"estimatedMinutes":60},{"title":"Update project documentation","description":"Documentation needs updating — schedule for later this week","priority":"low","category":"backlog","tags":["docs","maintenance"],"estimatedMinutes":120},{"title":"Buy groceries on the way home","description":"Pick up groceries today while commuting home","priority":"medium","category":"today","tags":["personal","errands"],"estimatedMinutes":30}]`;
```

---

## PHASE 2: Backend Implementation Plan

### 2.1 Project Structure

```
backend/
├── server.js                    # Entry point: Express app + server start
├── package.json
├── .env.example                 # Template for env vars
├── .env                         # (gitignored) actual secrets
│
├── config/
│   ├── db.js                    # MongoDB connection with retry logic
│   ├── openai.js                # OpenAI client instantiation
│   └── env.js                   # Centralized env var validation
│
├── models/
│   ├── User.js                  # Mongoose User schema + model
│   └── Task.js                  # Mongoose Task schema + model
│
├── routes/
│   ├── taskRoutes.js            # POST /api/tasks/process-dump, GET /api/tasks
│   ├── authRoutes.js            # POST /api/auth/register, /login, /me
│   └── index.js                 # Route aggregator
│
├── controllers/
│   ├── taskController.js        # processDump(), getTasks(), toggleComplete()
│   └── authController.js        # register(), login(), getMe()
│
├── services/
│   ├── aiService.js             # Prompt assembly, OpenAI call, JSON parse
│   └── taskService.js           # Bulk insert, query builders
│
├── middleware/
│   ├── auth.js                  # JWT verification middleware
│   ├── errorHandler.js          # Global async error handler
│   ├── rateLimiter.js           # Rate limiting for AI endpoints
│   └── validate.js              # Zod-based request validation
│
├── prompts/
│   └── systemPrompt.js          # Centralized LLM system prompt
│
└── utils/
    ├── asyncHandler.js          # try/catch wrapper for async routes
    ├── AppError.js              # Custom error class with status codes
    └── logger.js                # Pino / Winston structured logger
```

---

### 2.2 Development Steps (Ordered)

#### Step 1 — Project Initialization & Config

| Item | Detail |
|------|--------|
| **Runtime** | Node.js 20+ (ES Modules via `"type": "module"` in package.json) |
| **Package manager** | npm |
| **Dependencies** | `express`, `mongoose`, `openai`, `dotenv`, `cors`, `helmet`, `express-rate-limit`, `jsonwebtoken`, `bcryptjs`, `zod`, `uuid`, `pino` |
| **Dev deps** | `nodemon`, `eslint` |

Environment variables (`.env`):
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/braindump
JWT_SECRET=<random-64-char-hex>
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=20
```

#### Step 2 — Database Connection (`config/db.js`)

- Use `mongoose.connect()` with retry logic (3 attempts, exponential backoff)
- Handle `connected`, `error`, `disconnected` events
- Graceful shutdown on `SIGINT` / `SIGTERM`
- Connection string validated via `config/env.js`

#### Step 3 — Express Server Setup (`server.js`)

Boot sequence:
1. Load env vars (`dotenv/config`)
2. Validate env (`config/env.js`)
3. Connect to MongoDB (`config/db.js`)
4. Initialize Express app
5. Mount global middleware:
   - `helmet()` — security headers
   - `cors({ origin: CORS_ORIGIN, credentials: true })`
   - `express.json({ limit: '10kb' })` — body size limit
   - Request logger (pino-http)
6. Mount route groups:
   - `/api/auth` → `authRoutes`
   - `/api/tasks` → `taskRoutes`
7. Mount global error handler
8. Start listening on `PORT`

#### Step 4 — Authentication Layer

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Create user, hash password, return JWT |
| `/api/auth/login` | POST | Validate credentials, return JWT |
| `/api/auth/me` | GET | Return current user from JWT |

- Passwords hashed with `bcryptjs` (12 salt rounds)
- JWT signed with `HS256`, contains `{ userId, email }`
- Auth middleware extracts `Bearer` token from `Authorization` header, verifies, attaches `req.user`

#### Step 5 — AI Service (`services/aiService.js`)

This is the core brain of the application. The flow:

```
processRawDump(rawText)
    │
    ├── 1. Validate rawText is non-empty string, ≤ 5000 chars
    │
    ├── 2. Assemble messages array:
    │      [
    │        { role: "system", content: SYSTEM_PROMPT },
    │        { role: "user",   content: rawText }
    │      ]
    │
    ├── 3. Call OpenAI:
    │      openai.chat.completions.create({
    │        model: "gpt-4o-mini",
    │        messages,
    │        temperature: 0.3,        // Low creativity for structured output
    │        max_tokens: 2000,
    │        response_format: { type: "json_object" }
    │      })
    │
    ├── 4. Extract content string from response.choices[0].message.content
    │
    ├── 5. JSON.parse() the content
    │      └── On failure: attempt regex cleanup, retry parse
    │          └── On second failure: throw AppError(502, 'AI returned invalid JSON')
    │
    ├── 6. Validate parsed array with Zod schema:
    │      z.array(z.object({
    │        title: z.string().max(200),
    │        description: z.string().max(1000).default(''),
    │        priority: z.enum(['low','medium','high','urgent']).default('medium'),
    │        category: z.enum(['today','this_week','backlog']),
    │        tags: z.array(z.string()).max(10).default([]),
    │        estimatedMinutes: z.number().min(1).max(1440).nullable().default(null),
    │      }))
    │
    └── 7. Return validated task array
```

**Error recovery strategy:**
- If OpenAI returns markdown-fenced JSON → strip ` ```json ` and ` ``` ` before parsing
- If OpenAI returns an object instead of array → check for `tasks` or `items` key and extract
- If validation fails for individual items → filter out invalid, proceed with valid ones
- If zero valid items remain → return empty array (not an error)

#### Step 6 — Task Controller & Routes

##### POST `/api/tasks/process-dump`

```
Request body:  { "rawText": "string (1-5000 chars)" }
Auth:          Required (JWT)
Rate limit:    20 requests per 15 minutes

Flow:
1. Extract rawText from req.body
2. Validate with Zod
3. Generate dumpBatchId (uuid v4)
4. Call aiService.processRawDump(rawText)
5. Map results → add userId, sourceText, dumpBatchId to each task
6. Task.insertMany(mappedTasks)
7. Increment user.dumpCount, set user.lastDumpAt
8. Return { success: true, batchId, tasks: insertedTasks, count }
```

##### GET `/api/tasks`

```
Query params:  ?category=today|this_week|backlog&status=pending|completed
Auth:          Required (JWT)

Flow:
1. Build filter: { userId: req.user._id, ...queryFilters }
2. Task.find(filter).sort({ createdAt: -1 })
3. Return { success: true, tasks, count }
```

##### PATCH `/api/tasks/:id/toggle`

```
Auth:          Required (JWT)

Flow:
1. Find task by id + userId
2. Toggle isCompleted, set completedAt or null
3. Update status accordingly
4. Return updated task
```

##### DELETE `/api/tasks/:id`

```
Auth:          Required (JWT)

Flow:
1. Find task by id + userId
2. Delete (or set status = 'archived')
3. Return { success: true }
```

#### Step 7 — Error Handling

**Custom error class (`utils/AppError.js`):**
```javascript
class AppError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

**Global error handler (`middleware/errorHandler.js`):**
- Operational errors → return `{ success: false, error: message }`
- Mongoose validation errors → extract field messages, return 400
- Mongoose duplicate key → return 409
- JWT errors → return 401
- Unknown errors in production → return generic 500, log full stack

**Async handler (`utils/asyncHandler.js`):**
```javascript
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

#### Step 8 — Rate Limiting (`middleware/rateLimiter.js`)

- Use `express-rate-limit` on the `/api/tasks/process-dump` endpoint
- Window: 15 minutes
- Max: 20 requests per user
- Key: `req.user._id` (per-user, not per-IP)
- Response: `429 Too Many Requests` with retry-after header

---

### 2.3 Security Checklist

| Concern | Solution |
|---------|----------|
| XSS | Helmet sets CSP, X-Content-Type-Options |
| Injection | Mongoose parameterized queries, Zod validation |
| Auth | JWT with httpOnly cookie option, bcrypt passwords |
| Data exposure | `select: false` on passwordHash, lean queries |
| Rate abuse | Per-user rate limiting on AI endpoints |
| Body size | `express.json({ limit: '10kb' })` |
| CORS | Strict origin whitelist |
| Secrets | dotenv, never committed, validated at boot |

---

### 2.4 NPM Scripts

```json
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "lint": "eslint ."
  }
}
```

---

### 2.5 Implementation Order Checklist

```
[ ] 1. npm init, install deps, create .env
[ ] 2. config/env.js — validate all env vars at boot
[ ] 3. config/db.js — MongoDB connection with retry
[ ] 4. models/User.js, models/Task.js — schemas
[ ] 5. utils/AppError.js, asyncHandler.js, logger.js
[ ] 6. middleware/errorHandler.js
[ ] 7. middleware/auth.js — JWT verification
[ ] 8. controllers/authController.js + routes/authRoutes.js
[ ] 9. prompts/systemPrompt.js — LLM prompt
[ ] 10. config/openai.js — client instantiation
[ ] 11. services/aiService.js — prompt assembly, call, parse, validate
[ ] 12. services/taskService.js — bulk insert, queries
[ ] 13. controllers/taskController.js + routes/taskRoutes.js
[ ] 14. middleware/rateLimiter.js
[ ] 15. server.js — wire everything together
[ ] 16. Test with Postman / curl
[ ] 17. Add comprehensive error logging
```
