import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'question_screen.dart';

class FormDetailScreen extends StatelessWidget {
  const FormDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xffF5F5F5),

      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),

        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(.05),
                    blurRadius: 12,
                    offset: const Offset(0,5),
                  ),
                ],
              ),

              child: Column(
                children: [

                  Container(
                    height: 80,
                    width: 80,
                    decoration: BoxDecoration(
                      color: const Color(0xffECEFF3),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(
                      Icons.description_outlined,
                      size: 42,
                      color: Color(0xff343A40),
                    ),
                  ),

                  const SizedBox(height:20),

                  Text(
                    "Uji Formal v.3",
                    textAlign: TextAlign.center,
                    style: GoogleFonts.poppins(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),

                  const SizedBox(height:8),

                  Text(
                    "Dibuat oleh Fabian",
                    style: GoogleFonts.poppins(
                      color: Colors.grey.shade600,
                      fontSize: 15,
                    ),
                  ),

                ],
              ),
            ),

            const SizedBox(height:25),

            Row(
              children: [

                Expanded(
                  child: _infoCard(
                    Icons.timer_outlined,
                    "Durasi",
                    "120 Menit",
                  ),
                ),

                const SizedBox(width:15),

                Expanded(
                  child: _infoCard(
                    Icons.quiz_outlined,
                    "Jumlah Soal",
                    "50",
                  ),
                ),

              ],
            ),

            const SizedBox(height:25),

            Text(
              "Deskripsi",
              style: GoogleFonts.poppins(
                fontSize:18,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height:12),

            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Text(
                "Silakan membaca petunjuk dengan teliti sebelum memulai pengerjaan formulir. Pastikan koneksi internet stabil dan jawablah seluruh pertanyaan dengan benar.",
                style: GoogleFonts.poppins(
                  fontSize:14,
                  height:1.7,
                ),
              ),
            ),

            const SizedBox(height:35),

            SizedBox(
              width: double.infinity,
              height: 56,

              child: ElevatedButton(
                onPressed: (){
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const QuestionScreen(),
                    ),
                  );
                },

                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xff343A40),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),

                child: Text(
                  "START",
                  style: GoogleFonts.poppins(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize:17,
                  ),
                ),
              ),
            ),

          ],
        ),
      ),
    );
  }

  Widget _infoCard(
    IconData icon,
    String title,
    String value,
  ){
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        children: [

          Icon(
            icon,
            size:32,
            color: const Color(0xff343A40),
          ),

          const SizedBox(height:10),

          Text(
            title,
            style: GoogleFonts.poppins(
              color: Colors.grey,
            ),
          ),

          const SizedBox(height:5),

          Text(
            value,
            style: GoogleFonts.poppins(
              fontWeight: FontWeight.bold,
              fontSize:18,
            ),
          ),

        ],
      ),
    );
  }
}