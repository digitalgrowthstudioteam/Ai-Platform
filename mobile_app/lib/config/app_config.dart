import 'package:flutter/material.dart';

/// Central Configuration for Digital Growth Studio Client App
/// Brand: Glam Stree Nails (glam-stree-nails)
class AppConfig {
  static const String baseApiUrl = "https://digital-growth-studio-api.onrender.com/api/store";
  static String activeStoreSlug = "glam-stree-nails";
  
  // Luxury Glam Stree Brand Theme Colors
  static Color primaryColor = const Color(0xFF0B192C);     // Deep Luxury Navy
  static Color secondaryColor = const Color(0xFFDB2777);   // Glam Rose Pink Accent
  static Color accentGold = const Color(0xFFD97706);       // Warm Luxury Gold
  static Color backgroundWarm = const Color(0xFFFDFCFB);   // Warm Ivory White
  
  static String appTitle = "Glam Stree Nails";
  static String appTagline = "Luxury Handcrafted Press-On Studio";
  static const String currency = "₹";
  static const String supportPhone = "7499904962";
  static const String defaultLogoUrl = "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80";
}
