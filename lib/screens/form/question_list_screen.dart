import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class QuestionListScreen extends StatelessWidget {
  // Total jumlah soal.
  final int totalQuestion;

  // Index soal yang sedang aktif.
  final int currentQuestion;

  // Jawaban dari setiap soal.
  final List<int?> answers;

  // Status ragu-ragu setiap soal.
  // Dibuat optional agar pemanggilan lama tetap aman.
  final List<bool> doubtfulQuestions;

  const QuestionListScreen({
    super.key,
    required this.totalQuestion,
    required this.currentQuestion,
    required this.answers,
    this.doubtfulQuestions = const [],
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    // Memastikan jumlah soal tidak negatif.
    final int safeTotalQuestion =
        totalQuestion < 0 ? 0 : totalQuestion;

    const Color doubtfulColor = Color(0xFFFFC107);
    const Color doubtfulTextColor = Color(0xFF5D4300);

    return Scaffold(
      // Background halaman.
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,

      // AppBar halaman.
      appBar: AppBar(
        automaticallyImplyLeading: false,
        elevation: 0,
        backgroundColor: colors.surface,
        surfaceTintColor: Colors.transparent,
        centerTitle: true,
        title: Text(
          'Daftar Soal',
          style: GoogleFonts.poppins(
            color: colors.onSurface,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),

      // Isi halaman.
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Daftar nomor soal.
            Expanded(
              child: safeTotalQuestion == 0
                  ? Center(
                      child: Column(
                        mainAxisAlignment:
                            MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              color: colors.primaryContainer,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.quiz_outlined,
                              size: 38,
                              color: colors.onPrimaryContainer,
                            ),
                          ),
                          const SizedBox(height: 15),
                          Text(
                            'Belum ada soal.',
                            style: GoogleFonts.poppins(
                              color: colors.onSurfaceVariant,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    )
                  : GridView.builder(
                      itemCount: safeTotalQuestion,
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 5,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemBuilder: (_, index) {
                        final bool isCurrent =
                            index == currentQuestion;

                        // Memastikan index jawaban tetap aman.
                        final bool isAnswered =
                            index < answers.length &&
                            answers[index] != null;

                        // Memastikan index status ragu-ragu tetap aman.
                        final bool isDoubtful =
                            index < doubtfulQuestions.length &&
                            doubtfulQuestions[index];

                        Color backgroundColor;
                        Color textColor;
                        Color borderColor;

                        if (isAnswered) {
                          backgroundColor = colors.secondary;
                          textColor = colors.onSecondary;
                          borderColor = colors.secondary;
                        } else {
                          backgroundColor = colors.surface;
                          textColor = colors.onSurface;
                          borderColor = colors.outlineVariant;
                        }

                        // Ragu-ragu memakai warna oranye-kuning.
                        if (isDoubtful) {
                          backgroundColor = doubtfulColor;
                          textColor = doubtfulTextColor;
                          borderColor = doubtfulColor;
                        }

                        // Soal saat ini tetap diberi border primary.
                        // Jika juga ragu-ragu, warna kuning tetap dipertahankan.
                        if (isCurrent) {
                          borderColor = colors.primary;

                          if (!isDoubtful) {
                            backgroundColor = colors.primary;
                            textColor = colors.onPrimary;
                          }
                        }

                        return Material(
                          color: Colors.transparent,
                          child: InkWell(
                            // Memilih nomor soal.
                            onTap: () {
                              Navigator.pop(
                                context,
                                index,
                              );
                            },
                            borderRadius:
                                BorderRadius.circular(15),
                            child: AnimatedContainer(
                              duration:
                                  const Duration(milliseconds: 180),
                              decoration: BoxDecoration(
                                color: backgroundColor,
                                borderRadius:
                                    BorderRadius.circular(15),
                                border: Border.all(
                                  color: borderColor,
                                  width:
                                      isCurrent || isAnswered || isDoubtful
                                          ? 1.4
                                          : 1,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: isDoubtful
                                        ? doubtfulColor.withAlpha(35)
                                        : isCurrent
                                            ? colors.primary.withAlpha(35)
                                            : isAnswered
                                                ? colors.secondary
                                                    .withAlpha(30)
                                                : colors.shadow
                                                    .withAlpha(12),
                                    blurRadius: 7,
                                    offset: const Offset(0, 3),
                                  ),
                                ],
                              ),
                              child: Center(
                                child: Text(
                                  '${index + 1}',
                                  style: GoogleFonts.poppins(
                                    color: textColor,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),

            const SizedBox(height: 16),

            // Judul keterangan.
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Keterangan',
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: colors.onSurface,
                ),
              ),
            ),

            const SizedBox(height: 10),

            // Keterangan soal sudah dijawab.
            _buildLegend(
              context,
              color: colors.secondary,
              textColor: colors.onSecondary,
              label: 'Sudah Dijawab',
            ),

            const SizedBox(height: 8),

            // Keterangan soal ragu-ragu.
            _buildLegend(
              context,
              color: doubtfulColor,
              textColor: doubtfulTextColor,
              label: 'Ragu-ragu',
            ),

            const SizedBox(height: 8),

            // Keterangan soal saat ini.
            _buildLegend(
              context,
              color: colors.primary,
              textColor: colors.onPrimary,
              label: 'Soal Saat Ini',
            ),

            const SizedBox(height: 8),

            // Keterangan soal belum dijawab.
            _buildLegend(
              context,
              color: colors.surface,
              textColor: colors.onSurface,
              borderColor: colors.outlineVariant,
              label: 'Belum Dijawab',
            ),

            const SizedBox(height: 25),

            // Tombol kembali ke halaman soal.
            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                },
                icon: const Icon(
                  Icons.arrow_back_rounded,
                ),
                label: Text(
                  'Kembali ke Soal',
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: colors.primary,
                  foregroundColor: colors.onPrimary,
                  elevation: 0,
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

  // Membuat item keterangan warna.
  Widget _buildLegend(
    BuildContext context, {
    required Color color,
    required Color textColor,
    required String label,
    Color? borderColor,
  }) {
    final colors = Theme.of(context).colorScheme;

    return Row(
      children: [
        Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(
              color: borderColor ?? Colors.transparent,
            ),
          ),
        ),
        const SizedBox(width: 9),
        Text(
          label,
          style: GoogleFonts.poppins(
            fontSize: 13,
            color: colors.onSurface,
          ),
        ),
      ],
    );
  }
}
