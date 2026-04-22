import React from "react";
import { Modal, Button, Table, Badge } from "react-bootstrap";

const RowItem = ({ label, value }) => (
  <tr>
    <th style={{width: 160}}>{label}</th>
    <td>{value ?? "-"}</td>
  </tr>
);

const copyJson = (obj) => {
  try {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
  } catch {}
};

const PayloadModal = ({ show, onHide, data }) => {
  const payload = data || {};
  // created_at removed from details per request

  const hasError = !!payload.error;
  const isRawOnly = !!payload.raw && !payload.patient_id && !payload.patient_name;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Decrypted Data {hasError && <Badge bg="danger" className="ms-2">Error</Badge>}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {hasError ? (
          <div className="alert alert-danger mb-0">{payload.error}</div>
        ) : isRawOnly ? (
          <>
            <div className="mb-2 text-muted">Raw decrypted text</div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{payload.raw}</pre>
          </>
        ) : (
          <Table bordered hover responsive>
            <tbody>
              <RowItem label="Patient ID" value={payload.patient_id} />
              <RowItem label="Patient Name" value={payload.patient_name} />
              <RowItem label="Message" value={payload.message} />
              <RowItem label="Sender" value={payload.sender ? payload.sender.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : payload.sender} />
              {payload.recipient !== undefined && (
                <RowItem label="Recipient" value={payload.recipient ? payload.recipient.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : payload.recipient} />
              )}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => copyJson(payload)}>Copy JSON</Button>
        <Button variant="primary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PayloadModal;
