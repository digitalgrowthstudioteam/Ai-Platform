import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/auth_provider.dart';
import '../config/api_config.dart';

class SubscriptionLockScreen extends StatelessWidget {
  const SubscriptionLockScreen({super.key});

  Future<void> _openWebRenewal(BuildContext context) async {
    final uri = Uri.parse(ApiConfig.webSubscriptionRenewUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please visit digitalgrowthstudio.in on your web browser to renew.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),

              // Lock Icon Badge
              Center(
                child: Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withOpacity(0.15),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.4), width: 2),
                  ),
                  child: const Center(
                    child: Icon(Icons.lock_clock_rounded, size: 48, color: Color(0xFFF87171)),
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // Title
              const Text(
                'Store Subscription Expired',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 10),

              // Store Tag
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withOpacity(0.15)),
                  ),
                  child: Text(
                    '${user?.storeName ?? "My Store"} (${user?.vendorCode ?? "VENDOR"})',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF94A3B8)),
                  ),
                ),
              ),
              const SizedBox(height: 18),

              // Description
              const Text(
                'Access to your merchant partner app, live order alerts, and catalog management has been temporarily locked because your monthly store subscription has expired.\n\nTo avoid Play Store service fees, billing and renewals are completed strictly on your desktop or mobile web browser.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: Color(0xFF94A3B8),
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 36),

              // Primary CTA Button: Renew on Web Browser
              ElevatedButton.icon(
                onPressed: () => _openWebRenewal(context),
                icon: const Icon(Icons.open_in_browser_rounded, size: 20),
                label: const Text('Renew Subscription on Web Browser', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6366F1),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
              ),
              const SizedBox(height: 12),

              // Refresh Button
              OutlinedButton.icon(
                onPressed: () => auth.checkAuth(),
                icon: const Icon(Icons.refresh_rounded, size: 18, color: Color(0xFFCBD5E1)),
                label: const Text('I Have Completed Payment (Refresh)', style: TextStyle(fontSize: 13, color: Color(0xFFCBD5E1), fontWeight: FontWeight.w600)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  side: BorderSide(color: Colors.white.withOpacity(0.2)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),

              const Spacer(),

              // Sign Out Link
              Center(
                child: TextButton.icon(
                  onPressed: () => auth.logout(),
                  icon: const Icon(Icons.logout_rounded, size: 16, color: Color(0xFF64748B)),
                  label: const Text('Log out of account', style: TextStyle(color: Color(0xFF64748B), fontSize: 13, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

