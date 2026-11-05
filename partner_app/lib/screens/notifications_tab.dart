import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/vendor_models.dart';
import '../providers/notifications_provider.dart';

class NotificationsTab extends StatefulWidget {
  const NotificationsTab({super.key});

  @override
  State<NotificationsTab> createState() => _NotificationsTabState();
}

class _NotificationsTabState extends State<NotificationsTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<NotificationsProvider>(context, listen: false).fetchNotifications();
    });
  }

  @override
  Widget build(BuildContext context) {
    final notifsProvider = Provider.of<NotificationsProvider>(context);
    final list = notifsProvider.notifications;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Alerts & Notifications', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
            if (notifsProvider.unreadCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(color: const Color(0xFFE11D48), borderRadius: BorderRadius.circular(10)),
                child: Text(
                  '${notifsProvider.unreadCount} new',
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ],
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF475569)),
            onPressed: () => notifsProvider.fetchNotifications(),
          ),
        ],
      ),
      body: notifsProvider.isLoading && list.isEmpty
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)))
          : list.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.notifications_none_rounded, size: 54, color: Color(0xFFCBD5E1)),
                      SizedBox(height: 12),
                      Text('No notifications yet', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                      SizedBox(height: 4),
                      Text('Order dispatches and system updates will appear here.', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final item = list[index];
                    return _buildNotificationCard(context, item, notifsProvider);
                  },
                ),
    );
  }

  Widget _buildNotificationCard(BuildContext context, VendorNotificationModel item, NotificationsProvider provider) {
    IconData icon;
    Color iconColor;
    Color iconBg;

    switch (item.notificationType.toUpperCase()) {
      case 'ORDER':
        icon = Icons.shopping_bag_rounded;
        iconColor = const Color(0xFF059669);
        iconBg = const Color(0xFFD1FAE5);
        break;
      case 'DELIVERY':
        icon = Icons.local_shipping_rounded;
        iconColor = const Color(0xFF2563EB);
        iconBg = const Color(0xFFDBEAFE);
        break;
      case 'HYPERLOCAL':
        icon = Icons.near_me_rounded;
        iconColor = const Color(0xFFE11D48);
        iconBg = const Color(0xFFFFE4E6);
        break;
      default:
        icon = Icons.info_outline_rounded;
        iconColor = const Color(0xFF4F46E5);
        iconBg = const Color(0xFFEEF2FF);
    }

    return Card(
      elevation: 0,
      color: item.isRead ? Colors.white : const Color(0xFFF0FDF4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: item.isRead ? const Color(0xFFE2E8F0) : const Color(0xFF86EFAC),
          width: item.isRead ? 1 : 1.5,
        ),
      ),
      child: InkWell(
        onTap: () {
          if (!item.isRead) {
            provider.markAsRead(item.id);
          }
        },
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: item.isRead ? FontWeight.w700 : FontWeight.w900,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        if (!item.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
                          ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      item.message,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF475569), height: 1.4),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      DateFormat('d MMM, h:mm a').format(item.createdAt),
                      style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

