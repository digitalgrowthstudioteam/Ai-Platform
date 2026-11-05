import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class SmartStoreImage extends StatelessWidget {
  final String? imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final Widget? placeholder;
  final Widget? errorWidget;
  final String fallbackText;

  const SmartStoreImage({
    super.key,
    required this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.placeholder,
    this.errorWidget,
    this.fallbackText = "GS",
  });

  Widget _buildFallback(BuildContext context) {
    if (errorWidget != null) return errorWidget!;
    return Image.asset(
      "assets/images/logo.png",
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (_, _, _) => Container(
        width: width,
        height: height,
        color: const Color(0xFFF1F5F9),
        alignment: Alignment.center,
        child: Text(
          fallbackText,
          style: const TextStyle(
            color: Color(0xFF0B192C),
            fontWeight: FontWeight.w900,
            fontSize: 16,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (imageUrl == null || imageUrl!.trim().isEmpty) {
      return _wrapWithRadius(_buildFallback(context));
    }

    final trimmed = imageUrl!.trim();

    // Case 1: Base64 data URL (e.g. data:image/png;base64,iVBOR...)
    if (trimmed.startsWith("data:image")) {
      try {
        final commaIdx = trimmed.indexOf(",");
        if (commaIdx != -1) {
          final b64Str = trimmed.substring(commaIdx + 1);
          final Uint8List bytes = base64Decode(b64Str);
          return _wrapWithRadius(
            Image.memory(
              bytes,
              width: width,
              height: height,
              fit: fit,
              errorBuilder: (_, error, stack) => _buildFallback(context),
            ),
          );
        }
      } catch (_) {
        return _wrapWithRadius(_buildFallback(context));
      }
    }

    // Case 2: Standard Network URL (http / https)
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return _wrapWithRadius(
        CachedNetworkImage(
          imageUrl: trimmed,
          width: width,
          height: height,
          fit: fit,
          placeholder: (context, url) =>
              placeholder ??
              Container(
                width: width,
                height: height,
                color: const Color(0xFFF1F5F9),
                child: const Center(
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0B192C)),
                  ),
                ),
              ),
          errorWidget: (context, url, error) => _buildFallback(context),
        ),
      );
    }

    return _wrapWithRadius(_buildFallback(context));
  }

  Widget _wrapWithRadius(Widget child) {
    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius!, child: child);
    }
    return child;
  }
}
