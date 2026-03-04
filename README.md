# Reliable - Full Stack Application

A modern full-stack application with a React frontend and Node.js/Express backend.

## Project Structure

```
Reliable/
├── Backend/              # Node.js + Express + TypeScript API server
│   ├── src/
│   │   ├── index.ts     # Main server file
│   │   └── routes/      # API route handlers
│   ├── .env             # Environment variables
│   ├── package.json
│   └── tsconfig.json
│
└── Frontend/            # React + Vite + TypeScript + Shadcn UI
    ├── src/
    │   ├── components/  # UI components
    │   ├── pages/       # Page components
    │   ├── lib/         # Utilities and API client
    │   └── main.tsx     # Entry point
    ├── .env             # Environment variables
    ├── package.json
    └── vite.config.ts
```

## Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library
- **React Router** - Navigation
- **Recharts** - Data visualization

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type safety
- **CORS** - Cross-origin resource sharing
- **tsx** - TypeScript execution

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or bun

### Installation

#### 1. Backend Setup

```bash
# Navigate to Backend directory
cd Backend

# Install dependencies
npm install

# Start development server
npm run dev
```

The backend server will run on `http://localhost:3000`

#### 2. Frontend Setup

```bash
# Navigate to Frontend directory
cd Frontend

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:8080`

### Environment Variables

#### Backend (.env)
```env
PORT=3000
FRONTEND_URL=http://localhost:8080
NODE_ENV=development
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
```

## API Endpoints

All API endpoints are prefixed with `/api`

### Branches
- `GET /api/branches` - Get all branches
- `GET /api/branches/:id` - Get specific branch
- `POST /api/branches` - Create new branch
- `PUT /api/branches/:id` - Update branch
- `DELETE /api/branches/:id` - Deactivate branch

Available branches:
- **Main Branch** (MB) - Prefix: MB
- **Eastside Branch** (EB) - Prefix: EB
- **Westside Branch** (WB) - Prefix: WB
- **Downtown Branch** (DB) - Prefix: DB

### Orders
- `GET /api/orders` - Get all orders (filter by `?branchId=1`)
- `GET /api/orders/:id` - Get specific order by ID or order number
- `POST /api/orders` - Create new order (requires `branchId` and `branchPrefix`)
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

**Branch-Specific Order Numbers**: Orders automatically receive branch-specific numbers (e.g., MB-001, EB-002). Each branch maintains its own sequential counter starting from 001.

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get specific customer
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Hardware
- `GET /api/hardware` - Get all hardware items
- `GET /api/hardware/:id` - Get specific hardware item
- `POST /api/hardware` - Create new hardware item
- `PUT /api/hardware/:id` - Update hardware item
- `DELETE /api/hardware/:id` - Delete hardware item

### Metrics
- `GET /api/metrics/dashboard` - Get dashboard metrics
- `GET /api/metrics/sales` - Get sales metrics
- `GET /api/metrics/performance` - Get performance metrics

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Health
- `GET /health` - Health check endpoint

## Features

### Frontend Features
- **Dashboard** - Overview with metrics, charts, and recent orders
- **Branch Management** - Multi-branch support with branch-specific order numbering
- **Orders Management** - Create and view orders with branch prefixes (MB-001, EB-001, etc.)
- **Customer Management** - Track customer information
- **Hardware Inventory** - Manage hardware items
- **Metrics & Analytics** - View business metrics
- **User Management** - Manage system users
- **Responsive Design** - Works on all device sizes
- **Dark Mode Support** - Theme switching capability

### Backend Features
- **RESTful API** - Clean API architecture
- **Branch-Specific Order Numbering** - Automatic order number generation per branch
- **CORS Enabled** - Cross-origin requests supported
- **TypeScript** - Type-safe codebase
- **Hot Reload** - Fast development with tsx watch mode
- **Error Handling** - Comprehensive error responses

## Development

### Backend Scripts
```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Frontend Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
```

## API Client Usage

The frontend includes a typed API client located at `Frontend/src/lib/api.ts`. Example usage:

```typescript
import { api } from '@/lib/api';

// Fetch orders
const { data, error } = await api.getOrders();

// Create new order
const result = await api.createOrder({
  customer: 'John Doe',
  items: ['Item 1', 'Item 2'],
  total: 150.00
});

// Check API health
const health = await api.healthCheck();
```

## Project Status

✅ Backend server created and running  
✅ Frontend connected to backend  
✅ API routes implemented  
✅ Dashboard displaying live data  
✅ CORS configured  
✅ TypeScript types defined  

## Deployment

The backend Express server serves the compiled React frontend as static files in production — one process, no CORS complexity.

### How it works

```
Browser → Render → Backend (Node/Express)
                        │
                        ├── /api/*      →  REST API handlers
                        ├── /health     →  Health check
                        └── /*          →  React SPA (Frontend/dist)
```

---

### Option A — Render.com (recommended, free tier available)

A `render.yaml` blueprint is included at the root for one-click deployment.

**Steps:**

1. Push the repo to GitHub (keep both `Backend/` and `Frontend/` in the same repo root).

2. Go to [render.com](https://render.com) → **New** → **Blueprint** → connect your GitHub repo.
   Render will auto-detect `render.yaml`.

3. In the Render dashboard, set the following **secret** environment variables (not in render.yaml):
   | Variable | Value |
   |---|---|
   | `MONGODB_URI` | `mongodb+srv://tgondo_db_user:...@dryclean.qvmlrcq.mongodb.net/?appName=DryClean` |
   | `JWT_SECRET` | Any strong random string (≥ 32 chars) |

4. Click **Apply** — Render builds and deploys automatically.

5. Your app will be live at `https://relclean.onrender.com` (or whatever name you choose).

---

### Option B — Vercel (frontend) + Render (backend)

Use this when you want the faster Vercel edge network for the React app and keep the Node backend on Render.

#### 1. Deploy the backend to Render

Same as Option A steps 1–5, but **skip** the `render.yaml` frontend serving — just deploy the API.

Set `FRONTEND_URL` on Render to include your Vercel domain (comma-separated):
```
FRONTEND_URL=https://relclean.onrender.com,https://relclean.vercel.app
```

#### 2. Deploy the frontend to Vercel

**Via Vercel dashboard:**

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo.
2. Set **Root Directory** to `Frontend`.
3. Framework preset: **Vite** (auto-detected).
4. Add an environment variable:
   | Name | Value |
   |---|---|
   | `VITE_API_URL` | `https://relclean.onrender.com/api` _(your Render backend URL)_ |
5. Click **Deploy**.

**Via Vercel CLI:**
```bash
npm install -g vercel
cd Frontend
vercel --prod
# When prompted, set VITE_API_URL to your Render backend URL
```

The included [Frontend/vercel.json](Frontend/vercel.json) handles SPA routing so React Router works on hard refresh.

---

### Option B — Manual build and deploy (any server/VPS)

#### 1. Build both projects

```bash
# From the repo root:
cd Frontend && npm install && npm run build
cd ../Backend && npm install && npm run build
```

#### 2. Set production environment variables on the server

Create `Backend/.env` (or export as system env vars):

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://tgondo_db_user:...@dryclean.qvmlrcq.mongodb.net/?appName=DryClean
JWT_SECRET=<strong-random-secret-min-32-chars>
FRONTEND_URL=https://your-domain.com
```

> `FRONTEND_URL` is only used for the CORS allow-list in production; it is not strictly required when the frontend is served from the same origin.

#### 3. Start the server

```bash
node Backend/dist/index.js
```

The server serves:
- All `/api/*` routes as the REST API
- `/health` as a health-check
- Everything else as React SPA from `Frontend/dist/`

For a persistent process, use **PM2**:

```bash
npm install -g pm2
pm2 start Backend/dist/index.js --name relclean
pm2 save && pm2 startup
```

---

### Backend Scripts (updated)

```bash
npm run dev        # Development server with hot reload (tsx watch)
npm run build      # Compile TypeScript → dist/
npm run build:all  # Build frontend + backend in one command
npm start          # Run compiled production server
```

---

## License

ISC
