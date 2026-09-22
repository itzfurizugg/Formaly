import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/routes/app_routes.dart';
import '../../widgets/auth_shell.dart';
import 'forgot_password_screen.dart';

class LoginScreen extends StatefulWidget {
  // Halaman untuk login pengguna.
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() =>
      _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  // Controller untuk input email dan password.
  final TextEditingController emailController =
      TextEditingController();

  final TextEditingController passwordController =
      TextEditingController();

  // Focus untuk field email dan password.
  final FocusNode emailFocusNode =
      FocusNode();

  final FocusNode passwordFocusNode =
      FocusNode();

  // Menandakan proses login sedang berjalan.
  bool isLoading = false;

  // UI saja: mengatur password terlihat atau disembunyikan.
  bool obscurePassword = true;

  // Client untuk mengakses Supabase.
  SupabaseClient get supabase =>
      Supabase.instance.client;

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    emailFocusNode.dispose();
    passwordFocusNode.dispose();
    super.dispose();
  }

  // Melakukan proses login menggunakan Supabase Auth.
  Future<void> login() async {
    if (isLoading) {
      return;
    }

    final String email =
        emailController.text.trim().toLowerCase();

    final String password =
        passwordController.text;

    // Validasi email.
    if (email.isEmpty) {
      _showMessage(
        'Masukkan email terlebih dahulu.',
      );
      _focusEmail();
      return;
    }

    if (!_isValidEmail(email)) {
      _showMessage(
        'Masukkan alamat email yang valid.',
      );
      _focusEmail();
      return;
    }

    // Validasi password.
    if (password.isEmpty) {
      _showMessage(
        'Masukkan password terlebih dahulu.',
      );
      _focusPassword();
      return;
    }

    FocusScope.of(context).unfocus();

    setState(() {
      isLoading = true;
    });

    try {
      // Login menggunakan Supabase Auth.
      await supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (!mounted) {
        return;
      }

      // Mengarahkan user ke halaman home.
      Navigator.pushReplacementNamed(
        context,
        AppRoutes.home,
      );
    } on AuthException catch (e) {
      if (!mounted) {
        return;
      }

      _showMessage(
        _cleanAuthMessage(e.message),
      );
    } catch (_) {
      if (!mounted) {
        return;
      }

      _showMessage(
        'Terjadi kesalahan saat login. Silakan coba lagi.',
      );
    } finally {
      if (!mounted) {
        return;
      }

      setState(() {
        isLoading = false;
      });
    }
  }

  // ============================================================
  // MAGIC LINK
  // ============================================================

  Future<void> sendMagicLink() async {
    if (isLoading) {
      return;
    }

    final String email =
        emailController.text.trim().toLowerCase();

    // Validasi email.
    if (email.isEmpty) {
      _showMessage(
        'Masukkan email terlebih dahulu.',
      );
      _focusEmail();
      return;
    }

    if (!_isValidEmail(email)) {
      _showMessage(
        'Masukkan alamat email yang valid.',
      );
      _focusEmail();
      return;
    }

    FocusScope.of(context).unfocus();

    setState(() {
      isLoading = true;
    });

    try {
      await supabase.auth.signInWithOtp(
        email: email,
        emailRedirectTo:
            'com.example.formaly://login-callback/',
        shouldCreateUser: false,
      );

      if (!mounted) {
        return;
      }

      _showMessage(
        'Magic Link sudah dikirim ke $email. Silakan cek email kamu.',
      );
    } on AuthException catch (e) {
      if (!mounted) {
        return;
      }

      _showMessage(
        _cleanAuthMessage(e.message),
      );
    } catch (_) {
      if (!mounted) {
        return;
      }

      _showMessage(
        'Gagal mengirim Magic Link. Silakan coba lagi.',
      );
    } finally {
      if (!mounted) {
        return;
      }

      setState(() {
        isLoading = false;
      });
    }
  }

  // Membuka halaman lupa password.
  void openForgotPassword() {
    if (isLoading) {
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) =>
            const ForgotPasswordScreen(),
      ),
    );
  }

  // Membuka halaman register.
  void openRegister() {
    if (isLoading) {
      return;
    }

    Navigator.pushNamed(
      context,
      AppRoutes.register,
    );
  }

  // Memvalidasi format email.
  bool _isValidEmail(String email) {
    final RegExp emailRegex = RegExp(
      r'^[^@\s]+@[^@\s]+\.[^@\s]+$',
    );

    return emailRegex.hasMatch(email);
  }

  // Mengarahkan focus ke field email.
  void _focusEmail() {
    if (!mounted) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback(
      (_) {
        if (!mounted) {
          return;
        }

        emailFocusNode.requestFocus();
      },
    );
  }

  // Mengarahkan focus ke field password.
  void _focusPassword() {
    if (!mounted) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback(
      (_) {
        if (!mounted) {
          return;
        }

        passwordFocusNode.requestFocus();
      },
    );
  }

  // Menampilkan pesan menggunakan SnackBar.
  void _showMessage(String message) {
    if (!mounted) {
      return;
    }

    final messenger =
        ScaffoldMessenger.of(context);

    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            message,
            style: TextStyle(fontFamily: 'FunnelDisplay',

              fontSize: 13,
            ),
          ),
          behavior:
              SnackBarBehavior.floating,
          duration:
              const Duration(
            seconds: 3,
          ),
        ),
      );
  }

  // Membersihkan pesan error dari Supabase.
  String _cleanAuthMessage(String message) {
    final String clean =
        message.trim();

    if (clean.isEmpty) {
      return 'Login gagal. Silakan periksa kembali email dan password.';
    }

    return clean;
  }

  @override
  Widget build(BuildContext context) {
    return AuthShell(child: _buildLoginForm());
  }

  Widget _buildLoginForm() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      decoration: const BoxDecoration(color: Colors.transparent),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Masuk', style: TextStyle(fontFamily: 'FunnelDisplay',
fontSize: 24, fontWeight: FontWeight.w700, color: kDarks)),
          const SizedBox(height: 4),
          Text('Masuk untuk melanjutkan ke akun kamu', style: TextStyle(fontFamily: 'FunnelDisplay',
fontSize: 14, color: kTinted)),
          const SizedBox(height: 24),
          Text('Email', style: TextStyle(fontFamily: 'FunnelDisplay',
fontSize: 13, fontWeight: FontWeight.w600, color: kDarks)),
          const SizedBox(height: 7),
          _buildInputField(controller: emailController, focusNode: emailFocusNode, hintText: 'nama@email.com', textInputAction: TextInputAction.next, onSubmitted: (_) => passwordFocusNode.requestFocus()),
          const SizedBox(height: 16),
          Text('Password', style: TextStyle(fontFamily: 'FunnelDisplay',
fontSize: 13, fontWeight: FontWeight.w600, color: kDarks)),
          const SizedBox(height: 7),
          _buildInputField(controller: passwordController, focusNode: passwordFocusNode, hintText: 'Masukkan password', obscureText: obscurePassword, textInputAction: TextInputAction.done, suffixIcon: IconButton(onPressed: isLoading ? null : () => setState(() => obscurePassword = !obscurePassword), icon: Icon(obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 18, color: kTinted)), onSubmitted: (_) => isLoading ? null : login()),
          Align(alignment: Alignment.centerLeft, child: TextButton(onPressed: isLoading ? null : openForgotPassword, style: TextButton.styleFrom(padding: EdgeInsets.zero), child: Text('Lupa password?', style: TextStyle(fontFamily: 'FunnelDisplay',
fontSize: 12, color: kDone)))),
          const SizedBox(height: 18),
          SizedBox(width: double.infinity, height: 44, child: ElevatedButton.icon(onPressed: isLoading ? null : login, icon: const Icon(Icons.login_rounded, size: 17), label: Text(isLoading ? 'Memproses...' : 'Masuk', style: TextStyle(fontFamily: 'FunnelDisplay',
fontWeight: FontWeight.w600, fontSize: 13)), style: ElevatedButton.styleFrom(backgroundColor: kDarks, foregroundColor: Colors.white, elevation: 0, shape: const StadiumBorder()))),
          const SizedBox(height: 10),
          SizedBox(width: double.infinity, height: 44, child: OutlinedButton(onPressed: isLoading ? null : openRegister, style: OutlinedButton.styleFrom(backgroundColor: kBase, foregroundColor: kDarks, side: const BorderSide(color: kSecond), elevation: 0, shape: const StadiumBorder()), child: Text('Belum punya akun? Daftar', style: TextStyle(fontFamily: 'FunnelDisplay',
fontSize: 13, fontWeight: FontWeight.w600)))),
        ],
      ),
    );
  }


  // Field dibuat di halaman ini supaya bentuknya dapat
  // disesuaikan dengan gambar tanpa mengubah logic login.
  Widget _buildInputField({
    required TextEditingController controller,
    required FocusNode focusNode,
    required String hintText,
    bool obscureText = false,
    TextInputAction? textInputAction,
    Widget? suffixIcon,
    ValueChanged<String>? onSubmitted,
  }) {
    return SizedBox(
      height: 44,
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        enabled: !isLoading,
        obscureText: obscureText,
        textInputAction: textInputAction,
        onSubmitted: onSubmitted,
        autocorrect: false,
        enableSuggestions: !obscureText,
        style: TextStyle(fontFamily: 'FunnelDisplay',

          fontSize: 13,
          color: kDarks,
        ),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: TextStyle(fontFamily: 'FunnelDisplay',

            fontSize: 13,
            color: kTinted,
          ),
          filled: true,
          fillColor: kSecond,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 0,
          ),
          suffixIcon: suffixIcon,
          suffixIconConstraints: const BoxConstraints(
            minWidth: 44,
            minHeight: 44,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: kDone),
          ),
          disabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }
}