import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = () => {
  const { user, logout, updateUserRole } = useAuth();
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [newRole, setNewRole] = useState(user?.role || 'student');

  const handleRoleChange = async () => {
    try {
      setIsChangingRole(true);
      await updateUserRole(newRole);
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role. Please try again.');
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="profile-avatar">
          {user.picture_url ? (
            <img src={user.picture_url} alt={user.name} />
          ) : (
            <div className="avatar-placeholder">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="profile-info">
          <h3>{user.name}</h3>
          <p>{user.email}</p>
          <span className={`role-badge ${user.role}`}>
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </span>
        </div>
      </div>

      <div className="profile-actions">
        <div className="role-selector">
          <label htmlFor="role-select">Role:</label>
          <select
            id="role-select"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            disabled={isChangingRole}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
          {newRole !== user.role && (
            <button
              onClick={handleRoleChange}
              disabled={isChangingRole}
              className="update-role-btn"
            >
              {isChangingRole ? 'Updating...' : 'Update Role'}
            </button>
          )}
        </div>

        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
