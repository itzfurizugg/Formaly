import 'package:supabase_flutter/supabase_flutter.dart';

class ExamService {
  // Client untuk mengakses database Supabase.
  static final SupabaseClient _supabase =
      Supabase.instance.client;

  // Mengambil data form berdasarkan token.
  static Future<Map<String, dynamic>?> getFormByToken(
    String tokenCode,
  ) async {
    try {
      final tokenResponse = await _supabase
          .from('tokens')
          .select('''
            id,
            token_code,
            form_id,
            is_active,
            expires_at,
            forms (
              id,
              creator_id,
              title,
              description,
              exam_mode,
              passing_score,
              status,
              duration,
              created_at,
              updated_at
            )
          ''')
          .eq('token_code', tokenCode)
          .maybeSingle();

      if (tokenResponse == null) {
        return null;
      }

      final bool isActive =
          tokenResponse['is_active'] == true;

      if (!isActive) {
        return null;
      }

      final dynamic expiresAt =
          tokenResponse['expires_at'];

      if (expiresAt != null) {
        final DateTime? expirationDate =
            DateTime.tryParse(
          expiresAt.toString(),
        );

        if (expirationDate != null &&
            expirationDate.isBefore(
              DateTime.now(),
            )) {
          return null;
        }
      }

      final dynamic formData =
          tokenResponse['forms'];

      if (formData == null) {
        return null;
      }

      final Map<String, dynamic> form =
          Map<String, dynamic>.from(
        formData as Map,
      );

      return {
        'token_id': tokenResponse['id'],
        'token_code': tokenResponse['token_code'],
        'form': form,
      };
    } catch (e) {
      throw Exception(
        'Gagal mengambil data form berdasarkan token: $e',
      );
    }
  }

  // Mengambil semua form dari Supabase.
  static Future<List<Map<String, dynamic>>>
      getForms() async {
    try {
      final response = await _supabase
          .from('forms')
          .select('''
            id,
            creator_id,
            title,
            description,
            exam_mode,
            passing_score,
            status,
            duration,
            created_at,
            updated_at
          ''')
          .order(
            'created_at',
            ascending: false,
          );

      return List<Map<String, dynamic>>.from(
        response,
      );
    } catch (e) {
      throw Exception(
        'Gagal mengambil daftar form: $e',
      );
    }
  }

  // Mengambil satu form berdasarkan ID.
  static Future<Map<String, dynamic>?>
      getFormById(
    String formId,
  ) async {
    try {
      final response = await _supabase
          .from('forms')
          .select('''
            id,
            creator_id,
            title,
            description,
            exam_mode,
            passing_score,
            status,
            duration,
            created_at,
            updated_at
          ''')
          .eq('id', formId)
          .maybeSingle();

      return response;
    } catch (e) {
      throw Exception(
        'Gagal mengambil form: $e',
      );
    }
  }

  // Mengambil soal beserta pilihan jawabannya.
  static Future<List<Map<String, dynamic>>>
      getQuestions(
    String formId,
  ) async {
    try {
      final questionResponse = await _supabase
          .from('questions')
          .select('''
            id,
            form_id,
            question_text,
            question_type,
            score_value,
            order_index,
            image_question,
            is_required
          ''')
          .eq('form_id', formId)
          .order(
            'order_index',
            ascending: true,
          );

      final List<Map<String, dynamic>> questions =
          List<Map<String, dynamic>>.from(
        questionResponse,
      );

      if (questions.isEmpty) {
        return [];
      }

      final List<Map<String, dynamic>> result = [];

      for (final question in questions) {
        final String questionId =
            question['id'].toString();

        final optionResponse = await _supabase
            .from('question_options')
            .select('''
              id,
              question_id,
              option_text,
              is_correct,
              order_index
            ''')
            .eq('question_id', questionId)
            .order(
              'order_index',
              ascending: true,
            );

        final List<Map<String, dynamic>> options =
            List<Map<String, dynamic>>.from(
          optionResponse,
        );

        result.add({
          'id': question['id'],
          'form_id': question['form_id'],
          'question': question['question_text'],
          'question_text': question['question_text'],
          'question_type': question['question_type'],
          'score_value': question['score_value'],
          'order_index': question['order_index'],
          'image_question': question['image_question'],
          'is_required': question['is_required'],
          'options': options,
        });
      }

      return result;
    } catch (e) {
      throw Exception(
        'Gagal mengambil soal: $e',
      );
    }
  }

  // Mengambil data ujian lengkap berdasarkan token.
  static Future<Map<String, dynamic>?>
      getExamByToken(
    String tokenCode,
  ) async {
    try {
      final tokenData =
          await getFormByToken(tokenCode);

      if (tokenData == null) {
        return null;
      }

      final Map<String, dynamic> form =
          Map<String, dynamic>.from(
        tokenData['form'],
      );

      final String formId =
          form['id'].toString();

      final List<Map<String, dynamic>> questions =
          await getQuestions(formId);

      return {
        'token_id': tokenData['token_id'],
        'token_code': tokenData['token_code'],
        'form': form,
        'questions': questions,
      };
    } catch (e) {
      throw Exception(
        'Gagal mengambil data ujian: $e',
      );
    }
  }

  // Mencari index jawaban yang benar.
  static int getCorrectAnswerIndex(
    List<Map<String, dynamic>> options,
  ) {
    for (int i = 0; i < options.length; i++) {
      if (options[i]['is_correct'] == true) {
        return i;
      }
    }

    return -1;
  }

  // Mengambil ID option berdasarkan index.
  static String? getOptionIdByIndex(
    List<Map<String, dynamic>> options,
    int index,
  ) {
    if (index < 0 || index >= options.length) {
      return null;
    }

    final dynamic id = options[index]['id'];

    if (id == null) {
      return null;
    }

    return id.toString();
  }

  // Menghitung nilai ujian.
  static int calculateScore({
    required int correctAnswer,
    required int totalQuestion,
  }) {
    if (totalQuestion <= 0) {
      return 0;
    }

    return (
      (correctAnswer / totalQuestion) * 100
    ).round();
  }
}