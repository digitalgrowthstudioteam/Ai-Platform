import 'package:flutter/material.dart';

/// Central Configuration for Digital Growth Studio Client App
/// Brand: Ashtekar Collection (ashtekar-collection)
class AppConfig {
  static const String baseApiUrl = "https://digital-growth-studio-api.onrender.com/api/store";
  static String activeStoreSlug = "ashtekar-collection";
  
  // Luxury Men's Apparel Theme Colors
  static Color primaryColor = const Color(0xFF0F172A);     // Deep Royal Charcoal Navy
  static Color secondaryColor = const Color(0xFFD4AF37);   // Imperial Sovereign Gold
  static Color accentGold = const Color(0xFFC5A059);       // Warm Regal Gold
  static Color backgroundWarm = const Color(0xFFF8FAFC);   // Crisp Clean White
  
  static String appTitle = "Ashtekar Collection";
  static String appTagline = "Premium Men's Apparels & Festive Wear";
  static const String currency = "₹";
  static const String supportPhone = "9960143578";
  static const String defaultLogoUrl = "assets/images/logo.png";
}
