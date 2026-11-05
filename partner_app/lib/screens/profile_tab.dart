import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/auth_provider.dart';
import '../config/api_config.dart';

class ProfileTab extends StatelessWidget {
  const ProfileTab({super.key});

  Future<void> _openWebDashboard() async {
    final uri = Uri.parse(ApiConfig.webSubscriptionRenewUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Store Profile & Services', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Vendor Identity Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: const Color(0xFF4F46E5).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Center(
                      child: Icon(Icons.store_rounded, size: 28, color: Color(0xFF4F46E5)),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.storeName ?? 'Merchant Store',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user?.email ?? '',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'ID: ${user?.vendorCode ?? "N/A"}',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF475569), fontFamily: 'monospace'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Active Integration Entitlements (Condition 1: Displays what admin enabled)
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('ACTIVE MODULE ENTITLEMENTS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8), letterSpacing: 0.8)),
                  const SizedBox(height: 14),
                  _buildServiceRow('Hyperlocal Quick Delivery', auth.isHyperlocalActive, Icons.near_me_rounded),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _buildServiceRow('Razorpay Payment Gateway', auth.isRazorpayActive, Icons.credit_card_rounded),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _buildServiceRow('Shiprocket Courier Logistics', auth.isShiprocketActive, Icons.local_shipping_rounded),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _buildServiceRow('SMS Gateway Engine', auth.isSmsActive, Icons.message_rounded),
                  const Divider(height: 20, color: Color(0xFFF1F5F9)),
                  _buildServiceRow('Custom Domain & SSL', auth.isCustomDomainActive, Icons.language_rounded),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Web Management Notice Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.shield_outlined, size: 18, color: Color(0xFF16A34A)),
                      SizedBox(width: 8),
                      Text('Desktop Web Billing', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF166534))),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'To protect you against 30% digital store commissions, all add-ons and plan renewals are processed safely on the desktop web dashboard.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF15803D), height: 1.4),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: _openWebDashboard,
                    icon: const Icon(Icons.open_in_browser_rounded, size: 16),
                    label: const Text('Manage Plan & Add-ons on Web Browser', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF16A34A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Sign Out Button
            OutlinedButton.icon(
              onPressed: () => auth.logout(),
              icon: const Icon(Icons.logout_rounded, size: 18),
              label: const Text('Sign Out of Partner App', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFDC2626),
                side: const BorderSide(color: Color(0xFFFECACA)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceRow(String title, bool isActive, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: isActive ? const Color(0xFF4F46E5) : const Color(0xFF94A3B8)),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: isActive ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFFD1FAE5) : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            isActive ? 'ACTIVE' : 'LOCKED',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: isActive ? const Color(0xFF059669) : const Color(0xFF94A3B8),
            ),
          ),
        ),
      ],
    );
  }
}

