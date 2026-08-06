import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SubmitDialog extends StatelessWidget {
  final VoidCallback onSubmit;

  const SubmitDialog({
    super.key,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
      ),
      title: Text(
        "Selesaikan Form",
        style: GoogleFonts.poppins(
          fontWeight: FontWeight.bold,
        ),
      ),
      content: Text(
        "Apakah Anda yakin ingin mengumpulkan seluruh jawaban?",
        style: GoogleFonts.poppins(),
      ),
      actions: [

        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text("Batal"),
        ),

        ElevatedButton(
          onPressed: onSubmit,
          child: const Text("Submit"),
        ),
      ],
    );
  }
}