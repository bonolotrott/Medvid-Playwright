const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// ============= MIDDLEWARE =============
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============= MONGODB CONNECTION =============
console.log('🔄 Connecting to MongoDB...');

mongoose.connect('mongodb://localhost:27017/medvid')
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => {
  console.error('❌ MongoDB Error:', err.message);
  console.log('💡 Make sure MongoDB is running: net start MongoDB');
});

// ============= PATIENT SCHEMA =============
const patientSchema = new mongoose.Schema({
  patientId: { type: String, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: String,
  password: String,
  dateOfBirth: Date,
  gender: String,
  createdAt: { type: Date, default: Date.now }
});
const Patient = mongoose.model('Patient', patientSchema);

// ============= DOCTOR SCHEMA =============
const doctorSchema = new mongoose.Schema({
  doctorId: { type: String, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  specialization: String,
  roomNumber: String,
  phone: String,
  isAvailable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
const Doctor = mongoose.model('Doctor', doctorSchema);

// ============= CONSULTATION SCHEMA =============
const consultationSchema = new mongoose.Schema({
  consultationId: { type: String, unique: true },
  patientId: { type: String },
  doctorId: { type: String },
  diagnosis: String,
  symptoms: [String],
  prescriptions: [{
    medicine: String,
    dosage: String,
    frequency: String,
    duration: String
  }],
  advice: [String],
  doctorVideoUrl: String,
  doctorVoiceNote: String,
  patientVoiceNote: String,
  patientVideoUrl: String,
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'completed', 'results-ready'],
    default: 'pending'
  },
  consultationDate: { type: Date, default: Date.now },
  followUpDate: Date
});
const Consultation = mongoose.model('Consultation', consultationSchema);

// ============= CREATE DEFAULT DOCTOR =============
const createDefaultDoctor = async () => {
  try {
    const existing = await Doctor.findOne({ email: 'doctor@medvid.com' });
    if (!existing) {
      const doctor = new Doctor({
        doctorId: 'DOC123456',
        name: 'Dr. John Smith',
        email: 'doctor@medvid.com',
        password: await bcrypt.hash('password123', 10),
        specialization: 'General Medicine',
        roomNumber: '101',
        phone: '9876543210',
        isAvailable: true
      });
      await doctor.save();
      console.log('✅ Default doctor created');
    } else {
      console.log('✅ Doctor already exists');
    }
  } catch (error) {
    console.log('⚠️ Doctor creation error:', error.message);
  }
};

// Wait for MongoDB connection before creating doctor
setTimeout(createDefaultDoctor, 2000);

// ============= SOCKET.IO =============
io.on('connection', (socket) => {
  console.log('🔗 Client connected:', socket.id);
  
  socket.on('join-queue', (patientId) => {
    socket.join(`patient-${patientId}`);
    console.log(`Patient ${patientId} joined queue room`);
  });

  socket.on('queue-update', (data) => {
    io.to(`patient-${data.patientId}`).emit('queue-update', data);
  });

  socket.on('consultation-start', (data) => {
    io.to(`patient-${data.patientId}`).emit('consultation-start', data);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// ============= HEALTH CHECK =============
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MedVid Backend Running!', timestamp: new Date().toISOString() });
});

// ============= PATIENT REGISTRATION =============
app.post('/api/patients/register', async (req, res) => {
  console.log('📝 Registration request received');
  console.log('📦 Body:', req.body);
  
  try {
    const { name, phone, email, dateOfBirth, gender } = req.body;
    
    // Validate required fields
    if (!name || !phone) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'Name and Phone are required' 
      });
    }
    
    // Check if patient exists
    const existing = await Patient.findOne({ phone });
    if (existing) {
      console.log('❌ Patient already exists:', phone);
      return res.status(400).json({ 
        success: false, 
        message: 'Patient already exists with this phone number' 
      });
    }
    
    // Generate patient ID
    const patientId = `PAT${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
    console.log('🆔 Generated patient ID:', patientId);
    
    // Create patient
    const patient = new Patient({
      patientId,
      name,
      phone,
      email: email || '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || 'Other'
    });
    
    await patient.save();
    console.log('✅ Patient saved successfully:', patientId);
    
    res.status(201).json({
      success: true,
      data: {
        patientId: patient.patientId,
        name: patient.name,
        phone: patient.phone,
        email: patient.email
      },
      message: 'Patient registered successfully'
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed: ' + error.message 
    });
  }
});

// ============= GET PATIENT =============
app.get('/api/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching patient' });
  }
});

// ============= GET PATIENT BY PHONE =============
app.get('/api/patients/phone/:phone', async (req, res) => {
  try {
    const patient = await Patient.findOne({ phone: req.params.phone });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({
      success: true,
      data: {
        patientId: patient.patientId,
        name: patient.name,
        phone: patient.phone,
        email: patient.email
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error finding patient' });
  }
});

// ============= DOCTOR LOGIN =============
app.post('/api/auth/doctor/login', async (req, res) => {
  console.log('👨‍⚕️ Doctor login request');
  console.log('📦 Body:', req.body);
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password required' 
      });
    }
    
    const doctor = await Doctor.findOne({ email });
    
    if (!doctor) {
      console.log('❌ Doctor not found:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    const isValid = await bcrypt.compare(password, doctor.password);
    
    if (!isValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    console.log('✅ Doctor login successful:', doctor.doctorId);
    
    const token = jwt.sign(
      { id: doctor._id, doctorId: doctor.doctorId, role: 'doctor' },
      process.env.JWT_SECRET || 'medvid_secret_key_2026',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      data: {
        token,
        doctor: {
          doctorId: doctor.doctorId,
          name: doctor.name,
          specialization: doctor.specialization || 'General Medicine',
          roomNumber: doctor.roomNumber || '101'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed: ' + error.message 
    });
  }
});

// ============= DOCTOR DASHBOARD =============
app.get('/api/doctors/dashboard/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorId: req.params.id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    
    res.json({
      success: true,
      data: {
        doctor: {
          doctorId: doctor.doctorId,
          name: doctor.name,
          specialization: doctor.specialization || 'General Medicine',
          roomNumber: doctor.roomNumber || '101'
        },
        stats: {
          totalPatients: 150,
          waitingPatients: 3,
          completedToday: 12
        },
        queue: [
          {
            _id: '1',
            patient: { name: 'Raj Kumar', patientId: 'PAT123' },
            tokenNumber: 1,
            estimatedWaitTime: 15,
            status: 'waiting'
          }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dashboard' });
  }
});

// ============= PATIENT QUEUE STATUS =============
app.get('/api/patients/:id/queue', (req, res) => {
  res.json({
    success: true,
    data: {
      position: 1,
      estimatedWaitTime: 15,
      tokenNumber: 1,
      status: 'waiting',
      doctor: { name: 'Dr. John Smith', roomNumber: '101' },
      checkInTime: new Date().toISOString()
    }
  });
});

// ============= CONSULTATION HISTORY =============
app.get('/api/consultations/patient/:patientId', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: '1',
        consultationId: 'CON123456',
        doctor: { name: 'Dr. John Smith', specialization: 'General Medicine' },
        diagnosis: 'Viral Fever with mild dehydration',
        symptoms: ['Fever 38.5°C', 'Headache', 'Body aches'],
        prescriptions: [{ medicine: 'Paracetamol 500mg', dosage: '1 tablet', frequency: '3 times daily', duration: '5 days' }],
        advice: ['Drink plenty of fluids', 'Rest for 3 days'],
        doctorVideoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
        doctorVoiceNote: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
        patientVideoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
        consultationDate: new Date().toISOString(),
        followUpDate: new Date(Date.now() + 7*24*60*60*1000).toISOString()
      }
    ]
  });
});

// ============= GET SINGLE CONSULTATION =============
app.get('/api/consultations/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      consultationId: req.params.id,
      patient: { name: 'Raj Kumar', patientId: 'PAT123' },
      doctor: { name: 'Dr. John Smith', specialization: 'General Medicine' },
      diagnosis: 'Viral Fever with mild dehydration',
      symptoms: ['Fever 38.5°C', 'Headache', 'Body aches'],
      prescriptions: [{ medicine: 'Paracetamol 500mg', dosage: '1 tablet', frequency: '3 times daily', duration: '5 days' }],
      advice: ['Drink plenty of fluids', 'Rest for 3 days'],
      doctorVideoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
      doctorVoiceNote: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
      patientVideoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4',
      consultationDate: new Date().toISOString(),
      followUpDate: new Date(Date.now() + 7*24*60*60*1000).toISOString()
    }
  });
});

// ============= VOICE UPLOAD =============
app.post('/api/upload/voice', (req, res) => {
  console.log('🎙️ Voice upload');
  const { consultationId, type } = req.body;
  res.json({
    success: true,
    data: { voiceUrl: `https://medvid-storage/voice/${consultationId}-${Date.now()}.mp3` },
    message: 'Voice note uploaded successfully'
  });
});

// ============= PATIENT VIDEO UPLOAD =============
app.post('/api/upload/patient-video', (req, res) => {
  console.log('📹 Patient video upload');
  const { consultationId } = req.body;
  res.json({
    success: true,
    data: { videoUrl: `https://medvid-storage/videos/${consultationId}-${Date.now()}.mp4` },
    message: 'Video uploaded successfully'
  });
});

// ============= QUEUE ROUTES =============
app.post('/api/queue/add', (req, res) => {
  res.json({ success: true, data: { queue: { patient: { name: 'Raj Kumar' }, tokenNumber: 1 }, position: 1 }, message: 'Added to queue successfully' });
});

app.post('/api/queue/doctor/:doctorId/start', (req, res) => {
  res.json({ success: true, data: { patient: { name: 'Raj Kumar', patientId: 'PAT123' }, tokenNumber: 1, remaining: 1 }, message: 'Consultation started' });
});

app.post('/api/queue/doctor/:doctorId/complete/:patientId', (req, res) => {
  res.json({ success: true, message: 'Consultation completed successfully' });
});

app.get('/api/queue/patient/:patientId', (req, res) => {
  res.json({
    success: true,
    data: {
      tokenNumber: 1,
      position: 1,
      estimatedWaitTime: 15,
      status: 'waiting',
      doctor: { name: 'Dr. John Smith', roomNumber: '101' },
      checkInTime: new Date().toISOString()
    }
  });
});

// ============= START SERVER =============
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /api/patients/register - Register patient`);
  console.log(`   POST /api/auth/doctor/login - Doctor login`);
  console.log(`   GET  /api/health - Health check`);
});