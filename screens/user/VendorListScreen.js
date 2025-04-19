import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as localData from '../../services/localData';

const VendorListScreen = () => {
  const navigation = useNavigation();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        // Fetch all users, then filter for approved vendors
        const allUsers = await localData.getUsers();
        const approvedVendors = allUsers.filter(
          u => u.role === 'vendor' && u.approval_status === 'approved'
        );
        setVendors(approvedVendors);
      } catch (error) {
        console.error('Error fetching vendors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  const renderVendorItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.vendorCard}
      onPress={() => navigation.navigate('ProductList', { vendorId: item.id })}
    >
      <View style={styles.vendorImageContainer}>
        <Image 
          source={require('../../assets/milk-icon.png')}
          style={styles.vendorImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.vendorInfo}>
        <Text style={styles.vendorName}>{item.profile_info?.business_name || 'Milk Vendor'}</Text>
        <Text style={styles.vendorAddress}>{item.profile_info?.address || 'No address provided'}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('ProductList', { vendorId: item.id })}
          >
            <Text style={styles.actionButtonText}>View Products</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.subscribeButton]}
            onPress={() => navigation.navigate('SubscriptionScreen', { vendorId: item.id })}
          >
            <Text style={styles.actionButtonText}>Subscribe</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
        <Text style={styles.loadingText}>Loading vendors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Available Milk Vendors</Text>
      
      {vendors.length > 0 ? (
        <FlatList
          data={vendors}
          renderItem={renderVendorItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No vendors available at the moment</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9f9f9',
    padding: 16 
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  listContent: {
    paddingBottom: 20
  },
  vendorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  vendorImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  vendorImage: {
    width: 60,
    height: 60
  },
  vendorInfo: {
    flex: 1
  },
  vendorName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333'
  },
  vendorAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    backgroundColor: '#4e9af1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2
  },
  subscribeButton: {
    backgroundColor: '#5bbda6'
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  }
});

export default VendorListScreen;
