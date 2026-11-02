import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/store_provider.dart';
import 'providers/cart_provider.dart';
import 'screens/splash_screen.dart';
import 'config/app_config.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const DgsStoreApp());
}

class DgsStoreApp extends StatelessWidget {
  const DgsStoreApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => StoreProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
      ],
      child: Consumer<StoreProvider>(
        builder: (context, store, _) {
          final primary = store.primaryColor;

          return MaterialApp(
            title: AppConfig.appTitle,
            debugShowCheckedModeBanner: false,
            theme: ThemeData(
              useMaterial3: true,
              colorScheme: ColorScheme.fromSeed(
                seedColor: primary,
                primary: primary,
                secondary: store.secondaryColor,
              ),
              scaffoldBackgroundColor: const Color(0xFFF8FAFC),
              fontFamily: 'Roboto',
              appBarTheme: const AppBarTheme(
                backgroundColor: Colors.white,
                foregroundColor: Color(0xFF0F172A),
                elevation: 0,
                centerTitle: false,
              ),
            ),
            home: const SplashScreen(),
          );
        },
      ),
    );
  }
}
