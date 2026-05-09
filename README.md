# CRM Lead Management System

A comprehensive Customer Relationship Management (CRM) system for e-commerce lead management, built with Node.js/Express backend and React frontend.

## Features

### Core Functionality
- **Lead Capture**: Centralized lead intake from multiple sources (website forms, email, WhatsApp, Meta Ads)
- **Lead Management**: Complete lead lifecycle tracking with status management
- **Team Management**: Role-based access control with admin and team member roles
- **Assignment Engine**: Automatic and manual lead assignment capabilities
- **Activity Tracking**: Comprehensive audit trail for all lead activities
- **Analytics Dashboard**: Real-time insights and performance metrics

### Key Features
- ✅ Authentication & Authorization
- ✅ Role-based access (Admin/Team Member)
- ✅ Lead CRUD operations
- ✅ Team management
- ✅ User management
- ✅ Activity logging
- ✅ Duplicate lead detection
- ✅ Real-time dashboard
- ✅ Responsive design

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Multer** - File uploads

### Frontend
- **React 19** - UI framework
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Axios** - HTTP client

## Project Structure

```
crm/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── utils/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/crm_system
   JWT_SECRET=your_super_secret_jwt_key_here
   NODE_ENV=development
   ```

4. **Start the backend server**
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Environment setup**
   Create `.env` file:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start the frontend development server**
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

### Teams
- `GET /api/teams` - Get all teams
- `GET /api/teams/:id` - Get team by ID
- `POST /api/teams` - Create team (admin only)
- `PUT /api/teams/:id` - Update team (admin only)
- `DELETE /api/teams/:id` - Delete team (admin only)

### Leads
- `GET /api/leads` - Get all leads with pagination and filtering
- `GET /api/leads/:id` - Get lead by ID with activities
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead (admin only)
- `GET /api/leads/stats/overview` - Get lead statistics

## Database Schema

### Users
- name (String, required)
- email (String, required, unique)
- password (String, required)
- role (String: admin/team_member)
- team (ObjectId, ref: Team)
- isActive (Boolean, default: true)
- lastLogin (Date)

### Teams
- name (String, required, unique)
- description (String)
- teamLead (ObjectId, ref: User)
- members (Array of ObjectId, ref: User)
- assignmentSettings (Object)

### Leads
- name (String, required)
- phone (String, required)
- email (String)
- source (String, required)
- message (String)
- status (String: new/contacted/interested/negotiation/converted/lost)
- assignedTo (ObjectId, ref: User)
- assignedTeam (ObjectId, ref: Team)
- dealValue (Number)
- lostReason (String)
- customerData (Object)
- tags (Array of String)

### Activities
- lead (ObjectId, ref: Lead, required)
- type (String, required)
- description (String, required)
- performedBy (ObjectId, ref: User, required)
- metadata (Object)

## Lead Lifecycle

1. **New** - Initial lead capture
2. **Contacted** - First contact made
3. **Interested** - Lead shows interest
4. **Negotiation** - In negotiation phase
5. **Converted** - Successfully converted
6. **Lost** - Lead lost/not interested

## Authentication Flow

1. User logs in with email/password
2. Backend validates credentials and returns JWT token
3. Frontend stores token in localStorage
4. Token is sent with all subsequent API requests
5. Backend validates token for protected routes

## Role-Based Access Control

### Admin
- Manage all users
- Manage all teams
- Full access to all leads
- Delete permissions
- System configuration

### Team Member
- View assigned leads
- Update lead status
- Add notes and activities
- Limited user management (own profile)

## Development

### Running Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Building for Production
```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Note**: This CRM system is designed specifically for e-commerce lead management and can be customized to fit specific business requirements.
