import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class ExamSessionService {
  static const _runningKey = "exam_running";
  static const _startTimeKey = "exam_start_time";
  static const _currentQuestionKey = "current_question";
  static const _answersKey = "answers";

  /// Mulai ujian
  static Future<void> startExam() async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setBool(_runningKey, true);

    await prefs.setInt(
      _startTimeKey,
      DateTime.now().millisecondsSinceEpoch,
    );
  }

  /// Apakah masih ada ujian berjalan?
  static Future<bool> isExamRunning() async {
    final prefs = await SharedPreferences.getInstance();

    return prefs.getBool(_runningKey) ?? false;
  }

  /// Simpan nomor soal
  static Future<void> saveQuestion(int number) async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setInt(
      _currentQuestionKey,
      number,
    );
  }

  /// Ambil nomor soal
  static Future<int> getQuestion() async {
    final prefs = await SharedPreferences.getInstance();

    return prefs.getInt(_currentQuestionKey) ?? 0;
  }

  /// Simpan jawaban
  static Future<void> saveAnswers(
      List<int?> answers) async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(
      _answersKey,
      jsonEncode(answers),
    );
  }

  /// Ambil jawaban
  static Future<List<int?>> getAnswers(
      int totalQuestion) async {
    final prefs = await SharedPreferences.getInstance();

    final json = prefs.getString(_answersKey);

    if (json == null) {
      return List<int?>.filled(
        totalQuestion,
        null,
      );
    }

    final List list = jsonDecode(json);

    return list
        .map<int?>((e) => e == null ? null : e as int)
        .toList();
  }

  /// Ambil waktu mulai ujian
  static Future<DateTime?> getStartTime() async {
    final prefs = await SharedPreferences.getInstance();

    final value = prefs.getInt(_startTimeKey);

    if (value == null) return null;

    return DateTime.fromMillisecondsSinceEpoch(value);
  }

  /// Hapus session
  static Future<void> finishExam() async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.remove(_runningKey);

    await prefs.remove(_startTimeKey);

    await prefs.remove(_currentQuestionKey);

    await prefs.remove(_answersKey);
  }
}