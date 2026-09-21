import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/routes/app_routes.dart';
import 'core/routes/auth_gate.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_controller.dart';

import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/home/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Inisialisasi Supabase.
  await Supabase.initialize(
    url: 'https://efyzyhwioavodibjhaiu.supabase.co',
    publishableKey:
        'sb_publishable_EtibdZOq6x29B49kgaiAdQ_oMvcxD12',
  );

  // Memuat pilihan tema yang tersimpan di HP.
  await ThemeController.instance.load();

  runApp(
    const FormalyApp(),
  );
}

class FormalyApp extends StatelessWidget {
  const FormalyApp({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: ThemeController.instance,
      builder: (context, _) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'Formaly',

          // Tema Light dan Dark.
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: ThemeController.instance.themeMode,

          // Halaman awal aplikasi.
          initialRoute: AppRoutes.splash,

          // Daftar route aplikasi.
          routes: {
            AppRoutes.splash:
                (_) => const AuthGate(),
            AppRoutes.login:
                (_) => const LoginScreen(),
            AppRoutes.register:
                (_) => const RegisterScreen(),
            AppRoutes.home:
                (_) => const HomeScreen(),
          },
        );
      },
    );
  }
}