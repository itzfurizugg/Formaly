import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/history_model.dart';

class HistoryService {
  static final SupabaseClient _supabase =
      Supabase.instance.client;

  static final List<HistoryModel> historyList = [];

  static const String _storagePrefix = 'formaly_history_';
  static const String _deletedStoragePrefix =
      'formaly_deleted_history_';

  static String _storageKey(String userId) {
    return '$_storagePrefix$userId';
  }

  static String _deletedStorageKey(String userId) {
    return '$_deletedStoragePrefix$userId';
  }

  // ============================================================
  // TAMBAH RIWAYAT
  // ============================================================

  static Future<void> addHistory(
    HistoryModel history, {
    String? formId,
    String? tokenId,
  }) async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      throw Exception(
        'User belum login. Silakan login terlebih dahulu.',
      );
    }

    final existingIndex = historyList.indexWhere(
      (item) => item.submissionId == history.submissionId,
    );

    if (existingIndex >= 0) {
      historyList[existingIndex] = history;
    } else {
      historyList.insert(0, history);
    }

    await _saveLocal(user.id, historyList);
  }

  // ============================================================
  // AMBIL RIWAYAT
  // ============================================================

  static Future<List<HistoryModel>> getHistory() async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      historyList.clear();
      return [];
    }

    // Daftar history yang sudah dihapus disimpan di perangkat.
    final deletedIds = await _loadDeletedIds(user.id);

    // Cache lokal tetap difilter agar history yang sudah dihapus
    // tidak muncul kembali.
    final cached = await _loadLocal(user.id);

    final visibleCached = cached.where(
      (item) =>
          item.submissionId == null ||
          !deletedIds.contains(
            item.submissionId!.trim(),
          ),
    );

    historyList
      ..clear()
      ..addAll(visibleCached);

    try {
      final result = await _loadFromSupabase(user.id);

      // Data dari Supabase juga selalu difilter.
      final visibleResult = result.where(
        (item) =>
            item.submissionId == null ||
            !deletedIds.contains(
              item.submissionId!.trim(),
            ),
      ).toList();

      historyList
        ..clear()
        ..addAll(visibleResult);

      await _saveLocal(
        user.id,
        visibleResult,
      );

      return visibleResult;
    } catch (_) {
      // Jika query Supabase gagal, cache lokal tetap dipakai.
      return List<HistoryModel>.from(historyList);
    }
  }

  // ============================================================
  // HAPUS SATU HISTORY
  // ============================================================

  // Hanya Flutter/local.
  // Data di Supabase tidak diubah.
  // ID yang dihapus disimpan permanen di SharedPreferences
  // selama data aplikasi di perangkat tidak dihapus.
  static Future<void> deleteHistory(
    String submissionId,
  ) async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      throw Exception(
        'User belum login. Silakan login terlebih dahulu.',
      );
    }

    final String cleanSubmissionId =
        submissionId.trim();

    if (cleanSubmissionId.isEmpty) {
      throw Exception(
        'ID history tidak valid.',
      );
    }

    // Simpan ID sebagai history yang sudah dihapus.
    // Data ini tetap ada walaupun user logout lalu login kembali.
    final deletedIds =
        await _loadDeletedIds(user.id);

    deletedIds.add(cleanSubmissionId);

    await _saveDeletedIds(
      user.id,
      deletedIds,
    );

    // Hapus langsung dari daftar yang sedang tampil.
    historyList.removeWhere(
      (item) =>
          item.submissionId?.trim() ==
          cleanSubmissionId,
    );

    // Bersihkan cache lokal juga.
    await _saveLocal(
      user.id,
      historyList,
    );
  }

  // ============================================================
  // HAPUS CACHE HISTORY
  // ============================================================

  static Future<void> clearHistory() async {
    final user = _supabase.auth.currentUser;

    historyList.clear();

    if (user == null) {
      return;
    }

    try {
      final prefs =
          await SharedPreferences.getInstance();

      await prefs.remove(
        _storageKey(user.id),
      );
    } catch (_) {
      // Cache gagal dihapus tidak boleh membuat aplikasi crash.
    }
  }

  // ============================================================
  // LOAD DARI SUPABASE
  // ============================================================

  static Future<List<HistoryModel>> _loadFromSupabase(
    String userId,
  ) async {
    final response = await _supabase
        .from('submissions')
        .select(
          'id, form_id, total_score, status, started_at, submitted_at',
        )
        .eq('user_id', userId)
        .order(
          'started_at',
          ascending: false,
        );

    final submissions =
        List<Map<String, dynamic>>.from(
      response,
    );

    if (submissions.isEmpty) {
      return [];
    }

    // ----------------------------------------------------------
    // FORMS
    // ----------------------------------------------------------

    final formIds = submissions
        .map(
          (row) =>
              row['form_id']?.toString().trim() ?? '',
        )
        .where(
          (id) => id.isNotEmpty,
        )
        .toSet()
        .toList();

    final Map<String, Map<String, dynamic>>
        formsById = {};

    if (formIds.isNotEmpty) {
      final formsResponse = await _supabase
          .from('forms')
          .select('id, title')
          .inFilter(
            'id',
            formIds,
          );

      for (final row in formsResponse) {
        final map =
            Map<String, dynamic>.from(row);

        final id =
            map['id']?.toString().trim() ?? '';

        if (id.isNotEmpty) {
          formsById[id] = map;
        }
      }
    }

    // ----------------------------------------------------------
    // TAG
    // ----------------------------------------------------------

    final Map<String, String>
        firstTagByForm = {};

    if (formIds.isNotEmpty) {
      final formTagResponse = await _supabase
          .from('form_tags')
          .select('form_id, tag_id')
          .inFilter(
            'form_id',
            formIds,
          );

      final formTags =
          List<Map<String, dynamic>>.from(
        formTagResponse,
      );

      final tagIds = formTags
          .map(
            (row) =>
                row['tag_id']?.toString().trim() ?? '',
          )
          .where(
            (id) => id.isNotEmpty,
          )
          .toSet()
          .toList();

      final Map<String, String> tagNames = {};

      if (tagIds.isNotEmpty) {
        final tagsResponse = await _supabase
            .from('tags')
            .select('id, name')
            .inFilter(
              'id',
              tagIds,
            );

        for (final row in tagsResponse) {
          final id =
              row['id']?.toString().trim() ?? '';

          final name =
              row['name']?.toString().trim() ?? '';

          if (id.isNotEmpty && name.isNotEmpty) {
            tagNames[id] = name;
          }
        }
      }

      for (final row in formTags) {
        final formId =
            row['form_id']?.toString().trim() ?? '';

        final tagId =
            row['tag_id']?.toString().trim() ?? '';

        final tagName =
            tagNames[tagId] ?? '';

        if (formId.isEmpty || tagName.isEmpty) {
          continue;
        }

        firstTagByForm.putIfAbsent(
          formId,
          () => tagName,
        );
      }
    }

    // ----------------------------------------------------------
    // JUMLAH SOAL
    // ----------------------------------------------------------

    final Map<String, int>
        questionCountByForm = {};

    if (formIds.isNotEmpty) {
      final questionResponse = await _supabase
          .from('questions')
          .select('id, form_id')
          .inFilter(
            'form_id',
            formIds,
          );

      for (final row in questionResponse) {
        final formId =
            row['form_id']?.toString().trim() ?? '';

        if (formId.isEmpty) {
          continue;
        }

        questionCountByForm[formId] =
            (questionCountByForm[formId] ?? 0) + 1;
      }
    }

    // ----------------------------------------------------------
    // BUILD HISTORY
    // ----------------------------------------------------------

    final List<HistoryModel> result = [];

    for (final row in submissions) {
      final String submissionId =
          row['id']?.toString().trim() ?? '';

      final String formId =
          row['form_id']?.toString().trim() ?? '';

      if (submissionId.isEmpty ||
          formId.isEmpty) {
        continue;
      }

      final form = formsById[formId];

      final rawTitle =
          form?['title']?.toString().trim() ?? '';

      final title =
          rawTitle.isEmpty
              ? 'Form Ujian'
              : rawTitle;

      final DateTime? startedAt = _parseDate(
        row['started_at'],
      );

      final DateTime? submittedAt = _parseDate(
        row['submitted_at'],
      );

      final status =
          row['status']
                  ?.toString()
                  .trim()
                  .toUpperCase() ??
              '';

      final bool isFinished =
          status == 'SUBMITTED' ||
          submittedAt != null;

      result.add(
        HistoryModel(
          submissionId: submissionId,
          title: title,
          token:
              firstTagByForm[formId] ?? '-',
          date: _formatDate(
            submittedAt ?? startedAt,
          ),
          startTime:
              _formatTime(startedAt),
          finishTime:
              _formatTime(submittedAt),
          duration: _formatElapsed(
            startedAt,
            submittedAt,
          ),
          score: _toInt(
            row['total_score'],
          ),
          totalQuestion:
              questionCountByForm[formId] ??
                  0,
          correctAnswer: 0,
          wrongAnswer: 0,
          isFinished: isFinished,
          answers: const [],
        ),
      );
    }

    return result;
  }

  // ============================================================
  // HISTORY YANG DIHAPUS SECARA LOKAL
  // ============================================================

  static Future<Set<String>> _loadDeletedIds(
    String userId,
  ) async {
    try {
      final prefs =
          await SharedPreferences.getInstance();

      final raw = prefs.getString(
        _deletedStorageKey(userId),
      );

      if (raw == null ||
          raw.trim().isEmpty) {
        return <String>{};
      }

      final decoded =
          jsonDecode(raw);

      if (decoded is! List) {
        return <String>{};
      }

      return decoded
          .map(
            (item) =>
                item.toString().trim(),
          )
          .where(
            (id) => id.isNotEmpty,
          )
          .toSet();
    } catch (_) {
      return <String>{};
    }
  }

  static Future<void> _saveDeletedIds(
    String userId,
    Set<String> deletedIds,
  ) async {
    final prefs =
        await SharedPreferences.getInstance();

    await prefs.setString(
      _deletedStorageKey(userId),
      jsonEncode(
        deletedIds.toList(),
      ),
    );
  }

  // ============================================================
  // LOCAL CACHE
  // ============================================================

  static Future<List<HistoryModel>> _loadLocal(
    String userId,
  ) async {
    try {
      final prefs =
          await SharedPreferences.getInstance();

      final raw = prefs.getString(
        _storageKey(userId),
      );

      if (raw == null ||
          raw.trim().isEmpty) {
        return [];
      }

      final decoded =
          jsonDecode(raw);

      if (decoded is! List) {
        return [];
      }

      return decoded
          .whereType<Map>()
          .map(
            (item) =>
                HistoryModel.fromJson(
              Map<String, dynamic>.from(
                item,
              ),
            ),
          )
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> _saveLocal(
    String userId,
    List<HistoryModel> histories,
  ) async {
    try {
      final prefs =
          await SharedPreferences.getInstance();

      final data = histories
          .map(
            (history) =>
                history.toJson(),
          )
          .toList();

      await prefs.setString(
        _storageKey(userId),
        jsonEncode(data),
      );
    } catch (_) {
      // Cache hanya pelengkap.
    }
  }

  // ============================================================
  // FORMAT / HELPER
  // ============================================================

  static DateTime? _parseDate(dynamic value) {
    if (value == null) {
      return null;
    }

    final text =
        value.toString().trim();

    if (text.isEmpty) {
      return null;
    }

    return DateTime.tryParse(text);
  }

  static String _formatDate(
    DateTime? date,
  ) {
    if (date == null) {
      return '-';
    }

    final local =
        date.toLocal();

    return '${_twoDigits(local.day)}/'
        '${_twoDigits(local.month)}/'
        '${local.year}';
  }

  static String _formatTime(
    DateTime? date,
  ) {
    if (date == null) {
      return '-';
    }

    final local =
        date.toLocal();

    return '${_twoDigits(local.hour)}.'
        '${_twoDigits(local.minute)}';
  }

  static String _formatElapsed(
    DateTime? startedAt,
    DateTime? submittedAt,
  ) {
    if (startedAt == null ||
        submittedAt == null) {
      return '-';
    }

    final difference =
        submittedAt.difference(startedAt);

    final int totalSeconds =
        difference.inSeconds < 0
            ? 0
            : difference.inSeconds;

    final int hours =
        totalSeconds ~/ 3600;

    final int minutes =
        (totalSeconds % 3600) ~/ 60;

    final int seconds =
        totalSeconds % 60;

    if (hours > 0) {
      return '$hours Jam $minutes Menit';
    }

    if (minutes > 0) {
      return '$minutes Menit';
    }

    return '$seconds Detik';
  }

  static String _twoDigits(
    int value,
  ) {
    return value
        .toString()
        .padLeft(2, '0');
  }

  static int _toInt(
    dynamic value,
  ) {
    if (value == null) {
      return 0;
    }

    if (value is num) {
      return value.toInt();
    }

    return int.tryParse(
          value.toString(),
        ) ??
        0;
  }
}
