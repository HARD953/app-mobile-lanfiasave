import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RootStack } from './src/navigation';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import NewHouseholdScreen from './src/screens/NewHouseholdScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SubmissionDetailScreen from './src/screens/SubmissionDetailScreen';
import { SessionProvider, useSession } from './src/session';
import { C } from './src/theme';

const Stack = createNativeStackNavigator<RootStack>();

function Routes() {
  const { ready, signedIn } = useSession();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primaryDeep }}>
        <ActivityIndicator color={C.white} size="large" />
      </View>
    );
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      {signedIn ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="NewHousehold" component={NewHouseholdScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="SubmissionDetail" component={SubmissionDetailScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <NavigationContainer>
          <Routes />
        </NavigationContainer>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
