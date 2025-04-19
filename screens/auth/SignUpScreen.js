import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../contexts/AuthContext';

const roles = [
  { label: 'Regular User', value: 'user' },
  { label: 'Vendor', value: 'vendor' },
  { label: 'Admin', value: 'admin' },
];

const SignUpScreen = ({ navigation }) => {
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    // Validate inputs
    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (role === 'vendor' && (!businessName || !businessAddress)) {
      setError('Business name and address are required for vendors');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Starting signup process...');
      
      // Prepare user data
      const userData = {
        email,
        password,
        name,
        role
      };
      
      // Add vendor-specific fields if applicable
      if (role === 'vendor') {
        userData.profile_info = {
          business_name: businessName,
          address: businessAddress
        };
      }
      
      // Register user with local data service
      const result = await signup(userData);
      
      if (result.success) {
        console.log('User created successfully');
        
        // For debugging, display what role was selected
        if (role === 'admin') {
          console.log('ADMIN ROLE SELECTED - You should see admin screens');
        } else if (role === 'vendor') {
          console.log('VENDOR ROLE SELECTED - You should see vendor screens');
        } else {
          console.log('USER ROLE SELECTED - You should see user screens');
        }
        
        // Navigation will be handled by AuthContext/AppNavigator
      } else {
        setError(result.message || 'Sign up failed');
      }
    } catch (e) {
      console.error('Signup error:', e);
      setError('Sign up failed. Please try again.');
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
          <Text style={styles.title}>Create Account</Text>
        </View>
        
        <View style={styles.formContainer}>
          <TextInput
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          
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
          
          <TextInput
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.input}
            secureTextEntry
          />
          
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Account Type:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={role}
                onValueChange={setRole}
                style={styles.picker}
              >
                {roles.map(r => (
                  <Picker.Item key={r.value} label={r.label} value={r.value} />
                ))}
              </Picker>
            </View>
          </View>
          
          {role === 'vendor' && (
            <View style={styles.vendorFields}>
              <Text style={styles.sectionTitle}>Vendor Details</Text>
              <TextInput
                placeholder="Business Name"
                value={businessName}
                onChangeText={setBusinessName}
                style={styles.input}
              />
              <TextInput
                placeholder="Business Address"
                value={businessAddress}
                onChangeText={setBusinessAddress}
                style={styles.input}
              />
            </View>
          )}
          
          {error ? <Text style={styles.error}>{error}</Text> : null}
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleSignUp} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')} 
            style={styles.linkContainer}
          >
            <Text style={styles.link}>Already have an account? Login</Text>
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
  pickerContainer: { 
    marginBottom: 15 
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    marginTop: 5
  },
  label: { 
    fontSize: 16, 
    marginBottom: 5,
    color: '#555'
  },
  picker: { 
    height: 50, 
    width: '100%' 
  },
  vendorFields: {
    marginTop: 10,
    marginBottom: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#555'
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
  }
});

export default SignUpScreen;
