import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';

/**
 * AuthGuard — wraps protected routes.
 *
 * Props:
 *   allowedRoles: string[] — e.g. ['student'] or ['instructor']
 *   children: the page component to render if authorized
 *
 * Behavior:
 *   1. If not authenticated → redirect to /login
 *   2. If authenticated but wrong role → redirect to correct profile page
 *   3. If authenticated and correct role → render children
 */
function AuthGuard({ allowedRoles, children }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading' | 'authorized' | 'redirecting'

  useEffect(() => {
    async function checkAuth() {
      try {
        // Check if the user has an active session
        const session = await fetchAuthSession();
        if (!session.tokens) {
          navigate('/login', { replace: true });
          setStatus('redirecting');
          return;
        }

        // Get the user's role
        const attributes = await fetchUserAttributes();
        const role = (attributes['custom:role'] || '').toLowerCase();

        // Check if the role is allowed
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
          // Redirect to the correct profile page for their role
          if (role === 'instructor') {
            navigate('/profile/instructor', { replace: true });
          } else {
            navigate('/profile/student', { replace: true });
          }
          setStatus('redirecting');
          return;
        }

        setStatus('authorized');
      } catch (err) {
        // Not authenticated
        console.warn('AuthGuard: not authenticated', err);
        navigate('/login', { replace: true });
        setStatus('redirecting');
      }
    }

    checkAuth();
  }, [navigate, allowedRoles]);

  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fb',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#666',
      }}>
        Loading...
      </div>
    );
  }

  if (status === 'authorized') {
    return children;
  }

  // 'redirecting' — render nothing while navigating
  return null;
}

export default AuthGuard;
