import 'package:flutter/material.dart';

class AppColor {
  AppColor._();

  // ============================================================
  // WARNA UTAMA FORMALY
  // ============================================================

  // Biru sebagai warna utama agar UI tidak terlihat monoton.
  static const Color primary = Color(0xFF3F51B5);

  // Warna latar Light Mode.
  static const Color background = Colors.white;

  // Warna scaffold Light Mode.
  static const Color scaffold = Color(0xFFF7F8FA);

  // Warna teks utama.
  static const Color text = Color(0xFF212529);

  // Warna teks sekunder.
  static const Color subtitle = Color(0xFF757575);

  // Warna border.
  static const Color border = Color(0xFFE1E5EA);

  // Warna field input Light Mode.
  static const Color textField = Color(0xFFF1F3F5);

  // ============================================================
  // WARNA STATUS
  // ============================================================

  // Hijau untuk berhasil / selesai / terverifikasi.
  static const Color success = Color(0xFF4CAF50);

  // Merah untuk error / danger / logout.
  static const Color danger = Color(0xFFE53935);

  // Orange untuk warning / belum selesai.
  static const Color warning = Color(0xFFFF9800);

  // Biru untuk informasi.
  static const Color info = Color(0xFF2196F3);

  // Ungu sebagai aksen tambahan.
  static const Color accent = Color(0xFF7E57C2);
}
