class AnswerModel {
  /// Nomor soal.
  final int questionNumber;

  /// Isi pertanyaan.
  final String question;

  /// Seluruh pilihan jawaban.
  final List<String> options;

  /// Index jawaban benar.
  ///
  /// Bernilai -1 jika tidak ada jawaban benar yang ditemukan.
  final int correctAnswer;

  /// Index jawaban yang dipilih user.
  ///
  /// Bernilai -1 jika soal belum dijawab.
  final int userAnswer;

  AnswerModel({
    required this.questionNumber,
    required this.question,
    required this.options,
    required this.correctAnswer,
    required this.userAnswer,
  });

  /// Apakah jawaban user benar.
  ///
  /// Tidak dianggap benar jika tidak ada jawaban benar
  /// atau user belum memilih jawaban.
  bool get isCorrect =>
      correctAnswer >= 0 &&
      userAnswer >= 0 &&
      correctAnswer < options.length &&
      userAnswer < options.length &&
      correctAnswer == userAnswer;

  /// Apakah soal sudah dijawab.
  ///
  /// Selain mengecek index >= 0, index juga harus berada
  /// dalam daftar pilihan yang tersedia agar aman.
  bool get isAnswered =>
      userAnswer >= 0 &&
      userAnswer < options.length;

  /// Apakah index jawaban benar valid.
  bool get hasValidCorrectAnswer =>
      correctAnswer >= 0 &&
      correctAnswer < options.length;

  /// Apakah index jawaban user valid.
  bool get hasValidUserAnswer =>
      userAnswer >= 0 &&
      userAnswer < options.length;

  /// Huruf jawaban user.
  String get userAnswerLabel {
    if (!hasValidUserAnswer) {
      return '-';
    }

    return String.fromCharCode(
      65 + userAnswer,
    );
  }

  /// Huruf jawaban benar.
  String get correctAnswerLabel {
    if (!hasValidCorrectAnswer) {
      return '-';
    }

    return String.fromCharCode(
      65 + correctAnswer,
    );
  }

  /// Teks jawaban user.
  String get userAnswerText {
    if (!hasValidUserAnswer) {
      return 'Tidak Dijawab';
    }

    return options[userAnswer];
  }

  /// Teks jawaban benar.
  String get correctAnswerText {
    if (!hasValidCorrectAnswer) {
      return 'Tidak Diketahui';
    }

    return options[correctAnswer];
  }
}