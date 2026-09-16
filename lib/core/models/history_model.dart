import 'answer_model.dart';

class HistoryModel {
  // ID submission dari tabel submissions.
  final String? submissionId;

  // Data utama history.
  final String title;
  final String token;
  final String date;
  final String startTime;
  final String finishTime;
  final String duration;

  // Score untuk kompatibilitas model lama.
  final int score;

  // Data hasil ujian.
  final int totalQuestion;
  final int correctAnswer;
  final int wrongAnswer;
  final bool isFinished;

  // Detail jawaban yang tetap dipertahankan untuk screen lama.
  final List<AnswerModel> answers;

  // Constructor untuk mengisi data history.
  const HistoryModel({
    this.submissionId,
    required this.title,
    required this.token,
    required this.date,
    required this.startTime,
    required this.finishTime,
    required this.duration,
    required this.score,
    required this.totalQuestion,
    required this.correctAnswer,
    required this.wrongAnswer,
    required this.isFinished,
    this.answers = const [],
  });

  // Membuat salinan data history dengan perubahan tertentu.
  HistoryModel copyWith({
    String? submissionId,
    String? title,
    String? token,
    String? date,
    String? startTime,
    String? finishTime,
    String? duration,
    int? score,
    int? totalQuestion,
    int? correctAnswer,
    int? wrongAnswer,
    bool? isFinished,
    List<AnswerModel>? answers,
  }) {
    return HistoryModel(
      submissionId: submissionId ?? this.submissionId,
      title: title ?? this.title,
      token: token ?? this.token,
      date: date ?? this.date,
      startTime: startTime ?? this.startTime,
      finishTime: finishTime ?? this.finishTime,
      duration: duration ?? this.duration,
      score: score ?? this.score,
      totalQuestion: totalQuestion ?? this.totalQuestion,
      correctAnswer: correctAnswer ?? this.correctAnswer,
      wrongAnswer: wrongAnswer ?? this.wrongAnswer,
      isFinished: isFinished ?? this.isFinished,
      answers: answers ?? this.answers,
    );
  }

  // Mengubah data history menjadi JSON untuk cache lokal.
  Map<String, dynamic> toJson() {
    return {
      'submissionId': submissionId,
      'title': title,
      'token': token,
      'date': date,
      'startTime': startTime,
      'finishTime': finishTime,
      'duration': duration,
      'score': score,
      'totalQuestion': totalQuestion,
      'correctAnswer': correctAnswer,
      'wrongAnswer': wrongAnswer,
      'isFinished': isFinished,
      'answers': <dynamic>[],
    };
  }

  // Membuat HistoryModel dari data JSON.
  factory HistoryModel.fromJson(
    Map<String, dynamic> json,
  ) {
    return HistoryModel(
      submissionId: _nullableString(
        json['submissionId'],
      ),
      title: _stringOrDefault(
        json['title'],
        'Form Ujian',
      ),
      token: _stringOrDefault(
        json['token'],
        '-',
      ),
      date: _stringOrDefault(
        json['date'],
        '-',
      ),
      startTime: _stringOrDefault(
        json['startTime'],
        '-',
      ),
      finishTime: _stringOrDefault(
        json['finishTime'],
        '-',
      ),
      duration: _stringOrDefault(
        json['duration'],
        '-',
      ),
      score: _toInt(
        json['score'],
      ),
      totalQuestion: _toInt(
        json['totalQuestion'],
      ),
      correctAnswer: _toInt(
        json['correctAnswer'],
      ),
      wrongAnswer: _toInt(
        json['wrongAnswer'],
      ),
      isFinished: json['isFinished'] == true,
      answers: const [],
    );
  }

  // Mengubah nilai menjadi String atau nilai default.
  static String _stringOrDefault(
    dynamic value,
    String fallback,
  ) {
    final String text =
        value?.toString().trim() ?? '';

    return text.isEmpty ? fallback : text;
  }

  // Mengubah nilai menjadi String nullable.
  static String? _nullableString(
    dynamic value,
  ) {
    final String text =
        value?.toString().trim() ?? '';

    return text.isEmpty ? null : text;
  }

  // Mengubah nilai menjadi int.
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
          value.toString().trim(),
        ) ??
        0;
  }
}