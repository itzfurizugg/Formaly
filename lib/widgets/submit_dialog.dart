import 'package:flutter/material.dart';

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
        style: TextStyle(fontFamily: 'FunnelDisplay',

          fontWeight: FontWeight.bold,
        ),
      ),
      content: Text(
        "Apakah Anda yakin ingin mengumpulkan seluruh jawaban?",
        style: TextStyle(fontFamily: 'FunnelDisplay',
),
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