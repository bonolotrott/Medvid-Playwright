import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import axios from 'axios';

// ============================================
// VOICE RECORDER COMPONENT
// ============================================
function VoiceRecorder({ patientId, consultationId, type, onUpload }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/mp3' });
        const file = new File([audioBlob], 'voice-note.mp3', { type: 'audio/mp3' });
        
        setUploading(true);
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('patientId', patientId);
        formData.append('consultationId', consultationId);
        formData.append('type', type);

        try {
          const res = await axios.post('http://localhost:5000/api/upload/voice', formData);
          if (res.data.success) {
            setAudioUrl(res.data.data.voiceUrl);
            toast.success('Voice note uploaded!');
            if (onUpload) onUpload(res.data.data.voiceUrl);
          }
        } catch (error) {
          toast.error('Upload failed');
        } finally {
          setUploading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording... Click stop when done');
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
  };

  return (
    <div className="voice-recorder">
      {!isRecording ? (
        <button onClick={startRecording} className="btn-primary">
          🎤 Record Voice
        </button>
      ) : (
        <button onClick={stopRecording} className="btn-danger">
          ⏹️ Stop Recording <span className="recording-indicator">●</span>
        </button>
      )}
      {uploading && <div className="spinner" style={{ width: '24px', height: '24px' }}></div>}
      {audioUrl && (
        <div className="audio-player">
          <audio controls src={audioUrl} />
          <p style={{ fontSize: '13px', color: '#10b981', marginTop: '4px' }}>✅ Voice note uploaded</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// VIDEO UPLOADER COMPONENT
// ============================================
function VideoUploader({ patientId, consultationId }) {
  const [videoFile, setVideoFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setVideoFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!videoFile) {
      toast.error('Please select a video');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('patientId', patientId);
    formData.append('consultationId', consultationId);
    formData.append('description', description);

    try {
      const res = await axios.post('http://localhost:5000/api/upload/patient-video', formData);
      if (res.data.success) {
        toast.success('Video uploaded! Doctor can now view it');
        setVideoFile(null);
        setPreview(null);
        setDescription('');
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      <h4 style={{ marginBottom: '12px' }}>📹 Upload Symptom Video</h4>
      
      <input 
        type="file" 
        accept="video/*" 
        onChange={handleFileSelect}
        className="input-field"
        style={{ padding: '8px' }}
      />
      
      {preview && (
        <div className="video-container" style={{ maxWidth: '300px', marginTop: '12px' }}>
          <video controls src={preview} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      
      <textarea
        placeholder="Describe your symptoms..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="input-field"
        rows="3"
        style={{ marginTop: '12px' }}
      />
      
      <button 
        onClick={handleUpload} 
        className="btn-primary" 
        disabled={uploading}
        style={{ marginTop: '12px' }}
      >
        {uploading ? 'Uploading...' : '📤 Upload Video'}
      </button>
    </div>
  );
}

// ============================================
// HOME PAGE
// ============================================
function Home() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)', color: 'white' }}>
      <div className="container" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '56px', marginBottom: '16px' }}>🏥 MedVid</h1>
          <p style={{ fontSize: '22px', marginBottom: '16px', opacity: 0.9 }}>Smart Healthcare with Video & Voice Consultations</p>
          <p style={{ fontSize: '17px', marginBottom: '40px', opacity: 0.8, maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            No more lost files, crowded queues, or confusing diagnoses.
            Get personalized video and voice feedback from your doctor.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn-primary" style={{ background: 'white', color: '#1e40af' }}>
              📝 Register as Patient
            </Link>
            <Link to="/doctor-login" className="btn-primary" style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid white' }}>
              👨‍⚕️ Doctor Login
            </Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginTop: '80px' }}>
          <div className="card" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>🎙️ Voice & Video</h3>
            <p style={{ opacity: 0.8 }}>Get voice notes and video explanations from your doctor</p>
          </div>
          <div className="card" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>📹 Upload Symptoms</h3>
            <p style={{ opacity: 0.8 }}>Upload videos of your symptoms for better diagnosis</p>
          </div>
          <div className="card" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>🔒 Secure Records</h3>
            <p style={{ opacity: 0.8 }}>Your medical records are encrypted and secure</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PATIENT REGISTRATION
// ============================================
function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    email: '', 
    dateOfBirth: '', 
    gender: 'Male' 
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/patients/register', formData);
      if (res.data.success) {
        toast.success('Registration successful!');
        navigate(`/patient/${res.data.data.patientId}`);
      }
    } catch (error) {
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', marginBottom: '24px' }}>📝 Patient Registration</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label className="label">Full Name *</label>
            <input type="text" className="input-field" placeholder="Enter your full name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label className="label">Phone Number *</label>
            <input type="tel" className="input-field" placeholder="10-digit number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label className="label">Email</label>
            <input type="email" className="input-field" placeholder="email@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label className="label">Date of Birth</label>
            <input type="date" className="input-field" value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label className="label">Gender</label>
            <select className="input-field" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '16px' }}>
          Already have an account? <Link to="/login" style={{ color: '#3b82f6' }}>Login</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
          <Link to="/" style={{ color: '#6b7280' }}>← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}

// ============================================
// PATIENT LOGIN
// ============================================
function PatientLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/patients/phone/${phone}`);
      if (res.data.success) {
        toast.success('Login successful!');
        navigate(`/patient/${res.data.data.patientId}`);
      }
    } catch (error) {
      toast.error('Patient not found. Please register.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', marginBottom: '24px' }}>🔑 Patient Login</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label className="label">Phone Number</label>
            <input type="tel" className="input-field" placeholder="Enter your 10-digit phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '16px' }}>
          Don't have an account? <Link to="/register" style={{ color: '#3b82f6' }}>Register</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
          <Link to="/" style={{ color: '#6b7280' }}>← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}

// ============================================
// DOCTOR LOGIN
// ============================================
function DoctorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/doctor/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('medvid_token', res.data.data.token);
        toast.success('Login successful!');
        navigate(`/doctor/${res.data.data.doctor.doctorId}`);
      }
    } catch (error) {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', marginBottom: '8px' }}>👨‍⚕️ Doctor Login</h2>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>Enter your credentials to access the dashboard</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label className="label">Email</label>
            <input type="email" className="input-field" placeholder="doctor@medvid.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label className="label">Password</label>
            <input type="password" className="input-field" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div style={{ marginTop: '16px', padding: '12px', background: '#fef3c7', borderRadius: '6px' }}>
          <p style={{ fontSize: '13px', color: '#92400e', textAlign: 'center' }}>
            <strong>Default:</strong> doctor@medvid.com / password123
          </p>
        </div>
        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#6b7280' }}>
          <Link to="/" style={{ color: '#6b7280' }}>← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}

// ============================================
// PATIENT DASHBOARD (No Queue Status)
// ============================================
function PatientDashboard() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientRes, historyRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/patients/${id}`),
          axios.get(`http://localhost:5000/api/consultations/patient/${id}`)
        ]);
        setPatient(patientRes.data.data);
        setConsultations(historyRes.data.data || []);
      } catch (error) {
        toast.error('Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div className="spinner"></div></div>;
  }

  const latestConsultation = consultations.length > 0 ? consultations[0] : null;

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>👋 Welcome, {patient?.name}!</h1>
            <p style={{ color: '#6b7280' }}>Patient ID: <strong>{patient?.patientId}</strong></p>
            <p style={{ color: '#6b7280' }}>📱 {patient?.phone}</p>
          </div>
          <Link to="/" className="btn-secondary">Logout</Link>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to={`/history/${id}`} className="btn-primary">📋 View History</Link>
          <button onClick={() => setShowUpload(!showUpload)} className="btn-primary" style={{ background: '#8b5cf6' }}>
            {showUpload ? '📹 Hide Upload' : '📹 Upload Symptoms'}
          </button>
        </div>
      </div>

      {showUpload && latestConsultation && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>📹 Upload Your Symptoms</h3>
          <VideoUploader 
            patientId={id} 
            consultationId={latestConsultation.consultationId || 'CON123456'} 
          />
          
          <div className="media-section" style={{ marginTop: '16px' }}>
            <h4>🎙️ Voice Question for Doctor</h4>
            <VoiceRecorder 
              patientId={id} 
              consultationId={latestConsultation.consultationId || 'CON123456'} 
              type="patient"
            />
          </div>
        </div>
      )}

      {consultations.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>📋 Recent Consultations</h2>
          {consultations.slice(0, 3).map((consult) => (
            <div key={consult._id} style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontWeight: '600' }}>Dr. {consult.doctor?.name}</p>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>{new Date(consult.consultationDate).toLocaleDateString()}</p>
                  <p style={{ fontSize: '14px' }}>{consult.diagnosis}</p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {consult.doctorVoiceNote && <span className="badge badge-info">🎙️ Voice</span>}
                    {consult.doctorVideoUrl && <span className="badge badge-info">📹 Video</span>}
                    {consult.patientVoiceNote && <span className="badge badge-success">🎤 Your Voice</span>}
                    {consult.patientVideoUrl && <span className="badge badge-success">📹 Your Video</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {consult.doctorVoiceNote && (
                    <audio controls src={consult.doctorVoiceNote} style={{ maxWidth: '150px' }} />
                  )}
                  {consult.doctorVideoUrl && (
                    <Link to={`/video/${consult.consultationId}`} className="btn-primary" style={{ fontSize: '14px', padding: '8px 16px' }}>
                      📹 Watch
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
          {consultations.length > 3 && (
            <Link to={`/history/${id}`} style={{ color: '#3b82f6' }}>View all {consultations.length} consultations →</Link>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// DOCTOR DASHBOARD
// ============================================
function DoctorDashboard() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/doctors/dashboard/${id}`);
        if (res.data.success) {
          setDoctor(res.data.data.doctor);
          setQueue(res.data.data.queue);
          setStats(res.data.data.stats);
        }
      } catch (error) {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const startConsultation = async () => {
    try {
      const res = await axios.post(`http://localhost:5000/api/queue/doctor/${id}/start`);
      if (res.data.success) {
        setSelectedPatient(res.data.data.patient);
        toast.success(`Now consulting: ${res.data.data.patient.name}`);
        window.location.reload();
      }
    } catch (error) {
      toast.error('No patients in queue');
    }
  };

  const completeConsultation = async (patientId) => {
    try {
      await axios.post(`http://localhost:5000/api/queue/doctor/${id}/complete/${patientId}`);
      toast.success('Consultation completed!');
      setSelectedPatient(null);
      window.location.reload();
    } catch (error) {
      toast.error('Failed to complete consultation');
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div className="spinner"></div></div>;
  }

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px' }}>👨‍⚕️ Dr. {doctor?.name}</h1>
          <p style={{ color: '#6b7280' }}>{doctor?.specialization} | Room {doctor?.roomNumber}</p>
        </div>
        <Link to="/" className="btn-secondary">Logout</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>Total Patients</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>{stats.totalPatients || 0}</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>Waiting</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.waitingPatients || 0}</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>Completed Today</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{stats.completedToday || 0}</p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px' }}>Current Queue</h2>
          <button onClick={startConsultation} className="btn-primary">📞 Call Next Patient</button>
        </div>

        {queue.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>No patients in queue</p>
        ) : (
          queue.map((item) => (
            <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f9fafb', borderRadius: '8px', marginBottom: '8px' }}>
              <div>
                <p style={{ fontWeight: '600' }}>{item.patient?.name}</p>
                <p style={{ fontSize: '13px', color: '#6b7280' }}>Token #{item.tokenNumber} | Wait: {item.estimatedWaitTime} min</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className={`badge ${item.status === 'waiting' ? 'badge-warning' : 'badge-success'}`}>{item.status}</span>
                {item.status === 'in-progress' && (
                  <button onClick={() => completeConsultation(item.patient?.patientId)} className="btn-primary" style={{ padding: '6px 16px', fontSize: '13px' }}>
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedPatient && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>📹 Patient Media for: {selectedPatient.name}</h3>
          
          <div className="media-section">
            <h4>Patient's Symptom Video</h4>
            <div className="video-container" style={{ maxWidth: '400px', marginTop: '8px' }}>
              <video controls style={{ width: '100%', height: '100%' }}>
                <source src="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4" type="video/mp4" />
              </video>
            </div>
          </div>

          <div className="media-section" style={{ marginTop: '16px' }}>
            <h4>🎙️ Doctor's Voice Note for Patient</h4>
            <VoiceRecorder 
              patientId={selectedPatient.patientId} 
              consultationId="CON123" 
              type="doctor"
            />
          </div>

          <div className="media-section" style={{ marginTop: '16px' }}>
            <h4>📹 Doctor's Video Explanation</h4>
            <button className="btn-primary">
              🎥 Record Video Explanation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CONSULTATION HISTORY (With Voice Notes)
// ============================================
function ConsultationHistory() {
  const { patientId } = useParams();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/consultations/patient/${patientId}`);
        setConsultations(res.data.data || []);
      } catch (error) {
        toast.error('Failed to load history');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [patientId]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div className="spinner"></div></div>;
  }

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Link to={`/patient/${patientId}`} className="btn-secondary">← Back</Link>
        <h1 style={{ fontSize: '28px' }}>📋 Consultation History</h1>
      </div>

      {consultations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#6b7280' }}>No consultations found.</p>
        </div>
      ) : (
        consultations.map((consult) => (
          <div key={consult._id} className="card" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '600' }}>Dr. {consult.doctor?.name}</p>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>{consult.doctor?.specialization}</p>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>{new Date(consult.consultationDate).toLocaleDateString()}</p>
                <p style={{ marginTop: '8px' }}><strong>Diagnosis:</strong> {consult.diagnosis}</p>
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {consult.doctorVideoUrl && <span className="badge badge-info">📹 Doctor Video</span>}
                  {consult.doctorVoiceNote && <span className="badge badge-info">🎙️ Doctor Voice</span>}
                  {consult.patientVideoUrl && <span className="badge badge-success">📹 Your Video</span>}
                  {consult.patientVoiceNote && <span className="badge badge-success">🎤 Your Voice</span>}
                </div>

                {consult.doctorVoiceNote && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>🎙️ Doctor's Voice Note</p>
                    <audio controls src={consult.doctorVoiceNote} style={{ width: '100%', maxWidth: '300px' }} />
                  </div>
                )}

                {consult.patientVoiceNote && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>🎤 Your Voice Note</p>
                    <audio controls src={consult.patientVoiceNote} style={{ width: '100%', maxWidth: '300px' }} />
                  </div>
                )}

                {consult.prescriptions && consult.prescriptions.length > 0 && (
                  <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                    💊 {consult.prescriptions.length} medicine(s) prescribed
                  </p>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {consult.doctorVideoUrl && (
                  <Link to={`/video/${consult.consultationId}`} className="btn-primary" style={{ fontSize: '14px', padding: '8px 16px' }}>
                    📹 Watch Video
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ============================================
// QUEUE STATUS
// ============================================
function QueueStatus() {
  const { patientId } = useParams();
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/queue/patient/${patientId}`);
        setQueue(res.data.data);
      } catch (error) {
        toast.error('Failed to fetch queue status');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [patientId]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div className="spinner"></div></div>;
  }

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Link to={`/patient/${patientId}`} className="btn-secondary">← Back</Link>
        <h1 style={{ fontSize: '28px' }}>📍 Queue Status</h1>
      </div>

      {!queue ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: '#6b7280' }}>No active queue position</p>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '72px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' }}>#{queue.tokenNumber}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px', maxWidth: '400px', margin: '0 auto 16px' }}>
            <div><p style={{ fontSize: '13px', color: '#6b7280' }}>Position</p><p style={{ fontSize: '24px', fontWeight: 'bold' }}>{queue.position}</p></div>
            <div><p style={{ fontSize: '13px', color: '#6b7280' }}>Wait Time</p><p style={{ fontSize: '24px', fontWeight: 'bold' }}>{queue.estimatedWaitTime} min</p></div>
          </div>
          <div><span className={`badge ${queue.status === 'waiting' ? 'badge-warning' : 'badge-success'}`}>{queue.status}</span></div>
          <p style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>Doctor: {queue.doctor?.name} - Room {queue.doctor?.roomNumber}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// VIDEO PLAYER (With Voice Notes)
// ============================================
function VideoPlayer() {
  const { consultationId } = useParams();
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/consultations/${consultationId}`);
        setConsultation(res.data.data);
      } catch (error) {
        toast.error('Failed to load video');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [consultationId]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div className="spinner"></div></div>;
  }

  if (!consultation) {
    return (
      <div className="container" style={{ paddingTop: '40px' }}>
        <p style={{ textAlign: 'center', color: '#6b7280' }}>Consultation not found</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
      <Link to={`/history/${consultation.patient?.patientId}`} className="btn-secondary" style={{ marginBottom: '16px', display: 'inline-block' }}>
        ← Back to History
      </Link>
      
      <div className="card">
        <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>📹 Consultation Details</h2>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>
          Dr. {consultation.doctor?.name} - {new Date(consultation.consultationDate).toLocaleDateString()}
        </p>
        
        {consultation.doctorVideoUrl && (
          <>
            <h4 style={{ marginBottom: '8px' }}>📹 Doctor's Video Explanation</h4>
            <div className="video-container">
              <video controls style={{ width: '100%', height: '100%' }} src={consultation.doctorVideoUrl}>
                Your browser does not support the video tag.
              </video>
            </div>
          </>
        )}

        {consultation.doctorVoiceNote && (
          <div style={{ marginTop: '16px', padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <h4 style={{ marginBottom: '8px', color: '#166534' }}>🎙️ Doctor's Voice Note</h4>
            <audio controls src={consultation.doctorVoiceNote} style={{ width: '100%' }} />
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
              💡 Listen to the doctor's voice explanation
            </p>
          </div>
        )}

        {consultation.patientVoiceNote && (
          <div style={{ marginTop: '16px', padding: '16px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <h4 style={{ marginBottom: '8px', color: '#1e40af' }}>🎤 Your Voice Note</h4>
            <audio controls src={consultation.patientVoiceNote} style={{ width: '100%' }} />
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
              💡 This is the voice note you sent to the doctor
            </p>
          </div>
        )}

        {consultation.patientVideoUrl && (
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ marginBottom: '8px' }}>📹 Your Symptom Video</h4>
            <div className="video-container">
              <video controls style={{ width: '100%', height: '100%' }} src={consultation.patientVideoUrl}>
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}
        
        <div style={{ marginTop: '16px' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '4px' }}>📋 Diagnosis</h3>
          <p style={{ color: '#374151' }}>{consultation.diagnosis}</p>
        </div>

        {consultation.symptoms && consultation.symptoms.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '4px' }}>🔍 Symptoms</h3>
            <ul style={{ listStyle: 'disc', paddingLeft: '20px' }}>
              {consultation.symptoms.map((symptom, idx) => (
                <li key={idx} style={{ color: '#374151' }}>{symptom}</li>
              ))}
            </ul>
          </div>
        )}
        
        {consultation.prescriptions && consultation.prescriptions.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '4px' }}>💊 Prescriptions</h3>
            <ul style={{ listStyle: 'disc', paddingLeft: '20px' }}>
              {consultation.prescriptions.map((prescription, idx) => (
                <li key={idx} style={{ color: '#374151' }}>
                  <strong>{prescription.medicine}</strong> - {prescription.dosage}
                  {prescription.frequency && `, ${prescription.frequency}`}
                  {prescription.duration && `, ${prescription.duration}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {consultation.advice && consultation.advice.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '4px' }}>📌 Doctor's Advice</h3>
            <ul style={{ listStyle: 'disc', paddingLeft: '20px' }}>
              {consultation.advice.map((item, idx) => (
                <li key={idx} style={{ color: '#374151' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        
        {consultation.followUpDate && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#fef3c7', borderRadius: '6px' }}>
            <p style={{ color: '#92400e' }}>📅 Follow-up: {new Date(consultation.followUpDate).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================
function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<PatientLogin />} />
        <Route path="/doctor-login" element={<DoctorLogin />} />
        <Route path="/patient/:id" element={<PatientDashboard />} />
        <Route path="/doctor/:id" element={<DoctorDashboard />} />
        <Route path="/history/:patientId" element={<ConsultationHistory />} />
        <Route path="/queue/:patientId" element={<QueueStatus />} />
        <Route path="/video/:consultationId" element={<VideoPlayer />} />
      </Routes>
    </Router>
  );
}

export default App;