import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class ExamDraft {
  // Data draft ujian.
  final String formId;
  final String? tokenId;
  final DateTime startDateTime;
  final DateTime? deadline;
  final int currentQuestion;
  final List<int?> selectedSingle;
  final List<Set<int>> selectedMultiple;
  final List<String> essays;
  final List<String> questionIds;

  // Status ragu-ragu setiap soal.
  final List<bool> doubtfulQuestions;

  // Constructor untuk mengisi data draft.
  const ExamDraft({
    required this.formId,
    required this.tokenId,
    required this.startDateTime,
    required this.deadline,
    required this.currentQuestion,
    required this.selectedSingle,
    required this.selectedMultiple,
    required this.essays,
    required this.questionIds,
    this.doubtfulQuestions = const [],
  });
}

class ExamDraftService {
  // Prefix untuk menyimpan draft berdasarkan user.
  static const String _prefix = 'formaly_active_exam_';

  // Membuat key penyimpanan berdasarkan user ID.
  static String _key(String userId) => '$_prefix$userId';

  // Menyimpan draft ujian ke local storage.
  static Future<void> saveDraft({
    required String userId,
    required String formId,
    required String? tokenId,
    required DateTime startDateTime,
    required DateTime? deadline,
    required int currentQuestion,
    required List<int?> selectedSingle,
    required List<Set<int>> selectedMultiple,
    required List<String> essays,
    required List<String> questionIds,
    List<bool> doubtfulQuestions = const [],
  }) async {
    final prefs = await SharedPreferences.getInstance();

    final data = <String, dynamic>{
      'formId': formId,
      'tokenId': tokenId,
      'startDateTime': startDateTime.toIso8601String(),
      'deadline': deadline?.toIso8601String(),
      'currentQuestion': currentQuestion,
      'selectedSingle': selectedSingle,
      'selectedMultiple':
          selectedMultiple.map((set) => set.toList()).toList(),
      'essays': essays,
      'questionIds': questionIds,
      'doubtfulQuestions': doubtfulQuestions,
    };

    await prefs.setString(
      _key(userId),
      jsonEncode(data),
    );
  }

  // Mengambil draft untuk form tertentu.
  static Future<ExamDraft?> loadDraft({
    required String userId,
    required String formId,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key(userId));

      if (raw == null || raw.trim().isEmpty) {
        return null;
      }

      final decoded = jsonDecode(raw);

      if (decoded is! Map) {
        return null;
      }

      final data = Map<String, dynamic>.from(decoded);

      final savedFormId =
          data['formId']?.toString().trim() ?? '';

      if (savedFormId != formId.trim()) {
        return null;
      }

      final start = DateTime.tryParse(
        data['startDateTime']?.toString() ?? '',
      );

      if (start == null) {
        return null;
      }

      DateTime? deadline;

      final deadlineRaw =
          data['deadline']?.toString().trim() ?? '';

      if (deadlineRaw.isNotEmpty) {
        deadline = DateTime.tryParse(deadlineRaw);
      }

      final savedSingles =
          data['selectedSingle'] is List
              ? List<dynamic>.from(
                  data['selectedSingle'] as List,
                )
              : <dynamic>[];

      final singles = savedSingles.map<int?>((value) {
        if (value == null) {
          return null;
        }

        return int.tryParse(value.toString());
      }).toList();

      final savedMultiple =
          data['selectedMultiple'] is List
              ? List<dynamic>.from(
                  data['selectedMultiple'] as List,
                )
              : <dynamic>[];

      final multiple = <Set<int>>[];

      for (final value in savedMultiple) {
        if (value is List) {
          multiple.add(
            value
                .map(
                  (item) => int.tryParse(
                    item.toString(),
                  ),
                )
                .whereType<int>()
                .toSet(),
          );
        } else {
          multiple.add(<int>{});
        }
      }

      final essays = data['essays'] is List
          ? List<String>.from(
              (data['essays'] as List).map(
                (value) => value?.toString() ?? '',
              ),
            )
          : <String>[];

      final questionIds = data['questionIds'] is List
          ? List<String>.from(
              (data['questionIds'] as List).map(
                (value) => value?.toString() ?? '',
              ),
            )
          : <String>[];

      // Memulihkan status ragu-ragu.
      final doubtfulQuestions =
          data['doubtfulQuestions'] is List
              ? (data['doubtfulQuestions'] as List)
                  .map((value) => value == true)
                  .toList()
              : <bool>[];

      final savedCurrent =
          int.tryParse(
            data['currentQuestion']?.toString() ?? '0',
          ) ??
          0;

      final safeCurrent =
          savedCurrent < 0 ? 0 : savedCurrent;

      return ExamDraft(
        formId: savedFormId,
        tokenId: data['tokenId']?.toString(),
        startDateTime: start,
        deadline: deadline,
        currentQuestion: safeCurrent,
        selectedSingle: singles,
        selectedMultiple: multiple,
        essays: essays,
        questionIds: questionIds,
        doubtfulQuestions: doubtfulQuestions,
      );
    } catch (_) {
      return null;
    }
  }

  // Mengambil draft ujian yang sedang aktif.
  static Future<ExamDraft?> loadActiveDraft(
    String userId,
  ) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key(userId));

      if (raw == null || raw.trim().isEmpty) {
        return null;
      }

      final decoded = jsonDecode(raw);

      if (decoded is! Map) {
        return null;
      }

      final data = Map<String, dynamic>.from(decoded);

      final formId =
          data['formId']?.toString().trim() ?? '';

      if (formId.isEmpty) {
        return null;
      }

      // Menggunakan parser yang sama dengan loadDraft.
      return loadDraft(
        userId: userId,
        formId: formId,
      );
    } catch (_) {
      return null;
    }
  }

  // Menghapus draft ujian dari local storage.
  static Future<void> clearDraft(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key(userId));
  }
}
