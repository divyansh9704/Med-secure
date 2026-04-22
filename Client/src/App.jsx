import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Import pages correctly based on your folder structure
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Encrypt from "./pages/Encrypt";
import Decrypt from "./pages/Decrypt";
import Logs from "./pages/Logs";
import Inbox from "./pages/Inbox";

// Optional shared components
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  // Session determined by ProtectedRoute / auth components; navbar itself fetches /auth/me

  return (
    <BrowserRouter>
      <Navbar />
      <ToastContainer position="top-right" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route path="/dashboard/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

