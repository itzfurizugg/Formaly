import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeController extends ChangeNotifier {
  // Constructor private agar hanya menggunakan instance yang disediakan.
  ThemeController._();

  // Instance tunggal ThemeController.
  static final ThemeController instance = ThemeController._();

  // Key untuk menyimpan mode tema.
  static const String _storageKey = 'theme_mode';

  // Tema default aplikasi.
  ThemeMode _themeMode = ThemeMode.light;

  // Mengambil mode tema saat ini.
  ThemeMode get themeMode => _themeMode;

  // Mengecek apakah tema sedang dark mode.
  bool get isDarkMode => _themeMode == ThemeMode.dark;

  // Memuat tema yang tersimpan.
  Future<void> load() async {
    final prefs =
        await SharedPreferences.getInstance();

    final savedMode =
        prefs.getString(_storageKey);

    if (savedMode == 'dark') {
      _themeMode = ThemeMode.dark;
    } else {
      _themeMode = ThemeMode.light;
    }

    notifyListeners();
  }

  // Mengubah dan menyimpan mode tema.
  Future<void> setThemeMode(
    ThemeMode mode,
  ) async {
    if (_themeMode == mode) {
      return;
    }

    _themeMode = mode;
    notifyListeners();

    final prefs =
        await SharedPreferences.getInstance();

    await prefs.setString(
      _storageKey,
      mode == ThemeMode.dark
          ? 'dark'
          : 'light',
    );
  }

  // Mengubah tema dari light ke dark atau sebaliknya.
  Future<void> toggle() async {
    await setThemeMode(
      isDarkMode
          ? ThemeMode.light
          : ThemeMode.dark,
    );
  }
}