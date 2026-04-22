import React, { useState } from "react";
import { api } from "../lib/api";
import { Form, Button, Spinner } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { io } from "socket.io-client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totpSetup, setTotpSetup] = useState(null); // { qr, otpauthUrl }
  const [totpSetupCode, setTotpSetupCode] = useState("");
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password, totp });
      if (res.data?.requireTotpSetup) {
        setTotpSetup({ qr: res.data.qr, otpauthUrl: res.data.otpauthUrl });
        toast.info("Scan the QR code and enter the code from your authenticator app.");
        setLoading(false);
        return;
      }
      if (res.data?.token && typeof window !== 'undefined') {
        window.localStorage.setItem('auth_token', res.data.token);
      }
      // Connect socket and join doctor's personal room
      if (res.data?.user) {
        const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const socket = io(BACKEND_URL, { transports: ['websocket'] });
        socket.on('connect', () => {
          socket.emit('join_room', {
            doctorId: res.data.user.username,
            doctorName: res.data.user.username
          });
        });
        // Store socket on window so Navbar/Inbox can access it
        window.__medsecure_socket = socket;
      }
      toast.success("Logged in successfully");
      setTimeout(() => nav("/dashboard"), 500);
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-totp", { identifier: email, totp: totpSetupCode });
      if (res.data?.ok) {
        toast.success("TOTP setup complete. Please log in again.");
        setTotpSetup(null);
        setTotpSetupCode("");
        setTotp("");
      } else {
        toast.error(res.data?.error || "Verification failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-welcome-panel">
        <div className="auth-welcome-content">
          <h1>Welcome, Doctor</h1>
          <p>Secure steganography-based patient data exchange</p>
          <ul className="feature-list">
            <li>Hide patient info in images and audio files</li>
            <li>Send encrypted data to colleague doctors</li>
            <li>Track all activities with complete audit logs</li>
          </ul>
        </div>
      </div>
      <div className="auth-form-panel">
        <div className="auth-form-content">
          <h3>Doctor Login</h3>
          {!totpSetup ? (
            <Form onSubmit={submit}>
              <Form.Group className="mb-3">
                <Form.Label>EMAIL</Form.Label>
                <Form.Control 
                  type="email"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  disabled={loading}
                />
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Label>PASSWORD</Form.Label>
                <div style={{ position: 'relative' }}>
                  <Form.Control 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6c757d'
                    }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Label>Authenticator Code</Form.Label>
                <Form.Control
                  type="text"
                  value={totp}
                  onChange={e => setTotp(e.target.value)}
                  required
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  disabled={loading}
                  autoComplete="one-time-code"
                />
                <Form.Text className="text-muted">Open your Google Authenticator app and enter the 6-digit code.</Form.Text>
              </Form.Group>
              <Button type="submit" className="w-100" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : "Login"}
              </Button>
              <div className="auth-mode-toggle">
                <p className="text-muted mb-0">
                  Don't have an account? <Link to="/register">Sign Up</Link>
                </p>
              </div>
            </Form>
          ) : (
            <Form onSubmit={handleTotpSetup}>
              <div className="text-center mb-3">
                <p>Scan this QR code with your authenticator app:</p>
                <img src={totpSetup.qr} alt="TOTP QR Code" style={{ maxWidth: 200, margin: '0 auto' }} />
              </div>
              <Form.Group className="mb-4">
                <Form.Label>Enter 6-digit code from app</Form.Label>
                <Form.Control
                  type="text"
                  value={totpSetupCode}
                  onChange={e => setTotpSetupCode(e.target.value)}
                  required
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  disabled={loading}
                  autoComplete="one-time-code"
                />
              </Form.Group>
              <Button type="submit" className="w-100" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : "Verify & Complete Setup"}
              </Button>
            </Form>
          )}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default Login;

