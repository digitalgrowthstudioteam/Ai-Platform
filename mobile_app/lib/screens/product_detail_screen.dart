import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/store_models.dart';
import '../services/api_service.dart';
import '../providers/cart_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/wishlist_provider.dart';
import '../widgets/smart_store_image.dart';
import '../widgets/sizing_guide_sheet.dart';
import 'cart_screen.dart';
import 'checkout_screen.dart';
import 'login_screen.dart';
import 'wishlist_screen.dart';

class ProductDetailScreen extends StatefulWidget {
  final ProductItem? product;
  final String? productId;

  const ProductDetailScreen({
    super.key,
    this.product,
    this.productId,
  });

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  ProductItem? _product;
  ProductVariant? _selectedVariant;
  int _quantity = 1;
  int _activeImageIdx = 0;
  bool _loading = false;
  final PageController _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    if (widget.product != null) {
      _product = widget.product;
      if (_product!.variants.isNotEmpty) {
        _selectedVariant = _product!.variants.first;
      }
    } else if (widget.productId != null) {
      _loading = true;
      _fetchDetail();
    }
  }

  Future<void> _fetchDetail() async {
    final item = await ApiService().getProductDetail(widget.productId!);
    if (mounted) {
      setState(() {
        _product = item;
        if (item != null && item.variants.isNotEmpty) {
          _selectedVariant = item.variants.first;
        }
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);
    final auth = Provider.of<AuthProvider>(context);
    final wishlist = Provider.of<WishlistProvider>(context);

    if (_loading) {
      return Scaffold(
        appBar: AppBar(elevation: 0, backgroundColor: Colors.white),
        body: const Center(child: CircularProgressIndicator(color: Color(0xFF0F172A))),
      );
    }

    if (_product == null) {
      return Scaffold(
        appBar: AppBar(elevation: 0, backgroundColor: Colors.white),
        body: const Center(child: Text("Product not found")),
      );
    }

    final p = _product!;
    final images = _selectedVariant != null && _selectedVariant!.images.isNotEmpty
        ? _selectedVariant!.images
        : (p.galleryImages.isNotEmpty
            ? p.galleryImages
            : (p.primaryImage != null ? [p.primaryImage!] : <String>[]));

    final effectivePrice = _selectedVariant != null
        ? (_selectedVariant!.salePrice ?? _selectedVariant!.price)
        : p.effectivePrice;

    final inStock = _selectedVariant != null
        ? _selectedVariant!.stockQuantity > 0
        : p.inStock;

    final discountPercent = p.regularPrice > effectivePrice
        ? (((p.regularPrice - effectivePrice) / p.regularPrice) * 100).round()
        : 0;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: const BackButton(color: Color(0xFF0F172A)),
        title: Text(
          p.title,
          style: const TextStyle(color: Color(0xFF0F172A), fontSize: 15, fontWeight: FontWeight.bold),
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          // Wishlist Button
          IconButton(
            icon: Icon(
              wishlist.isWishlisted(p.id) ? Icons.favorite : Icons.favorite_border,
              color: wishlist.isWishlisted(p.id) ? const Color(0xFFE11D48) : const Color(0xFF0F172A),
            ),
            tooltip: "Wishlist",
            onPressed: () async {
              final added = await wishlist.toggleWishlist(p);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(added ? "${p.title} added to Wishlist!" : "${p.title} removed from Wishlist"),
                    duration: const Duration(milliseconds: 1400),
                    backgroundColor: const Color(0xFF0F172A),
                    action: SnackBarAction(
                      label: "VIEW",
                      textColor: const Color(0xFFD4AF37),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const WishlistScreen()),
                        );
                      },
                    ),
                  ),
                );
              }
            },
          ),

          // Shopping Bag Button
          IconButton(
            icon: Stack(
              children: [
                const Icon(Icons.shopping_bag_outlined, color: Color(0xFF0F172A)),
                if (cart.itemCount > 0)
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(color: Color(0xFFD4AF37), shape: BoxShape.circle),
                      child: Text(
                        '${cart.itemCount}',
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
              ],
            ),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const CartScreen()),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. High-Res Full Product Image Viewer (Full Page Width & Unrestricted Aspect Ratio)
            if (images.isNotEmpty) ...[
              Stack(
                alignment: Alignment.bottomCenter,
                children: [
                  AspectRatio(
                    aspectRatio: 1.0,
                    child: PageView.builder(
                      controller: _pageController,
                      itemCount: images.length,
                      onPageChanged: (idx) => setState(() => _activeImageIdx = idx),
                      itemBuilder: (context, idx) {
                        return GestureDetector(
                          onTap: () => _showFullScreenImage(context, images, idx),
                          child: Container(
                            color: const Color(0xFFF8FAFC),
                            child: SmartStoreImage(
                              imageUrl: images[idx],
                              width: double.infinity,
                              fit: BoxFit.contain,
                              fallbackText: "AC",
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  // Page Dots Indicator
                  if (images.length > 1)
                    Positioned(
                      bottom: 12,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(images.length, (idx) {
                          return Container(
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            width: _activeImageIdx == idx ? 18 : 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: _activeImageIdx == idx ? const Color(0xFF0F172A) : Colors.black.withAlpha(50),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          );
                        }),
                      ),
                    ),
                ],
              ),

              // Horizontal Thumbnail Carousel (for multiple images / variants)
              if (images.length > 1)
                Container(
                  height: 74,
                  margin: const EdgeInsets.only(top: 10, bottom: 4),
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: images.length,
                    itemBuilder: (context, idx) {
                      final isSelected = _activeImageIdx == idx;
                      return GestureDetector(
                        onTap: () {
                          setState(() => _activeImageIdx = idx);
                          if (_pageController.hasClients) {
                            _pageController.animateToPage(
                              idx,
                              duration: const Duration(milliseconds: 250),
                              curve: Curves.easeInOut,
                            );
                          }
                        },
                        child: Container(
                          width: 64,
                          height: 64,
                          margin: const EdgeInsets.only(right: 10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected ? const Color(0xFFD4AF37) : const Color(0xFFE2E8F0),
                              width: isSelected ? 2.5 : 1.0,
                            ),
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: const Color(0xFFD4AF37).withAlpha(60),
                                      blurRadius: 6,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: SmartStoreImage(
                              imageUrl: images[idx],
                              width: 64,
                              height: 64,
                              fit: BoxFit.cover,
                              fallbackText: "AC",
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
            ],

            // 2. Product Information
            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category & Rating Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          p.category ?? "Men's Apparel",
                          style: const TextStyle(
                            color: Color(0xFF0F172A),
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Row(
                        children: const [
                          Icon(Icons.star, color: Color(0xFFEAB308), size: 14),
                          SizedBox(width: 4),
                          Text("5.0 (24 reviews)", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Title
                  Text(
                    p.title,
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Pricing Block
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        "₹${effectivePrice.toStringAsFixed(0)}",
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(width: 10),
                      if (p.regularPrice > effectivePrice) ...[
                        Text(
                          "₹${p.regularPrice.toStringAsFixed(0)}",
                          style: const TextStyle(
                            fontSize: 14,
                            decoration: TextDecoration.lineThrough,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDC2626),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            "$discountPercent% OFF",
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Brand Guarantee Banner
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.verified, color: Color(0xFFD4AF37), size: 20),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            "Ashtekar Tailored Guarantee: 100% fine fabrics, handcrafted tailoring & complimentary size exchange.",
                            style: TextStyle(fontSize: 11.5, color: Color(0xFF334155), fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 3. Variant / Size Selector (With images if present)
                  if (p.variants.isNotEmpty) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "SELECT SIZE / VARIANT",
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A), letterSpacing: 0.5),
                        ),
                        InkWell(
                          onTap: () => SizingGuideSheet.show(context),
                          child: Row(
                            children: const [
                              Icon(Icons.straighten, size: 14, color: Color(0xFFD4AF37)),
                              SizedBox(width: 4),
                              Text("Sizing Guide", style: TextStyle(color: Color(0xFFD4AF37), fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: p.variants.map((v) {
                        final isSelected = _selectedVariant?.id == v.id;
                        return ChoiceChip(
                          avatar: v.images.isNotEmpty
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: SmartStoreImage(
                                    imageUrl: v.images.first,
                                    width: 20,
                                    height: 20,
                                    fit: BoxFit.cover,
                                    fallbackText: "AC",
                                  ),
                                )
                              : null,
                          label: Text(v.title),
                          selected: isSelected,
                          onSelected: (_) {
                            setState(() {
                              _selectedVariant = v;
                              _activeImageIdx = 0;
                            });
                            if (_pageController.hasClients) {
                              _pageController.jumpToPage(0);
                            }
                          },
                          selectedColor: const Color(0xFF0F172A),
                          backgroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                            side: BorderSide(
                              color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFCBD5E1),
                            ),
                          ),
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : const Color(0xFF334155),
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // 4. Quantity Adjuster
                  Row(
                    children: [
                      const Text(
                        "Quantity:",
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0B192C)),
                      ),
                      const SizedBox(width: 14),
                      Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove, size: 16),
                              onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                            ),
                            Text(
                              '$_quantity',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add, size: 16),
                              onPressed: () => setState(() => _quantity++),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // 5. Product Features & Description
                  const Text(
                    "Product Features & Quality",
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0B192C)),
                  ),
                  const SizedBox(height: 8),
                  if (p.description != null && p.description!.isNotEmpty)
                    Text(
                      p.description!,
                      style: const TextStyle(fontSize: 13, height: 1.6, color: Color(0xFF475569)),
                    ),
                  const SizedBox(height: 14),

                  // Trust Badges
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: const [
                      _TrustIcon(icon: Icons.check_circle_outline, label: "100% Pure Fabric"),
                      _TrustIcon(icon: Icons.local_shipping_outlined, label: "Express Shipping"),
                      _TrustIcon(icon: Icons.straighten, label: "Tailored Perfect Fit"),
                    ],
                  ),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ],
        ),
      ),

      // Sticky Bottom Bar: Add to Bag & Buy Now
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(20),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              // Add to Bag Button
              Expanded(
                child: OutlinedButton(
                  onPressed: inStock
                      ? () {
                          cart.addToCart(p, variant: _selectedVariant, quantity: _quantity);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text("${p.title} added to bag!"),
                              duration: const Duration(milliseconds: 1400),
                              backgroundColor: const Color(0xFF0F172A),
                            ),
                          );
                        }
                      : null,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: Color(0xFF0F172A), width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text(
                    "ADD TO BAG",
                    style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Buy Now Button (Requires login before completing order)
              Expanded(
                child: ElevatedButton(
                  onPressed: inStock
                      ? () {
                          cart.addToCart(p, variant: _selectedVariant, quantity: _quantity);
                          if (auth.isLoggedIn) {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const CheckoutScreen()),
                            );
                          } else {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const LoginScreen(
                                  promptMessage: "Please sign in to complete your order and track delivery.",
                                  redirectTo: CheckoutScreen(),
                                ),
                              ),
                            );
                          }
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F172A), // Brand Navy
                    foregroundColor: const Color(0xFFD4AF37), // Brand Gold
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 2,
                  ),
                  child: Text(
                    inStock ? "BUY NOW" : "OUT OF STOCK",
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showFullScreenImage(BuildContext context, List<String> images, int initialIdx) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            iconTheme: const IconThemeData(color: Colors.white),
            elevation: 0,
          ),
          body: PageView.builder(
            controller: PageController(initialPage: initialIdx),
            itemCount: images.length,
            itemBuilder: (ctx, idx) => Center(
              child: InteractiveViewer(
                maxScale: 4.0,
                child: SmartStoreImage(
                  imageUrl: images[idx],
                  fit: BoxFit.contain,
                  fallbackText: "AC",
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TrustIcon extends StatelessWidget {
  final IconData icon;
  final String label;

  const _TrustIcon({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 22, color: const Color(0xFF0B192C)),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
        ),
      ],
    );
  }
}
