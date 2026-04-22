import React from "react";
import { Container, Button, Row, Col, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Activity, FileText, Eye, CheckCircle, Key, Database, Users, Zap } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <div className="hero-section">
        <Container>
          <div className="hero-content text-center">
            <div className="mb-4">
              <span className="badge-pill">Steganography-Enabled</span>
              <span className="badge-pill">Encrypted</span>
              <span className="badge-pill">Secure</span>
            </div>
            <h1 className="hero-title">MedSecure</h1>
            <p className="hero-subtitle">Advanced Steganography-Powered Medical Data Exchange</p>
            <p className="hero-description">
              Empowering <span className="highlight">healthcare professionals</span> to securely exchange patient data using advanced steganography and encryption. Hide sensitive information inside images and audio files for total privacy and compliance.
            </p>
            <div className="hero-buttons">
             <Button size="lg" variant="outline-light me-3" onClick={() => navigate("/login")}>
                 Get Started
              </Button>
              <Button size="lg" variant="outline-light" onClick={() => navigate("/register")}>
                Sign Up
              </Button>
            </div>
          </div>
        </Container>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <Container>
          <h2 className="section-title text-center mb-5">Core Features</h2>
          <Row className="g-4">
            <Col md={4}>
              <Card className="feature-card h-100">
                <Card.Body className="text-center">
                  <div className="feature-icon mx-auto mb-3">
                    <Shield size={40} />
                  </div>
                  <h5 className="feature-title">LSB Steganography</h5>
                  <p className="feature-text">
                    Hide encrypted patient records within PNG images and WAV audio files using advanced Least Significant Bit techniques.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="feature-card h-100">
                <Card.Body className="text-center">
                  <div className="feature-icon mx-auto mb-3">
                    <Lock size={40} />
                  </div>
                  <h5 className="feature-title">Fernet Encryption</h5>
                  <p className="feature-text">
                    Patient data is encrypted with AES-128 Fernet encryption before embedding, ensuring only authorized recipients can decrypt.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="feature-card h-100">
                <Card.Body className="text-center">
                  <div className="feature-icon mx-auto mb-3">
                    <Key size={40} />
                  </div>
                  <h5 className="feature-title">Authenticated Encryption</h5>
                  <p className="feature-text">
                    Fernet tokens add integrity protection (HMAC) alongside AES encryption—no legacy ciphers, just modern cryptography.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="feature-card h-100">
                <Card.Body className="text-center">
                  <div className="feature-icon mx-auto mb-3">
                    <Users size={40} />
                  </div>
                  <h5 className="feature-title">Doctor-to-Doctor Messaging</h5>
                  <p className="feature-text">
                    Send encrypted patient data directly to colleague doctors with secure recipient email/username targeting.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="feature-card h-100">
                <Card.Body className="text-center">
                  <div className="feature-icon mx-auto mb-3">
                    <Database size={40} />
                  </div>
                  <h5 className="feature-title">MongoDB Audit Logs</h5>
                  <p className="feature-text">
                    Complete audit trail of all encryption, send, and decrypt activities stored securely for compliance and forensics.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="feature-card h-100">
                <Card.Body className="text-center">
                  <div className="feature-icon mx-auto mb-3">
                    <Eye size={40} />
                  </div>
                  <h5 className="feature-title">Payload Preview</h5>
                  <p className="feature-text">
                    Instantly preview the encrypted payload before embedding, ensuring accuracy and transparency for every message sent.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="feature-card h-100">
                <Card.Body className="text-center">
                  <div className="feature-icon mx-auto mb-3">
                    <Activity size={40} />
                  </div>
                  <h5 className="feature-title">JWT Authentication</h5>
                  <p className="feature-text">
                    Secure session management with JSON Web Tokens, ensuring authenticated access to patient data exchange.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* How It Works Section */}
      <div className="how-it-works-section py-5" style={{background: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)', color: 'white'}}>
        <Container>
          <h2 className="section-title text-center mb-5 text-white">How It Works</h2>
          <Row className="g-4 justify-content-center">
            <Col md={4} lg={3}>
              <div className="how-step-card text-center p-4 h-100" style={{background: 'rgba(255,255,255,0.08)', borderRadius: 16}}>
                <div className="mb-3" style={{fontSize: 32}}><Lock /></div>
                <h5 className="text-white mb-2">1. Secure Login with TOTP</h5>
                <p className="text-white-50">Doctors log in using password and TOTP code for strong two-factor authentication.</p>
              </div>
            </Col>
            <Col md={4} lg={3}>
              <div className="how-step-card text-center p-4 h-100" style={{background: 'rgba(255,255,255,0.08)', borderRadius: 16}}>
                <div className="mb-3" style={{fontSize: 32}}><FileText /></div>
                <h5 className="text-white mb-2">2. Encrypt & Preview Data</h5>
                <p className="text-white-50">Patient data is encrypted and previewed before being embedded in a PNG or WAV file.</p>
              </div>
            </Col>
            <Col md={4} lg={3}>
              <div className="how-step-card text-center p-4 h-100" style={{background: 'rgba(255,255,255,0.08)', borderRadius: 16}}>
                <div className="mb-3" style={{fontSize: 32}}><Shield /></div>
                <h5 className="text-white mb-2">3. Steganography Embedding</h5>
                <p className="text-white-50">Encrypted payload is hidden inside the cover file using LSB steganography.</p>
              </div>
            </Col>
            <Col md={4} lg={3}>
              <div className="how-step-card text-center p-4 h-100" style={{background: 'rgba(255,255,255,0.08)', borderRadius: 16}}>
                <div className="mb-3" style={{fontSize: 32}}><Users /></div>
                <h5 className="text-white mb-2">4. One-to-Many Messaging</h5>
                <p className="text-white-50">Send the stego file securely to one or multiple doctors at once for collaborative care.</p>
              </div>
            </Col>
            <Col md={4} lg={3}>
              <div className="how-step-card text-center p-4 h-100" style={{background: 'rgba(255,255,255,0.08)', borderRadius: 16}}>
                <div className="mb-3" style={{fontSize: 32}}><Key /></div>
                <h5 className="text-white mb-2">5. Extract & Decrypt</h5>
                <p className="text-white-50">Recipients upload the stego file to extract and decrypt patient data securely.</p>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Footer */}
      <div className="footer-section" style={{background: '#1a1a2e', color: '#fff', padding: '2rem 0'}}>
        <Container>
          <div className="text-center">
            <h5 className="mb-2" style={{color: '#00b4d8'}}>MedSecure</h5>
            <p className="text-white-50 small mb-3">
              Secure steganography-based patient data exchange for healthcare professionals.
            </p>
            <p className="text-center text-white-50 small mb-0">© 2025 MedSecure. All rights reserved.</p>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default Landing;
