import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/store_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/smart_store_image.dart';
import '../config/app_config.dart';
import 'home_screen.dart';
import 'login_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animCtrl;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );

    _scaleAnimation = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutBack),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animCtrl, curve: Curves.easeIn),
    );

    _animCtrl.forward();
    _bootstrapApp();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  Future<void> _bootstrapApp() async {
    final store = Provider.of<StoreProvider>(context, listen: false);
    final auth = Provider.of<AuthProvider>(context, listen: false);

    // Concurrently initialize store catalog & customer auth session
    await Future.wait([
      store.initializeStore(),
      auth.loadSession(),
      Future.delayed(const Duration(milliseconds: 1600)), // Smooth branded intro
    ]);

    if (!mounted) return;

    // Direct routing: if logged in -> HomeScreen, otherwise -> LoginScreen
    if (auth.isLoggedIn) {
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (_, __, ___) => const HomeScreen(),
          transitionsBuilder: (_, a, __, c) => FadeTransition(opacity: a, child: c),
          transitionDuration: const Duration(milliseconds: 400),
        ),
      );
    } else {
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (_, __, ___) => const LoginScreen(),
          transitionsBuilder: (_, a, __, c) => FadeTransition(opacity: a, child: c),
          transitionDuration: const Duration(milliseconds: 400),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final logoUrl = store.config?.logoUrl ?? AppConfig.defaultLogoUrl;
    final storeName = store.config?.storeName ?? AppConfig.appTitle;

    return Scaffold(
      backgroundColor: const Color(0xFF0B192C), // Deep Luxury Navy
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: ScaleTransition(
            scale: _scaleAnimation,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Branded Logo with Luxury Gold Border
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFD97706).withOpacity(0.35),
                        blurRadius: 28,
                        spreadRadius: 4,
                      ),
                    ],
                    border: Border.all(
                      color: const Color(0xFFD97706).withOpacity(0.8),
                      width: 2.5,
                    ),
                  ),
                  child: ClipOval(
                    child: SmartStoreImage(
                      imageUrl: logoUrl,
                      width: 110,
                      height: 110,
                      fit: BoxFit.cover,
                      fallbackText: "GS",
                    ),
                  ),
                ),
                const SizedBox(height: 28),

                // Brand Name
                Text(
                  storeName.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2.5,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 6),

                // Subtitle Tagline
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(width: 24, height: 1, color: const Color(0xFFDB2777)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: Text(
                        AppConfig.appTagline.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 2.0,
                          color: Color(0xFFF472B6), // Soft Pink
                        ),
                      ),
                    ),
                    Container(width: 24, height: 1, color: const Color(0xFFDB2777)),
                  ],
                ),
                const SizedBox(height: 48),

                // Elegant Loading Spinner
                const SizedBox(
                  width: 26,
                  height: 26,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFD97706)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
