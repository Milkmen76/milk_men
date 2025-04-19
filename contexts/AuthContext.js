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

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      signup,
      logout,
      updateUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
