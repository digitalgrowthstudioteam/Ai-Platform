import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/vendor_models.dart';
import '../providers/orders_provider.dart';

class OrderDetailScreen extends StatefulWidget {
  final VendorOrderModel order;
  const OrderDetailScreen({super.key, required this.order});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  late VendorOrderModel _order;
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    _order = widget.order;
  }

  Future<void> _updateStatus(String newStatus) async {
    setState(() => _isUpdating = true);
    final provider = Provider.of<OrdersProvider>(context, listen: false);
    final success = await provider.updateStatus(_order.id, newStatus);
    if (!mounted) return;
    setState(() => _isUpdating = false);

    if (success) {
      setState(() {
        _order = VendorOrderModel(
          id: _order.id,
          orderNumber: _order.orderNumber,
          customerName: _order.customerName,
          customerPhone: _order.customerPhone,
          customerEmail: _order.customerEmail,
          shippingAddress: _order.shippingAddress,
          totalAmount: _order.totalAmount,
          paymentMethod: _order.paymentMethod,
          paymentStatus: _order.paymentStatus,
          orderStatus: newStatus,
          courierName: _order.courierName,
          trackingNumber: _order.trackingNumber,
          createdAt: _order.createdAt,
          items: _order.items,
          isHyperlocalDelivery: _order.isHyperlocalDelivery,
        );
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Order status changed to $newStatus')),
      );
    }
  }

  Future<void> _callCustomer() async {
    final phone = _order.customerPhone.replaceAll(RegExp(r'[^\d+]'), '');
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _whatsappCustomer() async {
    final phone = _order.customerPhone.replaceAll(RegExp(r'[^\d]'), '');
    final msg = Uri.encodeComponent('Hello ${_order.customerName}, this is regarding your order #${_order.orderNumber} from ${_order.shippingAddress}.');
    final uri = Uri.parse('https://wa.me/$phone?text=$msg');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Order #${_order.orderNumber}',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'CURRENT STATUS',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8), letterSpacing: 0.8),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF4F46E5).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _order.orderStatus.toUpperCase(),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF4F46E5)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Order Placed: ${DateFormat('EEE, d MMM yyyy, h:mm a').format(_order.createdAt)}',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Customer Details Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('CUSTOMER & DELIVERY ADDRESS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8), letterSpacing: 0.8)),
                  const SizedBox(height: 10),
                  Text(_order.customerName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                  const SizedBox(height: 4),
                  Text(_order.shippingAddress, style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.4)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: _callCustomer,
                        icon: const Icon(Icons.phone_rounded, size: 16),
                        label: Text(_order.customerPhone, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF2563EB),
                          side: const BorderSide(color: Color(0xFFBFDBFE)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        onPressed: _whatsappCustomer,
                        icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16),
                        label: const Text('WhatsApp', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Items Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('ORDER ITEMS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8), letterSpacing: 0.8)),
                  const SizedBox(height: 10),
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _order.items.length,
                    separatorBuilder: (_, __) => const Divider(height: 16, color: Color(0xFFF1F5F9)),
                    itemBuilder: (context, i) {
                      final item = _order.items[i];
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8)),
                            child: const Icon(Icons.shopping_bag_outlined, size: 18, color: Color(0xFF64748B)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.productName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                                const SizedBox(height: 2),
                                Text('${item.quantity} x Rs. ${item.price.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              ],
                            ),
                          ),
                          Text('Rs. ${item.total.toStringAsFixed(2)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        ],
                      );
                    },
                  ),
                  const Divider(height: 24, color: Color(0xFFE2E8F0)),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Bill Amount', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                      Text('Rs. ${_order.totalAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF059669))),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Action Buttons
            if (_isUpdating)
              const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)))
            else ...[
              if (_order.orderStatus.toUpperCase() == 'NEW') ...[
                ElevatedButton(
                  onPressed: () => _updateStatus('PROCESSING'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: const Text('Accept Order & Mark Processing', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: () => _updateStatus('CANCELLED'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFDC2626),
                    side: const BorderSide(color: Color(0xFFFCA5A5)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Reject / Cancel Order', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                ),
              ] else if (_order.orderStatus.toUpperCase() == 'PROCESSING') ...[
                ElevatedButton.icon(
                  onPressed: () => _updateStatus('SHIPPED'),
                  icon: const Icon(Icons.local_shipping_rounded, size: 18),
                  label: const Text('Dispatched / Out for Delivery', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                ),
              ] else if (_order.orderStatus.toUpperCase() == 'SHIPPED') ...[
                ElevatedButton.icon(
                  onPressed: () => _updateStatus('DELIVERED'),
                  icon: const Icon(Icons.check_circle_rounded, size: 18),
                  label: const Text('Mark Order as Delivered', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                ),
              ],
            ],
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

