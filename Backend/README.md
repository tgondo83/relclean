# Reliable Backend API

Backend API server for the Reliable application.

## Tech Stack

- Node.js
- Express
- TypeScript
- CORS enabled

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3000` by default.

## Available Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint

## API Endpoints

### Base URL
`http://localhost:3000/api`

### Orders
- `GET /api/orders` - Get all orders (optionally filter by branchId query param)
- `GET /api/orders/:id` - Get order by ID or order number
- `POST /api/orders` - Create new order (requires branchId and branchPrefix)
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

#### Branch-Specific Order Numbering
Orders are assigned branch-specific numbers with prefixes:
- Main Branch (MB): MB-001, MB-002, MB-003...
- Eastside Branch (EB): EB-001, EB-002, EB-003...
- Westside Branch (WB): WB-001, WB-002, WB-003...
- Downtown Branch (DB): DB-001, DB-002, DB-003...

Each branch maintains its own counter, starting from 001 and incrementing for each new order.

### Branches
- `GET /api/branches` - Get all branches
- `GET /api/branches/:id` - Get branch by ID
- `POST /api/branches` - Create new branch
- `PUT /api/branches/:id` - Update branch
- `DELETE /api/branches/:id` - Deactivate branch

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Hardware
- `GET /api/hardware` - Get all hardware items
- `GET /api/hardware/:id` - Get hardware item by ID
- `POST /api/hardware` - Create new hardware item
- `PUT /api/hardware/:id` - Update hardware item
- `DELETE /api/hardware/:id` - Delete hardware item

### Metrics
- `GET /api/metrics/dashboard` - Get dashboard metrics
- `GET /api/metrics/sales` - Get sales metrics
- `GET /api/metrics/performance` - Get performance metrics

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Health
- `GET /health` - Health check endpoint

## Environment Variables

- `PORT` - Server port (default: 3000)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:8080)
- `NODE_ENV` - Environment mode (development/production)
