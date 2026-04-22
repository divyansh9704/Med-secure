import React, { useState, useEffect } from "react";
import { Container, Card, Button, Row, Col } from "react-bootstrap";
import Encrypt from "./Encrypt";
import Decrypt from "./Decrypt";
import Logs from "./Logs";
import Profile from "./Profile";
import Sent from "./Sent";
import Inbox from "./Inbox";
import { Route, Routes, Link, NavLink } from "react-router-dom";
import { Lock, Unlock, Inbox as InboxIcon, FileText, Home, Shield, Mail, Activity, Send, Key, Database } from "lucide-react";
import { api } from "../lib/api";

const Overview = () => {
  const [stats, setStats] = useState({ totalMessages: 0, newMessages: 0, sentMessages: 0 });
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const me = await api.get('/auth/profile');
        const raw = me.data.user.username || '';
        const dn = raw ? raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
        setDisplayName(dn);
        const [inboxRes, sentRes] = await Promise.all([
          api.get('/messages/inbox?mine=true'),
          api.get('/messages/sent')
        ]);
        const messages = inboxRes.data.items || [];
        const sent = sentRes.data.items || [];
        setStats({
          totalMessages: messages.length,
          newMessages: messages.filter(m => !m.decrypted).length,
          sentMessages: sent.length
        });
      } catch (e) {
        console.error('Failed to fetch stats');
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="overview-page">
      <div className="page-header mb-4">
        <div className="d-flex align-items-center">
          <div className="header-icon">
            <Home size={32} />
          </div>
          <div>
            <h2 className="mb-1">Welcome Back, Dr. {displayName}</h2>
            <p className="text-muted mb-0">
              Secure steganography-based patient data exchange dashboard
            </p>
          </div>
        </div>
      </div>

      <Row className="g-4 mb-4">
        <Col md={6} lg={3}>
          <Card className="stat-card stat-card-primary">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="stat-label">Total Messages</p>
                  <h2 className="stat-value">{stats.totalMessages}</h2>
                </div>
                <div className="stat-icon stat-icon-primary">
                  <Mail size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stat-card stat-card-info">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="stat-label">New Messages</p>
                  <h2 className="stat-value">{stats.newMessages}</h2>
                </div>
                <div className="stat-icon stat-icon-info">
                  <InboxIcon size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stat-card stat-card-success">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="stat-label">Security Status</p>
                  <h2 className="stat-value">Active</h2>
                </div>
                <div className="stat-icon stat-icon-success">
                  <Shield size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stat-card stat-card-warning">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="stat-label">Sent Messages</p>
                  <h2 className="stat-value">{stats.sentMessages}</h2>
                </div>
                <div className="stat-icon stat-icon-warning">
                  <Send size={24} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Body className="p-4">
              <h4 className="mb-3">Quick Actions</h4>
              <p className="text-muted mb-4">
                Secure, steganography-powered sharing of patient data within your hospital network. 
                Encrypt confidential information into PNG images or WAV audio files, send to colleague doctors, and decrypt on receipt.
              </p>
              
              <div className="quick-actions">
                <Button 
                  variant="outline-primary"
                  as={Link} 
                  to="/dashboard/encrypt" 
                  size="lg"
                  className="action-btn me-3 mb-3"
                >
                  <Lock size={20} className="me-2" />
                  Encrypt & Send Message
                </Button>
                <Button 
                  variant="outline-primary" 
                  as={Link} 
                  to="/dashboard/inbox"
                  size="lg"
                  className="action-btn me-3 mb-3"
                >
                  <InboxIcon size={20} className="me-2" />
                  View Inbox ({stats.newMessages} new)
                </Button>
                <Button 
                  variant="outline-primary" 
                  as={Link} 
                  to="/dashboard/decrypt"
                  size="lg"
                  className="action-btn mb-3"
                >
                  <Unlock size={20} className="me-2" />
                  Decrypt Message
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="shadow-sm border-0 h-100 feature-card-overview">
            <Card.Body className="p-4">
              <h5 className="mb-3">Security Features</h5>
              <ul className="feature-list">
                <li>
                  <Shield size={18} className="me-2 text-primary" />
                  <div>
                    <strong>LSB Steganography</strong>
                    <p className="mb-0 small text-muted">Hide encrypted data in PNG/WAV files</p>
                  </div>
                </li>
                <li>
                  <Lock size={18} className="me-2 text-primary" />
                  <div>
                    <strong>Fernet Encryption</strong>
                    <p className="mb-0 small text-muted">AES-128 symmetric encryption for payloads</p>
                  </div>
                </li>
                <li>
                  <Key size={18} className="me-2 text-primary" />
                  <div>
                    <strong>Authenticated Encryption</strong>
                    <p className="mb-0 small text-muted">Fernet provides confidentiality & integrity (HMAC)</p>
                  </div>
                </li>
                <li>
                  <Activity size={18} className="me-2 text-primary" />
                  <div>
                    <strong>JWT Authentication</strong>
                    <p className="mb-0 small text-muted">Secure session management with tokens</p>
                  </div>
                </li>
                <li>
                  <Database size={18} className="me-2 text-primary" />
                  <div>
                    <strong> Audit Logs</strong>
                    <p className="mb-0 small text-muted">Complete trail of all security events</p>
                  </div>
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const Dashboard = () => {
  const [role, setRole] = useState('doctor');
  useEffect(() => {
    (async () => {
      try {
        const me = await api.get('/auth/profile');
        setRole(me.data.user.role);
      } catch {}
    })();
  }, []);

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <ul className="sidebar-nav">
          <li className="sidebar-nav-item">
            <NavLink to="/dashboard" end className="sidebar-nav-link">
              <Home /> Overview
            </NavLink>
          </li>
          <li className="sidebar-nav-item">
            <NavLink to="/dashboard/encrypt" className="sidebar-nav-link">
              <Lock /> Encrypt
            </NavLink>
          </li>
          <li className="sidebar-nav-item">
            <NavLink to="/dashboard/decrypt" className="sidebar-nav-link">
              <Unlock /> Decrypt
            </NavLink>
          </li>
          <li className="sidebar-nav-item">
            <NavLink to="/dashboard/inbox" className="sidebar-nav-link">
              <InboxIcon /> Inbox
            </NavLink>
          </li>
          <li className="sidebar-nav-item">
            <NavLink to="/dashboard/sent" className="sidebar-nav-link">
              <FileText /> Sent
            </NavLink>
          </li>
          {role === "admin" && (
            <li className="sidebar-nav-item">
              <NavLink to="/dashboard/logs" className="sidebar-nav-link">
                <FileText /> Logs
              </NavLink>
            </li>
          )}
        </ul>
      </aside>
      <main className="app-main">
        <Container fluid>
          <Routes>
            <Route index element={<Overview />} />
            <Route path="encrypt" element={<Encrypt />} />
            <Route path="decrypt" element={<Decrypt />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="sent" element={<Sent />} />
            <Route path="logs" element={<Logs />} />
            <Route path="profile" element={<Profile />} />
          </Routes>
        </Container>
      </main>
    </div>
  );
};

export default Dashboard;

