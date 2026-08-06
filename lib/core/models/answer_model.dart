class AnswerModel {
  /// Nomor soal
  final int questionNumber;

  /// Isi pertanyaan
  final String question;

  /// Seluruh pilihan jawaban
  final List<String> options;

  /// Index jawaban benar
  final int correctAnswer;

  /// Index jawaban yang dipilih user
  final int userAnswer;

  AnswerModel({
    required this.questionNumber,
    required this.question,
    required this.options,
    required this.correctAnswer,
    required this.userAnswer,
  });

  /// Apakah jawaban benar
  bool get isCorrect => correctAnswer == userAnswer;

  /// Huruf jawaban user (A,B,C,D)
  String get userAnswerLabel =>
      String.fromCharCode(65 + userAnswer);

  /// Huruf jawaban benar (A,B,C,D)
  String get correctAnswerLabel =>
      String.fromCharCode(65 + correctAnswer);

  /// Teks jawaban user
  String get userAnswerText => options[userAnswer];

  /// Teks jawaban benar
  String get correctAnswerText => options[correctAnswer];
}