import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class OptionCard extends StatelessWidget {
  final String text;
  final int index;
  final bool selected;
  final VoidCallback onTap;

  const OptionCard({
    super.key,
    required this.text,
    required this.index,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    final Color cardColor = selected
        ? colors.primary
        : colors.surface;

    final Color borderColor = selected
        ? colors.primary
        : colors.outlineVariant;

    final Color letterBackground = selected
        ? colors.onPrimary
        : colors.surfaceContainerHighest;

    final Color letterColor = selected
        ? colors.primary
        : colors.onSurface;

    final Color textColor = selected
        ? colors.onPrimary
        : colors.onSurface;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        margin: const EdgeInsets.only(bottom: 15),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: borderColor,
            width: selected ? 1.4 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: colors.shadow.withAlpha(
                selected ? 31 : 13,
              ),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: letterBackground,
              child: Text(
                String.fromCharCode(65 + index),
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.bold,
                  color: letterColor,
                ),
              ),
            ),

            const SizedBox(width: 18),

            Expanded(
              child: Text(
                text,
                style: GoogleFonts.poppins(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: textColor,
                  height: 1.45,
                ),
              ),
            ),

            if (selected) ...[
              const SizedBox(width: 10),
              Icon(
                Icons.check_circle_rounded,
                color: colors.onPrimary,
                size: 22,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
