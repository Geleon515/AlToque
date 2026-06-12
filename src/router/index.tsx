import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import LandingPage from '../pages/landing/LandingPage'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import RegisterClientPage from '../pages/auth/RegisterClientPage'
import RegisterWorkerPage from '../pages/auth/RegisterWorkerPage'
import ClientDashboard from '../pages/client/ClientDashboard'
import WorkerDashboard from '../pages/worker/WorkerDashboard'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/register/client', element: <RegisterClientPage /> },
  { path: '/register/worker', element: <RegisterWorkerPage /> },
  {
    path: '/client/*',
    element: (
      <ProtectedRoute requiredRole="client">
        <ClientDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/worker/*',
    element: (
      <ProtectedRoute requiredRole="worker">
        <WorkerDashboard />
      </ProtectedRoute>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
