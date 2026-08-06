import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'result_screen.dart';

class QuestionScreen extends StatefulWidget {
  const QuestionScreen({super.key});

  @override
  State<QuestionScreen> createState() => _QuestionScreenState();
}

class _QuestionScreenState extends State<QuestionScreen> {

  int currentQuestion = 0;

  // Menyimpan jawaban tiap soal
  late List<int?> selectedAnswers;

  // ================= TIMER =================
  Duration duration = const Duration(hours: 2);
  Timer? timer;

  void startTimer() {
    timer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => countdown(),
    );
  }

  void countdown() {
    if (duration.inSeconds == 0) {
      timer?.cancel();

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => const ResultScreen(),
        ),
      );

      return;
    }

    setState(() {
      duration = Duration(
        seconds: duration.inSeconds - 1,
      );
    });
  }

  String twoDigits(int n) => n.toString().padLeft(2, '0');

  String get timerText {
    final hours = twoDigits(duration.inHours);
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));

    return "$hours : $minutes : $seconds";
  }

  final List<Map<String, dynamic>> questions = [
    {
      "question": "Apa kepanjangan dari RPL?",
      "options": [
        "Rekayasa Perangkat Lunak",
        "Rekayasa Program Linux",
        "Rumah Pintar Listrik",
        "Ruang Pengembangan Logika",
      ],
    },
    {
      "question": "Flutter dikembangkan oleh?",
      "options": [
        "Google",
        "Microsoft",
        "Apple",
        "Meta",
      ],
    },
  ];

  @override
  void initState() {
    super.initState();

    selectedAnswers = List<int?>.filled(
      questions.length,
      null,
    );

    startTimer();
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  // ================= DAFTAR SOAL =================

  void showQuestionList() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(25),
        ),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [

                Text(
                  "Daftar Soal",
                  style: GoogleFonts.poppins(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                const SizedBox(height: 20),

                GridView.builder(
                  shrinkWrap: true,
                  physics:
                      const NeverScrollableScrollPhysics(),
                  itemCount: questions.length,
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 5,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                  ),
                  itemBuilder: (context, index) {

                    Color bg = Colors.grey.shade300;

                    if (selectedAnswers[index] != null) {
                      bg = Colors.green;
                    }

                    if (index == currentQuestion) {
                      bg = const Color(0xff343A40);
                    }

                    return InkWell(
                      onTap: () {
                        setState(() {
                          currentQuestion = index;
                        });

                        Navigator.pop(context);
                      },
                      child: Container(
                        decoration: BoxDecoration(
                          color: bg,
                          borderRadius:
                              BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            "${index + 1}",
                            style: GoogleFonts.poppins(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),

                const SizedBox(height: 25),

                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          const Color(0xff343A40),
                      shape: RoundedRectangleBorder(
                        borderRadius:
                            BorderRadius.circular(14),
                      ),
                    ),
                    child: Text(
                      "Kembali ke Soal",
                      style: GoogleFonts.poppins(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {

    final question = questions[currentQuestion];

    return PopScope(
      canPop: false,

      child: Scaffold(
        backgroundColor: const Color(0xffF4F6FA),

        appBar: AppBar(
          automaticallyImplyLeading: false,
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          elevation: 0,
          centerTitle: true,

          title: Text(
            "Pengerjaan Form",
            style: GoogleFonts.poppins(
              color: Colors.black87,
              fontWeight: FontWeight.w600,
            ),
          ),

          actions: [

            IconButton(
              onPressed: showQuestionList,
              icon: const Icon(
                Icons.grid_view_rounded,
                color: Colors.black87,
              ),
            ),

            const SizedBox(width: 8),

          ],
        ),

        body: SafeArea(
  child: Padding(
    padding: const EdgeInsets.all(20),
    child: Column(
      children: [

        Row(
          children: [

            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 10,
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(15),
              ),
              child: Text(
                "Soal ${currentQuestion + 1}",
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),

            const Spacer(),

            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 10,
              ),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(15),
              ),
              child: Text(
                timerText,
                style: GoogleFonts.poppins(
                  color: Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 20),

        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: LinearProgressIndicator(
            value: (currentQuestion + 1) / questions.length,
            minHeight: 10,
            backgroundColor: Colors.grey.shade300,
            valueColor: const AlwaysStoppedAnimation(
              Color(0xff343A40),
            ),
          ),
        ),

        const SizedBox(height: 10),

        Align(
          alignment: Alignment.centerRight,
          child: Text(
            "${currentQuestion + 1}/${questions.length}",
            style: GoogleFonts.poppins(
              fontWeight: FontWeight.w500,
            ),
          ),
        ),

        const SizedBox(height: 25),

        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withOpacity(.15),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Text(
            question["question"],
            style: GoogleFonts.poppins(
              fontSize: 19,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),

        const SizedBox(height: 25),

        Expanded(
          child: ListView.builder(
            itemCount: question["options"].length,
            itemBuilder: (context, index) {

              final bool isSelected =
                  selectedAnswers[currentQuestion] == index;

              return AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                margin: const EdgeInsets.only(bottom: 15),

                child: InkWell(
                  borderRadius: BorderRadius.circular(18),

                  onTap: () {
                    setState(() {
                      selectedAnswers[currentQuestion] = index;
                    });
                  },

                  child: Container(
                    padding: const EdgeInsets.all(18),

                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xff343A40)
                          : Colors.white,

                      borderRadius: BorderRadius.circular(18),

                      border: Border.all(
                        color: isSelected
                            ? const Color(0xff343A40)
                            : Colors.grey.shade300,
                      ),

                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(.05),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),

                    child: Row(
                      children: [

                        CircleAvatar(
                          radius: 16,
                          backgroundColor: isSelected
                              ? Colors.white
                              : Colors.grey.shade200,

                          child: Text(
                            String.fromCharCode(65 + index),
                            style: GoogleFonts.poppins(
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? const Color(0xff343A40)
                                  : Colors.black,
                            ),
                          ),
                        ),

                        const SizedBox(width: 15),

                        Expanded(
                          child: Text(
                            question["options"][index],
                            style: GoogleFonts.poppins(
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                              color: isSelected
                                  ? Colors.white
                                  : Colors.black87,
                            ),
                          ),
                        ),

                        AnimatedSwitcher(
                          duration: const Duration(milliseconds: 200),
                          child: isSelected
                              ? const Icon(
                                  Icons.check_circle,
                                  color: Colors.white,
                                  key: ValueKey("selected"),
                                )
                              : const SizedBox(
                                  width: 24,
                                  key: ValueKey("empty"),
                                ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 20),

        Row(
          children: [

            Expanded(
              child: SizedBox(
                height: 55,
                child: OutlinedButton(
                  onPressed: currentQuestion == 0
                      ? null
                      : () {
                          setState(() {
                            currentQuestion--;
                          });
                        },
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(
                      color: Color(0xff343A40),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    "Kembali",
                    style: GoogleFonts.poppins(
                      color: const Color(0xff343A40),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(width: 12),

            Expanded(
              child: SizedBox(
                height: 55,
                child: ElevatedButton(
                  onPressed: () {

                    if (selectedAnswers[currentQuestion] == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            "Silakan pilih salah satu jawaban terlebih dahulu.",
                          ),
                        ),
                      );
                      return;
                    }

                    if (currentQuestion < questions.length - 1) {

                      setState(() {
                        currentQuestion++;
                      });

                    } else {

                      showDialog(
                        context: context,
                        barrierDismissible: false,
                        builder: (context) => AlertDialog(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                          title: const Text("Konfirmasi Submit"),
                          content: const Text(
                            "Apakah Anda yakin ingin mengirim jawaban?\n\nJawaban yang sudah dikirim tidak dapat diubah lagi.",
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text("Batal"),
                            ),
                            ElevatedButton(
                              onPressed: () {
                                timer?.cancel();
                                Navigator.pop(context);
                                Navigator.pushReplacement(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => const ResultScreen(),
                                  ),
                                );
                              },
                              child: const Text("Ya, Submit"),
                            ),
                          ],
                        ),
                      );

                    }

                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xff343A40),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Text(
                    currentQuestion == questions.length - 1
                        ? "Submit"
                        : "Selanjutnya",
                    style: GoogleFonts.poppins(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ], 
    ),
  ),
),
      ),
    );
  }
}

