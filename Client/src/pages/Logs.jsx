import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, Table } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";

const Logs = () => {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    const fetch = async () => {
      try {
  const res = await api.get("/audit");
        setLogs(res.data.logs || []);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to fetch logs");
      }
    };
    fetch();
  }, []);
  return (
    <Card className="p-3">
      <h4>Audit Logs</h4>
      <Table striped bordered hover>
        <thead>
          <tr><th>Time</th><th>User</th><th>Action</th><th>Patient</th><th>Details</th></tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l._id}>
              <td>{new Date(l.created_at || l.timestamp).toLocaleString()}</td>
              <td>{l.username ? l.username.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '-'}</td>
              <td>{l.action}</td>
              <td>{l.patient_id || "-"}</td>
              <td>{typeof l.details === 'object' ? JSON.stringify(l.details) : (l.details || l.file_url || "-")}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <ToastContainer />
    </Card>
  );
};

export default Logs;
