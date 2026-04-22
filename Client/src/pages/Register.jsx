import React, { useState } from "react";
import {QRCodeSVG} from "qrcode.react";
import { api } from "../lib/api";
import { Form, Button, Spinner } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [loading, setLoading] = useState(false);
  const [totp, setTotp] = useState(null);
  const nav = useNavigate();

  const calculatePasswordStrength = (pwd) => {
    if (!pwd) {
      setPasswordStrength("");
      return;
    }
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 2) setPasswordStrength("weak");
    else if (strength <= 3) setPasswordStrength("medium");
    else setPasswordStrength("strong");
  };

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    calculatePasswordStrength(pwd);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { username, email, password });
      if (res.data?.totp?.otpauth_url) {
        setTotp(res.data.totp);
        toast.success("Scan QR with Google Authenticator");
      } else {
        toast.success("Registered successfully. Please login.");
        setTimeout(() => nav("/login"), 800);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-welcome-panel">
        <div className="auth-welcome-content">
          <h1>Welcome, Doctor</h1>
          <p>Streamlined and secure care</p>
          <ul className="feature-list">
            <li>Encrypt patient data before sending</li>
            <li>Deliver securely to another doctor</li>
            <li>Audit every action for traceability</li>
          </ul>
        </div>
      </div>
      <div className="auth-form-panel">
        <div className="auth-form-content">
          <h3>Doctor Signup</h3>
          {!totp ? (
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
              <Form.Group className="mb-3">
                <Form.Label>USERNAME</Form.Label>
                <Form.Control 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
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
                    onChange={handlePasswordChange} 
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
                <div className="password-requirements mt-2">
                  <small className="text-muted d-block mb-1">Password must contain:</small>
                  <small className={`requirement-item ${password.length >= 8 ? 'requirement-met' : 'requirement-unmet'}`}>
                    • At least 8 characters
                  </small>
                  <small className={`requirement-item ${/[A-Z]/.test(password) ? 'requirement-met' : 'requirement-unmet'}`}>
                    • One uppercase letter
                  </small>
                  <small className={`requirement-item ${/[a-z]/.test(password) ? 'requirement-met' : 'requirement-unmet'}`}>
                    • One lowercase letter
                  </small>
                  <small className={`requirement-item ${/\d/.test(password) ? 'requirement-met' : 'requirement-unmet'}`}>
                    • One number
                  </small>
                  <small className={`requirement-item ${/[^a-zA-Z0-9]/.test(password) ? 'requirement-met' : 'requirement-unmet'}`}>
                    • One special character (!@#$%^&*)
                  </small>
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="password-strength-bar">
                      <div className={`password-strength-fill password-strength-${passwordStrength}`}></div>
                    </div>
                    <small className={`password-strength-text text-${passwordStrength === 'weak' ? 'danger' : passwordStrength === 'medium' ? 'warning' : 'success'}`}>
                      Password strength: {passwordStrength}
                    </small>
                  </div>
                )}
              </Form.Group>
              <Button type="submit" className="w-100" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : "Register"}
              </Button>
              <div className="auth-mode-toggle">
                <p className="text-muted mb-0">
                  Already have an account? <Link to="/login">Login</Link>
                </p>
              </div>
            </Form>
          ) : (
            <div className="totp-setup text-center p-4">
              <h4 className="mb-3">Scan QR with Google Authenticator</h4>
              <div className="d-flex justify-content-center mb-3">
                <QRCodeSVG value={totp.otpauth_url} size={180} bgColor="#f8f9fa" fgColor="#0077b6" level="H" includeMargin={true} />
              </div>
              <div className="mb-2">
                <strong>Secret:</strong> <span className="text-monospace">{totp.secret}</span>
              </div>
              <div className="mb-3 text-muted" style={{ fontSize: '0.95em' }}>
                Add this account to your Google Authenticator app. You will need to enter the code it generates when logging in.
              </div>
              <Button variant="primary" className="w-100" onClick={() => nav('/login')}>Proceed to Login</Button>
            </div>
          )}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default Register;

