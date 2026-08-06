import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class NavigationButton extends StatelessWidget {

  final bool isFirst;

  final bool isLast;

  final VoidCallback onPrevious;

  final VoidCallback onNext;

  const NavigationButton({
    super.key,
    required this.isFirst,
    required this.isLast,
    required this.onPrevious,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {

    return Row(
      children: [

        Expanded(
          child: OutlinedButton.icon(

            onPressed: isFirst
                ? null
                : onPrevious,

            icon: const Icon(Icons.arrow_back),

            label: Text(
              "Sebelumnya",
              style: GoogleFonts.poppins(),
            ),
          ),
        ),

        const SizedBox(width: 15),

        Expanded(
          child: ElevatedButton.icon(

            onPressed: onNext,

            icon: Icon(
              isLast
                  ? Icons.check
                  : Icons.arrow_forward,
            ),

            label: Text(
              isLast
                  ? "Submit"
                  : "Selanjutnya",
              style: GoogleFonts.poppins(),
            ),
          ),
        ),
      ],
    );
  }
}