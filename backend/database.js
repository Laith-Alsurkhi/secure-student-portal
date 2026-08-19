// Security: Database setup with MongoDB
// This module connects to MongoDB Atlas and defines secure schemas

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  student_id_encrypted: {
    type: String,
    required: true
  },
  phone_encrypted: {
    type: String,
    required: true
  },
  password_hash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true
  },
  user_email: {
    type: String
  },
  ip_address: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// Connect to MongoDB Atlas
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('FATAL: MONGODB_URI is not set in .env file');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log('MongoDB connected successfully');

    await createDefaultAdmin();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create default admin account if it does not exist
const createDefaultAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ email: 'admin@portal.com' });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('Admin@12345', 10);

      await User.create({
        name: 'Admin User',
        email: 'admin@portal.com',
        student_id_encrypted: 'ADMIN_ID_ENCRYPTED',
        phone_encrypted: 'ADMIN_PHONE_ENCRYPTED',
        password_hash: hashedPassword,
        role: 'admin'
      });

      console.log('Default admin account created');
    } else {
      console.log('Default admin account already exists');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

connectDB();

module.exports = {
  User,
  AuditLog
};