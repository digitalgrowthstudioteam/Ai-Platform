import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../providers/store_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/smart_store_image.dart';
import '../config/app_config.dart';
import '../services/api_service.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  final Widget? redirectTo;
  final String? promptMessage;

  const LoginScreen({
    super.key,
    this.redirectTo,
    this.promptMessage,
  });

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
      _navigateNext();
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
      _navigateNext();
    }
  }

  void _navigateNext() {
    if (widget.redirectTo != null) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => widget.redirectTo!),
      );
    } else if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop(true);
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    }
  }

  Future<void> _handleGoogleSignIn() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    try {
      final googleSignIn = GoogleSignIn(scopes: ['email', 'profile']);
      final account = await googleSignIn.signIn();
      if (account == null) return; // User cancelled

      final result = await auth.googleAuthRaw(
        email: account.email,
        name: account.displayName ?? "Customer",
        googleId: account.id,
      );

      if (result['success'] == true && mounted) {
        _navigateNext();
      } else if (result['requires_phone'] == true && mounted) {
        _showPhonePromptDialog(
          email: account.email,
          name: account.displayName ?? "Customer",
          googleId: account.id,
        );
      }
    } catch (_) {
      // Fallback dialog for devices/emulators without full Play Services
      _showManualGoogleAuthDialog();
    }
  }

  void _showPhonePromptDialog({
    required String email,
    required String name,
    required String googleId,
  }) {
    final phoneCtrl = TextEditingController();
    bool loading = false;
    String? error;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (bCtx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: const [
                  Icon(Icons.phone_android, color: Color(0xFF0F172A), size: 24),
                  SizedBox(width: 8),
                  Text("Enter Mobile Number", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                "Please enter your 10-digit mobile number for order delivery & tracking updates.",
                style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
              ),
              if (error != null) ...[
                const SizedBox(height: 8),
                Text(error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
              ],
              const SizedBox(height: 14),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                autofocus: true,
                decoration: const InputDecoration(
                  prefixText: "+91 ",
                  labelText: "10-Digit Mobile Number",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: loading
                    ? null
                    : () async {
                        final phone = phoneCtrl.text.trim();
                        if (phone.length < 10) {
                          setSheetState(() => error = "Please enter a valid 10-digit mobile number");
                          return;
                        }
                        setSheetState(() => loading = true);
                        final auth = Provider.of<AuthProvider>(context, listen: false);
                        final res = await auth.googleAuthRaw(
                          email: email,
                          name: name,
                          phone: phone,
                          googleId: googleId,
                        );
                        if (res['success'] == true && mounted) {
                          if (bCtx.mounted) Navigator.of(bCtx).pop();
                          _navigateNext();
                        } else {
                          setSheetState(() {
                            loading = false;
                            error = res['error'] ?? "Failed to link phone number";
                          });
                        }
                      },
                child: loading
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text("Confirm & Continue"),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showManualGoogleAuthDialog() {
    final emailCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    bool loading = false;
    String? error;

    showDialog(
      context: context,
      builder: (dCtx) => StatefulBuilder(
        builder: (ctx, setDState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: const [
              Icon(Icons.account_circle, color: Color(0xFF2563EB), size: 24),
              SizedBox(width: 8),
              Text("Google Sign In", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (error != null)
                  Container(
                    padding: const EdgeInsets.all(8),
                    margin: const EdgeInsets.only(bottom: 10),
                    decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(8)),
                    child: Text(error!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12)),
                  ),
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: "Google Email", border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: "Full Name", border: OutlineInputBorder()),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(prefixText: "+91 ", labelText: "10-Digit Mobile", border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(dCtx).pop(), child: const Text("Cancel")),
            ElevatedButton(
              onPressed: loading
                  ? null
                  : () async {
                      if (!emailCtrl.text.contains("@") || phoneCtrl.text.trim().length < 10) {
                        setDState(() => error = "Valid Google email and 10-digit mobile required");
                        return;
                      }
                      setDState(() => loading = true);
                      final auth = Provider.of<AuthProvider>(context, listen: false);
                      final res = await auth.googleAuthRaw(
                        email: emailCtrl.text.trim(),
                        name: nameCtrl.text.trim().isNotEmpty ? nameCtrl.text.trim() : "Google Shopper",
                        phone: phoneCtrl.text.trim(),
                        googleId: "google_${DateTime.now().millisecondsSinceEpoch}",
                      );
                      if (res['success'] == true && mounted) {
                        if (dCtx.mounted) Navigator.of(dCtx).pop();
                        _navigateNext();
                      } else {
                        setDState(() {
                          loading = false;
                          error = res['error'] ?? "Failed to sign in";
                        });
                      }
                    },
              child: loading
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text("Continue"),
            ),
          ],
        ),
      ),
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
                              if (dialogContext.mounted) {
                                Navigator.of(ctx).pop();
                              }
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text("Password reset successful! Please log in."),
                                    backgroundColor: Color(0xFF16A34A),
                                  ),
                                );
                              }
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
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B192C),
        elevation: 0,
        leading: Navigator.of(context).canPop()
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () => Navigator.of(context).pop(),
              )
            : null,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              // Top Luxury Navy Header with Glam Stree Logo
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
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
                            color: const Color(0xFFD97706).withAlpha(76),
                            blurRadius: 16,
                          ),
                        ],
                      ),
                      child: ClipOval(
                        child: SmartStoreImage(
                          imageUrl: logoUrl,
                          width: 74,
                          height: 74,
                          fit: BoxFit.cover,
                          fallbackText: "GS",
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Brand Name
                    Text(
                      storeName.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 2.0,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),

                    // Tagline
                    Text(
                      store.config?.description ?? AppConfig.appTagline,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.2,
                        color: store.secondaryColor,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),

              // Mandatory Action Prompt Banner (if redirected from checkout / my account)
              if (widget.promptMessage != null)
                Container(
                  margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, color: Color(0xFFD97706), size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          widget.promptMessage!,
                          style: const TextStyle(
                            color: Color(0xFF92400E),
                            fontSize: 12.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // Tab Bar (Sign In / Create Account)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
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
                height: 520,
                child: TabBarView(
                  controller: _tabCtrl,
                  children: [
                    // TAB 1: SIGN IN
                    _buildSignInTab(auth, primary, storeName),

                    // TAB 2: CREATE ACCOUNT
                    _buildRegisterTab(auth, primary),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSignInTab(AuthProvider auth, Color primary, String storeName) {
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
                  : Text(
                      "Sign In to $storeName",
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
            ),
            const SizedBox(height: 16),
            _buildOrDivider(),
            const SizedBox(height: 14),
            _buildGoogleButton(auth, isSignUp: false),
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
                      "Create Account & Continue",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
            ),
            const SizedBox(height: 14),
            _buildOrDivider(),
            const SizedBox(height: 12),
            _buildGoogleButton(auth, isSignUp: true),
          ],
        ),
      ),
    );
  }

  Widget _buildOrDivider() {
    return Row(
      children: const [
        Expanded(child: Divider(color: Color(0xFFE2E8F0))),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 10),
          child: Text(
            "OR",
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8)),
          ),
        ),
        Expanded(child: Divider(color: Color(0xFFE2E8F0))),
      ],
    );
  }

  Widget _buildGoogleButton(AuthProvider auth, {required bool isSignUp}) {
    return OutlinedButton(
      onPressed: auth.loading ? null : _handleGoogleSignIn,
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 13),
        side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: Colors.white,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.network(
            "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/768px-Google_%22G%22_logo.svg.png",
            width: 20,
            height: 20,
            errorBuilder: (_, _, _) => const Icon(Icons.g_mobiledata, color: Color(0xFF4285F4), size: 24),
          ),
          const SizedBox(width: 10),
          Text(
            isSignUp ? "Sign Up with Google" : "Sign In with Google",
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }
}
