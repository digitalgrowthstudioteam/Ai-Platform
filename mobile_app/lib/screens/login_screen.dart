import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/store_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/smart_store_image.dart';
import '../config/app_config.dart';
import '../services/api_service.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  // Sign In Form Controllers
  final _loginPhoneCtrl = TextEditingController();
  final _loginPwdCtrl = TextEditingController();
  bool _loginObscure = true;

  // Sign Up Form Controllers
  final _regNameCtrl = TextEditingController();
  final _regPhoneCtrl = TextEditingController();
  final _regEmailCtrl = TextEditingController();
  final _regPwdCtrl = TextEditingController();
  bool _regObscure = true;

  final _formKeyLogin = GlobalKey<FormState>();
  final _formKeyRegister = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _loginPhoneCtrl.dispose();
    _loginPwdCtrl.dispose();
    _regNameCtrl.dispose();
    _regPhoneCtrl.dispose();
    _regEmailCtrl.dispose();
    _regPwdCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSignIn() async {
    if (!_formKeyLogin.currentState!.validate()) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);

    final success = await auth.login(
      phone: _loginPhoneCtrl.text.trim(),
      password: _loginPwdCtrl.text.trim(),
    );

    if (success && mounted) {
      _navigateToHome();
    }
  }

  Future<void> _handleRegister() async {
    if (!_formKeyRegister.currentState!.validate()) return;
    final auth = Provider.of<AuthProvider>(context, listen: false);

    final success = await auth.register(
      name: _regNameCtrl.text.trim(),
      phone: _regPhoneCtrl.text.trim(),
      email: _regEmailCtrl.text.trim(),
      password: _regPwdCtrl.text.trim(),
    );

    if (success && mounted) {
      _navigateToHome();
    }
  }

  void _navigateToHome() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const HomeScreen()),
    );
  }

  void _showForgotPasswordDialog() {
    final phoneOrEmailCtrl = TextEditingController(text: _loginPhoneCtrl.text.trim());
    final otpCtrl = TextEditingController();
    final newPwdCtrl = TextEditingController();
    bool otpSent = false;
    bool dialogLoading = false;
    String? dialogError;
    String? maskedContact;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return AlertDialog(
              backgroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Row(
                children: const [
                  Icon(Icons.lock_reset, color: Color(0xFF0B192C)),
                  SizedBox(width: 8),
                  Text("Reset Password", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (dialogError != null)
                      Container(
                        padding: const EdgeInsets.all(8),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          dialogError!,
                          style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12),
                        ),
                      ),
                    if (!otpSent) ...[
                      const Text(
                        "Enter your registered mobile phone or email to receive a 6-digit verification code.",
                        style: TextStyle(fontSize: 13, color: Color(0xFF475569)),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: phoneOrEmailCtrl,
                        decoration: const InputDecoration(
                          labelText: "Phone Number or Email",
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ] else ...[
                      Text(
                        "Enter the 6-digit code sent to $maskedContact and your new password.",
                        style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: otpCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: "6-Digit OTP",
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: newPwdCtrl,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: "New Password (min 6 chars)",
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text("Cancel"),
                ),
                ElevatedButton(
                  onPressed: dialogLoading
                      ? null
                      : () async {
                          setDialogState(() {
                            dialogLoading = true;
                            dialogError = null;
                          });

                          try {
                            final api = ApiService();
                            if (!otpSent) {
                              final res = await api.customerForgotPassword(phoneOrEmailCtrl.text.trim());
                              setDialogState(() {
                                otpSent = true;
                                maskedContact = res['masked_email'] ?? phoneOrEmailCtrl.text;
                                dialogLoading = false;
                              });
                            } else {
                              await api.customerResetPassword(
                                identifier: phoneOrEmailCtrl.text.trim(),
                                otp: otpCtrl.text.trim(),
                                newPassword: newPwdCtrl.text.trim(),
                              );
                              Navigator.of(ctx).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text("Password reset successful! Please log in."),
                                  backgroundColor: Color(0xFF16A34A),
                                ),
                              );
                            }
                          } catch (err) {
                            setDialogState(() {
                              dialogError = err.toString().replaceAll("Exception: ", "");
                              dialogLoading = false;
                            });
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0B192C),
                    foregroundColor: Colors.white,
                  ),
                  child: dialogLoading
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(otpSent ? "Verify & Save" : "Send OTP"),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final logoUrl = store.config?.logoUrl ?? AppConfig.defaultLogoUrl;
    final storeName = store.config?.storeName ?? AppConfig.appTitle;
    final primary = store.primaryColor;

    return Scaffold(
      backgroundColor: const Color(0xFFFDFCFB),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              // Top Luxury Navy Header with Glam Stree Logo
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
                decoration: const BoxDecoration(
                  color: Color(0xFF0B192C),
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(28),
                    bottomRight: Radius.circular(28),
                  ),
                ),
                child: Column(
                  children: [
                    // Brand Logo
                    Container(
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFFD97706), width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFD97706).withOpacity(0.3),
                            blurRadius: 16,
                          ),
                        ],
                      ),
                      child: ClipOval(
                        child: SmartStoreImage(
                          imageUrl: logoUrl,
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
                          fallbackText: "GS",
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Brand Name
                    Text(
                      storeName.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 2.0,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),

                    // Tagline
                    const Text(
                      "Handcrafted Luxury Press-On Studio",
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.2,
                        color: Color(0xFFF472B6), // Pink Accent
                      ),
                    ),
                  ],
                ),
              ),

              // Tab Bar (Sign In / Create Account)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: TabBar(
                    controller: _tabCtrl,
                    indicator: BoxDecoration(
                      color: primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    labelColor: Colors.white,
                    unselectedLabelColor: const Color(0xFF64748B),
                    labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    indicatorSize: TabBarIndicatorSize.tab,
                    tabs: const [
                      Tab(text: "Sign In"),
                      Tab(text: "Create Account"),
                    ],
                  ),
                ),
              ),

              // Error Banner (if any)
              if (auth.errorMessage != null)
                Container(
                  margin: const EdgeInsets.fromLTRB(20, 14, 20, 0),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFCA5A5)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          auth.errorMessage!,
                          style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ),

              // Tab Views
              SizedBox(
                height: 420,
                child: TabBarView(
                  controller: _tabCtrl,
                  children: [
                    // TAB 1: SIGN IN
                    _buildSignInTab(auth, primary),

                    // TAB 2: CREATE ACCOUNT
                    _buildRegisterTab(auth, primary),
                  ],
                ),
              ),

              // Guest Skip Option
              Padding(
                padding: const EdgeInsets.only(bottom: 24),
                child: TextButton(
                  onPressed: _navigateToHome,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      Text(
                        "Skip & Browse Catalog",
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward_ios, size: 12, color: Color(0xFF64748B)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSignInTab(AuthProvider auth, Color primary) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      child: Form(
        key: _formKeyLogin,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Phone Field
            TextFormField(
              controller: _loginPhoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: "10-Digit Mobile Number *",
                prefixIcon: const Icon(Icons.phone_android, size: 20),
                prefixText: "+91 ",
                prefixStyle: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0B192C)),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (v) {
                if (v == null || v.trim().length < 10) {
                  return "Please enter a valid 10-digit mobile number";
                }
                return null;
              },
            ),
            const SizedBox(height: 14),

            // Password Field
            TextFormField(
              controller: _loginPwdCtrl,
              obscureText: _loginObscure,
              decoration: InputDecoration(
                labelText: "Password *",
                prefixIcon: const Icon(Icons.lock_outline, size: 20),
                suffixIcon: IconButton(
                  icon: Icon(_loginObscure ? Icons.visibility_off : Icons.visibility, size: 20),
                  onPressed: () => setState(() => _loginObscure = !_loginObscure),
                ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) {
                  return "Please enter your password";
                }
                return null;
              },
            ),
            const SizedBox(height: 6),

            // Forgot Password Link
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: _showForgotPasswordDialog,
                style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(50, 30)),
                child: const Text(
                  "Forgot Password?",
                  style: TextStyle(color: Color(0xFFDB2777), fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Sign In Button
            ElevatedButton(
              onPressed: auth.loading ? null : _handleSignIn,
              style: ElevatedButton.styleFrom(
                backgroundColor: primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 2,
              ),
              child: auth.loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text(
                      "Sign In to Glam Stree",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRegisterTab(AuthProvider auth, Color primary) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Form(
        key: _formKeyRegister,
        child: ListView(
          physics: const NeverScrollableScrollPhysics(),
          children: [
            // Full Name
            TextFormField(
              controller: _regNameCtrl,
              decoration: InputDecoration(
                labelText: "Full Name *",
                prefixIcon: const Icon(Icons.person_outline, size: 20),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (v) => (v == null || v.trim().length < 2) ? "Full name is required" : null,
            ),
            const SizedBox(height: 10),

            // Phone
            TextFormField(
              controller: _regPhoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: "10-Digit Mobile Number *",
                prefixIcon: const Icon(Icons.phone_android, size: 20),
                prefixText: "+91 ",
                prefixStyle: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0B192C)),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (v) => (v == null || v.trim().length < 10) ? "10-digit mobile required" : null,
            ),
            const SizedBox(height: 10),

            // Email
            TextFormField(
              controller: _regEmailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: "Email Address *",
                prefixIcon: const Icon(Icons.mail_outline, size: 20),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (v) => (v == null || !v.contains("@")) ? "Valid email required" : null,
            ),
            const SizedBox(height: 10),

            // Password
            TextFormField(
              controller: _regPwdCtrl,
              obscureText: _regObscure,
              decoration: InputDecoration(
                labelText: "Create Password (min 6 chars) *",
                prefixIcon: const Icon(Icons.lock_outline, size: 20),
                suffixIcon: IconButton(
                  icon: Icon(_regObscure ? Icons.visibility_off : Icons.visibility, size: 20),
                  onPressed: () => setState(() => _regObscure = !_regObscure),
                ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              validator: (v) => (v == null || v.trim().length < 6) ? "Minimum 6 characters" : null,
            ),
            const SizedBox(height: 16),

            // Register Button
            ElevatedButton(
              onPressed: auth.loading ? null : _handleRegister,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFDB2777), // Glam Rose Pink
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 2,
              ),
              child: auth.loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text(
                      "Create Account & Continue",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
