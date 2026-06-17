import { createBrowserRouter, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import AppLayout from '../components/layout/AppLayout'
import LandingPage from '../pages/landing/LandingPage'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import RegisterClientPage from '../pages/auth/RegisterClientPage'
import RegisterWorkerPage from '../pages/auth/RegisterWorkerPage'
import ClientDashboardPage from '../pages/client/ClientDashboardPage'
import ClientProfilePage from '../pages/client/ClientProfilePage'
import NewJobPage from '../pages/client/NewJobPage'
import ClientJobsPage from '../pages/client/ClientJobsPage'
import WorkerDashboardPage from '../pages/worker/WorkerDashboardPage'
import PlaceholderPage from '../pages/PlaceholderPage'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/register/client', element: <RegisterClientPage /> },
  { path: '/register/worker', element: <RegisterWorkerPage /> },
  {
    path: '/client',
    element: (
      <ProtectedRoute requiredRole="client">
        <AppLayout role="client" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <ClientDashboardPage /> },
      { path: 'profile', element: <ClientProfilePage /> },
      { path: 'new-job', element: <NewJobPage /> },
      { path: 'jobs', element: <ClientJobsPage /> },
      { path: '*', element: <PlaceholderPage /> },
    ],
  },
  {
    path: '/worker',
    element: (
      <ProtectedRoute requiredRole="worker">
        <AppLayout role="worker" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <WorkerDashboardPage /> },
      { path: '*', element: <PlaceholderPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
