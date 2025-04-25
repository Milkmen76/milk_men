import React, { createContext, useState, useContext, useEffect } from 'react';
import * as localData from '../services/localData';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize local data on app start
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize local JSON files if they don't exist
        await localData.initializeData();
        
        // Check if user is already logged in
        const currentUser = await localData.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error initializing app data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
  }, []);

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    try {
      const result = await localData.loginUser(email, password);
      if (result.success) {
        setUser(result.user);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  // Signup function
  const signup = async (userData) => {
    setLoading(true);
    try {
      const result = await localData.signupUser(userData);
      if (result.success) {
        // Automatically log in the user after signup
        setUser(result.user);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, message: 'Signup failed' };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    try {
      await localData.logoutUser();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update user data
  const updateUserData = async (userData) => {
    if (!user) return { success: false, message: 'No user logged in' };
    
    try {
      const success = await localData.updateUser(user.id, userData);
      if (success) {
        // Update local user state with new data
        const updatedUser = await localData.getUserById(user.id);
        if (updatedUser) {
          setUser({
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            approval_status: updatedUser.approval_status,
            profile_info: updatedUser.profile_info
          });
        }
        return { success: true };
      }
      return { success: false, message: 'Failed to update user data' };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, message: 'Update failed' };
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      // Check if the email exists in the system
      const userExists = await localData.getUserByEmail(email);
      if (!userExists) {
        return { success: false, message: 'Email not found' };
      }
      
      // In a real app, this would send an email with a reset link
      // For this demo, we'll just simulate success
      console.log(`Password reset requested for email: ${email}`);
      
      return { success: true, message: 'Password reset instructions sent' };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, message: 'Reset password failed' };
    }
  };
  
  // Change password function
  const changePassword = async (oldPassword, newPassword) => {
    if (!user) return { success: false, message: 'No user logged in' };
    
    try {
      // Verify old password
      const verifyResult = await localData.verifyPassword(user.id, oldPassword);
      if (!verifyResult.success) {
        return { success: false, message: 'Current password is incorrect' };
      }
      
      // Update password
      const updateResult = await localData.updatePassword(user.id, newPassword);
      if (updateResult.success) {
        return { success: true, message: 'Password updated successfully' };
      } else {
        return { success: false, message: updateResult.message || 'Failed to update password' };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: 'Password change failed' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      signup,
      logout,
      updateUserData,
      resetPassword,
      changePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
