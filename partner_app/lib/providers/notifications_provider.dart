import 'package:flutter/material.dart';
import '../models/vendor_models.dart';
import '../services/api_service.dart';

class NotificationsProvider extends ChangeNotifier {
  List<VendorNotificationModel> _notifications = [];
  bool _isLoading = false;

  List<VendorNotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  Future<void> fetchNotifications() async {
    _isLoading = true;
    notifyListeners();

    try {
      final rawList = await ApiService.getNotifications();
      _notifications = rawList.map((e) => VendorNotificationModel.fromJson(e)).toList();
    } catch (_) {
      // Keep existing list on error
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> markAsRead(String id) async {
    await ApiService.markNotificationRead(id);
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1) {
      final old = _notifications[index];
      _notifications[index] = VendorNotificationModel(
        id: old.id,
        title: old.title,
        message: old.message,
        notificationType: old.notificationType,
        isRead: true,
        actionUrl: old.actionUrl,
        createdAt: old.createdAt,
      );
      notifyListeners();
    }
  }
}

