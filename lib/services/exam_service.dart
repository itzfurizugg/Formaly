import 'package:supabase_flutter/supabase_flutter.dart';

class ExamService {
  static final SupabaseClient _supabase =
      Supabase.instance.client;

  // Mencari dan memvalidasi token.
  static Future<Map<String, dynamic>?> getToken(
    String tokenCode,
  ) async {
    final String cleanedToken =
        tokenCode.trim().toUpperCase();

    if (cleanedToken.isEmpty) {
      return null;
    }

    final response = await _supabase
        .from('tokens')
        .select('''
          id,
          form_id,
          token_code,
          max_usage,
          used_count,
          expires_at,
          is_active,
          mode
        ''')
        .eq(
          'token_code',
          cleanedToken,
        )
        .maybeSingle();

    if (response == null) {
      return null;
    }

    final token = Map<String, dynamic>.from(response);

    // Cek apakah token masih aktif.
    final bool isActive = token['is_active'] == true;

    if (!isActive) {
      return null;
    }

    // Cek tanggal kedaluwarsa token.
    final dynamic expiresAt = token['expires_at'];

    if (expiresAt != null) {
      final DateTime? expiration =
          DateTime.tryParse(
        expiresAt.toString(),
      );

      if (expiration != null &&
          expiration.isBefore(
            DateTime.now(),
          )) {
        return null;
      }
    }

    // Cek batas penggunaan token.
    final dynamic maxUsage = token['max_usage'];
    final dynamic usedCount = token['used_count'];

    if (maxUsage != null && usedCount != null) {
      final int max = _toInt(maxUsage);
      final int used = _toInt(usedCount);

      if (max > 0 && used >= max) {
        return null;
      }
    }

    // Pastikan token memiliki form ID.
    final dynamic formId = token['form_id'];

    if (formId == null ||
        formId.toString().trim().isEmpty) {
      return null;
    }

    return token;
  }

  // Mengambil data form berdasarkan ID.
  static Future<Map<String, dynamic>?> getForm(
    String formId,
  ) async {
    if (formId.trim().isEmpty) {
      return null;
    }

    final response = await _supabase
        .from('forms')
        .select('''
          id,
          title,
          description,
          exam_mode,
          passing_score,
          status,
          duration,
          show_score_to_respondent,
          show_answers_to_respondent,
          randomize_questions,
          header_image,
          show_correct_filter_to_respondent,
          requires_token,
          header_color
        ''')
        .eq(
          'id',
          formId,
        )
        .maybeSingle();

    if (response == null) {
      return null;
    }

    return Map<String, dynamic>.from(response);
  }

  // Mengambil soal beserta pilihan jawabannya.
  static Future<List<Map<String, dynamic>>> getQuestions(
    String formId, {
    bool randomize = false,
  }) async {
    if (formId.trim().isEmpty) {
      return [];
    }

    final response = await _supabase
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
        .eq(
          'form_id',
          formId,
        )
        .order(
          'order_index',
          ascending: true,
        );

    final List<Map<String, dynamic>> loadedQuestions =
        List<Map<String, dynamic>>.from(response);

    final List<Map<String, dynamic>> result = [];

    for (final question in loadedQuestions) {
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
          .eq(
            'question_id',
            questionId,
          )
          .order(
            'order_index',
            ascending: true,
          );

      final List<Map<String, dynamic>> options =
          List<Map<String, dynamic>>.from(
        optionResponse,
      );

      result.add({
        'id': questionId,
        'form_id': question['form_id'],
        'question_text': question['question_text'],
        'question': question['question_text'],
        'question_type': question['question_type'],
        'score_value': question['score_value'],
        'scoreValue': question['score_value'],
        'order_index': question['order_index'],
        'image_question': question['image_question'],
        'is_required': question['is_required'],
        'options': options
            .map(
              (option) => {
                'id': option['id']?.toString(),
                'question_id':
                    option['question_id']?.toString(),
                'option_text': option['option_text'],
                'text': option['option_text'],
                'is_correct':
                    option['is_correct'] == true,
                'isCorrect':
                    option['is_correct'] == true,
                'order_index': option['order_index'],
              },
            )
            .toList(),
      });
    }

    // Mengacak urutan soal tanpa mengacak pilihan jawaban.
    if (randomize) {
      result.shuffle();
    }

    return result;
  }

  // Mengambil data ujian berdasarkan token.
  static Future<Map<String, dynamic>?> getExamByToken(
    String tokenCode,
  ) async {
    final token = await getToken(tokenCode);

    if (token == null) {
      return null;
    }

    final String formId =
        token['form_id'].toString();

    final form = await getForm(formId);

    if (form == null) {
      return null;
    }

    final bool randomize =
        form['randomize_questions'] == true;

    final List<Map<String, dynamic>> questions =
        await getQuestions(
      formId,
      randomize: randomize,
    );

    return {
      'token': token,
      'token_id': token['id']?.toString(),
      'token_code': token['token_code']?.toString(),
      'form_id': formId,
      'form': form,
      'questions': questions,
    };
  }

  // Mengambil data ujian berdasarkan form ID.
  static Future<Map<String, dynamic>?> getExamByFormId(
    String formId,
  ) async {
    final form = await getForm(formId);

    if (form == null) {
      return null;
    }

    final bool randomize =
        form['randomize_questions'] == true;

    final questions = await getQuestions(
      formId,
      randomize: randomize,
    );

    return {
      'form_id': formId,
      'form': form,
      'questions': questions,
    };
  }

  // Mencari index pilihan jawaban yang benar.
  static int getCorrectAnswerIndex(
    List<Map<String, dynamic>> options,
  ) {
    for (int i = 0; i < options.length; i++) {
      if (options[i]['is_correct'] == true ||
          options[i]['isCorrect'] == true) {
        return i;
      }
    }

    return -1;
  }

  // Mengambil ID pilihan berdasarkan index.
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

  // Mengecek apakah pilihan tertentu benar.
  static bool isCorrectOption(
    List<Map<String, dynamic>> options,
    int index,
  ) {
    if (index < 0 || index >= options.length) {
      return false;
    }

    return options[index]['is_correct'] == true ||
        options[index]['isCorrect'] == true;
  }

  // Menghitung nilai berdasarkan jumlah jawaban benar.
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

  // Mengubah nilai menjadi integer.
  static int _toInt(dynamic value) {
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
          value.toString(),
        ) ??
        0;
  }
}