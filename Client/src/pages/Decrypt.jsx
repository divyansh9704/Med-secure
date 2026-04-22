import React, { useState } from "react";
import { api } from "../lib/api";
import { Card, Form, Button, Spinner, Alert } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import { Unlock, FileSearch, Upload } from "lucide-react";
import PayloadModal from "../components/PayloadModal";

const Decrypt = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [open, setOpen] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile?.name || "");
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const bytes = new Uint8Array(reader.result);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          resolve(btoa(binary));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });

  const submit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setLoading(true);

    try {
      const b64 = await fileToBase64(file);
      const mime = file.type || "application/octet-stream";

      const res = await api.post("/messages/extract", {
        file: { b64, mime, filename: file.name },
      });

      // Backend returns: { patient_id, patient_name, decrypted_message, payload, cipher_text }
      const decrypted = res.data?.payload;
      if (!decrypted) {
        toast.error(res.data?.message || "Could not read hidden data");
        return;
      }

      // Normalize for modal
      const modalData = {
        patient_id: decrypted.patient_id || res.data.patient_id,
        patient_name: decrypted.patient_name || res.data.patient_name,
        message: decrypted.message || res.data.decrypted_message,
        sender: decrypted.sender,
        recipient: decrypted.recipient,
        created_at: decrypted.created_at,
      };

      setPayload(modalData);
      setOpen(true);
      toast.success("Decryption successful!");
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || "Failed to extract data";
      toast.error(msg);
    }

    setLoading(false);
  };

  return (
    <div className="decrypt-page">
      <div className="page-header mb-4">
        <div className="d-flex align-items-center">
          <div className="header-icon">
            <Unlock size={32} />
          </div>
          <div>
            <h2 className="mb-1">Retrieve & Decrypt Patient Data</h2>
            <p className="text-muted mb-0">
              Extract hidden patient information from steganographic files
            </p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <Form onSubmit={submit}>
            <div className="upload-area mb-4">
              <Form.Group>
                <Form.Label className="form-label-custom">
                  <FileSearch size={18} className="me-2" />
                  Select Steganographic File
                </Form.Label>

                <div className="file-upload-wrapper">
                  <Form.Control
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, audio/wav"
                    onChange={handleFileChange}
                    required
                    className="form-control-custom file-input"
                    id="fileInput"
                  />
                  <label htmlFor="fileInput" className="file-upload-label">
                    <div className="file-upload-content">
                      <Upload size={40} className="upload-icon mb-3" />
                      {fileName ? (
                        <>
                          <p className="mb-1 fw-bold text-primary">
                            {fileName}
                          </p>
                          <p className="text-muted small">
                            Click to change file
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="mb-1 fw-bold">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-muted small">
                            PNG or WAV files
                          </p>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                <Form.Text className="text-muted">
                  PNG images or WAV audio files are supported
                </Form.Text>
              </Form.Group>
            </div>

            <div className="d-grid">
              <Button
                type="submit"
                disabled={loading || !file}
                size="lg"
                className="btn-decrypt"
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Decrypting...
                  </>
                ) : (
                  <>
                    <Unlock size={20} className="me-2" />
                    Retrieve & Decrypt Data
                  </>
                )}
              </Button>
            </div>
          </Form>

          {payload && (
            <Alert variant="success" className="mt-4">
              <strong>Success!</strong> Patient data has been decrypted. View
              details in the popup window.
            </Alert>
          )}
        </Card.Body>
      </Card>

      <PayloadModal show={open} onHide={() => setOpen(false)} data={payload} />
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Decrypt;
