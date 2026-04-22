import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, Table, Button, Alert, Toast, ToastContainer } from "react-bootstrap";
import { toast } from "react-toastify";
import {
  Inbox as InboxIcon,
  Mail,
  MailOpen,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

const Inbox = () => {
  const [items, setItems] = useState([]);
  // Decrypt now happens only via Decrypt page; remove modal state
  const [loading, setLoading] = useState(false);

  // Socket real-time notification state
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState(null);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await api.get("/messages/inbox?mine=true");
      setItems(res.data.items || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to fetch inbox");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  // Listen for real-time receive_message events via the global socket
  useEffect(() => {
    const handler = (payload) => {
      setToastData(payload);
      setShowToast(true);
      // Auto-refresh inbox to show the new message
      fetchInbox();
    };

    // Poll briefly for socket availability (it's set after login redirect)
    const interval = setInterval(() => {
      const socket = window.__medsecure_socket;
      if (socket) {
        socket.on('receive_message', handler);
        clearInterval(interval);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      const socket = window.__medsecure_socket;
      if (socket) {
        socket.off('receive_message', handler);
      }
    };
  }, []);

  // Removed inline decrypt action; users should use the Decrypt page

  const newMessages = items.filter((m) => !m.decrypted).length;

  const capSender = (s) => {
    if (!s) return "-";
    const str = String(s);
    if (str.includes("@")) {
      const local = str.split("@")[0];
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  /*** FIXED DOWNLOAD FUNCTION ***/
  const downloadFrom = async (urlPath) => {
    try {
      const fileRes = await api.get(urlPath, { responseType: "blob" });

      const mime =
        fileRes.headers["content-type"] || "application/octet-stream";

      // Extract filename from backend header if possible
      const cd = fileRes.headers["content-disposition"] || "";
      const match = cd.match(/filename="(.+?)"/i);
      let filename = match ? match[1] : "file";

      // If backend didn't provide filename → infer from MIME
      if (!match) {
        if (mime.includes("png")) filename += ".png";
        else if (mime.includes("jpeg") || mime.includes("jpg"))
          filename += ".jpg";
        else if (mime.includes("wav")) filename += ".wav";
        else filename += ".bin"; // last fallback
      }

      const blob = new Blob([fileRes.data], { type: mime });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      toast.error("Download unavailable");
    }
  };

  return (
    <div className="inbox-page">
      <div className="page-header mb-4">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <div className="header-icon">
              <InboxIcon size={32} />
            </div>
            <div>
              <h2 className="mb-1">Message Inbox</h2>
              <p className="text-muted mb-0">
                Encrypted patient data messages from colleague doctors
              </p>
            </div>
          </div>
          <Button
            variant="outline-primary"
            onClick={fetchInbox}
            disabled={loading}
            className="d-flex align-items-center"
          >
            <RefreshCw size={18} className="me-2" />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {newMessages > 0 && (
        <Alert variant="info" className="mb-4">
          <strong>
            You have {newMessages} new message{newMessages > 1 ? "s" : ""}!
          </strong>{" "}
          Click decrypt to view the patient data.
        </Alert>
      )}

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {items.length === 0 ? (
            <div className="text-center py-5">
              <Mail size={64} className="text-muted mb-3" />
              <h5 className="text-muted">No messages yet</h5>
              <p className="text-muted">
                Encrypted messages from other doctors will appear here
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 inbox-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>From Doctor</th>
                    <th>Patient ID</th>
                    <th>Patient Name</th>
                    <th>Stego File</th>
                    <th>Original File</th>
                    <th>Received</th>
                    {/* Action column removed: decrypt happens via Decrypt page */}
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr
                      key={m._id}
                      className={!m.decrypted ? "unread-message" : ""}
                    >
                      <td>
                        {m.decrypted ? (
                          <MailOpen size={20} className="text-muted" />
                        ) : (
                          <Mail size={20} className="text-primary" />
                        )}
                      </td>
                      <td>
                        <strong>Dr. {m.senderUsername ? (m.senderUsername.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')) : capSender(m.sender)}</strong>
                      </td>
                      <td>
                        <code className="patient-id-badge">
                          {m.patient_id || "-"}
                        </code>
                      </td>
                      <td>{m.patient_name || "-"}</td>

                      {/* STEGO DOWNLOAD */}
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          disabled={!m.has_stego}
                          onClick={() =>
                            downloadFrom(`/messages/${m._id}/file/stego`)
                          }
                        >
                          <ExternalLink size={16} className="me-1" /> Download
                        </Button>
                      </td>

                      {/* ORIGINAL DOWNLOAD */}
                      <td>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          disabled={!m.has_original}
                          onClick={() =>
                            downloadFrom(`/messages/${m._id}/file/original`)
                          }
                        >
                          <ExternalLink size={16} className="me-1" /> Download
                        </Button>
                      </td>

                      <td>
                        <small className="text-muted">
                          {new Date(m.createdAt || m.created_at).toLocaleString()}
                        </small>
                      </td>

                      {/* Action cell removed */}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* PayloadModal removed */}

      {/* Socket real-time Toast notification */}
      <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          autohide
          delay={6000}
          bg="info"
        >
          <Toast.Header closeButton>
            <strong className="me-auto">🔔 New Secure Message</strong>
            <small>{toastData?.timestamp ? new Date(toastData.timestamp).toLocaleTimeString() : ''}</small>
          </Toast.Header>
          <Toast.Body className="text-white">
            From <strong>Dr. {toastData?.fromName || 'Unknown'}</strong>
            {toastData?.patientId ? ` — Patient: ${toastData.patientId}` : ''}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
};

export default Inbox;
