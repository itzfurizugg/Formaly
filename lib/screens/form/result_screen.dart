import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/models/history_model.dart';
import '../home/home_screen.dart';

class ResultScreen extends StatelessWidget {
  final HistoryModel history;

  const ResultScreen({
    super.key,
    required this.history,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,

      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 25),

              // =========================
              // ICON BERHASIL
              // =========================

              CircleAvatar(
                radius: 45,
                backgroundColor: colors.primary,
                child: Icon(
                  Icons.check,
                  color: colors.onPrimary,
                  size: 50,
                ),
              ),

              const SizedBox(height: 25),

              // =========================
              // JUDUL
              // =========================

              Text(
                "Form Berhasil Disubmit",
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 10),

              Text(
                "Jawaban kamu berhasil disimpan ke riwayat.",
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(
                  color: colors.onSurfaceVariant,
                ),
              ),

              const SizedBox(height: 35),

              // =========================
              // DETAIL HASIL
              // =========================

              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: colors.surface,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: colors.shadow.withOpacity(.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    buildItem(
                      context,
                      "Nama Form",
                      history.title,
                    ),

                    const Divider(height: 25),

                    // TAG, bukan token.
                    buildItem(
                      context,
                      "Tag",
                      history.token.trim().isEmpty ||
                              history.token == '-'
                          ? '-'
                          : history.token,
                    ),

                    const Divider(height: 25),

                    buildItem(
                      context,
                      "Tanggal",
                      history.date,
                    ),

                    const Divider(height: 25),

                    buildItem(
                      context,
                      "Waktu Mulai",
                      history.startTime,
                    ),

                    const Divider(height: 25),

                    buildItem(
                      context,
                      "Waktu Selesai",
                      history.finishTime,
                    ),

                    const Divider(height: 25),

                    buildItem(
                      context,
                      "Durasi",
                      history.duration,
                    ),

                    const Divider(height: 25),

                    buildItem(
                      context,
                      "Jumlah Soal",
                      history.totalQuestion.toString(),
                    ),

                    const Divider(height: 25),

                    buildItem(
                      context,
                      "Benar",
                      history.correctAnswer.toString(),
                    ),

                    const Divider(height: 25),

                    buildItem(
                      context,
                      "Salah",
                      history.wrongAnswer.toString(),
                    ),

                    // Nilai/SCORE sengaja tidak ditampilkan
                    // karena hasil score disembunyikan dari user.
                  ],
                ),
              ),

              const SizedBox(height: 25),

              // =========================
              // STATUS
              // =========================

              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  vertical: 14,
                  horizontal: 20,
                ),
                decoration: BoxDecoration(
                  color: colors.secondaryContainer,
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(
                    color: colors.secondary.withAlpha(90),
                  ),
                ),
                child: Row(
                  mainAxisAlignment:
                      MainAxisAlignment.center,
                  children: [
                    Icon(
                      history.isFinished
                          ? Icons.check_circle
                          : Icons.info_outline,
                      color: colors.onSecondaryContainer,
                    ),

                    const SizedBox(width: 8),

                    Text(
                      history.isFinished
                          ? "SELESAI"
                          : "BELUM SELESAI",
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.bold,
                        color: colors.onSecondaryContainer,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 25),

              // =========================
              // TOMBOL KEMBALI
              // =========================

              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () async {
                    // Keluar fullscreen sebelum kembali ke beranda.
                    await SystemChrome.setEnabledSystemUIMode(
                      SystemUiMode.edgeToEdge,
                    );

                    if (!context.mounted) {
                      return;
                    }

                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const HomeScreen(),
                      ),
                      (route) => false,
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor:
                        colors.primary,
                    foregroundColor: colors.onPrimary,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius:
                          BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    "Kembali ke Beranda",
                    style: GoogleFonts.poppins(
                      color: colors.onPrimary,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget buildItem(
    BuildContext context,
    String title,
    String value,
  ) {
    final colors = Theme.of(context).colorScheme;

    return Row(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            title,
            style: GoogleFonts.poppins(
              color: colors.onSurfaceVariant,
            ),
          ),
        ),

        const SizedBox(width: 15),

        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: GoogleFonts.poppins(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }
}