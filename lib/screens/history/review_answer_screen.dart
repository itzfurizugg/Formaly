import 'package:flutter/material.dart';

import '../../core/models/answer_model.dart';
import '../../widgets/auth_shell.dart';

class ReviewAnswerScreen extends StatelessWidget {
  // Tetap menerima answers agar kompatibel dengan kode lama.
  final List<AnswerModel> answers;

  const ReviewAnswerScreen({super.key, required this.answers});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBase,
      appBar: AppBar(
        backgroundColor: kBase,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Review Jawaban',
          style: TextStyle(
            fontFamily: 'FunnelDisplay',
            color: kDarks,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),

      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: kSecond),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x0A393E46),
                    blurRadius: 10,
                    offset: Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: kDone.withValues(alpha: .1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.lock_outline_rounded,
                      size: 34,
                      color: kDone,
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Review Jawaban Tidak Tersedia',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'FunnelDisplay',
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: kDarks,
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Jawaban dan hasil penilaian tidak ditampilkan kepada user.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'FunnelDisplay',
                      fontSize: 14,
                      color: kTinted,
                      height: 1.6,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Catatan mengenai data jawaban.
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: kDone.withValues(alpha: .06),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: kDone.withValues(alpha: .2)),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.info_outline_rounded,
                          size: 20,
                          color: kDone,
                        ),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Detail jawaban, jawaban benar, benar/salah, dan nilai hanya digunakan untuk proses penilaian internal.',
                            style: TextStyle(
                              fontFamily: 'FunnelDisplay',
                              fontSize: 12,
                              color: kTinted,
                              height: 1.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 28),

                  // Tombol kembali.
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kDarks,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                      child: const Text(
                        'Kembali',
                        style: TextStyle(
                          fontFamily: 'FunnelDisplay',
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
