# Autonex Resource Planning - Frontend

React frontend for the Autonex Project & Resource Management System.

## Features

- **Dashboard**: Overview of system status and critical alerts
- **Employee Management**: Full CRUD operations with allocation tracking
- **Project Management**: Create and manage projects with live calculations
- **Manpower Allocation**: Central operational screen for resource planning
- **Leave Management**: Track leaves and their impact on projects

## Tech Stack

- **React 18**: UI framework
- **React Router**: Client-side routing
- **TanStack Query (React Query)**: Server state management
- **Axios**: HTTP client
- **Tailwind CSS**: Styling
- **Vite**: Build tool
- **Lucide React**: Icons
- **date-fns**: Date formatting

## Setup

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

3. Build for production:
```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   │   └── Layout.jsx   # Main layout with navigation
│   ├── pages/           # Page components
│   │   ├── Dashboard.jsx
│   │   ├── EmployeesPage.jsx
│   │   ├── ProjectsPage.jsx
│   │   ├── ManpowerAllocationPage.jsx
│   │   └── LeavesPage.jsx
│   ├── services/        # API client
│   │   └── api.ts       # API service layer
│   ├── types/           # TypeScript types
│   │   └── index.ts     # Type definitions
│   ├── App.jsx          # Root component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Key Pages

### Dashboard
- System overview with statistics
- Critical project alerts
- Overloaded employee warnings

### Employees Page
- Employee resource pool
- Add/Edit/Delete employees
- Filter by skill and allocation status
- View current allocations

### Projects Page
- Project list with live calculations
- Add/Edit/Delete projects
- View risk levels and team capacity
- Daily target tracking

### Manpower Allocation Page
**Primary operational screen** - The main decision-making surface for PMs:
- Employee resource pool table
- Project planning surface table
- Allocate employees to projects
- View system recommendations
- Real-time capacity calculations

### Leaves Page
- Leave management
- Impact analysis on projects
- Warning generation for conflicts

## API Integration

The frontend communicates with the FastAPI backend at `http://localhost:8000/api/v1`.

API proxy is configured in `vite.config.js` for development.

## State Management

- **TanStack Query**: Server state, caching, and synchronization
- **React State**: Local UI state
- **Query Invalidation**: Automatic refetch on mutations

## Styling

Using Tailwind CSS with custom utilities:
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
- `.input`, `.card`, `.table`
- `.badge`, `.badge-green`, `.badge-yellow`, `.badge-red`

## Features by Page

### Real-time Calculations
All calculations happen on the backend and are displayed in the UI:
- Daily task targets
- Team capacity
- Risk levels
- Allocation status

### Warning System
Visual indicators for:
- Critical projects (red background)
- Overloaded employees (red badges)
- Capacity shortages (warning icons)
- Leave conflicts (impact analysis)

### Responsive Design
Optimized for desktop use with tables and complex data views.
