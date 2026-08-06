class HistoryModel {
  final String title;
  final String token;

  final String date;

  final String startTime;

  final String finishTime;

  final String duration;

  final int score;

  final int totalQuestion;

  final int correctAnswer;

  final int wrongAnswer;

  final bool isFinished;

  HistoryModel({
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
  });
}