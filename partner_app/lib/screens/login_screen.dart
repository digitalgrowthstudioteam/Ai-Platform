import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/auth_provider.dart';
import '../config/api_config.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Please enter both email and password.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.login(email, password);

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (!success) {
      setState(() => _error = auth.errorMessage ?? 'Invalid login credentials.');
    }
  }

  Future<void> _handleGoogleLogin() async {
    // Info notification directing to web registration or prompt
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Google Sign-In is launching via your default merchant browser account...'),
        duration: Duration(seconds: 2),
      ),
    );
    final uri = Uri.parse(ApiConfig.loginUrl.replaceAll('/api/v1/platform/auth/login', '/app/login'));
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  // Condition 3: Strictly redirect new users to web browser for registration
  Future<void> _redirectToWebRegistration() async {
    final uri = Uri.parse(ApiConfig.webRegisterUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open web browser. Please visit digitalgrowthstudio.in')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // App Logo & Brand Header
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF4F46E5), Color(0xFF2563EB)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF4F46E5).withOpacity(0.3),
                        blurRadius: 16,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Icon(Icons.storefront_rounded, size: 38, color: Colors.white),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'DGS Store Partner',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Unified Merchant Dashboard & Operations',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 36),

                // Error Banner
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      border: Border.all(color: const Color(0xFFFECACA)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline_rounded, size: 18, color: Color(0xFFDC2626)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _error!,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF991B1B), fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // Login Form Card
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Email Field
                      const Text(
                        'VENDOR EMAIL',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.8),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        style: const TextStyle(fontSize: 14),
                        decoration: InputDecoration(
                          hintText: 'vendor@example.com',
                          hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                          prefixIcon: const Icon(Icons.email_outlined, size: 18, color: Color(0xFF64748B)),
                          filled: true,
                          fillColor: const Color(0xFFF8FAFC),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.5)),
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Password Field
                      const Text(
                        'PASSWORD',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF64748B), letterSpacing: 0.8),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        style: const TextStyle(fontSize: 14),
                        decoration: InputDecoration(
                          hintText: '••••••••',
                          hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                          prefixIcon: const Icon(Icons.lock_outline_rounded, size: 18, color: Color(0xFF64748B)),
                          suffixIcon: IconButton(
                            icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18, color: const Color(0xFF64748B)),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                          filled: true,
                          fillColor: const Color(0xFFF8FAFC),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.5)),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Submit Button
                      ElevatedButton(
                        onPressed: _isLoading ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF4F46E5),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: _isLoading
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text('Sign In to Store Partner', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(height: 16),

                      // Google Sign In Button
                      OutlinedButton.icon(
                        onPressed: _isLoading ? null : _handleGoogleLogin,
                        icon: const Icon(Icons.g_mobiledata_rounded, size: 24, color: Color(0xFFDB4437)),
                        label: const Text('Sign in with Google', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          side: const BorderSide(color: Color(0xFFCBD5E1)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // Condition 3: Browser registration redirection banner
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEF2FF),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFC7D2FE)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.open_in_browser_rounded, size: 22, color: Color(0xFF4F46E5)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'New merchant on DGS?',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E1B4B)),
                            ),
                            const SizedBox(height: 2),
                            InkWell(
                              onTap: _redirectToWebRegistration,
                              child: const Text(
                                'Register your store on Web Browser →',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF4F46E5), decoration: TextDecoration.underline),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

