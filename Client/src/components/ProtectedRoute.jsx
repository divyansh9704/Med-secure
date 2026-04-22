import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';

// Usage: <ProtectedRoute><Dashboard /></ProtectedRoute>
const ProtectedRoute = ({ children }) => {
	const [status, setStatus] = useState({ loading: true, ok: false });

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				await api.get('/auth/me');
				if (mounted) setStatus({ loading: false, ok: true });
			} catch (e) {
				if (mounted) setStatus({ loading: false, ok: false });
			}
		})();
		return () => { mounted = false; };
	}, []);

	if (status.loading) return <div className="p-4 text-center">Checking session...</div>;
	if (!status.ok) return <Navigate to="/" replace />;
	return children;
};

export default ProtectedRoute;
