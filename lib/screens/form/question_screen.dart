import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_widget_from_html/flutter_widget_from_html.dart';
import 'package:flutter_math_fork/flutter_math.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_ntp/flutter_ntp.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../../core/models/answer_model.dart';
import '../../core/models/history_model.dart';
import '../../core/services/exam_draft_service.dart';
import '../../core/services/history_service.dart';
import 'result_screen.dart';

class QuestionScreen extends StatefulWidget {
  // ID form yang sedang dikerjakan.
  final String formId;

  // ID token jika ujian dibuka melalui token.
  final String? tokenId;

  const QuestionScreen({
    super.key,
    required this.formId,
    this.tokenId,
  });

  @override
  State<QuestionScreen> createState() =>
      _QuestionScreenState();
}

class _QuestionScreenState extends State<QuestionScreen> {
  // Client untuk mengakses Supabase.
  final SupabaseClient _supabase =
      Supabase.instance.client;

  // Channel untuk mengaktifkan / menonaktifkan security ujian.
  static const MethodChannel _examSecurityChannel =
      MethodChannel(
    'com.example.formaly/exam_security',
  );

  // Data pengerjaan soal.
  int currentQuestion = 0;
  List<int?> selectedAnswers = [];

  // Menyimpan status ragu-ragu setiap soal.
  List<bool> doubtfulQuestions = [];

  // Data untuk soal multiple choice dan essay.
  List<Set<int>> selectedMultipleAnswers = [];
  List<TextEditingController> essayControllers = [];

  // Waktu mulai dan batas waktu ujian.
  late DateTime startDateTime;
  Duration duration = Duration.zero;
  DateTime? deadline;

  Timer? timer;

  // Jam ujian disinkronkan dari NTP, bukan jam perangkat.
  final Stopwatch _serverClock = Stopwatch();
  DateTime? _serverTimeAtSync;
  Timer? _serverSyncTimer;
  bool _serverTimeReady = false;

  // Status halaman dan submit.
  bool hasTimeLimit = false;
  bool isLoading = true;
  bool isSubmitting = false;
  bool isAutoSubmitting = false;
  String? errorMessage;

  // Judul form.
  String formTitle = 'Pengerjaan Form';

  // TAG untuk kompatibilitas history/tampilan lama.
  String tokenTag = '-';

  // Daftar pertanyaan.
  final List<Map<String, dynamic>> questions = [];

  // Security violation selama ujian.
  bool _securityViolationTriggered = false;

  // Informasi baterai dan koneksi selama ujian.
  final Battery _battery = Battery();
  final Connectivity _connectivity = Connectivity();
  Timer? _deviceStatusTimer;
  int? _batteryLevel;
  List<ConnectivityResult> _connectivityResults = [];

  @override
  void initState() {
    super.initState();

    _examSecurityChannel.setMethodCallHandler(
      _handleSecurityMethodCall,
    );

    loadExam();
    _loadDeviceStatus();
    _deviceStatusTimer = Timer.periodic(
      const Duration(seconds: 5),
      (_) => _loadDeviceStatus(),
    );
  }

  // Menangani pelanggaran security dari Android.
  Future<void> _handleSecurityMethodCall(MethodCall call) async {
    if (call.method != 'securityViolation') {
      return;
    }

    await _handleSecurityViolation(
      call.arguments?.toString() ?? 'security',
    );
  }

  Future<void> _handleSecurityViolation(String reason) async {
    if (!mounted ||
        isLoading ||
        isSubmitting ||
        _securityViolationTriggered) {
      return;
    }

    _securityViolationTriggered = true;
    isAutoSubmitting = true;

    try {
      await _examSecurityChannel.invokeMethod(
        'playViolationAlarm',
      );
    } catch (_) {
      // Alarm gagal tidak boleh menghentikan auto-submit.
    }

    if (!mounted) {
      return;
    }

    final String message = reason == 'notification'
        ? 'Pelanggaran terdeteksi: notifikasi masuk. Ujian dikirim otomatis.'
        : reason == 'multi_window'
            ? 'Pelanggaran terdeteksi: mode split-screen/multi-window. Ujian dikirim otomatis.'
            : 'Pelanggaran terdeteksi: kamu keluar dari fokus ujian. Ujian dikirim otomatis.';

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 3),
      ),
    );

    await submitExam();
  }

  @override
  void dispose() {
    _deviceStatusTimer?.cancel();
    timer?.cancel();
    _serverSyncTimer?.cancel();
    _serverClock.stop();
    _examSecurityChannel.setMethodCallHandler(null);

    for (final controller in essayControllers) {
      controller.dispose();
    }

    super.dispose();
  }

  // Mengambil informasi baterai dan koneksi perangkat.
  Future<void> _loadDeviceStatus() async {
    try {
      final int batteryLevel =
          await _battery.batteryLevel;

      final List<ConnectivityResult> connectivityResults =
          await _connectivity.checkConnectivity();

      if (!mounted) {
        return;
      }

      setState(() {
        _batteryLevel = batteryLevel;
        _connectivityResults = connectivityResults;
      });
    } catch (_) {
      // Status perangkat hanya informasi tambahan.
    }
  }

  String get _connectionLabel {
    if (_connectivityResults.contains(
      ConnectivityResult.wifi,
    )) {
      return 'Wi-Fi';
    }

    if (_connectivityResults.contains(
      ConnectivityResult.mobile,
    )) {
      return 'Data';
    }

    if (_connectivityResults.contains(
      ConnectivityResult.ethernet,
    )) {
      return 'Ethernet';
    }

    if (_connectivityResults.contains(
      ConnectivityResult.bluetooth,
    )) {
      return 'Bluetooth';
    }

    return 'Offline';
  }

  IconData get _connectionIcon {
    if (_connectivityResults.contains(
      ConnectivityResult.wifi,
    )) {
      return Icons.wifi_rounded;
    }

    if (_connectivityResults.contains(
      ConnectivityResult.mobile,
    )) {
      return Icons.signal_cellular_alt_rounded;
    }

    if (_connectivityResults.contains(
      ConnectivityResult.ethernet,
    )) {
      return Icons.settings_ethernet_rounded;
    }

    if (_connectivityResults.contains(
      ConnectivityResult.bluetooth,
    )) {
      return Icons.bluetooth_rounded;
    }

    return Icons.wifi_off_rounded;
  }

  Widget _buildDeviceStatusChip({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    final colors = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 8,
      ),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(13),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: color,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontFamily: 'FunnelDisplay',
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: colors.onSurface,
            ),
          ),
        ],
      ),
    );
  }

  // Memuat data ujian dari Supabase.
  Future<void> loadExam() async {
    final String cleanFormId =
        widget.formId.trim();

    if (cleanFormId.isEmpty) {
      if (!mounted) {
        return;
      }

      setState(() {
        isLoading = false;
        errorMessage = 'ID form tidak valid.';
      });

      return;
    }

    timer?.cancel();

    if (mounted) {
      setState(() {
        isLoading = true;
        errorMessage = null;
        currentQuestion = 0;
        _securityViolationTriggered = false;
      });
    }

    try {
      final currentUser =
          _supabase.auth.currentUser;

      // Mengambil draft pengerjaan sebelumnya.
      final ExamDraft? savedDraft =
          currentUser == null
              ? null
              : await ExamDraftService.loadDraft(
                  userId: currentUser.id,
                  formId: cleanFormId,
                );

      // Untuk ujian bertimer, waktu resmi diambil dari NTP.
      // Draft tetap dipakai agar sesi yang sedang berjalan tidak berubah.
      startDateTime =
          savedDraft?.startDateTime ??
              DateTime.now();

      // Mengambil data form.
      final formResponse = await _supabase
          .from('forms')
          .select('id, title, duration')
          .eq('id', cleanFormId)
          .maybeSingle();

      if (formResponse == null) {
        throw Exception(
          'Form tidak ditemukan di Supabase.',
        );
      }

      final String loadedFormId =
          formResponse['id']?.toString().trim() ??
              '';

      if (loadedFormId.isEmpty) {
        throw Exception(
          'ID form dari Supabase tidak valid.',
        );
      }

      final String title =
          formResponse['title']?.toString().trim() ??
              '';

      final int durationMinutes =
          _toInt(formResponse['duration']);

      // Durasi ditentukan oleh creator.
      final bool loadedHasTimeLimit =
          durationMinutes > 0;

      final Duration loadedDuration =
          loadedHasTimeLimit
              ? Duration(
                  minutes: durationMinutes,
                )
              : Duration.zero;

      DateTime? loadedDeadline;

      if (loadedHasTimeLimit) {
        // Ambil waktu resmi dari NTP. Jam perangkat tidak dijadikan
        // acuan untuk memulai atau melanjutkan countdown.
        final DateTime networkNow = await _syncServerTime(
          forceRefresh: true,
        );

        if (savedDraft == null) {
          startDateTime = networkNow;
          loadedDeadline = networkNow.add(
            Duration(minutes: durationMinutes),
          );
        } else {
          loadedDeadline = savedDraft.deadline;

          loadedDeadline ??= startDateTime.add(
            Duration(minutes: durationMinutes),
          );
        }

        _startServerTimeSync();
      }

      // Mengambil TAG form melalui form_tags -> tags.
      tokenTag = '-';

      try {
        final formTagResponse =
            await _supabase
                .from('form_tags')
                .select('tag_id')
                .eq(
                  'form_id',
                  loadedFormId,
                )
                .limit(1);

        if (formTagResponse.isNotEmpty) {
          final String tagId =
              formTagResponse.first['tag_id']
                      ?.toString()
                      .trim() ??
                  '';

          if (tagId.isNotEmpty) {
            final tagResponse =
                await _supabase
                    .from('tags')
                    .select('id, name')
                    .eq(
                      'id',
                      tagId,
                    )
                    .maybeSingle();

            if (tagResponse != null) {
              final String tagName =
                  tagResponse['name']
                          ?.toString()
                          .trim() ??
                      '';

              if (tagName.isNotEmpty) {
                tokenTag = tagName;
              }
            }
          }
        }
      } catch (_) {
        // Gagal mengambil TAG tidak menghentikan ujian.
        tokenTag = '-';
      }

      // Mengambil semua soal berdasarkan form ID.
      final questionResponse =
          await _supabase
              .from('questions')
              .select(
                'id, question_text, question_type, score_value, '
                'order_index, is_required, image_question, media_url',
              )
              .eq(
                'form_id',
                loadedFormId,
              )
              .order(
                'order_index',
                ascending: true,
              );

      final List<Map<String, dynamic>>
          loadedQuestions = [];

      // Mengambil pilihan jawaban setiap soal.
      for (final questionRow
          in questionResponse) {
        final String questionId =
            questionRow['id']
                    ?.toString()
                    .trim() ??
                '';

        if (questionId.isEmpty) {
          continue;
        }

        final optionResponse =
            await _supabase
                .from('question_options')
                .select(
                  'id, option_text, is_correct, order_index',
                )
                .eq(
                  'question_id',
                  questionId,
                )
                .order(
                  'order_index',
                  ascending: true,
                );

        final List<Map<String, dynamic>>
            options = [];

        for (final optionRow
            in optionResponse) {
          final String optionId =
              optionRow['id']
                      ?.toString()
                      .trim() ??
                  '';

          final String optionText =
              optionRow['option_text']
                      ?.toString() ??
                  '';

          options.add({
            'id': optionId,
            'text': optionText,
            'isCorrect':
                optionRow['is_correct'] == true,
          });
        }

        loadedQuestions.add({
          'id': questionId,
          'question':
              questionRow['question_text']
                      ?.toString() ??
                  '',
          'options': options,
          'scoreValue':
              questionRow['score_value'],
          'questionType':
              questionRow['question_type']
                  ?.toString(),
          'isRequired':
              questionRow['is_required'] == true,
          'imageQuestion':
              questionRow['image_question']
                  ?.toString(),
          'mediaUrl':
              questionRow['media_url']
                  ?.toString(),
        });
      }

      if (!mounted) {
        return;
      }

      // Menangani form yang belum memiliki soal.
      if (loadedQuestions.isEmpty) {
        setState(() {
          formTitle =
              title.isEmpty
                  ? 'Form Ujian'
                  : title;

          duration = loadedDuration;

          questions.clear();
          selectedAnswers = [];

          isLoading = false;
          errorMessage =
              'Belum ada soal untuk form ini.';
        });

        return;
      }

      // Menyiapkan state jawaban sesuai jumlah soal.
      final int questionCount =
          loadedQuestions.length;

      final List<int?> loadedSelectedAnswers =
          List<int?>.filled(
        questionCount,
        null,
      );

      // Semua soal awalnya tidak ditandai ragu-ragu.
      final List<bool> loadedDoubtfulQuestions =
          List<bool>.filled(
        questionCount,
        false,
      );

      final List<Set<int>> loadedMultiple =
          List.generate(
        questionCount,
        (_) => <int>{},
      );

      final List<TextEditingController>
          loadedEssays =
          List.generate(
        questionCount,
        (_) => TextEditingController(),
      );

      final currentQuestionIds =
          loadedQuestions
              .map(
                (question) =>
                    question['id']
                            ?.toString()
                            .trim() ??
                        '',
              )
              .toList();

      // Mengecek apakah draft masih sesuai dengan soal sekarang.
      final bool draftMatchesQuestions =
          savedDraft != null &&
          savedDraft.questionIds.length ==
              currentQuestionIds.length &&
          _sameStringList(
            savedDraft.questionIds,
            currentQuestionIds,
          );

      if (draftMatchesQuestions) {
        // Memulihkan jawaban single choice.
        for (
          int i = 0;
          i < questionCount &&
              i <
                  savedDraft
                      .selectedSingle
                      .length;
          i++
        ) {
          loadedSelectedAnswers[i] =
              savedDraft.selectedSingle[i];
        }

        // Memulihkan jawaban multiple choice.
        for (
          int i = 0;
          i < questionCount &&
              i <
                  savedDraft
                      .selectedMultiple
                      .length;
          i++
        ) {
          loadedMultiple[i]
            ..clear()
            ..addAll(
              savedDraft
                  .selectedMultiple[i],
            );
        }

        // Memulihkan jawaban essay.
        for (
          int i = 0;
          i < questionCount &&
              i <
                  savedDraft.essays.length;
          i++
        ) {
          loadedEssays[i].text =
              savedDraft.essays[i];
        }
      }

      final int restoredQuestion =
          draftMatchesQuestions
              ? savedDraft.currentQuestion
              : 0;

      setState(() {
        formTitle =
            title.isEmpty
                ? 'Form Ujian'
                : title;

        duration = loadedDuration;
        deadline = loadedDeadline;
        hasTimeLimit = loadedHasTimeLimit;

        questions
          ..clear()
          ..addAll(
            loadedQuestions,
          );

        selectedAnswers =
            loadedSelectedAnswers;
        doubtfulQuestions =
            loadedDoubtfulQuestions;
        selectedMultipleAnswers =
            loadedMultiple;
        essayControllers =
            loadedEssays;

        currentQuestion =
            restoredQuestion >= questionCount
                ? questionCount - 1
                : restoredQuestion;

        isLoading = false;
        errorMessage = null;
      });

      await _saveDraft();

      if (hasTimeLimit) {
        startTimer();
      }
    } catch (e) {
      if (!mounted) {
        return;
      }

      setState(() {
        isLoading = false;
        errorMessage = _cleanError(e);
      });
    }
  }

  // Menyimpan progress ujian ke draft lokal.
  Future<void> _saveDraft() async {
    if (isSubmitting || questions.isEmpty) {
      return;
    }

    final user =
        _supabase.auth.currentUser;

    if (user == null) {
      return;
    }

    try {
      await ExamDraftService.saveDraft(
        userId: user.id,
        formId: widget.formId,
        tokenId: widget.tokenId,
        startDateTime: startDateTime,
        deadline: deadline,
        currentQuestion: currentQuestion,
        selectedSingle: selectedAnswers,
        selectedMultiple:
            selectedMultipleAnswers,
        essays: essayControllers
            .map(
              (controller) =>
                  controller.text,
            )
            .toList(),
        questionIds: questions
            .map(
              (question) =>
                  question['id']
                          ?.toString()
                          .trim() ??
                      '',
            )
            .toList(),
      );
    } catch (_) {
      // Gagal menyimpan draft tidak menghentikan ujian.
    }
  }

  // Menandai atau membatalkan status ragu-ragu.
  void _toggleDoubtful() {
    if (isSubmitting || questions.isEmpty) {
      return;
    }

    setState(() {
      doubtfulQuestions[currentQuestion] =
          !doubtfulQuestions[currentQuestion];
    });

    _saveDraft();
  }

  // Mengecek status ragu-ragu soal saat ini.
  bool _isCurrentQuestionDoubtful() {
    if (currentQuestion < 0 ||
        currentQuestion >= doubtfulQuestions.length) {
      return false;
    }

    return doubtfulQuestions[currentQuestion];
  }

  // Membandingkan dua daftar ID soal.
  bool _sameStringList(
    List<String> first,
    List<String> second,
  ) {
    if (first.length != second.length) {
      return false;
    }

    for (
      int i = 0;
      i < first.length;
      i++
    ) {
      if (first[i] != second[i]) {
        return false;
      }
    }

    return true;
  }

  // Memulai timer ujian.
  void startTimer() {
    timer?.cancel();

    if (!hasTimeLimit ||
        deadline == null) {
      return;
    }

    updateTimer();

    timer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => updateTimer(),
    );
  }

  // Memperbarui waktu tersisa.
  void updateTimer() {
    if (!mounted ||
        !hasTimeLimit ||
        deadline == null ||
        isSubmitting) {
      return;
    }

    final Duration remaining =
        deadline!.difference(
      _currentServerTime(),
    );

    if (remaining.inMilliseconds <= 0) {
      setState(() {
        duration = Duration.zero;
      });

      timer?.cancel();

      if (!isAutoSubmitting) {
        isAutoSubmitting = true;
        submitExam();
      }

      return;
    }

    setState(() {
      duration = remaining;
    });
  }

  // Dipertahankan untuk kompatibilitas pemanggilan lama.
  void countdown() {
    updateTimer();
  }

  // Mengubah angka menjadi dua digit.
  String twoDigits(int n) {
    return n.toString().padLeft(2, '0');
  }

  // Mengecek apakah aplikasi menggunakan dark mode.
  bool get _isDarkMode =>
      Theme.of(context).brightness ==
      Brightness.dark;

  // Warna background jawaban terpilih.
  Color get _selectedAnswerBackground =>
      _isDarkMode
          ? const Color(0xFFB9C4FF)
          : Theme.of(context)
              .colorScheme
              .primary;

  // Warna teks jawaban terpilih.
  Color get _selectedAnswerText =>
      _isDarkMode
          ? const Color(0xFF20264D)
          : Theme.of(context)
              .colorScheme
              .onPrimary;

  // Menampilkan timer dalam format jam : menit : detik.
  String get timerText {
    final int totalSeconds =
        duration.inSeconds < 0
            ? 0
            : duration.inSeconds;

    final int hours =
        totalSeconds ~/ 3600;

    final int minutes =
        (totalSeconds % 3600) ~/ 60;

    final int seconds =
        totalSeconds % 60;

    return '${twoDigits(hours)} : '
        '${twoDigits(minutes)} : '
        '${twoDigits(seconds)}';
  }

  // Mengambil tipe soal.
  String _questionType(
    Map<String, dynamic> question,
  ) {
    return (question['questionType']
                ?.toString() ??
            '')
        .trim()
        .toLowerCase()
        .replaceAll('-', '_')
        .replaceAll(' ', '_');
  }

  // Mengecek apakah soal berupa essay.
  bool _isEssay(
    Map<String, dynamic> question,
  ) {
    final type =
        _questionType(question);

    return type == 'essay' ||
        type == 'text' ||
        type == 'textarea' ||
        type == 'long_text' ||
        type == 'long_answer' ||
        type == 'short_answer';
  }

  // Mengecek apakah soal multiple choice.
  bool _isMultiple(
    Map<String, dynamic> question,
  ) {
    final type =
        _questionType(question);

    return type == 'checkbox' ||
        type == 'check_box' ||
        type == 'multiple_choice' ||
        type == 'multiple_select' ||
        type == 'multi_choice' ||
        type == 'multiple';
  }

  // Mengecek apakah soal sudah dijawab.
  bool _isAnswered(int index) {
    final question =
        questions[index];

    if (_isEssay(question)) {
      return essayControllers[index]
          .text
          .trim()
          .isNotEmpty;
    }

    if (_isMultiple(question)) {
      return selectedMultipleAnswers[index]
          .isNotEmpty;
    }

    return selectedAnswers[index] != null;
  }

  // Memastikan soal saat ini sudah dijawab.
  bool _validateCurrent() {
    if (_isAnswered(currentQuestion)) {
      return true;
    }

    final question =
        questions[currentQuestion];

    final String message =
        _isEssay(question)
            ? 'Silakan isi jawaban terlebih dahulu.'
            : _isMultiple(question)
                ? 'Silakan pilih minimal satu jawaban.'
                : 'Silakan pilih salah satu jawaban terlebih dahulu.';

    ScaffoldMessenger.of(context)
        .showSnackBar(
      SnackBar(
        content: Text(message),
      ),
    );

    return false;
  }

  // Membentuk AnswerModel dari jawaban user.
  List<AnswerModel> buildAnswers() {
    return List.generate(
      questions.length,
      (index) {
        final question =
            questions[index];

        final List<
            Map<String, dynamic>> options =
            List<Map<String, dynamic>>.from(
          question['options'] ?? [],
        );

        int correctAnswer = -1;

        for (
          int i = 0;
          i < options.length;
          i++
        ) {
          if (options[i]['isCorrect'] ==
              true) {
            correctAnswer = i;
            break;
          }
        }

        int userAnswer = -1;

        if (_isEssay(question)) {
          userAnswer = -1;
        } else if (_isMultiple(question)) {
          final selected =
              selectedMultipleAnswers[index];

          if (selected.isNotEmpty) {
            userAnswer =
                selected.first;
          }
        } else {
          userAnswer =
              selectedAnswers[index] ?? -1;
        }

        return AnswerModel(
          questionNumber: index + 1,
          question:
              question['question']
                      ?.toString() ??
                  '',
          options: options
              .map(
                (option) =>
                    option['text']
                            ?.toString() ??
                        '',
              )
              .toList(),
          correctAnswer:
              correctAnswer,
          userAnswer:
              userAnswer,
        );
      },
    );
  }

  // Mengirim hasil ujian ke Supabase.
  Future<void> submitExam() async {
    if (isSubmitting ||
        questions.isEmpty) {
      return;
    }

    if (mounted) {
      setState(() {
        isSubmitting = true;
      });
    }

    timer?.cancel();

    try {
      final List<AnswerModel> answers =
          buildAnswers();

      final int totalQuestion =
          questions.length;

      int correctAnswer = 0;
      int wrongAnswer = 0;

      double earnedScore = 0;
      double maximumScore = 0;

      // Menghitung nilai setiap soal.
      for (
        int i = 0;
        i < questions.length;
        i++
      ) {
        final question =
            questions[i];

        // Essay belum dinilai otomatis.
        if (_isEssay(question)) {
          continue;
        }

        final List<
            Map<String, dynamic>> options =
            List<Map<String, dynamic>>.from(
          question['options'] ?? [],
        );

        if (options.isEmpty) {
          continue;
        }

        final double scoreValue =
            _toDouble(
          question['scoreValue'],
        );

        maximumScore += scoreValue;

        bool isCorrect = false;

        if (_isMultiple(question)) {
          final Set<String> selectedIds =
              <String>{};

          final Set<String> correctIds =
              <String>{};

          for (
            final index
                in selectedMultipleAnswers[i]
          ) {
            if (index >= 0 &&
                index < options.length) {
              final String id =
                  options[index]['id']
                          ?.toString()
                          .trim() ??
                      '';

              if (id.isNotEmpty) {
                selectedIds.add(id);
              }
            }
          }

          for (final option in options) {
            if (option['isCorrect'] ==
                true) {
              final String id =
                  option['id']
                          ?.toString()
                          .trim() ??
                      '';

              if (id.isNotEmpty) {
                correctIds.add(id);
              }
            }
          }

          isCorrect =
              selectedIds.length ==
                      correctIds.length &&
                  selectedIds.containsAll(
                    correctIds,
                  ) &&
                  correctIds.containsAll(
                    selectedIds,
                  );
        } else {
          final int? selectedIndex =
              selectedAnswers[i];

          if (selectedIndex != null &&
              selectedIndex >= 0 &&
              selectedIndex < options.length) {
            isCorrect =
                options[selectedIndex]
                        ['isCorrect'] ==
                    true;
          }
        }

        if (isCorrect) {
          correctAnswer++;
          earnedScore += scoreValue;
        } else {
          wrongAnswer++;
        }
      }

      // Menghitung nilai akhir.
      final int score =
          maximumScore <= 0
              ? 0
              : ((earnedScore /
                          maximumScore) *
                      100)
                  .round();

      final DateTime finishDateTime =
          hasTimeLimit
              ? _currentServerTime()
              : DateTime.now();

      final Duration elapsed =
          finishDateTime.difference(
        startDateTime,
      );

      final int totalSeconds =
          elapsed.inSeconds < 0
              ? 0
              : elapsed.inSeconds;

      final int hours =
          totalSeconds ~/ 3600;

      final int minutes =
          (totalSeconds % 3600) ~/ 60;

      final int seconds =
          totalSeconds % 60;

      final String durationText =
          hours > 0
              ? '$hours Jam $minutes Menit'
              : minutes > 0
                  ? '$minutes Menit'
                  : '$seconds Detik';

      // Memastikan user masih login.
      final user =
          _supabase.auth.currentUser;

      if (user == null) {
        throw Exception(
          'User belum login.',
        );
      }

      // Menyiapkan data submission.
      final Map<String, dynamic>
          submissionData = {
        'form_id': widget.formId,
        'user_id': user.id,
        'total_score': score,
        'status': 'SUBMITTED',
        'started_at':
            startDateTime.toIso8601String(),
        'submitted_at':
            finishDateTime.toIso8601String(),
      };

      final String cleanTokenId =
          widget.tokenId?.trim() ?? '';

      if (cleanTokenId.isNotEmpty) {
        submissionData['token_id'] =
            cleanTokenId;
      }

      // Menyimpan submission.
      final submissionResponse =
          await _supabase
              .from('submissions')
              .insert(
                submissionData,
              )
              .select('id')
              .single();

      final String submissionId =
          submissionResponse['id']
                  ?.toString()
                  .trim() ??
              '';

      if (submissionId.isEmpty) {
        throw Exception(
          'ID submission tidak berhasil dibuat.',
        );
      }

      // Menyiapkan data jawaban untuk database.
      final List<
              Map<String, dynamic>>
          answerRows = [];

      for (
        int i = 0;
        i < questions.length;
        i++
      ) {
        final question =
            questions[i];

        final String questionId =
            question['id']
                    ?.toString()
                    .trim() ??
                '';

        if (questionId.isEmpty) {
          continue;
        }

        final List<
                Map<String, dynamic>>
            options =
            List<Map<String, dynamic>>.from(
          question['options'] ?? [],
        );

        final Map<String, dynamic>
            answerRow = {
          'submission_id':
              submissionId,
          'question_id':
              questionId,
          'score_obtained': 0,
        };

        // Menyimpan jawaban essay.
        if (_isEssay(question)) {
          answerRow['answer_text'] =
              essayControllers[i]
                  .text
                  .trim();
        }

        // Menyimpan jawaban multiple choice.
        else if (_isMultiple(question)) {
          final List<String>
              selectedOptionIds = [];

          for (
            final index
                in selectedMultipleAnswers[i]
          ) {
            if (index >= 0 &&
                index < options.length) {
              final String optionId =
                  options[index]['id']
                          ?.toString()
                          .trim() ??
                      '';

              if (optionId.isNotEmpty) {
                selectedOptionIds.add(
                  optionId,
                );
              }
            }
          }

          answerRow[
                  'selected_options'] =
              selectedOptionIds;

          if (_multipleIsCorrect(
            options,
            selectedMultipleAnswers[i],
          )) {
            answerRow[
                    'score_obtained'] =
                _toDouble(
              question[
                  'scoreValue'],
            );
          }
        }

        // Menyimpan jawaban single choice.
        else {
          final int? userAnswer =
              selectedAnswers[i];

          String? selectedOptionId;

          if (userAnswer != null &&
              userAnswer >= 0 &&
              userAnswer < options.length) {
            selectedOptionId =
                options[userAnswer]['id']
                    ?.toString()
                    .trim();

            final bool isCorrect =
                options[userAnswer]
                        ['isCorrect'] ==
                    true;

            answerRow[
                    'score_obtained'] =
                isCorrect
                    ? _toDouble(
                        question[
                            'scoreValue'],
                      )
                    : 0;
          }

          answerRow[
                  'selected_option_id'] =
              selectedOptionId;
        }

        answerRows.add(
          answerRow,
        );
      }

      // Menyimpan semua jawaban.
      if (answerRows.isNotEmpty) {
        await _supabase
            .from('answers')
            .insert(
              answerRows,
            );
      }

      // Membuat data history.
      final history =
          HistoryModel(
        submissionId:
            submissionId,
        title:
            formTitle,
        token:
            tokenTag,
        date:
            formatDate(
          finishDateTime,
        ),
        startTime:
            formatTime(
          startDateTime,
        ),
        finishTime:
            formatTime(
          finishDateTime,
        ),
        duration:
            durationText,
        score:
            score,
        totalQuestion:
            totalQuestion,
        correctAnswer:
            correctAnswer,
        wrongAnswer:
            wrongAnswer,
        isFinished:
            true,
        answers:
            answers,
      );

      // Menyimpan history lokal.
      await HistoryService.addHistory(
        history,
      );

      // Menghapus draft setelah submit berhasil.
      final currentUser =
          _supabase.auth.currentUser;

      if (currentUser != null) {
        await ExamDraftService.clearDraft(
          currentUser.id,
        );
      }

      if (!mounted) {
        return;
      }

      // SECURITY OFF setelah ujian benar-benar selesai.
      // Screenshot/screen recording, Lock Task, dan fullscreen
      // dikembalikan ke kondisi normal sebelum membuka hasil.
      await _stopExamSecurity();

      if (!mounted) {
        return;
      }

      // Beralih ke halaman hasil.
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) =>
              ResultScreen(
            history: history,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) {
        return;
      }

      setState(() {
        isSubmitting = false;
      });

      ScaffoldMessenger.of(context)
          .showSnackBar(
        SnackBar(
          content: Text(
            isAutoSubmitting
                ? 'Waktu habis. Gagal mengirim ujian: ${_cleanError(e)}'
                : 'Gagal mengirim ujian: ${_cleanError(e)}',
          ),
        ),
      );

      // Menjalankan kembali timer jika submit gagal.
      if (hasTimeLimit &&
          deadline != null &&
          deadline!.isAfter(
            hasTimeLimit
                ? _currentServerTime()
                : DateTime.now(),
          )) {
        isAutoSubmitting = false;
        startTimer();
      }
    }
  }

  // Mengambil waktu dari NTP dan mengikat countdown ke stopwatch monotonic.
  // Perubahan jam perangkat setelah sinkronisasi tidak mengubah countdown.
  Future<DateTime> _syncServerTime({bool forceRefresh = false}) async {
    final DateTime networkNow = await FlutterNTP.now(
      forceRefresh: forceRefresh,
      allowFallback: false,
    );

    _serverTimeAtSync = networkNow.toUtc();
    _serverClock
      ..reset()
      ..start();
    _serverTimeReady = true;

    return _serverTimeAtSync!;
  }

  DateTime _currentServerTime() {
    if (!_serverTimeReady || _serverTimeAtSync == null) {
      throw Exception('Jam server belum tersinkronisasi.');
    }

    return _serverTimeAtSync!.add(
      _serverClock.elapsed,
    );
  }

  void _startServerTimeSync() {
    _serverSyncTimer?.cancel();

    _serverSyncTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) async {
        if (!mounted ||
            !hasTimeLimit ||
            isSubmitting) {
          return;
        }

        try {
          // Hanya menyegarkan offset. Countdown tetap berbasis stopwatch.
          await _syncServerTime();
          updateTimer();
        } catch (_) {
          // Gunakan titik waktu sinkronisasi terakhir.
        }
      },
    );
  }

  // Mematikan security ujian dan mengembalikan tampilan normal.
  Future<void> _stopExamSecurity() async {
    try {
      await _examSecurityChannel.invokeMethod(
        'stopExamSecurity',
      );
    } catch (_) {
      // Jika native security gagal dimatikan, jangan mengganggu
      // proses hasil ujian.
    }

    await SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.edgeToEdge,
    );
  }

  // Mengecek apakah semua jawaban multiple sudah benar.
  bool _multipleIsCorrect(
    List<Map<String, dynamic>> options,
    Set<int> selectedIndexes,
  ) {
    final Set<String> selectedIds =
        <String>{};

    final Set<String> correctIds =
        <String>{};

    for (final index in selectedIndexes) {
      if (index >= 0 &&
          index < options.length) {
        final String id =
            options[index]['id']
                    ?.toString()
                    .trim() ??
                '';

        if (id.isNotEmpty) {
          selectedIds.add(id);
        }
      }
    }

    for (final option in options) {
      if (option['isCorrect'] == true) {
        final String id =
            option['id']
                    ?.toString()
                    .trim() ??
                '';

        if (id.isNotEmpty) {
          correctIds.add(id);
        }
      }
    }

    return selectedIds.length ==
            correctIds.length &&
        selectedIds.containsAll(
          correctIds,
        ) &&
        correctIds.containsAll(
          selectedIds,
        );
  }

  // Mengubah nilai menjadi integer.
  int _toInt(dynamic value) {
    if (value == null) {
      return 0;
    }

    if (value is int) {
      return value;
    }

    if (value is num) {
      return value.toInt();
    }

    return int.tryParse(
          value.toString().trim(),
        ) ??
        0;
  }

  // Mengubah nilai menjadi double.
  double _toDouble(dynamic value) {
    if (value == null) {
      return 0;
    }

    if (value is num) {
      return value.toDouble();
    }

    return double.tryParse(
          value.toString().trim(),
        ) ??
        0;
  }

  // Membersihkan pesan error.
  String _cleanError(Object error) {
    final String text =
        error.toString();

    if (text.startsWith(
      'Exception: ',
    )) {
      return text.substring(
        'Exception: '.length,
      );
    }

    return text;
  }

  // Memformat tanggal.
  String formatDate(DateTime date) {
    return '${twoDigits(date.day)}/'
        '${twoDigits(date.month)}/'
        '${date.year}';
  }

  // Memformat waktu.
  String formatTime(DateTime date) {
    return '${twoDigits(date.hour)}.'
        '${twoDigits(date.minute)}';
  }

  // Menampilkan daftar nomor soal.
  void showQuestionList() {
    final colors =
        Theme.of(context).colorScheme;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor:
          colors.surface,
      shape:
          const RoundedRectangleBorder(
        borderRadius:
            BorderRadius.vertical(
          top: Radius.circular(25),
        ),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding:
                const EdgeInsets.all(20),
            child:
                SingleChildScrollView(
              child: Column(
                mainAxisSize:
                    MainAxisSize.min,
                children: [
                  Text(
                    'Daftar Soal',
                    style:
                        TextStyle(fontFamily: 'FunnelDisplay',

                      fontSize: 22,
                      fontWeight:
                          FontWeight.bold,
                    ),
                  ),

                  const SizedBox(
                    height: 20,
                  ),

                  // Grid nomor soal.
                  GridView.builder(
                    shrinkWrap: true,
                    physics:
                        const NeverScrollableScrollPhysics(),
                    itemCount:
                        questions.length,
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 5,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                    ),
                    itemBuilder:
                        (context, index) {
                      Color bg =
                          colors.surface;

                      Color textColor =
                          colors.onSurface;

                      final bool isDoubtful =
                          index <
                                  doubtfulQuestions.length &&
                              doubtfulQuestions[index];

                      if (_isAnswered(
                        index,
                      )) {
                        bg =
                            const Color(
                          0xFF4CAF50,
                        );
                        textColor =
                            Colors.white;
                      }

                      // Ragu-ragu selalu diutamakan.
                      // Jadi tetap kuning walaupun soal sudah dijawab.
                      if (isDoubtful) {
                        bg =
                            const Color(
                          0xFFFFC107,
                        );
                        textColor =
                            const Color(
                          0xFF5D4300,
                        );
                      } else if (index ==
                          currentQuestion) {
                        bg =
                            _selectedAnswerBackground;
                        textColor =
                            _selectedAnswerText;
                      }

                      return InkWell(
                        onTap: () {
                          setState(() {
                            currentQuestion =
                                index;
                          });

                          Navigator.pop(
                            context,
                          );
                        },
                        borderRadius:
                            BorderRadius.circular(
                          12,
                        ),
                        child: Container(
                          decoration:
                              BoxDecoration(
                            color: bg,
                            borderRadius:
                                BorderRadius.circular(
                              12,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              '${index + 1}',
                              style:
                                  TextStyle(fontFamily: 'FunnelDisplay',

                                color:
                                    textColor,
                                fontWeight:
                                    FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),

                  const SizedBox(
                    height: 25,
                  ),

                  // Tombol kembali ke soal.
                  SizedBox(
                    width:
                        double.infinity,
                    height: 50,
                    child:
                        ElevatedButton(
                      onPressed: () =>
                          Navigator.pop(
                        context,
                      ),
                      style:
                          ElevatedButton.styleFrom(
                        backgroundColor:
                            colors.primary,
                        foregroundColor:
                            colors.onPrimary,
                        shape:
                            RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(
                            14,
                          ),
                        ),
                      ),
                      child: Text(
                        'Kembali ke Soal',
                        style:
                            TextStyle(fontFamily: 'FunnelDisplay',

                          fontWeight:
                              FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // Menampilkan konfirmasi sebelum submit.
  void confirmSubmit() {
    final colors =
        Theme.of(context).colorScheme;

    // Jangan izinkan submit selama masih ada soal yang ragu-ragu.
    final int doubtfulIndex =
        doubtfulQuestions.indexWhere(
      (isDoubtful) => isDoubtful,
    );

    if (doubtfulIndex != -1) {
      setState(() {
        currentQuestion = doubtfulIndex;
      });

      _saveDraft();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Soal ${doubtfulIndex + 1} masih ditandai ragu-ragu. '
            'Hapus tanda Ragu-ragu terlebih dahulu sebelum submit.',
          ),
        ),
      );

      return;
    }

    final int unanswered =
        List.generate(
          questions.length,
          (index) => index,
        )
            .where(
              (index) =>
                  !_isAnswered(index),
            )
            .length;

    final String message =
        unanswered > 0
            ? 'Masih ada $unanswered soal yang belum dijawab.\n\n'
                'Apakah Anda yakin ingin mengirim jawaban?'
            : 'Apakah Anda yakin ingin mengirim jawaban?\n\n'
                'Jawaban yang sudah dikirim tidak dapat diubah lagi.';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          shape:
              RoundedRectangleBorder(
            borderRadius:
                BorderRadius.circular(
              20,
            ),
          ),
          title: Text(
            'Konfirmasi Submit',
            style:
                TextStyle(fontFamily: 'FunnelDisplay',

              fontWeight:
                  FontWeight.bold,
            ),
          ),
          content: Text(
            message,
            style:
                TextStyle(fontFamily: 'FunnelDisplay',
),
          ),
          actions: [
            TextButton(
              onPressed: () =>
                  Navigator.pop(
                dialogContext,
              ),
              child:
                  const Text(
                'Batal',
              ),
            ),

            ElevatedButton(
              onPressed:
                  isSubmitting
                      ? null
                      : () async {
                          Navigator.pop(
                            dialogContext,
                          );

                          await submitExam();
                        },
              style:
                  ElevatedButton.styleFrom(
                backgroundColor:
                    colors.primary,
                foregroundColor:
                    colors.onPrimary,
              ),
              child:
                  const Text(
                'Ya, Submit',
              ),
            ),
          ],
        );
      },
    );
  }

  // Tampilan loading.
  Widget buildLoading() {
    return const Center(
      child:
          CircularProgressIndicator(),
    );
  }

  // Tampilan error.
  Widget buildError() {
    final colors =
        Theme.of(context).colorScheme;

    return Center(
      child: Padding(
        padding:
            const EdgeInsets.all(30),
        child: Column(
          mainAxisAlignment:
              MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 60,
              color: colors.error,
            ),

            const SizedBox(
              height: 20,
            ),

            Text(
              errorMessage ??
                  'Terjadi kesalahan.',
              textAlign:
                  TextAlign.center,
              style:
                  TextStyle(fontFamily: 'FunnelDisplay',
),
            ),

            const SizedBox(
              height: 20,
            ),

            ElevatedButton(
              onPressed:
                  loadExam,
              style:
                  ElevatedButton.styleFrom(
                backgroundColor:
                    colors.primary,
                foregroundColor:
                    colors.onPrimary,
              ),
              child:
                  const Text(
                'Coba Lagi',
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Renderer WYSIWYG/HTML untuk soal dan pilihan jawaban.
  //
  // Teks dari creator tetap disimpan apa adanya di database.
  // Helper ini hanya mengubah cara menampilkannya sehingga format seperti
  // paragraf, bold, italic, underline, heading, list, tabel, alignment,
  // warna, ukuran font, dan inline CSS dapat dirender di QuestionScreen.
  Widget _buildHtmlContent(
    String html, {
    required double fontSize,
    required FontWeight fontWeight,
    required Color color,
  }) {
    final String content = _prepareHtmlContent(html.trim());

    if (content.isEmpty) {
      return const SizedBox.shrink();
    }

    return HtmlWidget(
      content,
      renderMode: RenderMode.column,
      textStyle: TextStyle(
        fontFamily: 'FunnelDisplay',
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        height: 1.5,
      ),
      customStylesBuilder: (element) {
        // Jaga jarak antar paragraf tetap rapi tanpa menghapus
        // format yang dibuat creator.
        if (element.localName == 'p') {
          return {
            'margin': '0 0 8px 0',
          };
        }

        // Format code inline seperti <code>...</code>.
        if (element.localName == 'code') {
          return {
            'font-family': 'monospace',
            'font-size': '0.9em',
            'background-color': '#ECECEC',
            'padding': '2px 4px',
          };
        }

        // Rumus sederhana yang dibuat Creator menggunakan superscript
        // dan subscript tetap terlihat seperti notasi matematika.
        if (element.localName == 'sup' ||
            element.localName == 'sub') {
          return {
            'font-size': '75%',
          };
        }

        return null;
      },
      customWidgetBuilder: (element) {
        // Code block WYSIWYG, misalnya <pre><code>...</code></pre>.
        // Dibuat monospaced, mempertahankan line break, dan dapat
        // digeser horizontal tanpa mengubah isi code dari Creator.
        if (element.localName == 'pre') {
          return _QuestionCodeBlock(
            code: element.text,
          );
        }

        // Dukungan formula dari Creator bila editor menyimpan LaTeX
        // pada data-latex/data-formula/data-equation.
        final String latex =
            element.attributes['data-formaly-math']?.trim() ??
            element.attributes['data-latex']?.trim() ??
            element.attributes['data-formula']?.trim() ??
            element.attributes['data-equation']?.trim() ??
            '';

        if (latex.isNotEmpty) {
          final bool displayMath =
              element.attributes['data-formaly-math-display'] == 'true' ||
              element.attributes['data-display-math'] == 'true';

          return _QuestionMath(
            expression: latex,
            displayMath: displayMath,
            fontSize: fontSize,
            color: color,
          );
        }

        // Hanya gambar yang dibuat interaktif untuk zoom manual.
        // Format/isi WYSIWYG dari creator tetap tidak diubah.
        if (element.localName != 'img') {
          return null;
        }

        final String imageSource =
            element.attributes['src']?.trim() ?? '';

        if (imageSource.isEmpty) {
          return null;
        }

        return _ZoomableQuestionImage(
          imageUrl: _resolveMediaUrl(imageSource),
        );
      },
    );
  }

  // Menambahkan renderer formula LaTeX tanpa mengubah HTML asli yang
  // tersimpan dari Creator. Formula dilindungi agar code block tidak
  // ikut diproses sebagai rumus.
  String _prepareHtmlContent(String html) {
    if (html.isEmpty) {
      return '';
    }

    final List<String> protectedBlocks = [];
    int blockIndex = 0;

    // Pertahankan code block HTML yang memang sudah dibuat oleh WYSIWYG.
    final RegExp codeBlockPattern = RegExp(
      r'<(pre|code)\b[^>]*>[\s\S]*?</\1>',
      caseSensitive: false,
    );

    String prepared = html.replaceAllMapped(
      codeBlockPattern,
      (match) {
        final String token =
            'FORMALY_CODE_BLOCK_${blockIndex++}_PLACEHOLDER';
        protectedBlocks.add(match.group(0) ?? '');
        return token;
      },
    );

    // Dukungan code block Markdown dengan triple backtick.
    // Contoh yang ditempel oleh Creator:
    // ```python
    // x = 10
    // y = 3
    // print(x % y)
    // ```
    // Backtick tidak ditampilkan di Android; isinya dibuat menjadi
    // <pre><code> sehingga tampil seperti blok kode pada soal.
    final RegExp fencedCodePattern = RegExp(
      r'```[^\r\n`]*\r?\n([\s\S]*?)```',
      caseSensitive: false,
    );

    prepared = prepared.replaceAllMapped(
      fencedCodePattern,
      (match) {
        final String code = match.group(1) ?? '';
        return '<pre><code>${_escapeHtmlAttribute(code)}</code></pre>';
      },
    );

    // Dukungan inline code dengan single backtick, misalnya `x % y`.
    final RegExp inlineCodePattern = RegExp(
      r'(?<!`)`([^`\r\n]+)`(?!`)',
    );

    prepared = prepared.replaceAllMapped(
      inlineCodePattern,
      (match) {
        final String code = match.group(1) ?? '';
        return '<code>${_escapeHtmlAttribute(code)}</code>';
      },
    );

    // Lindungi lagi code block yang baru dibuat supaya tanda $ di dalam
    // code tidak dianggap sebagai awal rumus LaTeX.
    prepared = prepared.replaceAllMapped(
      codeBlockPattern,
      (match) {
        final String token =
            'FORMALY_CODE_BLOCK_${blockIndex++}_PLACEHOLDER';
        protectedBlocks.add(match.group(0) ?? '');
        return token;
      },
    );

    final RegExp latexPattern = RegExp(
      r'(\$\$([\s\S]*?)\$\$|\$([^$]+?)\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\))',
    );

    prepared = prepared.replaceAllMapped(
      latexPattern,
      (match) {
        String expression;
        bool displayMath;

        if ((match.group(2) ?? '').isNotEmpty) {
          expression = match.group(2) ?? '';
          displayMath = true;
        } else if ((match.group(3) ?? '').isNotEmpty) {
          expression = match.group(3) ?? '';
          displayMath = false;
        } else if ((match.group(4) ?? '').isNotEmpty) {
          expression = match.group(4) ?? '';
          displayMath = true;
        } else {
          expression = match.group(5) ?? '';
          displayMath = false;
        }

        final String token =
            _escapeHtmlAttribute(expression.trim());
        final String display =
            displayMath ? 'true' : 'false';

        return '<div data-formaly-math="$token" '
            'data-formaly-math-display="$display"></div>';
      },
    );

    for (int i = protectedBlocks.length - 1; i >= 0; i--) {
      final String token =
          'FORMALY_CODE_BLOCK_${i}_PLACEHOLDER';
      prepared = prepared.replaceFirst(
        token,
        protectedBlocks[i],
      );
    }

    return prepared;
  }

  static const String _storageBaseUrl =
      'https://formaly-storage.commandspes.tech';

  String _resolveMediaUrl(String raw) {
    final String value = raw.trim();

    if (value.isEmpty) return '';

    if (value.startsWith('http://') ||
        value.startsWith('https://')) {
      return value;
    }

    if (value.startsWith('/')) {
      return '$_storageBaseUrl$value';
    }

    return '$_storageBaseUrl/$value';
  }

  String _mediaExtension(String url) {
    final Uri? uri = Uri.tryParse(url);
    final String path =
        uri?.path.toLowerCase() ??
        url.split('?').first.toLowerCase();

    final int dotIndex = path.lastIndexOf('.');

    if (dotIndex == -1 || dotIndex == path.length - 1) {
      return '';
    }

    return path.substring(dotIndex + 1);
  }

  String _escapeHtmlAttribute(String value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
  }

  bool _htmlContainsImageUrl(String html, String imageUrl) {
    if (html.trim().isEmpty || imageUrl.isEmpty) {
      return false;
    }

    final RegExp imageTagPattern = RegExp(
      r"""<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']""",
      caseSensitive: false,
    );

    for (final match in imageTagPattern.allMatches(html)) {
      final String source = match.group(1)?.trim() ?? '';
      if (_resolveMediaUrl(source) == imageUrl) {
        return true;
      }
    }

    return false;
  }

  // Menampilkan media tambahan yang disimpan di kolom questions.
  // image_question = gambar, sedangkan media_url dapat berupa
  // gambar, video, atau audio dari Creator Web.
  Widget _buildQuestionMedia(Map<String, dynamic> question) {
    final String questionHtml =
        question['question']?.toString() ?? '';

    final String imageUrl = _resolveMediaUrl(
      question['imageQuestion']?.toString() ?? '',
    );

    final String mediaUrl = _resolveMediaUrl(
      question['mediaUrl']?.toString() ?? '',
    );

    final List<Widget> mediaWidgets = [];

    if (imageUrl.isNotEmpty &&
        !_htmlContainsImageUrl(questionHtml, imageUrl)) {
      mediaWidgets.add(
        _ZoomableQuestionImage(
          imageUrl: imageUrl,
        ),
      );
    }

    if (mediaUrl.isNotEmpty && mediaUrl != imageUrl) {
      final String url = _escapeHtmlAttribute(mediaUrl);
      final String extension = _mediaExtension(mediaUrl);

      if ({
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif',
      }.contains(extension)) {
        if (!_htmlContainsImageUrl(questionHtml, mediaUrl)) {
          mediaWidgets.add(
            _ZoomableQuestionImage(
              imageUrl: mediaUrl,
            ),
          );
        }
      } else if ({
        'mp4',
        'webm',
        'mov',
        'mkv',
        'avi',
      }.contains(extension)) {
        mediaWidgets.add(
          HtmlWidget(
            '<video controls src="$url" style="width:100%;"></video>',
            renderMode: RenderMode.column,
          ),
        );
      } else if ({
        'mp3',
        'wav',
        'm4a',
        'aac',
        'ogg',
        'flac',
      }.contains(extension)) {
        mediaWidgets.add(
          HtmlWidget(
            '<audio controls src="$url"></audio>',
            renderMode: RenderMode.column,
          ),
        );
      }
    }

    if (mediaWidgets.isEmpty) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: mediaWidgets
            .map(
              (widget) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: widget,
              ),
            )
            .toList(),
      ),
    );
  }

  @override
  Widget build(
    BuildContext context,
  ) {
    final colors =
        Theme.of(context).colorScheme;

    return PopScope(
      canPop: false,
      child: Scaffold(
        // Background halaman ujian.
        backgroundColor:
            Theme.of(context)
                .scaffoldBackgroundColor,

        // AppBar ujian.
        appBar: AppBar(
          automaticallyImplyLeading:
              false,
          backgroundColor:
              colors.surface,
          surfaceTintColor:
              Colors.transparent,
          elevation: 0,
          centerTitle: true,
          title: Text(
            isLoading
                ? 'Memuat Soal...'
                : formTitle,
            style:
                TextStyle(fontFamily: 'FunnelDisplay',

              color:
                  colors.onSurface,
              fontWeight:
                  FontWeight.w600,
            ),
          ),
          actions: [
            // Tombol daftar soal.
            if (!isLoading &&
                questions.isNotEmpty)
              IconButton(
                onPressed:
                    showQuestionList,
                icon: Icon(
                  Icons
                      .grid_view_rounded,
                  color:
                      colors.onSurface,
                ),
              ),

            const SizedBox(
              width: 8,
            ),
          ],
        ),

        // Menentukan tampilan berdasarkan status.
        body: isLoading
            ? buildLoading()
            : errorMessage != null
                ? buildError()
                : buildExam(),
      ),
    );
  }

  // Membuat tampilan utama pengerjaan ujian.
  Widget buildExam() {
    final colors =
        Theme.of(context).colorScheme;

    if (questions.isEmpty ||
        currentQuestion >=
            questions.length) {
      return buildError();
    }

    final question =
        questions[currentQuestion];

    final List<
            Map<String, dynamic>>
        options =
        List<Map<String, dynamic>>.from(
      question['options'] ?? [],
    );

    return SafeArea(
      child: Padding(
        padding:
            const EdgeInsets.all(20),
        child: Column(
          children: [
            // Nomor soal dan timer tetap di atas.
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets
                          .symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  decoration:
                      BoxDecoration(
                    color:
                        colors.surface,
                    borderRadius:
                        BorderRadius.circular(
                      15,
                    ),
                  ),
                  child: Text(
                    'Soal ${currentQuestion + 1}',
                    style:
                        TextStyle(fontFamily: 'FunnelDisplay',

                      fontWeight:
                          FontWeight.bold,
                    ),
                  ),
                ),

                const Spacer(),

                if (hasTimeLimit)
                  Container(
                    padding:
                        const EdgeInsets
                            .symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    decoration:
                        BoxDecoration(
                      color:
                          colors.errorContainer,
                      borderRadius:
                          BorderRadius.circular(
                        15,
                      ),
                    ),
                    child: Text(
                      timerText,
                      style:
                          TextStyle(fontFamily: 'FunnelDisplay',

                        color:
                            colors.error,
                        fontWeight:
                            FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),

            const SizedBox(
              height: 10,
            ),

            Align(
              alignment: Alignment.centerRight,
              child: Wrap(
                alignment: WrapAlignment.end,
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildDeviceStatusChip(
                    icon: _batteryLevel != null &&
                            _batteryLevel! <= 20
                        ? Icons.battery_alert_rounded
                        : Icons.battery_full_rounded,
                    label: _batteryLevel == null
                        ? '--'
                        : '${_batteryLevel!}%',
                    color: _batteryLevel != null &&
                            _batteryLevel! <= 20
                        ? colors.error
                        : colors.primary,
                  ),
                  _buildDeviceStatusChip(
                    icon: _connectionIcon,
                    label: _connectionLabel,
                    color: _connectionLabel == 'Offline'
                        ? colors.error
                        : colors.primary,
                  ),
                ],
              ),
            ),

            const SizedBox(
              height: 20,
            ),

            // Progress ujian tetap di atas.
            ClipRRect(
              borderRadius:
                  BorderRadius.circular(
                20,
              ),
              child:
                  LinearProgressIndicator(
                value:
                    (currentQuestion +
                            1) /
                        questions.length,
                minHeight: 10,
                backgroundColor:
                    colors
                        .surfaceContainerHighest,
                valueColor:
                    AlwaysStoppedAnimation<
                        Color>(
                  colors.primary,
                ),
              ),
            ),

            const SizedBox(
              height: 10,
            ),

            // Nomor progress tetap di atas.
            Align(
              alignment:
                  Alignment.centerRight,
              child: Text(
                '${currentQuestion + 1}/'
                '${questions.length}',
                style:
                    TextStyle(fontFamily: 'FunnelDisplay',

                  fontWeight:
                      FontWeight.w500,
                ),
              ),
            ),

            const SizedBox(
              height: 20,
            ),

            // Bagian soal dan jawaban dapat di-scroll bersama.
            Expanded(
              child: SingleChildScrollView(
                padding:
                    const EdgeInsets.only(
                  bottom: 10,
                ),
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.stretch,
                  children: [
                    // Pertanyaan.
                    Container(
                      width:
                          double.infinity,
                      padding:
                          const EdgeInsets.all(
                        22,
                      ),
                      decoration:
                          BoxDecoration(
                        color:
                            colors.surface,
                        borderRadius:
                            BorderRadius.circular(
                          20,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color:
                                colors.shadow
                                    .withAlpha(
                              38,
                            ),
                            blurRadius: 10,
                            offset:
                                const Offset(
                              0,
                              4,
                            ),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment:
                            CrossAxisAlignment.stretch,
                        children: [
                          _buildHtmlContent(
                            question['question']
                                ?.toString() ??
                                '',
                            fontSize: 19,
                            fontWeight:
                                FontWeight.bold,
                            color: colors.onSurface,
                          ),
                          _buildQuestionMedia(question),
                        ],
                      ),
                    ),

                    const SizedBox(
                      height: 12,
                    ),

                    // Tombol ragu-ragu berlaku untuk semua tipe soal.
                    Align(
                      alignment:
                          Alignment.centerRight,
                      child: OutlinedButton.icon(
                        onPressed:
                            isSubmitting
                                ? null
                                : _toggleDoubtful,
                        icon: Icon(
                          _isCurrentQuestionDoubtful()
                              ? Icons.flag_rounded
                              : Icons
                                  .outlined_flag_rounded,
                          size: 19,
                        ),
                        label: Text(
                          _isCurrentQuestionDoubtful()
                              ? 'Ragu-ragu'
                              : 'Tandai Ragu-ragu',
                        ),
                        style:
                            OutlinedButton.styleFrom(
                          foregroundColor:
                              _isCurrentQuestionDoubtful()
                                  ? const Color(
                                      0xFF7A5600,
                                    )
                                  : colors
                                      .onSurfaceVariant,
                          backgroundColor:
                              _isCurrentQuestionDoubtful()
                                  ? const Color(
                                      0xFFFFC107,
                                    ).withAlpha(45)
                                  : colors.surface,
                          side: BorderSide(
                            color:
                                _isCurrentQuestionDoubtful()
                                    ? const Color(
                                        0xFFFFB300,
                                      )
                                    : colors.outlineVariant,
                            width: 1.2,
                          ),
                          padding:
                              const EdgeInsets
                                  .symmetric(
                            horizontal: 16,
                            vertical: 11,
                          ),
                          shape:
                              RoundedRectangleBorder(
                            borderRadius:
                                BorderRadius.circular(
                              14,
                            ),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(
                      height: 18,
                    ),

                    // Input jawaban atau pilihan.
                    if (_isEssay(question))
                      TextField(
                        controller:
                            essayControllers[
                                currentQuestion],
                        enabled:
                            !isSubmitting,
                        maxLines: 8,
                        minLines: 6,
                        keyboardType:
                            TextInputType.multiline,
                        onChanged: (_) {
                          setState(
                            () {},
                          );
                          _saveDraft();
                        },
                        decoration:
                            InputDecoration(
                          hintText:
                              'Tulis jawaban kamu di sini...',
                          filled: true,
                          fillColor:
                              colors.surface,
                          border:
                              OutlineInputBorder(
                            borderRadius:
                                BorderRadius.circular(
                              18,
                            ),
                          ),
                          focusedBorder:
                              OutlineInputBorder(
                            borderRadius:
                                BorderRadius.circular(
                              18,
                            ),
                            borderSide:
                                BorderSide(
                              color:
                                  colors.primary,
                            ),
                          ),
                        ),
                        style:
                            TextStyle(fontFamily: 'FunnelDisplay',

                          fontSize: 14,
                          height: 1.5,
                        ),
                      )
                    else if (options.isEmpty)
                      Center(
                        child: Text(
                          'Pilihan jawaban '
                          'belum tersedia.',
                          style:
                              TextStyle(fontFamily: 'FunnelDisplay',
),
                        ),
                      )
                    else
                      Column(
                        children:
                            List.generate(
                          options.length,
                          (index) {
                            final bool isSelected =
                                _isMultiple(
                                  question,
                                )
                                    ? selectedMultipleAnswers[
                                            currentQuestion]
                                        .contains(
                                        index,
                                      )
                                    : selectedAnswers[
                                            currentQuestion] ==
                                        index;

                            return AnimatedContainer(
                              duration:
                                  const Duration(
                                milliseconds:
                                    250,
                              ),
                              margin:
                                  const EdgeInsets.only(
                                bottom: 15,
                              ),
                              child: InkWell(
                                borderRadius:
                                    BorderRadius.circular(
                                  18,
                                ),
                                onTap:
                                    isSubmitting
                                        ? null
                                        : () {
                                            setState(
                                              () {
                                                if (_isMultiple(
                                                  question,
                                                )) {
                                                  final selectedSet =
                                                      selectedMultipleAnswers[
                                                          currentQuestion];

                                                  if (selectedSet.contains(
                                                    index,
                                                  )) {
                                                    selectedSet.remove(
                                                      index,
                                                    );
                                                  } else {
                                                    selectedSet.add(
                                                      index,
                                                    );
                                                  }
                                                } else {
                                                  selectedAnswers[
                                                          currentQuestion] =
                                                      index;
                                                }
                                              },
                                            );

                                            _saveDraft();
                                          },
                                child: Container(
                                  padding:
                                      const EdgeInsets.all(
                                    18,
                                  ),
                                  decoration:
                                      BoxDecoration(
                                    color: isSelected
                                        ? colors.primary
                                        : colors.surface,
                                    borderRadius:
                                        BorderRadius.circular(
                                      18,
                                    ),
                                    border: Border.all(
                                      color: isSelected
                                          ? colors.primary
                                          : colors.outlineVariant,
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: colors.shadow
                                            .withAlpha(
                                          13,
                                        ),
                                        blurRadius: 8,
                                        offset:
                                            const Offset(
                                          0,
                                          4,
                                        ),
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    children: [
                                      // Checkbox untuk multiple choice.
                                      if (_isMultiple(
                                        question,
                                      ))
                                        Container(
                                          width: 32,
                                          height: 32,
                                          decoration:
                                              BoxDecoration(
                                            color: isSelected
                                                ? colors.onPrimary
                                                : colors.surfaceContainerHighest,
                                            borderRadius:
                                                BorderRadius.circular(
                                              9,
                                            ),
                                          ),
                                          child: Icon(
                                            isSelected
                                                ? Icons.check_box
                                                : Icons.check_box_outline_blank,
                                            color: isSelected
                                                ? _selectedAnswerText
                                                : colors.onSurfaceVariant,
                                            size: 20,
                                          ),
                                        )
                                      else
                                        // Huruf pilihan untuk single choice.
                                        CircleAvatar(
                                          radius: 16,
                                          backgroundColor:
                                              isSelected
                                                  ? Colors.white
                                                  : Colors.grey.shade200,
                                          child: Text(
                                            String.fromCharCode(
                                              65 + index,
                                            ),
                                            style:
                                                TextStyle(fontFamily: 'FunnelDisplay',

                                              fontWeight:
                                                  FontWeight.bold,
                                              color:
                                                  const Color(
                                                0xff343A40,
                                              ),
                                            ),
                                          ),
                                        ),

                                      const SizedBox(
                                        width: 15,
                                      ),

                                      // Teks pilihan jawaban.
                                      Expanded(
                                        child: _buildHtmlContent(
                                          options[index]['text']
                                              ?.toString() ??
                                              '',
                                          fontSize: 15,
                                          fontWeight:
                                              FontWeight.w500,
                                          color: isSelected
                                              ? colors.onPrimary
                                              : colors.onSurface,
                                        ),
                                      ),

                                      // Icon ketika jawaban terpilih.
                                      if (isSelected)
                                        Icon(
                                          Icons.check_circle,
                                          color:
                                              _selectedAnswerText,
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                  ],
                ),
              ),
            ),

            const SizedBox(
              height: 20,
            ),

            // Tombol navigasi soal tetap di bawah.
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 55,
                    child:
                        OutlinedButton(
                      onPressed:
                          isSubmitting ||
                                  currentQuestion ==
                                      0
                              ? null
                              : () {
                                  setState(
                                    () {
                                      currentQuestion--;
                                    },
                                  );

                                  _saveDraft();
                                },
                      style:
                          OutlinedButton.styleFrom(
                        side: BorderSide(
                          color:
                              colors.primary,
                        ),
                        shape:
                            RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(
                            16,
                          ),
                        ),
                      ),
                      child: Text(
                        'Kembali',
                        style:
                            TextStyle(fontFamily: 'FunnelDisplay',

                          color:
                              colors.primary,
                          fontWeight:
                              FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(
                  width: 12,
                ),

                Expanded(
                  child: SizedBox(
                    height: 55,
                    child:
                        ElevatedButton(
                      onPressed:
                          isSubmitting
                              ? null
                              : () {
                                  if (!_validateCurrent()) {
                                    return;
                                  }

                                  if (currentQuestion <
                                      questions.length -
                                          1) {
                                    setState(
                                      () {
                                        currentQuestion++;
                                      },
                                    );

                                    _saveDraft();
                                  } else {
                                    confirmSubmit();
                                  }
                                },
                      style:
                          ElevatedButton.styleFrom(
                        backgroundColor:
                            colors.primary,
                        foregroundColor:
                            colors.onPrimary,
                        disabledBackgroundColor:
                            colors
                                .surfaceContainerHighest,
                        elevation: 0,
                        shape:
                            RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(
                            16,
                          ),
                        ),
                      ),
                      child:
                          isSubmitting
                              ? SizedBox(
                                  width: 22,
                                  height: 22,
                                  child:
                                      CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color:
                                        colors.onPrimary,
                                  ),
                                )
                              : Text(
                                  currentQuestion ==
                                          questions.length -
                                              1
                                      ? 'Submit'
                                      : 'Selanjutnya',
                                  style:
                                      TextStyle(fontFamily: 'FunnelDisplay',

                                    fontWeight:
                                        FontWeight.bold,
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
    );
  }
}

class _QuestionCodeBlock extends StatelessWidget {
  final String code;

  const _QuestionCodeBlock({
    required this.code,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(12),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Text(
          code,
          softWrap: false,
          style: const TextStyle(
            fontFamily: 'monospace',
            fontSize: 13.5,
            height: 1.45,
            color: Color(0xFFF1F1F1),
          ),
        ),
      ),
    );
  }
}

class _QuestionMath extends StatelessWidget {
  final String expression;
  final bool displayMath;
  final double fontSize;
  final Color color;

  const _QuestionMath({
    required this.expression,
    required this.displayMath,
    required this.fontSize,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final String cleanExpression = expression.trim();

    if (cleanExpression.isEmpty) {
      return const SizedBox.shrink();
    }

    try {
      return Padding(
        padding: EdgeInsets.symmetric(
          vertical: displayMath ? 8 : 2,
        ),
        child: Math.tex(
          cleanExpression,
          mathStyle: displayMath
              ? MathStyle.display
              : MathStyle.text,
          textStyle: TextStyle(
            fontSize: fontSize,
            color: color,
          ),
        ),
      );
    } catch (_) {
      return Padding(
        padding: EdgeInsets.symmetric(
          vertical: displayMath ? 8 : 2,
        ),
        child: Text(
          cleanExpression,
          style: TextStyle(
            fontFamily: 'FunnelDisplay',
            fontSize: fontSize,
            color: color,
          ),
        ),
      );
    }
  }
}

class _ZoomableQuestionImage extends StatefulWidget {
  final String imageUrl;

  const _ZoomableQuestionImage({
    required this.imageUrl,
  });

  @override
  State<_ZoomableQuestionImage> createState() =>
      _ZoomableQuestionImageState();
}

class _ZoomableQuestionImageState
    extends State<_ZoomableQuestionImage> {
  final TransformationController _transformationController =
      TransformationController();

  double _scale = 1.0;

  @override
  void initState() {
    super.initState();
    _transformationController.addListener(_handleTransformationChanged);
  }

  @override
  void didUpdateWidget(
    covariant _ZoomableQuestionImage oldWidget,
  ) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.imageUrl != widget.imageUrl) {
      _setScale(1.0);
    }
  }

  void _handleTransformationChanged() {
    final double nextScale =
        _transformationController.value.getMaxScaleOnAxis();

    if ((nextScale - _scale).abs() < 0.001 || !mounted) {
      return;
    }

    setState(() {
      _scale = nextScale.clamp(1.0, 3.0).toDouble();
    });
  }

  void _setScale(double value) {
    final double nextScale = value.clamp(1.0, 3.0).toDouble();

    _transformationController.value =
        Matrix4.diagonal3Values(nextScale, nextScale, 1.0);

    if (mounted) {
      setState(() {
        _scale = nextScale;
      });
    }
  }

  void _zoomIn() {
    _setScale(_scale + 0.5);
  }

  void _zoomOut() {
    _setScale(_scale - 0.5);
  }

  @override
  void dispose() {
    _transformationController.removeListener(
      _handleTransformationChanged,
    );
    _transformationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            IconButton(
              onPressed: _scale <= 1.0 ? null : _zoomOut,
              icon: const Icon(Icons.zoom_out_rounded),
              tooltip: 'Zoom out',
              visualDensity: VisualDensity.compact,
              color: colors.onSurface,
            ),
            Text(
              '${_scale.toStringAsFixed(1)}x',
              style: TextStyle(
                fontFamily: 'FunnelDisplay',
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: colors.onSurfaceVariant,
              ),
            ),
            IconButton(
              onPressed: _scale >= 3.0 ? null : _zoomIn,
              icon: const Icon(Icons.zoom_in_rounded),
              tooltip: 'Zoom in',
              visualDensity: VisualDensity.compact,
              color: colors.onSurface,
            ),
          ],
        ),
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxHeight: 320,
            ),
            child: InteractiveViewer(
              transformationController:
                  _transformationController,
              minScale: 1.0,
              maxScale: 3.0,
              scaleEnabled: false,
              panEnabled: true,
              constrained: true,
              alignment: Alignment.center,
              boundaryMargin: EdgeInsets.zero,
              clipBehavior: Clip.hardEdge,
              child: Image.network(
                widget.imageUrl,
                width: double.infinity,
                fit: BoxFit.contain,
                errorBuilder: (_, _, _) =>
                    const SizedBox.shrink(),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

