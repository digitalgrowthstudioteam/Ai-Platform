import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/orders_provider.dart';
import 'providers/catalog_provider.dart';
import 'providers/notifications_provider.dart';
import 'screens/login_screen.dart';
import 'screens/subscription_lock_screen.dart';
import 'screens/main_dashboard_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const DGSPartnerApp());
}

class DGSPartnerApp extends StatelessWidget {
  const DGSPartnerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => OrdersProvider()),
        ChangeNotifierProvider(create: (_) => CatalogProvider()),
        ChangeNotifierProvider(create: (_) => NotificationsProvider()),
      ],
      child: MaterialApp(
        title: 'DGS Store Partner',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF4F46E5),
            primary: const Color(0xFF4F46E5),
            secondary: const Color(0xFF2563EB),
          ),
          fontFamily: 'Roboto',
          scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        ),
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    // 1. Initial Loading Splash
    if (auth.isLoading) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: 44,
                height: 44,
                child: CircularProgressIndicator(color: Color(0xFF4F46E5), strokeWidth: 3),
              ),
              SizedBox(height: 20),
              Text(
                'DGS Store Partner',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
              ),
              SizedBox(height: 4),
              Text(
                'Connecting to merchant engine...',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ),
      );
    }

    // 2. Unauthenticated -> Show Login Screen (Redirects new users to Web Browser)
    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }

    // 3. Condition 4: Subscription Expired -> Restrict access & Redirect to Browser
    if (auth.isSubscriptionExpired) {
      return const SubscriptionLockScreen();
    }

    // 4. Authenticated & Active -> Main Dashboard
    return const MainDashboardScreen();
  }
}
