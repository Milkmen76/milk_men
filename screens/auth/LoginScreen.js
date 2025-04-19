import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/milk-icon.png')} 
          style={styles.logo} 
          resizeMode="contain"
        />
        <Text style={styles.title}>Milk Delivery</Text>
        <Text style={styles.subtitle}>Login to your account</Text>
      </View>
      
      <View style={styles.formContainer}>
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
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => navigation.navigate('SignUp')} 
          style={styles.linkContainer}
        >
          <Text style={styles.link}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.testAccountsContainer}>
        <Text style={styles.testAccountsTitle}>Test Accounts:</Text>
        <Text style={styles.testAccount}>User: user1@example.com / pass123</Text>
        <Text style={styles.testAccount}>Vendor: vendor1@example.com / pass123</Text>
        <Text style={styles.testAccount}>Admin: admin@example.com / admin123</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20,
    backgroundColor: '#f9f9f9'
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#333',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10
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
  linkContainer: { 
    marginTop: 20, 
    alignItems: 'center' 
  },
  link: { 
    color: '#4e9af1',
    fontSize: 16
  },
  testAccountsContainer: {
    marginTop: 40,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8
  },
  testAccountsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#444'
  },
  testAccount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  }
});

export default LoginScreen;
