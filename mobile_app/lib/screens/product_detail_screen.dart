import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/store_models.dart';
import '../services/api_service.dart';
import '../providers/store_provider.dart';
import '../providers/cart_provider.dart';
import 'cart_screen.dart';

class ProductDetailScreen extends StatefulWidget {
  final String productId;

  const ProductDetailScreen({super.key, required this.productId});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  ProductItem? _product;
  ProductVariant? _selectedVariant;
  int _quantity = 1;
  int _activeImageIdx = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchDetail();
  }

  Future<void> _fetchDetail() async {
    final item = await ApiService().getProductDetail(widget.productId);
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
    final store = Provider.of<StoreProvider>(context);
    final cart = Provider.of<CartProvider>(context);
    final primary = store.primaryColor;

    if (_loading) {
      return Scaffold(
        appBar: AppBar(elevation: 0, backgroundColor: Colors.white),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_product == null) {
      return Scaffold(
        appBar: AppBar(elevation: 0, backgroundColor: Colors.white),
        body: const Center(child: Text("Product not found")),
      );
    }

    final images = _selectedVariant != null && _selectedVariant!.images.isNotEmpty
        ? _selectedVariant!.images
        : (_product!.galleryImages.isNotEmpty
            ? _product!.galleryImages
            : (_product!.primaryImage != null ? [_product!.primaryImage!] : <String>[]));

    final effectivePrice = _selectedVariant != null
        ? (_selectedVariant!.salePrice ?? _selectedVariant!.price)
        : _product!.effectivePrice;

    final inStock = _selectedVariant != null
        ? _selectedVariant!.stockQuantity > 0
        : _product!.stockQuantity > 0;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: const BackButton(color: Color(0xFF0F172A)),
        actions: [
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
                      decoration: BoxDecoration(color: primary, shape: BoxShape.circle),
                      child: Text(
                        '${cart.itemCount}',
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
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
            // Image Gallery Carousel
            if (images.isNotEmpty)
              SliverImageGallery(images: images)
            else
              Container(
                height: 280,
                color: const Color(0xFFF1F5F9),
                child: const Center(child: Icon(Icons.image, size: 64, color: Color(0xFF94A3B8))),
              ),

            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    _product!.title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Price & Stock
                  Row(
                    children: [
                      Text(
                        "₹${effectivePrice.toStringAsFixed(0)}",
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.black,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: inStock ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: inStock ? const Color(0xFFA7F3D0) : const Color(0xFFFECACA),
                          ),
                        ),
                        child: Text(
                          inStock ? "In Stock" : "Out of Stock",
                          style: TextStyle(
                            color: inStock ? const Color(0xFF047857) : const Color(0xFFDC2626),
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Variants Selector
                  if (_product!.variants.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    const Text(
                      "Select Variant / Option:",
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _product!.variants.map((v) {
                        final isSelected = _selectedVariant?.id == v.id;
                        return ChoiceChip(
                          label: Text(
                            v.title,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isSelected ? Colors.white : const Color(0xFF1E293B),
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: primary,
                          backgroundColor: const Color(0xFFF8FAFC),
                          onSelected: (selected) {
                            if (selected) {
                              setState(() {
                                _selectedVariant = v;
                              });
                            }
                          },
                        );
                      }).toList(),
                    ),
                  ],

                  // Quantity Selector
                  const SizedBox(height: 22),
                  Row(
                    children: [
                      const Text(
                        "Quantity:",
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
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
                            Text("$_quantity", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            IconButton(
                              icon: const Icon(Icons.add, size: 16),
                              onPressed: () => setState(() => _quantity++),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // Description
                  if (_product!.description != null && _product!.description!.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const Text(
                      "Description",
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _product!.description!,
                      style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.5),
                    ),
                  ],

                  const SizedBox(height: 80),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              offset: const Offset(0, -4),
              blurRadius: 10,
            ),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: inStock
                      ? () {
                          cart.addToCart(
                            _product!,
                            variant: _selectedVariant,
                            quantity: _quantity,
                          );
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text("Added ${_product!.title} to cart!"),
                              duration: const Duration(seconds: 2),
                              action: SnackBarAction(
                                label: "VIEW CART",
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const CartScreen()),
                                  );
                                },
                              ),
                            ),
                          );
                        }
                      : null,
                  icon: const Icon(Icons.add_shopping_cart, size: 18),
                  label: const Text("Add to Cart", style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SliverImageGallery extends StatefulWidget {
  final List<String> images;

  const SliverImageGallery({super.key, required this.images});

  @override
  State<SliverImageGallery> createState() => _SliverImageGalleryState();
}

class _SliverImageGalleryState extends State<SliverImageGallery> {
  int _active = 0;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          height: 300,
          child: PageView.builder(
            itemCount: widget.images.length,
            onPageChanged: (idx) => setState(() => _active = idx),
            itemBuilder: (context, idx) {
              return CachedNetworkImage(
                imageUrl: widget.images[idx],
                fit: BoxFit.contain,
                errorWidget: (_, __, ___) => const Icon(Icons.broken_image, size: 64),
              );
            },
          ),
        ),
        if (widget.images.length > 1)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(widget.images.length, (idx) {
              return Container(
                width: 7,
                height: 7,
                margin: const EdgeInsets.symmetric(horizontal: 3, vertical: 8),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _active == idx ? const Color(0xFF0F172A) : const Color(0xFFCBD5E1),
                ),
              );
            }),
          ),
      ],
    );
  }
}
