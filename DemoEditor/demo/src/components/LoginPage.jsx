import React, { useState } from 'react';
import GoogleLogin from './GoogleLogin';

const LoginPage = ({ onLoginSuccess }) => {
  const [error, setError] = useState('');

  const handleLoginSuccess = () => {
    setError('');
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  const handleLoginError = (errorMessage) => {
    setError(errorMessage);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Welcome to Learning App</h1>
          <p>Sign in with your Google account to continue</p>
        </div>

        <div className="login-form">
          <GoogleLogin
            onLoginSuccess={handleLoginSuccess}
            onLoginError={handleLoginError}
          />
          
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="login-footer">
          <p>
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
