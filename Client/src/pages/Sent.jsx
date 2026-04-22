import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, Table, Button, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import { Send as SendIcon, Mail, RefreshCw, ExternalLink } from "lucide-react";

const Sent = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const fetchSent = async () => {
    setLoading(true);
    try {
      const res = await api.get("/messages/sent");
      setItems(res.data.items || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to fetch sent messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get('/auth/me');
        const raw = me.data.user.displayName || me.data.user.username || '';
        const dn = raw ? raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
        setDisplayName(dn);
      } catch {}
      fetchSent();
    })();
  }, []);

  const capRecipient = (s) => {
    if (!s) return "-";
    const str = String(s);
    if (str.includes("@")) {
      const local = str.split("@")[0];
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const downloadOriginal = async (id) => {
    try {
      const fileRes = await api.get(`/messages/${id}/file/original`, { responseType: 'blob' });

      const mime = fileRes.headers['content-type'] || 'application/octet-stream';

      // Try to get filename from Content-Disposition
      const cd = fileRes.headers['content-disposition'] || '';
      const match = cd.match(/filename="(.+?)"/i);
      let name = match ? match[1] : 'original';

      // If no filename provided, infer extension from MIME type
      if (!match) {
        if (mime.includes('png')) name += '.png';
        else if (mime.includes('jpeg') || mime.includes('jpg')) name += '.jpg';
        else if (mime.includes('webp')) name += '.webp';
        else if (mime.includes('wav') || mime.includes('x-wav')) name += '.wav';
        else if (mime.includes('mp3') || mime.includes('mpeg')) name += '.mp3';
        else name += '.bin';
      }

      const blob = new Blob([fileRes.data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      toast.error('Original file unavailable');
    }
  };

  return (
    <div className="sent-page">
      <div className="page-header mb-4">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <div className="header-icon">
              <SendIcon size={32} />
            </div>
            <div>
              <h2 className="mb-1">Sent Messages</h2>
              <p className="text-muted mb-0">Dr. {displayName}</p>
            </div>
          </div>
          <Button 
            variant="outline-primary" 
            onClick={fetchSent}
            disabled={loading}
            className="d-flex align-items-center"
          >
            <RefreshCw size={18} className="me-2" />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {items.length === 0 ? (
            <div className="text-center py-5">
              <Mail size={64} className="text-muted mb-3" />
              <h5 className="text-muted">No sent messages yet</h5>
              <p className="text-muted">Messages you send will appear here</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 inbox-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Patient ID</th>
                    <th>Patient Name</th>
                    <th>Cipher Text</th>
                    <th>Original File</th>
                    <th>Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr key={m._id}>
                      <td><strong>Dr. {(m.recipientUsername ? (m.recipientUsername.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')) : capRecipient(m.recipient))}</strong></td>
                      <td><code className="patient-id-badge">{m.patient_id || '-'}</code></td>
                      <td>{m.patient_name || '-'}</td>
                      <td style={{maxWidth: 320}}>
                        <code className="text-muted small d-inline-block text-truncate" style={{maxWidth: 300}}>
                          {(m.vigenere_cipher || m.mono_cipher || '').slice(0, 100)}{((m.vigenere_cipher || m.mono_cipher || '').length>100)?'…':''}
                        </code>
                      </td>
                      <td>
                        {m.original_file_url ? (
                          <Button size="sm" variant="outline-secondary" onClick={()=> window.open(m.original_file_url, '_blank')}>
                            <ExternalLink size={16} className="me-1" /> Open
                          </Button>
                        ) : m.has_original ? (
                          <Button size="sm" variant="outline-secondary" onClick={()=> downloadOriginal(m._id)}>
                            <ExternalLink size={16} className="me-1" /> Download
                          </Button>
                        ) : (
                          <span className="text-muted small">-</span>
                        )}
                      </td>
                      <td>
                        <small className="text-muted">
                          {new Date(m.created_at || m.createdAt).toLocaleString()}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default Sent;
