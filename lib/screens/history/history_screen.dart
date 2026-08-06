
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/models/history_model.dart';
import 'detail_history_screen.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  static final List<HistoryModel> historyList = [
    HistoryModel(
      title: "PAT Rekayasa Perangkat Lunak",
      token: "KK58",
      date: "05 Agustus 2026",
      startTime: "08.00",
      finishTime: "09.35",
      duration: "1 Jam 35 Menit",
      totalQuestion: 50,
      correctAnswer: 42,
      wrongAnswer: 8,
      score: 84,
      isFinished: true,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xffF5F5F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        title: Text(
          "Riwayat",
          style: GoogleFonts.poppins(
            color: Colors.black,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: historyList.isEmpty
          ? Center(
              child: Text(
                "Belum ada riwayat.",
                style: GoogleFonts.poppins(),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: historyList.length,
              itemBuilder: (context, index) {
                final history = historyList[index];

                return InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => DetailHistoryScreen(history: history),
                      ),
                    );
                  },
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 18),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(.05),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        )
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          history.title,
                          style: GoogleFonts.poppins(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text("Tanggal : ${history.date}",
                            style: GoogleFonts.poppins()),
                        Text("Token : ${history.token}",
                            style: GoogleFonts.poppins()),
                        Text("Nilai : ${history.score}",
                            style: GoogleFonts.poppins(
                                fontWeight: FontWeight.w600)),
                        const SizedBox(height: 15),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Chip(
                              label: Text(
                                history.isFinished
                                    ? "SELESAI"
                                    : "BELUM SELESAI",
                              ),
                            ),
                            const Icon(Icons.arrow_forward_ios, size: 18),
                          ],
                        )
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
