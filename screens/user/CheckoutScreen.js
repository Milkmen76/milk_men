import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import nhost from '../../services/nhost';

const CheckoutScreen = () => {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>
      <Text>Total: ₹0 (mock)</Text>
      <Button title="Pay" onPress={() => Alert.alert('Payment', 'Mock payment successful!')} />
      <Button title="Back to Home" onPress={() => navigation.navigate('UserHome')} />
      <Button title="Sign Out" color="red" onPress={() => nhost.auth.signOut()} />
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});

export default CheckoutScreen;
