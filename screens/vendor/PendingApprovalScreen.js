import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';

const PendingApprovalScreen = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Image 
          source={require('../../assets/milk-icon.png')} 
          style={styles.image}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>Approval Pending</Text>
        
        <Text style={styles.message}>
          Thank you for registering as a vendor with our Milk Delivery App. 
          Your account is currently under review by our admin team.
        </Text>
        
        <Text style={styles.infoText}>
          Once your account is approved, you'll be able to:
        </Text>
        
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>• Add and manage your milk products</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>• View and process customer orders</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>• Manage subscriptions</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureText}>• Track your sales and revenue</Text>
          </View>
        </View>
        
        <Text style={styles.contactText}>
          If you have any questions, please contact our support team.
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 20,
    justifyContent: 'center'
  },
  contentContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  image: {
    width: 100,
    height: 100,
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center'
  },
  message: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24
  },
  infoText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 16,
    alignSelf: 'flex-start'
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: 24
  },
  featureItem: {
    marginBottom: 8
  },
  featureText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22
  },
  contactText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    fontStyle: 'italic'
  },
  logoutButton: {
    marginTop: 40,
    backgroundColor: '#f1f1f1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  logoutButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '500'
  }
});

export default PendingApprovalScreen;
