import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Modal, TextInput } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowCredentialsModal(true);
    // Pre-fill credentials based on role
    switch (role) {
      case 'Costumer':
        setEmail('user1@example.com');
        setPassword('pass123');
        break;
      case 'Vendor':
        setEmail('vendor1@example.com');
        setPassword('pass123');
        break;
      case 'Admin':
        setEmail('admin@example.com');
        setPassword('admin123');
        break;
      default:
        setEmail('');
        setPassword('');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await login(email, password);
      
      if (!result.success) {
        setError(result.message || 'Login failed');
      }
      // Navigation handled by AuthContext if successful
    } catch (e) {
      console.error('Login error:', e);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowCredentialsModal(false);
    setError('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/milk-icon.png')} 
          style={styles.logo} 
          resizeMode="contain"
        />
      </View>
      
      <Text style={styles.loginAsText}>Login As</Text>
      
      <View style={styles.roleContainer}>
        <TouchableOpacity 
          style={styles.roleButton} 
          onPress={() => handleRoleSelect('Costumer')}
        >
          <View style={styles.roleIconContainer}>
            <Text style={styles.roleIcon}>👥</Text>
          </View>
          <Text style={styles.roleText}>Costumer</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.roleButton} 
          onPress={() => handleRoleSelect('Vendor')}
        >
          <View style={styles.roleIconContainer}>
            <Text style={styles.roleIcon}>🥛</Text>
          </View>
          <Text style={styles.roleText}>Vendor</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.roleButton} 
          onPress={() => handleRoleSelect('Admin')}
        >
          <View style={styles.roleIconContainer}>
            <Text style={styles.roleIcon}>🔐</Text>
          </View>
          <Text style={styles.roleText}>Admin</Text>
        </TouchableOpacity>
      </View>
      
      {/* Credentials Modal */}
      <Modal
        visible={showCredentialsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Login as {selectedRole}</Text>
            
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
            />
            
            {error ? <Text style={styles.error}>{error}</Text> : null}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.loginButton} 
                onPress={handleLogin} 
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              onPress={() => navigation.navigate('SignUp')} 
              style={styles.linkContainer}
            >
              <Text style={styles.link}>Don't have an account? Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    width: 180,
    height: 180,
  },
  loginAsText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 50,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  roleButton: {
    alignItems: 'center',
    width: 100,
  },
  roleIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#e3dbf7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  roleIcon: {
    fontSize: 32,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 15, 
    marginBottom: 15,
    backgroundColor: '#f8f8f8',
    width: '100%',
  },
  error: { 
    color: '#e74c3c', 
    marginBottom: 15, 
    textAlign: 'center' 
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  loginButton: {
    backgroundColor: '#4e9af1',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
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
  },
})

export default LoginScreen;
