import 'package:flutter/material.dart';
import '../services/audio_alert_service.dart';

class IncomingOrderRingingDialog extends StatelessWidget {
  final String orderNumber;
  final double amount;
  final String customerName;
  final VoidCallback onAccept;

  const IncomingOrderRingingDialog({
    super.key,
    required this.orderNumber,
    required this.amount,
    required this.customerName,
    required this.onAccept,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Ringing Alarm Pulsing Header
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFF43F5E).withOpacity(0.12),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFF43F5E), width: 2.5),
              ),
              child: const Center(
                child: Icon(Icons.notifications_active_rounded, size: 44, color: Color(0xFFE11D48)),
              ),
            ),
            const SizedBox(height: 20),

            // Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF1F2),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFFECDD3)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.flash_on_rounded, size: 14, color: Color(0xFFE11D48)),
                  SizedBox(width: 4),
                  Text(
                    'NEW HYPERLOCAL QUICK ORDER',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFFBE123C), letterSpacing: 0.5),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Order Number & Amount
            Text(
              '#$orderNumber',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 4),
            Text(
              'Customer: $customerName',
              style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 16),

            // Amount Box
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  const Text('ORDER TOTAL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8), letterSpacing: 0.8)),
                  const SizedBox(height: 2),
                  Text(
                    'Rs. ${amount.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: Color(0xFF059669)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Accept Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  AudioAlertService().stopRinging();
                  Navigator.of(context).pop();
                  onAccept();
                },
                icon: const Icon(Icons.check_circle_rounded, size: 20),
                label: const Text('Accept Order & Stop Alarm', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
              ),
            ),
            const SizedBox(height: 10),

            // Dismiss Button
            TextButton(
              onPressed: () {
                AudioAlertService().stopRinging();
                Navigator.of(context).pop();
              },
              child: const Text('Dismiss Alarm', style: TextStyle(color: Color(0xFF64748B), fontSize: 13, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}

