import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import * as localData from '../../services/localData';

const ResetPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email/Phone, 2: New Password
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('');
  
  const verifyUserCredentials = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }
    
    if (userRole !== 'admin' && !phoneNumber) {
      setError('Phone number is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Check if user exists with the provided email
      const user = await localData.getUserByEmail(email);
      
      if (!user) {
        setError('No account found with this email');
        setLoading(false);
        return;
      }
      
      setUserRole(user.role);
      
      // For non-admin users, verify phone number
      if (user.role !== 'admin' && user.phone_number !== phoneNumber) {
        setError('Phone number does not match our records');
        setLoading(false);
        return;
      }
      
      // If all checks pass, move to password reset step
      setStep(2);
      setLoading(false);
    } catch (error) {
      console.error('Error verifying credentials:', error);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };
  
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Get user by email
      const user = await localData.getUserByEmail(email);
      
      if (!user) {
        setError('User not found');
        setLoading(false);
        return;
      }
      
      // Update the password
      const result = await localData.updatePassword(user.id, newPassword);
      
      if (result.success) {
        setSuccess('Password has been reset successfully!');
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigation.navigate('Login');
        }, 2000);
      } else {
        setError(result.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/milk-icon.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.title}>Reset Password</Text>
        </View>
        
        <View style={styles.formContainer}>
          {step === 1 ? (
            // Step 1: Verify Email and Phone
            <>
              <Text style={styles.instruction}>
                Please enter your email and phone number to reset your password.
              </Text>
              
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              
              <TextInput
                placeholder="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                style={styles.input}
                keyboardType="phone-pad"
              />
              
              {error ? <Text style={styles.error}>{error}</Text> : null}
              
              <TouchableOpacity 
                style={styles.button} 
                onPress={verifyUserCredentials} 
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Verify</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            // Step 2: Enter New Password
            <>
              <Text style={styles.instruction}>
                Please enter and confirm your new password.
              </Text>
              
              <TextInput
                placeholder="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                style={styles.input}
                secureTextEntry
              />
              
              <TextInput
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                secureTextEntry
              />
              
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {success ? <Text style={styles.success}>{success}</Text> : null}
              
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleResetPassword} 
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => {
                  setStep(1);
                  setError('');
                  setSuccess('');
                }}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')} 
            style={styles.linkContainer}
          >
            <Text style={styles.link}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  },
  container: { 
    flex: 1, 
    padding: 20,
    paddingBottom: 40
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#333',
    marginBottom: 10
  },
  instruction: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center'
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 15, 
    marginBottom: 15,
    backgroundColor: '#f8f8f8'
  },
  error: { 
    color: '#e74c3c', 
    marginBottom: 15, 
    textAlign: 'center' 
  },
  success: {
    color: '#2ecc71',
    marginBottom: 15,
    textAlign: 'center'
  },
  button: {
    backgroundColor: '#4e9af1',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  backButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10
  },
  backButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 16
  },
  linkContainer: { 
    marginTop: 20, 
    alignItems: 'center' 
  },
  link: { 
    color: '#4e9af1',
    fontSize: 16
  }
});

export default ResetPasswordScreen;