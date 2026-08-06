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
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        margin: const EdgeInsets.only(bottom: 15),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xff343A40)
              : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: selected
                ? const Color(0xff343A40)
                : Colors.grey.shade300,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(.04),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [

            CircleAvatar(
              radius: 18,
              backgroundColor: selected
                  ? Colors.white
                  : Colors.grey.shade200,
              child: Text(
                String.fromCharCode(65 + index),
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.bold,
                  color: selected
                      ? const Color(0xff343A40)
                      : Colors.black,
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
                  color: selected
                      ? Colors.white
                      : Colors.black,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}