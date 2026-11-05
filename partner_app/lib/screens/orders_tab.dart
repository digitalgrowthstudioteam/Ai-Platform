import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/vendor_models.dart';
import '../providers/auth_provider.dart';
import '../providers/orders_provider.dart';
import 'order_detail_screen.dart';

class OrdersTab extends StatelessWidget {
  const OrdersTab({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final ordersProvider = Provider.of<OrdersProvider>(context);
    final orders = ordersProvider.orders;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              auth.user?.storeName ?? 'Partner Dashboard',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
                ),
                const SizedBox(width: 5),
                Text(
                  'Accepting Orders • ${auth.user?.vendorCode ?? ""}',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF475569)),
            onPressed: () => ordersProvider.fetchOrders(isHyperlocalActive: auth.isHyperlocalActive),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ordersProvider.fetchOrders(isHyperlocalActive: auth.isHyperlocalActive),
        child: Column(
          children: [
            // Filter Pills Bar
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip(context, 'ALL', 'All Orders (${ordersProvider.allOrders.length})'),
                    const SizedBox(width: 8),
                    _buildFilterChip(context, 'NEW', 'New (${ordersProvider.newOrdersCount})', isAlert: ordersProvider.newOrdersCount > 0),
                    const SizedBox(width: 8),
                    _buildFilterChip(context, 'PROCESSING', 'Processing (${ordersProvider.processingOrdersCount})'),
                    const SizedBox(width: 8),
                    _buildFilterChip(context, 'SHIPPED', 'Dispatched'),
                    const SizedBox(width: 8),
                    _buildFilterChip(context, 'DELIVERED', 'Delivered'),
                  ],
                ),
              ),
            ),
            const Divider(height: 1, color: Color(0xFFE2E8F0)),

            // Orders List
            Expanded(
              child: ordersProvider.isLoading && orders.isEmpty
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)))
                  : orders.isEmpty
                      ? _buildEmptyState()
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: orders.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            return _buildOrderCard(context, orders[index], ordersProvider);
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(BuildContext context, String code, String label, {bool isAlert = false}) {
    final provider = Provider.of<OrdersProvider>(context);
    final isSelected = provider.activeFilter == code;

    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
          color: isSelected
              ? Colors.white
              : isAlert
                  ? const Color(0xFFE11D48)
                  : const Color(0xFF475569),
        ),
      ),
      selected: isSelected,
      onSelected: (_) => provider.setFilter(code),
      selectedColor: isAlert ? const Color(0xFFE11D48) : const Color(0xFF4F46E5),
      backgroundColor: isAlert ? const Color(0xFFFFF1F2) : const Color(0xFFF1F5F9),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      side: BorderSide(
        color: isSelected
            ? Colors.transparent
            : isAlert
                ? const Color(0xFFFECDD3)
                : const Color(0xFFE2E8F0),
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, VendorOrderModel order, OrdersProvider provider) {
    Color statusColor;
    switch (order.orderStatus.toUpperCase()) {
      case 'NEW':
        statusColor = const Color(0xFFE11D48);
        break;
      case 'PROCESSING':
        statusColor = const Color(0xFFD97706);
        break;
      case 'SHIPPED':
        statusColor = const Color(0xFF2563EB);
        break;
      case 'DELIVERED':
        statusColor = const Color(0xFF059669);
        break;
      default:
        statusColor = const Color(0xFF64748B);
    }

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: order.orderStatus.toUpperCase() == 'NEW'
              ? const Color(0xFFFECDD3)
              : const Color(0xFFE2E8F0),
          width: order.orderStatus.toUpperCase() == 'NEW' ? 1.5 : 1,
        ),
      ),
      color: Colors.white,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => OrderDetailScreen(order: order)),
          );
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '#${order.orderNumber}',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      order.orderStatus.toUpperCase(),
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: statusColor),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Customer info & Date
              Text(
                'Customer: ${order.customerName}',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF334155)),
              ),
              const SizedBox(height: 3),
              Text(
                'Placed: ${DateFormat('d MMM, h:mm a').format(order.createdAt)}',
                style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
              ),
              const SizedBox(height: 12),

              // Delivery Tag
              if (order.isHyperlocalDelivery) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF1F2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFFECDD3)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.near_me_rounded, size: 13, color: Color(0xFFE11D48)),
                      SizedBox(width: 4),
                      Text(
                        '📍 Hyperlocal On-Demand Delivery',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFFBE123C)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
              ],

              const Divider(height: 16, color: Color(0xFFF1F5F9)),

              // Footer row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${order.items.length} item(s)',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                  ),
                  Text(
                    'Rs. ${order.totalAmount.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Icon(Icons.inbox_rounded, size: 54, color: Color(0xFFCBD5E1)),
          SizedBox(height: 12),
          Text(
            'No orders in this category',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF64748B)),
          ),
          SizedBox(height: 4),
          Text(
            'New customer orders will ring and appear here in real time.',
            style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }
}

