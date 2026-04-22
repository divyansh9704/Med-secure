import React, { useEffect, useState } from "react";
import { Card, Form, Button, Row, Col, Alert, Spinner, Badge } from "react-bootstrap";
import { User, Mail, Shield, Calendar, Edit3, Check, X } from "lucide-react";
import { api } from "../lib/api";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ username: "", email: "", role: "", createdAt: "" });
  const [original, setOriginal] = useState({ username: "", email: "" });

  const load = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.get("/auth/profile");
      const u = res.data.user || {};
      const data = {
        username: u.username || "",
        email: u.email || "",
        role: u.role || "",
        createdAt: u.createdAt || ""
      };
      setForm(data);
      setOriginal({ username: data.username, email: data.email });
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = { username: form.username, email: form.email };
      const res = await api.put("/auth/profile", payload);
      const msg = res.data.tokenRefreshed 
        ? "Profile updated successfully. Session refreshed with new username." 
        : "Profile updated successfully.";
      setSuccess(msg);
      const u = res.data.user || {};
      const data = {
        username: u.username || form.username,
        email: u.email || form.email,
        role: u.role || form.role,
        createdAt: u.createdAt || form.createdAt
      };
      setForm(data);
      setOriginal({ username: data.username, email: data.email });
      
      // Reload page after 1.5s if username changed to refresh navbar
      if (res.data.tokenRefreshed) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = form.username !== original.username || form.email !== original.email;

  const initials = (() => {
    if (!form.username) return "";
    const parts = form.username.split(" ").filter(Boolean);
    const first = parts[0]?.charAt(0) || "";
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (first + last).toUpperCase();
  })();

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      });
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="profile-page">
      <div className="page-header mb-4">
        <h2 className="mb-1">
          <User size={28} className="me-3" style={{ color: '#00b4d8' }} />
          My Profile
        </h2>
        <p className="text-muted mb-0">Manage your account settings and preferences</p>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess("")}>{success}</Alert>}

      {loading ? (
        <Card className="shadow-sm border-0">
          <Card.Body className="p-5 text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 mb-0 text-muted">Loading profile...</p>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-4">
          {/* Profile Overview Card */}
          <Col lg={4}>
            <Card className="shadow-sm border-0 h-100" style={{ 
              background: 'linear-gradient(135deg, #1a4971 0%, #0d2c47 100%)',
              color: 'white'
            }}>
              <Card.Body className="p-4 text-center">
                <div
                  className="mx-auto mb-3 d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.2)",
                    color: "#fff",
                    fontSize: 36,
                    fontWeight: 700,
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  {initials || <User size={40} />}
                </div>
                <h5 className="mb-1" style={{ color: 'white', fontWeight: 700 }}>{form.username}</h5>
                <p className="text-white-50 small mb-3">{form.email || "No email set"}</p>
                <Badge 
                  bg={form.role === "admin" ? "danger" : "info"} 
                  className="px-3 py-2"
                  style={{ 
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  <Shield size={14} className="me-1" />
                  {form.role === "admin" ? "Administrator" : "Doctor"}
                </Badge>
                <hr className="my-3" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                <div className="d-flex align-items-center justify-content-center text-white-50 small">
                  <Calendar size={14} className="me-2" />
                  <span>Joined {formatDate(form.createdAt)}</span>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Edit Profile Form */}
          <Col lg={8}>
            <Card className="shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-4 pb-3" style={{ borderBottom: '2px solid #e9ecef' }}>
                  <div
                    className="me-3 d-inline-flex align-items-center justify-content-center"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)",
                      color: "#fff",
                    }}
                  >
                    <Edit3 size={22} />
                  </div>
                  <div>
                    <h5 className="mb-0" style={{ color: '#1a4971', fontWeight: 700 }}>Edit Profile</h5>
                    <p className="mb-0 text-muted small">Update your account information</p>
                  </div>
                </div>
                <Form onSubmit={onSave}>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Group controlId="username">
                        <Form.Label className="fw-semibold">
                          <User size={16} className="me-2" style={{ color: '#00b4d8' }} />
                          Username
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="username"
                          value={form.username}
                          placeholder="Enter your username"
                          onChange={onChange}
                          required
                          minLength={3}
                        />
                        <Form.Text className="text-muted">
                          Minimum 3 characters. Used for login and identification.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group controlId="email">
                        <Form.Label className="fw-semibold">
                          <Mail size={16} className="me-2" style={{ color: '#00b4d8' }} />
                          Email Address
                        </Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={form.email}
                          placeholder="your@email.com"
                          onChange={onChange}
                        />
                        <Form.Text className="text-muted">
                          Used for notifications and account recovery.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group controlId="role">
                        <Form.Label className="fw-semibold">
                          <Shield size={16} className="me-2" style={{ color: '#00b4d8' }} />
                          Account Role
                        </Form.Label>
                        <Form.Control
                          type="text"
                          value={form.role === "admin" ? "Administrator" : "Doctor"}
                          disabled
                          readOnly
                          style={{ backgroundColor: "#f8f9fa" }}
                        />
                        <Form.Text className="text-muted">
                          Contact an administrator to change your role.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="mt-4 d-flex gap-2">
                    <Button 
                      type="submit" 
                      variant="primary" 
                      disabled={saving || !hasChanges}
                      className="d-flex align-items-center"
                    >
                      {saving ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Saving Changes...
                        </>
                      ) : (
                        <>
                          <Check size={18} className="me-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      onClick={load} 
                      disabled={saving || !hasChanges}
                      className="d-flex align-items-center"
                    >
                      <X size={18} className="me-2" />
                      Reset
                    </Button>
                  </div>
                  {hasChanges && (
                    <div className="mt-3 p-3" style={{ 
                      background: 'linear-gradient(135deg, #fff3cd, #fff8e1)',
                      borderRadius: '10px',
                      border: '1px solid #ffc107'
                    }}>
                      <small className="d-flex align-items-center" style={{ color: '#856404', fontWeight: 600 }}>
                        ⚠️ <span className="ms-2">You have unsaved changes</span>
                      </small>
                    </div>
                  )}
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default Profile;
