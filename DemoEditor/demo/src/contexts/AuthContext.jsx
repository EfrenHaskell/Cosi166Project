import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in (using simple token check)
    const token = localStorage.getItem('authToken');
    if (token) {
      // Simple authentication - just check if token exists
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = async () => {
    // Placeholder for future login implementation
    // For now, just set loading to false
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUserRole = async (newRole) => {
    // Placeholder for future role update implementation
    if (user) {
      setUser(prev => ({ ...prev, role: newRole }));
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
