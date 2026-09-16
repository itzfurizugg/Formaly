import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../constants/app_color.dart';

class AppTheme {
  // Constructor private agar class tidak dibuat sebagai object.
  AppTheme._();

  // Tema untuk mode terang.
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,

      // Background utama aplikasi.
      scaffoldBackgroundColor: AppColor.background,

      // Warna utama aplikasi.
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColor.primary,
        brightness: Brightness.light,
        surface: Colors.white,
      ),

      // Menggunakan font Poppins.
      textTheme: GoogleFonts.poppinsTextTheme(),

      // Tampilan AppBar mode terang.
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
      ),

      // Tampilan field input mode terang.
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColor.textField,

        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 16,
        ),

        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),

        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),

        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(
            color: AppColor.primary,
            width: 1.2,
          ),
        ),
      ),

      // Warna pembatas.
      dividerTheme: DividerThemeData(
        color: Colors.grey.shade300,
      ),

      // Tampilan SnackBar.
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // Tema untuk mode gelap.
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,

      // Background utama mode gelap.
      scaffoldBackgroundColor: const Color(0xff121212),

      // Warna utama mode gelap.
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColor.primary,
        brightness: Brightness.dark,
        surface: const Color(0xff1E1E1E),
      ),

      // Font Poppins untuk mode gelap.
      textTheme: GoogleFonts.poppinsTextTheme(
        ThemeData.dark().textTheme,
      ),

      // Tampilan AppBar mode gelap.
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xff1E1E1E),
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
      ),

      // Tampilan field input mode gelap.
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xff262626),

        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 16,
        ),

        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),

        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(
            color: Color(0xff3A3A3A),
          ),
        ),

        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(
            color: Colors.white,
            width: 1.2,
          ),
        ),
      ),

      // Warna pembatas mode gelap.
      dividerTheme: const DividerThemeData(
        color: Color(0xff3A3A3A),
      ),

      // Tampilan SnackBar mode gelap.
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: Color(0xff2A2A2A),
        contentTextStyle: TextStyle(
          color: Colors.white,
        ),
      ),
    );
  }
}