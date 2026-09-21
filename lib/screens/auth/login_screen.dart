import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/routes/app_routes.dart';
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
            style: GoogleFonts.poppins(
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
    return Scaffold(
      // Background mengikuti tampilan pada gambar referensi.
      backgroundColor: const Color(0xffF7F7F7),

      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior:
              ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(
            12,
            28,
            12,
            18,
          ),
          child: Column(
            children: [
              // Logo:
              // "Form" tebal, "aly" regular.
              RichText(
                text: TextSpan(
                  children: [
                    TextSpan(
                      text: 'Form',
                      style: GoogleFonts.poppins(
                        fontSize: 40,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xff3E4149),
                        letterSpacing: -1.2,
                        height: 1,
                      ),
                    ),
                    TextSpan(
                      text: 'aly',
                      style: GoogleFonts.poppins(
                        fontSize: 40,
                        fontWeight: FontWeight.w400,
                        color: const Color(0xff3E4149),
                        letterSpacing: -1.2,
                        height: 1,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 34),

              // Card login seperti referensi.
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(
                  16,
                  18,
                  16,
                  16,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius:
                      BorderRadius.circular(24),
                  border: Border.all(
                    color: const Color(0xffE5E5E5),
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x12000000),
                      blurRadius: 5,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Masuk',
                      style: GoogleFonts.poppins(
                        fontSize: 23,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xff3E4149),
                        height: 1.2,
                      ),
                    ),

                    const SizedBox(height: 3),

                    Text(
                      'Masuk untuk melanjutkan ke akun kamu',
                      style: GoogleFonts.poppins(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w400,
                        color: const Color(0xff9299AA),
                      ),
                    ),

                    const SizedBox(height: 25),

                    Text(
                      'E-mail',
                      style: GoogleFonts.poppins(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xff30333A),
                      ),
                    ),

                    const SizedBox(height: 7),

                    _buildInputField(
                      controller: emailController,
                      focusNode: emailFocusNode,
                      hintText: 'nama@email.com',
                      textInputAction:
                          TextInputAction.next,
                      onSubmitted: (_) {
                        passwordFocusNode.requestFocus();
                      },
                    ),

                    const SizedBox(height: 14),

                    Text(
                      'Kata sandi',
                      style: GoogleFonts.poppins(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xff30333A),
                      ),
                    ),

                    const SizedBox(height: 7),

                    _buildInputField(
                      controller: passwordController,
                      focusNode: passwordFocusNode,
                      hintText: 'Masukkan kata sandi',
                      obscureText: obscurePassword,
                      textInputAction:
                          TextInputAction.done,
                      suffixIcon: IconButton(
                        onPressed: isLoading
                            ? null
                            : () {
                                setState(() {
                                  obscurePassword =
                                      !obscurePassword;
                                });
                              },
                        splashRadius: 18,
                        icon: Icon(
                          obscurePassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                          size: 18,
                          color: const Color(0xff8D96AA),
                        ),
                      ),
                      onSubmitted: (_) {
                        if (!isLoading) {
                          login();
                        }
                      },
                    ),

                    const SizedBox(height: 2),

                    // Posisi sesuai referensi: di kiri bawah
                    // field password.
                    Align(
                      alignment:
                          Alignment.centerLeft,
                      child: TextButton(
                        onPressed: isLoading
                            ? null
                            : openForgotPassword,
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize:
                              MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          'Lupa kata sandi?',
                          style: GoogleFonts.poppins(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            color: const Color(0xff087FC1),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 23),

                    // Tombol masuk model pill gelap.
                    SizedBox(
                      width: double.infinity,
                      height: 38,
                      child: ElevatedButton.icon(
                        onPressed:
                            isLoading ? null : login,
                        icon: const Icon(
                          Icons.login_rounded,
                          size: 16,
                        ),
                        label: Text(
                          isLoading
                              ? 'Memproses...'
                              : 'Masuk',
                          style: GoogleFonts.poppins(
                            fontSize: 13,
                            fontWeight:
                                FontWeight.w600,
                          ),
                        ),
                        style:
                            ElevatedButton.styleFrom(
                          backgroundColor:
                              const Color(0xff3E4149),
                          foregroundColor:
                              Colors.white,
                          disabledBackgroundColor:
                              const Color(0xff8B8D94),
                          disabledForegroundColor:
                              Colors.white,
                          elevation: 0,
                          shape:
                              const StadiumBorder(),
                          padding: EdgeInsets.zero,
                        ),
                      ),
                    ),

                    const SizedBox(height: 8),

                    // Tombol Magic Link.
                    SizedBox(
                      width: double.infinity,
                      height: 38,
                      child: OutlinedButton.icon(
                        onPressed:
                            isLoading
                                ? null
                                : sendMagicLink,
                        icon: const Icon(
                          Icons.mark_email_read_outlined,
                          size: 16,
                        ),
                        label: Text(
                          'Masuk dengan Magic Link',
                          style: GoogleFonts.poppins(
                            fontSize: 12.5,
                            fontWeight:
                                FontWeight.w600,
                          ),
                        ),
                        style:
                            OutlinedButton.styleFrom(
                          backgroundColor:
                              const Color(0xffF7F7F7),
                          foregroundColor:
                              const Color(0xff30333A),
                          side: const BorderSide(
                            color: Color(0xffE6E6E6),
                          ),
                          elevation: 0,
                          shape:
                              const StadiumBorder(),
                          padding: EdgeInsets.zero,
                        ),
                      ),
                    ),

                    const SizedBox(height: 8),

                    // Tombol daftar model pill abu-abu.
                    SizedBox(
                      width: double.infinity,
                      height: 38,
                      child: OutlinedButton(
                        onPressed:
                            isLoading
                                ? null
                                : openRegister,
                        style:
                            OutlinedButton.styleFrom(
                          backgroundColor:
                              const Color(0xffF7F7F7),
                          foregroundColor:
                              const Color(0xff30333A),
                          side: const BorderSide(
                            color: Color(0xffE6E6E6),
                          ),
                          elevation: 0,
                          shape:
                              const StadiumBorder(),
                          padding: EdgeInsets.zero,
                        ),
                        child: Text(
                          'Belum punya akun? Daftar',
                          style: GoogleFonts.poppins(
                            fontSize: 12.5,
                            fontWeight:
                                FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
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
      height: 38,
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        enabled: !isLoading,
        obscureText: obscureText,
        textInputAction: textInputAction,
        onSubmitted: onSubmitted,
        autocorrect: false,
        enableSuggestions: !obscureText,
        style: GoogleFonts.poppins(
          fontSize: 12.5,
          color: const Color(0xff30333A),
        ),
        decoration: InputDecoration(
          hintText: hintText,
          hintStyle: GoogleFonts.poppins(
            fontSize: 12.5,
            color: const Color(0xff8F8F8F),
          ),
          filled: true,
          fillColor: const Color(0xffF5F5F5),
          contentPadding:
              const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 0,
          ),
          suffixIcon: suffixIcon,
          suffixIconConstraints:
              const BoxConstraints(
            minWidth: 42,
            minHeight: 38,
          ),
          enabledBorder:
              OutlineInputBorder(
            borderRadius:
                BorderRadius.circular(5),
            borderSide: const BorderSide(
              color: Color(0xffE6E6E6),
            ),
          ),
          focusedBorder:
              OutlineInputBorder(
            borderRadius:
                BorderRadius.circular(5),
            borderSide: const BorderSide(
              color: Color(0xffCFCFCF),
            ),
          ),
          disabledBorder:
              OutlineInputBorder(
            borderRadius:
                BorderRadius.circular(5),
            borderSide: const BorderSide(
              color: Color(0xffE6E6E6),
            ),
          ),
        ),
      ),
    );
  }
}