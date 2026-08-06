import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class QuestionListScreen extends StatelessWidget {
  final int totalQuestion;
  final int currentQuestion;
  final List<int?> answers;

  const QuestionListScreen({
    super.key,
    required this.totalQuestion,
    required this.currentQuestion,
    required this.answers,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xffF5F5F5),

      appBar: AppBar(
        automaticallyImplyLeading: false,
        elevation: 0,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        centerTitle: true,
        title: Text(
          "Daftar Soal",
          style: GoogleFonts.poppins(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),

      body: Padding(
        padding: const EdgeInsets.all(20),

        child: Column(
          children: [

            Expanded(
              child: GridView.builder(
                itemCount: totalQuestion,

                gridDelegate:
                    const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 5,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),

                itemBuilder: (_, index) {

                  Color color = Colors.white;
                  Color textColor = Colors.black;

                  if (index == currentQuestion) {
                    color = Colors.blue;
                    textColor = Colors.white;
                  } else if (answers[index] != null) {
                    color = Colors.green;
                    textColor = Colors.white;
                  }

                  return InkWell(
                    onTap: () {
                      Navigator.pop(context, index);
                    },

                    borderRadius: BorderRadius.circular(15),

                    child: Container(
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(
                          color: Colors.grey.shade300,
                        ),
                      ),

                      child: Center(
                        child: Text(
                          "${index + 1}",
                          style: GoogleFonts.poppins(
                            color: textColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 10),

            Row(
              children: [

                Container(
                  width: 15,
                  height: 15,
                  decoration: const BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                  ),
                ),

                const SizedBox(width: 8),

                Text(
                  "Sudah Dijawab",
                  style: GoogleFonts.poppins(),
                ),
              ],
            ),

            const SizedBox(height: 8),

            Row(
              children: [

                Container(
                  width: 15,
                  height: 15,
                  decoration: const BoxDecoration(
                    color: Colors.blue,
                    shape: BoxShape.circle,
                  ),
                ),

                const SizedBox(width: 8),

                Text(
                  "Soal Saat Ini",
                  style: GoogleFonts.poppins(),
                ),
              ],
            ),

            const SizedBox(height: 8),

            Row(
              children: [

                Container(
                  width: 15,
                  height: 15,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.grey,
                    ),
                  ),
                ),

                const SizedBox(width: 8),

                Text(
                  "Belum Dijawab",
                  style: GoogleFonts.poppins(),
                ),
              ],
            ),

            const SizedBox(height: 30),

            SizedBox(
              width: double.infinity,
              height: 55,

              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                },

                icon: const Icon(Icons.arrow_back),

                label: Text(
                  "Kembali ke Soal",
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.bold,
                  ),
                ),

                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xff343A40),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 10),

          ],
        ),
      ),
    );
  }
}