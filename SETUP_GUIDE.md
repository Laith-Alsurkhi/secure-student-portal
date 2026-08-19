# Quick Setup Guide - Secure Student Portal

This guide will help you get the Secure Student Portal up and running in minutes.

## Prerequisites
- **Node.js** v14+ ([Download here](https://nodejs.org/))
- **npm** (comes with Node.js)
- A text editor or IDE

## Step-by-Step Setup

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Install Dependencies
```bash
npm install
```

This installs all required packages:
- `express` - Web server
- `sqlite3` - Database
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT tokens
- `helmet` - Security headers
- `cors` - Cross-origin support
- `express-rate-limit` - Rate limiting
- `validator` - Input validation
- `dotenv` - Environment variables

### Step 3: Verify .env File
Check that `.env` file exists in the `backend` directory with these values:

```
PORT=5000
JWT_SECRET=supersecretjwtkey1234567890abcdefghijklmn
ENCRYPTION_KEY=abcdef1234567890abcdef1234567890
CORS_ORIGIN=http://localhost:5000
NODE_ENV=development
```

**Note**: In production, generate strong random values using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Start the Server
```bash
npm start
```

You should see:
```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🔐 Secure Student Portal - Application Security         ║
║                                                              ║
║     Server running at http://localhost:5000                 ║
║                                                              ║
║     Frontend: http://localhost:5000                          ║
║                                                              ║
║     Default Admin:                                           ║
║     Email: admin@portal.com                                  ║
║     Password: Admin@12345                                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Step 5: Open in Browser
Navigate to: **http://localhost:5000**

## 🧪 Testing the Application

### Create a Student Account
1. Click **Sign Up**
2. Fill in the form:
   - Name: John Doe
   - Email: john@example.com
   - Student ID: STU123456
   - Phone: +1-555-123-4567
   - Password: MySecurePass123
3. Click **Create Account**
4. You'll be redirected to login

### Login as Student
1. Click **Login**
2. Enter your new credentials
3. Click **Login**
4. View your student dashboard

### Login as Admin
1. Click **Login**
2. Use admin credentials:
   - Email: `admin@portal.com`
   - Password: `Admin@12345`
3. You'll see the Admin Dashboard

### Admin Functions
1. **View Users**: See all registered students
2. **Manage Roles**: Change user roles
3. **Delete Users**: Remove user accounts
4. **View Audit Logs**: See security events

## 🔐 Security Features to Notice

- ✅ **Password Hashing**: All passwords encrypted with bcrypt
- ✅ **JWT Tokens**: Secure authentication tokens
- ✅ **Input Validation**: Form inputs validated server-side
- ✅ **Data Encryption**: Student ID and phone encrypted in database
- ✅ **Rate Limiting**: Login attempts limited to prevent brute force
- ✅ **Audit Logging**: All actions logged with IP address
- ✅ **HTTPS Headers**: Helmet.js security headers
- ✅ **Role-Based Access**: Admin-only features protected

## 📁 Project Structure

```
backend/
├── server.js          # Main application
├── database.js        # Database setup
├── package.json       # Dependencies
├── .env              # Configuration (don't commit!)
├── middleware/
│   ├── auth.js       # JWT verification
│   └── role.js       # Admin authorization
└── routes/
    ├── auth.js       # Signup/login
    ├── user.js       # User profile
    └── admin.js      # Admin functions

frontend/
├── index.html        # Home page
├── login.html        # Login page
├── signup.html       # Sign up page
├── dashboard.html    # User dashboard
├── admin.html        # Admin dashboard
├── css/
│   └── style.css     # Styling
└── js/
    ├── auth.js       # Auth utilities
    ├── dashboard.js  # Dashboard logic
    └── admin.js      # Admin logic
```

## 🐛 Troubleshooting

### "Port 5000 is already in use"
Change the PORT in `.env` to another number (e.g., 5001) and restart.

### "Cannot find module 'express'"
Run `npm install` in the backend directory.

### Database errors
Delete `backend/database.sqlite` and restart the server (it will recreate it).

### "JWT_SECRET not set"
Make sure `.env` file exists and has `JWT_SECRET` value.

### "CORS errors" in browser console
Check that `CORS_ORIGIN` in `.env` matches your frontend URL.

## 📊 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login user

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

### Admin (Admin Only)
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/role` - Change user role
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/audit-logs` - View audit logs

## 🔒 Security Best Practices

1. **Always use HTTPS** in production
2. **Change default admin password** immediately
3. **Generate strong JWT_SECRET** and ENCRYPTION_KEY
4. **Don't commit .env file** to version control
5. **Keep dependencies updated**
6. **Monitor audit logs** regularly
7. **Use strong passwords** (8+ characters)
8. **Never share credentials**

## 📚 Learn More

- **README.md** - Complete project documentation
- **docs/STRIDE_Threat_Model.md** - Security threat analysis
- **docs/DREAD_Risk_Assessment.md** - Risk evaluation
- **Code Comments** - Security explanations in source code

## 🚀 Next Steps

After setup:
1. Explore the application features
2. Review the security implementations in code
3. Read the threat model documentation
4. Run security scans (GitHub CodeQL, Snyk)
5. Experiment with different user roles
6. Monitor the audit logs

## ❓ Questions?

Refer to the main **README.md** for detailed information about:
- Project features
- Security implementations
- Technology stack
- Database schema
- Deployment instructions

---

**Happy learning! 🎓 This is an educational project demonstrating Application Security best practices.**
