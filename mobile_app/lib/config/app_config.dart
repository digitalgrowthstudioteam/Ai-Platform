import 'package:flutter/material.dart';

/// Central Configuration for Digital Growth Studio Client App
/// Brand: Fresh N Fast (fresh-n-fast)
class AppConfig {
  static const String baseApiUrl = "https://digital-growth-studio-api.onrender.com/api/store";
  static String activeStoreSlug = "fresh-n-fast";
  
  // Quick-Commerce Fresh Farm Theme Colors
  static Color primaryColor = const Color(0xFF15803D);     // Vibrant Farm Leaf Green
  static Color secondaryColor = const Color(0xFF166534);   // Deep Harvest Green
  static Color accentGreen = const Color(0xFF22C55E);      // Bright Emerald Green
  static Color backgroundWarm = const Color(0xFFF8FAFC);   // Crisp Clean White
  
  static String appTitle = "Fresh N Fast";
  static String appTagline = "Farm Fresh Veggies & Fruits in 15-25 Mins";
  static const String currency = "₹";
  static const String supportPhone = "+91 7595982230";
  static const String defaultLogoUrl = "assets/images/logo.png";
}
