import { Navigate } from 'react-router-dom';

/** Legacy route — redirects to /login */
export default function SplashPage() {
  return <Navigate to="/login" replace />;
}
