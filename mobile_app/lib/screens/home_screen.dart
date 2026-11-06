import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/store_provider.dart';
import '../providers/cart_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/wishlist_provider.dart';
import '../models/store_models.dart';
import '../widgets/smart_store_image.dart';
import '../widgets/location_selector_sheet.dart';
import 'product_detail_screen.dart';
import 'cart_screen.dart';
import 'profile_screen.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentNavIndex = 0;
  String _activeTab = "Items"; // "Items" or "Shop"
  String _selectedCategorySlug = "ALL";
  bool _isSearching = false;
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = Provider.of<StoreProvider>(context);
    final cart = Provider.of<CartProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final wishlist = Provider.of<WishlistProvider>(context);

    const primaryGreen = Color(0xFF15803D);     // Forest Green
    const sageBg = Color(0xFFEDF4EE);           // Pale Sage Green
    const textDark = Color(0xFF111827);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Stack(
          children: [
            RefreshIndicator(
              color: primaryGreen,
              onRefresh: () => store.initializeStore(),
              child: CustomScrollView(
                slivers: [
                  // 1. Top Bar (Matching Reference Screen 2)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                      child: Row(
                        children: [
                          // Location Icon
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: sageBg,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.location_on, color: primaryGreen, size: 20),
                          ),
                          const SizedBox(width: 10),

                          // Location Subtitle & Title
                          Expanded(
                            child: InkWell(
                              onTap: () => LocationSelectorSheet.show(context),
                              borderRadius: BorderRadius.circular(8),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Text(
                                    "Express delivery",
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: Color(0xFF94A3B8),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          store.deliveryLocationDisplayText,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w800,
                                            color: textDark,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const Icon(Icons.keyboard_arrow_down_rounded, size: 18, color: Color(0xFF64748B)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),

                          // Search Icon
                          IconButton(
                            icon: Icon(
                              _isSearching ? Icons.close : Icons.search,
                              color: textDark,
                              size: 24,
                            ),
                            onPressed: () {
                              setState(() {
                                _isSearching = !_isSearching;
                                if (!_isSearching) {
                                  _searchCtrl.clear();
                                  store.searchProducts("");
                                }
                              });
                            },
                          ),

                          // Notification / Alerts
                          IconButton(
                            icon: const Icon(Icons.notifications_none_rounded, color: textDark, size: 24),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text("⚡ Real-time farm fresh order alerts active!"),
                                  duration: Duration(milliseconds: 1600),
                                  backgroundColor: primaryGreen,
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Optional Search Bar
                  if (_isSearching)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: TextField(
                            controller: _searchCtrl,
                            autofocus: true,
                            decoration: InputDecoration(
                              hintText: "Search fresh vegetables, fruits, herbs...",
                              hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                              prefixIcon: const Icon(Icons.search, color: primaryGreen, size: 20),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              suffixIcon: _searchCtrl.text.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(Icons.clear, size: 18),
                                      onPressed: () {
                                        _searchCtrl.clear();
                                        store.searchProducts("");
                                        setState(() {});
                                      },
                                    )
                                  : null,
                            ),
                            onChanged: (val) {
                              store.searchProducts(val);
                              setState(() {});
                            },
                          ),
                        ),
                      ),
                    ),

                  // 2. Segmented Pill Tabs ("Items" | "Shop" - Matching Reference Screen 2)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: InkWell(
                                onTap: () {
                                  setState(() {
                                    _activeTab = "Items";
                                    _selectedCategorySlug = "ALL";
                                    store.selectCategory(null);
                                  });
                                },
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: _activeTab == "Items" ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(20),
                                    boxShadow: _activeTab == "Items"
                                        ? [
                                            BoxShadow(
                                              color: Colors.black.withValues(alpha: 0.05),
                                              blurRadius: 4,
                                              offset: const Offset(0, 1),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Center(
                                    child: Text(
                                      "Items",
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w800,
                                        color: _activeTab == "Items" ? primaryGreen : const Color(0xFF64748B),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              child: InkWell(
                                onTap: () {
                                  setState(() {
                                    _activeTab = "Shop";
                                  });
                                },
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  decoration: BoxDecoration(
                                    color: _activeTab == "Shop" ? Colors.white : Colors.transparent,
                                    borderRadius: BorderRadius.circular(20),
                                    boxShadow: _activeTab == "Shop"
                                        ? [
                                            BoxShadow(
                                              color: Colors.black.withValues(alpha: 0.05),
                                              blurRadius: 4,
                                              offset: const Offset(0, 1),
                                            ),
                                          ]
                                        : null,
                                  ),
                                  child: Center(
                                    child: Text(
                                      "Shop",
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w800,
                                        color: _activeTab == "Shop" ? primaryGreen : const Color(0xFF64748B),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // 3. Category Horizontal Pills (When "Shop" or filter active)
                  if (store.categories.isNotEmpty)
                    SliverToBoxAdapter(
                      child: SizedBox(
                        height: 44,
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          scrollDirection: Axis.horizontal,
                          itemCount: store.categories.length + 1,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (context, idx) {
                            if (idx == 0) {
                              final isAll = _selectedCategorySlug == "ALL";
                              return InkWell(
                                onTap: () {
                                  setState(() => _selectedCategorySlug = "ALL");
                                  store.selectCategory(null);
                                },
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: isAll ? primaryGreen : const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isAll ? primaryGreen : const Color(0xFFE2E8F0),
                                    ),
                                  ),
                                  child: Center(
                                    child: Text(
                                      "All Produce",
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: isAll ? Colors.white : const Color(0xFF475569),
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }
                            final cat = store.categories[idx - 1];
                            final isSelected = _selectedCategorySlug == cat.slug;
                            return InkWell(
                              onTap: () {
                                setState(() => _selectedCategorySlug = cat.slug);
                                store.selectCategory(cat.slug);
                              },
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                decoration: BoxDecoration(
                                  color: isSelected ? primaryGreen : const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSelected ? primaryGreen : const Color(0xFFE2E8F0),
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    cat.name,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: isSelected ? Colors.white : const Color(0xFF475569),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),

                  // 4. Hero Banner Card (Matching Reference Screen 2)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                      child: Container(
                        height: 135,
                        decoration: BoxDecoration(
                          color: sageBg,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Stack(
                          children: [
                            // Content
                            Padding(
                              padding: const EdgeInsets.all(18.0),
                              child: SizedBox(
                                width: 200,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEF4444),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Text(
                                        "LIMITED OFFER",
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 9,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    const Text(
                                      "20% Discount for every 3 items order in first time.",
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w800,
                                        color: textDark,
                                        height: 1.3,
                                      ),
                                      maxLines: 3,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            // Illustration on Right
                            Positioned(
                              right: 12,
                              bottom: 10,
                              top: 10,
                              child: Container(
                                width: 110,
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.7),
                                  shape: BoxShape.circle,
                                ),
                                padding: const EdgeInsets.all(12),
                                child: Image.asset(
                                  'assets/images/logo.png',
                                  fit: BoxFit.contain,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // 5. Section Header ("Popular of the week" - See all)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "Popular of the week",
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: textDark,
                              letterSpacing: -0.3,
                            ),
                          ),
                          InkWell(
                            onTap: () {
                              setState(() {
                                _selectedCategorySlug = "ALL";
                                store.selectCategory(null);
                              });
                            },
                            child: const Text(
                              "See all",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: primaryGreen,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // 6. Product Cards Grid (Matching Reference Screen 2)
                  if (store.loading)
                    const SliverToBoxAdapter(
                      child: Padding(
                        padding: EdgeInsets.all(40),
                        child: Center(
                          child: CircularProgressIndicator(color: primaryGreen),
                        ),
                      ),
                    )
                  else if (store.products.isEmpty)
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.all(40.0),
                        child: Center(
                          child: Column(
                            children: const [
                              Icon(Icons.eco_outlined, size: 48, color: Color(0xFFCBD5E1)),
                              SizedBox(height: 12),
                              Text(
                                "No fresh produce found matching your search.",
                                style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                  else
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                      sliver: SliverGrid(
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.72,
                          crossAxisSpacing: 14,
                          mainAxisSpacing: 16,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, idx) {
                            final p = store.products[idx];
                            return _buildProductCard(context, p, cart, wishlist);
                          },
                          childCount: store.products.length,
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // 7. Persistent Floating Bottom Cart Pill
            if (cart.itemCount > 0)
              Positioned(
                left: 16,
                right: 16,
                bottom: 80,
                child: InkWell(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const CartScreen()),
                    );
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: primaryGreen,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: primaryGreen.withValues(alpha: 0.35),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.shopping_bag_outlined, color: Colors.white, size: 20),
                            const SizedBox(width: 10),
                            Text(
                              "${cart.itemCount} ${cart.itemCount == 1 ? 'item' : 'items'}  •  ₹${cart.subtotal.toStringAsFixed(0)}",
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                        const Row(
                          children: [
                            Text(
                              "View Cart",
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            SizedBox(width: 4),
                            Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 12),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),

      // 8. Bottom Navigation Bar (Matching Reference Screen 2: Home, Search, Cart, Profile)
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Colors.grey.shade200, width: 0.8)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentNavIndex,
          onTap: (index) {
            setState(() => _currentNavIndex = index);
            if (index == 1) {
              setState(() => _isSearching = true);
            } else if (index == 2) {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const CartScreen()),
              );
            } else if (index == 3) {
              if (auth.isLoggedIn) {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProfileScreen()),
                );
              } else {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const LoginScreen(
                      promptMessage: "Sign in to manage your account and orders.",
                      redirectTo: ProfileScreen(),
                    ),
                  ),
                );
              }
            }
          },
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          selectedItemColor: primaryGreen,
          unselectedItemColor: const Color(0xFF94A3B8),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11),
          elevation: 0,
          items: [
            const BottomNavigationBarItem(
              icon: Icon(Icons.home_filled),
              label: "Home",
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.search_rounded),
              label: "Search",
            ),
            BottomNavigationBarItem(
              icon: Stack(
                clipBehavior: Clip.none,
                children: [
                  const Icon(Icons.shopping_bag_outlined),
                  if (cart.itemCount > 0)
                    Positioned(
                      right: -6,
                      top: -4,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: const BoxDecoration(
                          color: Color(0xFFEF4444),
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                        child: Text(
                          "${cart.itemCount}",
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 8.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              label: "Cart",
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded),
              label: "Profile",
            ),
          ],
        ),
      ),
    );
  }

  // Beautiful Produce Product Card (Matching Screen 2)
  Widget _buildProductCard(
    BuildContext context,
    ProductItem p,
    CartProvider cart,
    WishlistProvider wishlist,
  ) {
    const primaryGreen = Color(0xFF15803D);
    const sageBg = Color(0xFFEDF4EE); // Soft Pale Sage Green
    final isWishlisted = wishlist.isWishlisted(p.id);
    final int qty = cart.getQuantity(p.id);

    return Container(
      decoration: BoxDecoration(
        color: sageBg,
        borderRadius: BorderRadius.circular(20),
      ),
      padding: const EdgeInsets.all(10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top: Floating Circular Wishlist Button + Centered Image
          Expanded(
            child: Stack(
              children: [
                // Centered Product Photo
                Center(
                  child: InkWell(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => ProductDetailScreen(product: p)),
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(6.0),
                      child: SmartStoreImage(
                        imageUrl: p.primaryImage,
                        fit: BoxFit.contain,
                        fallbackText: "VG",
                      ),
                    ),
                  ),
                ),

                // Floating Circular Wishlist Button
                Positioned(
                  top: 0,
                  right: 0,
                  child: InkWell(
                    onTap: () async {
                      await wishlist.toggleWishlist(p);
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.9),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: Icon(
                        isWishlisted ? Icons.favorite : Icons.favorite_border,
                        size: 15,
                        color: isWishlisted ? const Color(0xFFEF4444) : const Color(0xFF94A3B8),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),

          // Title & Rating (e.g. "Broccoli Fresh"  ★ 4.3)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text(
                  p.title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF111827),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const Row(
                children: [
                  Icon(Icons.star_rounded, size: 14, color: Color(0xFFF59E0B)),
                  SizedBox(width: 2),
                  Text(
                    "4.3",
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 3),

          // Price (e.g. ₹26 /500gm)
          Text(
            "₹${p.effectivePrice.toStringAsFixed(0)} /500gm",
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w900,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 8),

          // Bottom Action: "Add to cart" or Stepper [-] qty [+]
          if (qty == 0)
            InkWell(
              onTap: () => cart.addToCart(p),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                height: 34,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: primaryGreen.withValues(alpha: 0.4)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.shopping_bag_outlined, size: 14, color: primaryGreen),
                    SizedBox(width: 5),
                    Text(
                      "Add to cart",
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: primaryGreen,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Container(
              height: 34,
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  InkWell(
                    onTap: () => cart.updateQuantity(p.id, qty - 1),
                    borderRadius: const BorderRadius.horizontal(left: Radius.circular(14)),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      child: Icon(Icons.remove, size: 14, color: Colors.white),
                    ),
                  ),
                  Text(
                    "$qty",
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 13,
                    ),
                  ),
                  InkWell(
                    onTap: () => cart.updateQuantity(p.id, qty + 1),
                    borderRadius: const BorderRadius.horizontal(right: Radius.circular(14)),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      child: Icon(Icons.add, size: 14, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
