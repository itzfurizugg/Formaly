import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ReviewAnswerScreen extends StatelessWidget {
  const ReviewAnswerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final reviewQuestions = List.generate(
      50,
      (index) => {
        "question": "Ini adalah pertanyaan nomor ${index + 1}.",
        "options": ["Pilihan A","Pilihan B","Pilihan C","Pilihan D"],
        "correct": index % 4,
        "user": (index + 1) % 4,
      },
    );

    return Scaffold(
      backgroundColor: const Color(0xffF5F5F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        title: Text("Review Jawaban",
            style: GoogleFonts.poppins(
                color: Colors.black, fontWeight: FontWeight.bold)),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: reviewQuestions.length,
        itemBuilder: (context, index) {
          final item = reviewQuestions[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 18),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18)),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Soal ${index + 1}",
                      style: GoogleFonts.poppins(
                          fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Text(item["question"] as String,
                      style: GoogleFonts.poppins()),
                  const SizedBox(height: 18),
                  ...List.generate(4, (i) {
                    final correct = item["correct"] == i;
                    final user = item["user"] == i;
                    Color color = Colors.white;
                    IconData? icon;
                    Color? iconColor;
                    if (correct) {
                      color = Colors.green.shade100;
                      icon = Icons.check_circle;
                      iconColor = Colors.green;
                    }
                    if (user && !correct) {
                      color = Colors.red.shade100;
                      icon = Icons.cancel;
                      iconColor = Colors.red;
                    }
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          Text(String.fromCharCode(65+i),
                              style: GoogleFonts.poppins(
                                  fontWeight: FontWeight.bold)),
                          const SizedBox(width: 15),
                          Expanded(
                            child: Text(
                              (item["options"] as List)[i],
                              style: GoogleFonts.poppins(),
                            ),
                          ),
                          if(icon!=null) Icon(icon,color: iconColor),
                        ],
                      ),
                    );
                  })
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
