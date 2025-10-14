import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const GoogleLogin = ({ onLoginSuccess, onLoginError }) => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
        });

        // Render the sign-in button
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            shape: 'rectangular',
          }
        );
      }
    };

    return () => {
      // Cleanup
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      setIsLoading(true);
      await login(response.credential);
      
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      console.error('Google login failed:', error);
      if (onLoginError) {
        onLoginError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="google-login-container">
      <div id="google-signin-button"></div>
      {isLoading && (
        <div className="loading-overlay">
          <p>Signing in...</p>
        </div>
      )}
    </div>
  );
};

export default GoogleLogin;
