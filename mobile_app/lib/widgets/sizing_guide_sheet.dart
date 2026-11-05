import 'package:flutter/material.dart';

class SizingGuideSheet extends StatelessWidget {
  const SizingGuideSheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const SizingGuideSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFCBD5E1),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: const [
                    Icon(Icons.straighten, color: Color(0xFFD97706), size: 22),
                    SizedBox(width: 8),
                    Text(
                      "Nail Shape & Sizing Guide",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0B192C),
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Scrollable Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Step-by-Step Measuring Banner
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFDF2F8), // Soft pink
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFFBCFE8)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          "HOW TO MEASURE YOUR NAILS (IN 3 EASY STEPS)",
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.0,
                            color: Color(0xFFDB2777),
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          "1. Place a piece of clear tape across the widest part of your natural nail bed.\n"
                          "2. Mark the edges of your nail on the tape using a fine pen.\n"
                          "3. Peel the tape off, place it flat on a ruler, and measure millimeters (mm). Repeat for all 5 fingers!",
                          style: TextStyle(fontSize: 12.5, height: 1.5, color: Color(0xFF334155)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Standard Sizing Table
                  const Text(
                    "Standard Size Chart",
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0B192C)),
                  ),
                  const SizedBox(height: 10),
                  Table(
                    border: TableBorder.all(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(10)),
                    children: [
                      TableRow(
                        decoration: const BoxDecoration(color: Color(0xFFF8FAFC)),
                        children: const [
                          Padding(
                            padding: EdgeInsets.all(10),
                            child: Text("Size", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ),
                          Padding(
                            padding: EdgeInsets.all(10),
                            child: Text("Thumb, Index, Mid, Ring, Pinky (mm)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ),
                        ],
                      ),
                      _buildTableRow("XS", "14, 11, 12, 11, 8 mm (Petite)"),
                      _buildTableRow("S", "15, 12, 13, 12, 9 mm (Most Common)"),
                      _buildTableRow("M", "16, 13, 14, 13, 10 mm (Standard)"),
                      _buildTableRow("L", "17, 14, 15, 14, 11 mm (Wide Beds)"),
                      _buildTableRow("Custom", "Send exact measurements via WhatsApp"),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Popular Nail Shapes
                  const Text(
                    "Popular Shapes",
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0B192C)),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: const [
                      _ShapeChip(title: "Almond", subtitle: "Feminine & Elongating"),
                      _ShapeChip(title: "Coffin / Ballerina", subtitle: "Glam & Trendy"),
                      _ShapeChip(title: "Square", subtitle: "Clean Classic"),
                      _ShapeChip(title: "Oval", subtitle: "Everyday Chic"),
                      _ShapeChip(title: "Stiletto", subtitle: "Dramatic & Edgy"),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Free Application Kit Guarantee
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.card_giftcard, color: Color(0xFF16A34A), size: 28),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            "Every Glam Stree set includes a FREE ₹299 Application Kit with salon glue, buffer, wooden stick, prep pads & adhesive tabs!",
                            style: TextStyle(fontSize: 12, color: Color(0xFF166534), fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static TableRow _buildTableRow(String size, String measurements) {
    return TableRow(
      children: [
        Padding(
          padding: const EdgeInsets.all(10),
          child: Text(size, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
        ),
        Padding(
          padding: const EdgeInsets.all(10),
          child: Text(measurements, style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
        ),
      ],
    );
  }
}

class _ShapeChip extends StatelessWidget {
  final String title;
  final String subtitle;

  const _ShapeChip({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0B192C))),
          Text(subtitle, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
        ],
      ),
    );
  }
}
