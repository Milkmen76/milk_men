import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { firebase } from '../../firebase/config';
import { format } from 'date-fns';

const windowWidth = Dimensions.get('window').width;

const HomeScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [vendors, setVendors] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVendors = async () => {
    try {
      const vendorsRef = firebase.firestore().collection('vendors').where('approved', '==', true);
      const snapshot = await vendorsRef.get();
      
      const vendorsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setVendors(vendorsList);
    } catch (error) {
      console.error('Error fetching vendors: ', error);
    }
  };

  const fetchSubscriptions = async () => {
    if (!user?.uid) return;
    
    try {
      const now = firebase.firestore.Timestamp.now();
      
      const subscriptionsRef = firebase.firestore()
        .collection('subscriptions')
        .where('userId', '==', user.uid)
        .where('endDate', '>=', now);
        
      const snapshot = await subscriptionsRef.get();
      
      if (snapshot.empty) {
        setSubscriptions([]);
        return;
      }
      
      // Get subscription documents
      let subscriptionsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Fetch vendor details for each subscription
      const vendorPromises = subscriptionsList.map(async (subscription) => {
        const vendorDoc = await firebase.firestore().collection('vendors').doc(subscription.vendorId).get();
        return vendorDoc.exists ? { id: vendorDoc.id, ...vendorDoc.data() } : null;
      });
      
      const vendorDetails = await Promise.all(vendorPromises);
      
      // Attach vendor details to subscriptions
      subscriptionsList = subscriptionsList.map((subscription, index) => ({
        ...subscription,
        vendor: vendorDetails[index]
      })).filter(sub => sub.vendor !== null);
      
      setSubscriptions(subscriptionsList);
    } catch (error) {
      console.error('Error fetching subscriptions: ', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchVendors(), fetchSubscriptions()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const navigateToVendorProducts = (vendorId, vendorName) => {
    navigation.navigate('ProductListScreen', { vendorId, vendorName });
  };

  const navigateToSubscriptionDetails = (subscription) => {
    navigation.navigate('SubscriptionDetailScreen', { subscription });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return format(date, 'MMM dd, yyyy');
  };

  const renderSubscriptionItem = ({ item }) => {
    if (!item.vendor) return null;
    
    return (
      <TouchableOpacity
        style={styles.subscriptionCard}
        onPress={() => navigateToSubscriptionDetails(item)}
      >
        <View style={styles.subscriptionHeader}>
          <Image 
            source={{ uri: item.vendor.logo || 'https://via.placeholder.com/100' }} 
            style={styles.subscriptionVendorLogo} 
          />
          <View style={styles.subscriptionInfo}>
            <Text style={styles.subscriptionVendorName}>{item.vendor.businessName}</Text>
            <Text style={styles.subscriptionPlan}>{item.planName}</Text>
            <View style={styles.dateContainer}>
              <Text style={styles.dateLabel}>Valid until:</Text>
              <Text style={styles.dateValue}>{formatDate(item.endDate)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.nextDeliveryContainer}>
          <Text style={styles.nextDeliveryLabel}>Next Delivery:</Text>
          <Text style={styles.nextDeliveryDate}>{item.nextDelivery ? formatDate(item.nextDelivery) : 'Not scheduled'}</Text>
          <View style={styles.deliveryStatus}>
            <Text style={styles.deliveryStatusText}>Active</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderVendorItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.vendorCard}
        onPress={() => navigateToVendorProducts(item.id, item.businessName)}
      >
        <Image 
          source={{ uri: item.logo || 'https://via.placeholder.com/100' }} 
          style={styles.vendorLogo} 
        />
        <Text style={styles.vendorName}>{item.businessName}</Text>
        <Text style={styles.vendorDescription} numberOfLines={2}>
          {item.description || 'Fresh dairy products'}
        </Text>
        <View style={styles.vendorRating}>
          <Text style={styles.ratingText}>★ {(item.rating || 4.5).toFixed(1)}</Text>
        </View>
        <View style={styles.browseButton}>
          <Text style={styles.browseButtonText}>Browse Products</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4e9af1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerContainer}>
          <Text style={styles.greeting}>Hello, {user?.displayName || 'there'}!</Text>
          <Text style={styles.subtitle}>Your dairy deliveries in one place</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Active Subscriptions</Text>
          {subscriptions.length > 0 ? (
            <FlatList
              data={subscriptions}
              renderItem={renderSubscriptionItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subscriptionsList}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>You don't have any active subscriptions.</Text>
              <TouchableOpacity style={styles.exploreButton}>
                <Text style={styles.exploreButtonText}>Explore Vendors</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Vendors</Text>
          {vendors.length > 0 ? (
            <FlatList
              data={vendors}
              renderItem={renderVendorItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vendorsList}
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No vendors available at the moment.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
  },
  headerContainer: {
    padding: 20,
    paddingBottom: 15,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },
  section: {
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  subscriptionsList: {
    paddingVertical: 8,
  },
  subscriptionCard: {
    width: windowWidth * 0.85,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionVendorLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
  },
  subscriptionInfo: {
    marginLeft: 16,
    flex: 1,
  },
  subscriptionVendorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  subscriptionPlan: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4e9af1',
    marginBottom: 6,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 4,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  nextDeliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  nextDeliveryLabel: {
    fontSize: 14,
    color: '#666',
  },
  nextDeliveryDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  deliveryStatus: {
    backgroundColor: '#e6f3e6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deliveryStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2e7d32',
  },
  vendorsList: {
    paddingVertical: 8,
  },
  vendorCard: {
    width: 180,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  vendorLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
  },
  vendorDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    height: 36,
  },
  vendorRating: {
    backgroundColor: '#fff8e1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff8f00',
  },
  browseButton: {
    backgroundColor: '#4e9af1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  browseButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  exploreButton: {
    backgroundColor: '#4e9af1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default HomeScreen;
