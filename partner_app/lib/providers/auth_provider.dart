import 'package:flutter/material.dart';
import '../models/vendor_models.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  VendorUser? _user;
  bool _isLoading = true;
  String? _errorMessage;

  VendorUser? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  bool get isAuthenticated => _user != null;

  // Subscription check (Condition 4: Restrict access if monthly payment is unpaid)
  bool get isSubscriptionExpired {
    if (_user == null) return false;
    if (_user!.isSubscriptionExpired) return true;
    final status = _user!.subscriptionStatus.toLowerCase();
    return status == 'expired' || status == 'suspended' || status == 'unpaid';
  }

  // Active Entitlements check (Condition 1: Hide services which admin turned off)
  bool get isHyperlocalActive => _user?.hyperlocalEnabled ?? false;
  bool get isRazorpayActive => _user?.razorpayEnabled ?? false;
  bool get isShiprocketActive => _user?.shiprocketEnabled ?? false;
  bool get isSmsActive => _user?.smsGatewayEnabled ?? false;
  bool get isCustomDomainActive => _user?.customDomainEnabled ?? false;
  bool get isWhatsappActive => _user?.whatsappAlertsEnabled ?? false;

  AuthProvider() {
    checkAuth();
  }

  Future<void> checkAuth() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await ApiService.getToken();
      if (token != null && token.isNotEmpty) {
        final profile = await ApiService.getMe();
        _user = VendorUser.fromJson(profile);
      } else {
        _user = null;
      }
    } catch (e) {
      _user = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await ApiService.login(email, password);
      final profile = await ApiService.getMe();
      _user = VendorUser.fromJson(profile);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await ApiService.clearToken();
    _user = null;
    notifyListeners();
  }
}

