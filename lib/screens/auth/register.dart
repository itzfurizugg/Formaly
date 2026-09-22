import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/routes/app_routes.dart';
import '../../widgets/auth_shell.dart';
import 'verify_signup_screen.dart';

class RegisterScreen extends StatefulWidget {
  // Halaman untuk mendaftarkan akun baru.
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() =>
      _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  // Controller untuk input data pendaftaran.
  final TextEditingController namaController =
      TextEditingController();

  final TextEditingController emailController =
      TextEditingController();

  final TextEditingController passwordController =
      TextEditingController();

  final TextEditingController confirmPasswordController =
      TextEditingController();

  // Focus untuk setiap field input.
  final FocusNode namaFocusNode = FocusNode();
  final FocusNode emailFocusNode = FocusNode();
  final FocusNode passwordFocusNode = FocusNode();
  final FocusNode confirmPasswordFocusNode =
      FocusNode();

  // Menandakan proses register sedang berjalan.
  bool isLoading = false;

  // Hanya untuk UI: mengatur tampil/sembunyinya password.
  bool obscurePassword = true;
  bool obscureConfirmPassword = true;

  // Client untuk mengakses Supabase.
  SupabaseClient get supabase =>
      Supabase.instance.client;

  @override
  void dispose() {
    namaController.dispose();
    emailController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();

    namaFocusNode.dispose();
    emailFocusNode.dispose();
    passwordFocusNode.dispose();
    confirmPasswordFocusNode.dispose();

    super.dispose();
  }

  // Melakukan proses pendaftaran akun.
  Future<void> register() async {
    if (isLoading) {
      return;
    }

    final String name =
        namaController.text.trim();

    final String email =
        emailController.text.trim().toLowerCase();

    final String password =
        passwordController.text;

    final String confirmPassword =
        confirmPasswordController.text;

    // Validasi nama.
    if (name.isEmpty) {
      _showMessage('Nama lengkap wajib diisi.');
      _focus(namaFocusNode);
      return;
    }

    if (name.length < 2) {
      _showMessage('Nama lengkap terlalu pendek.');
      _focus(namaFocusNode);
      return;
    }

    // Validasi email.
    if (email.isEmpty) {
      _showMessage('Email wajib diisi.');
      _focus(emailFocusNode);
      return;
    }

    if (!_isValidEmail(email)) {
      _showMessage(
        'Masukkan alamat email yang valid.',
      );
      _focus(emailFocusNode);
      return;
    }

    // Validasi password.
    if (password.isEmpty) {
      _showMessage('Password wajib diisi.');
      _focus(passwordFocusNode);
      return;
    }

    if (password.length < 6) {
      _showMessage('Password minimal 6 karakter.');
      _focus(passwordFocusNode);
      return;
    }

    // Validasi konfirmasi password.
    if (confirmPassword.isEmpty) {
      _showMessage(
        'Konfirmasi password wajib diisi.',
      );
      _focus(confirmPasswordFocusNode);
      return;
    }

    if (password != confirmPassword) {
      _showMessage(
        'Konfirmasi password tidak sama.',
      );
      _focus(confirmPasswordFocusNode);
      return;
    }

    FocusScope.of(context).unfocus();

    setState(() {
      isLoading = true;
    });

    try {
      // Membuat akun menggunakan Supabase Auth.
      final AuthResponse response =
          await supabase.auth.signUp(
        email: email,
        password: password,
        data: {
          'name': name,
        },
      );

      final User? user = response.user;

      if (user == null) {
        throw const AuthException(
          'Pendaftaran gagal. User tidak berhasil dibuat.',
        );
      }

      // Jika konfirmasi email aktif, lanjut ke OTP signup.
      if (response.session == null) {
        if (!mounted) {
          return;
        }

        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => VerifySignupScreen(
              email: email,
              name: name,
            ),
          ),
        );

        return;
      }

      // Jika konfirmasi email tidak aktif,
      // simpan data user dan langsung ke Home.
      await _createPublicUser(
        userId: user.id,
        name: name,
        email: email,
      );

      if (!mounted) {
        return;
      }

      Navigator.pushNamedAndRemoveUntil(
        context,
        AppRoutes.home,
        (route) => false,
      );
    } on AuthException catch (e) {
      if (!mounted) {
        return;
      }

      _showMessage(
        _cleanAuthMessage(e.message),
      );
    } on PostgrestException catch (e) {
      if (!mounted) {
        return;
      }

      _showMessage(
        'Akun Auth berhasil dibuat, tetapi data profil gagal disimpan: ${e.message}',
      );
    } catch (e) {
      if (!mounted) {
        return;
      }

      _showMessage(
        'Terjadi kesalahan: ${_cleanError(e)}',
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

  // Membuat data user pada tabel public.
  Future<void> _createPublicUser({
    required String userId,
    required String name,
    required String email,
  }) async {
    await supabase.from('users').upsert(
      {
        'id': userId,
        'name': name,
        'email': email,
      },
      onConflict: 'id',
    );

    await supabase.from('profiles').upsert(
      {
        'id': userId,
        'name': name,
      },
      onConflict: 'id',
    );
  }

  // Memvalidasi format email.
  bool _isValidEmail(String email) {
    final RegExp emailRegex = RegExp(
      r'^[^@\s]+@[^@\s]+\.[^@\s]+$',
    );

    return emailRegex.hasMatch(email);
  }

  // Mengarahkan focus ke field tertentu.
  void _focus(FocusNode node) {
    if (!mounted) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback(
      (_) {
        if (!mounted) {
          return;
        }

        node.requestFocus();
      },
    );
  }

  // Menampilkan pesan menggunakan SnackBar.
  void _showMessage(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            message,
            style: TextStyle(fontFamily: 'FunnelDisplay',

              fontSize: 13,
            ),
          ),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 3),
        ),
      );
  }

  // Membersihkan pesan error dari Supabase.
  String _cleanAuthMessage(String message) {
    final String clean =
        message.trim();

    return clean.isEmpty
        ? 'Pendaftaran gagal. Silakan coba lagi.'
        : clean;
  }

  // Membersihkan pesan error biasa.
  String _cleanError(Object error) {
    final String text = error.toString();

    if (text.startsWith('Exception: ')) {
      return text.substring(
        'Exception: '.length,
      );
    }

    return text;
  }

  @override
  Widget build(BuildContext context) {
    return AuthShell(
      showHeadline: true,
      child: Container(
        padding: const EdgeInsets.all(20),
        width: double.infinity,
        decoration: const BoxDecoration(color: Colors.transparent),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
                    // Tombol kembali.
                    Material(
                      color: kSecond,
                      shape: const CircleBorder(),
                      child: InkWell(
                        customBorder: const CircleBorder(),
                        onTap: isLoading
                            ? null
                            : () => Navigator.pop(context),
                        child: const SizedBox(
                          width: 40,
                          height: 40,
                          child: Icon(
                            Icons.arrow_back_rounded,
                            size: 20,
                            color: kDarks,
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 18),

                    Text(
                      'Daftar',
                      style: TextStyle(fontFamily: 'FunnelDisplay',

                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: kDarks,
                        height: 1.2,
                      ),
                    ),

                    const SizedBox(height: 4),

                    Text(
                      'Daftar untuk mulai membuat formulir anda!',
                      style: TextStyle(fontFamily: 'FunnelDisplay',

                        fontSize: 14,
                        color: kTinted,
                        height: 1.4,
                      ),
                    ),

                    const SizedBox(height: 24),

                    _buildRegisterField(
                      label: 'Nama',
                      controller: namaController,
                      focusNode: namaFocusNode,
                      hintText: 'John Smith',
                      textInputAction: TextInputAction.next,
                      onSubmitted: (_) {
                        emailFocusNode.requestFocus();
                      },
                    ),

                    const SizedBox(height: 16),

                    _buildRegisterField(
                      label: 'Email',
                      controller: emailController,
                      focusNode: emailFocusNode,
                      hintText: 'nama@email.com',
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      onSubmitted: (_) {
                        passwordFocusNode.requestFocus();
                      },
                    ),

                    const SizedBox(height: 16),

                    _buildRegisterField(
                      label: 'Password',
                      controller: passwordController,
                      focusNode: passwordFocusNode,
                      hintText: 'Minimal 8 karakter',
                      obscureText: obscurePassword,
                      textInputAction: TextInputAction.next,
                      suffixIcon: IconButton(
                        onPressed: () {
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
                          color: kTinted,
                        ),
                      ),
                      onSubmitted: (_) {
                        confirmPasswordFocusNode.requestFocus();
                      },
                    ),

                    const SizedBox(height: 16),

                    _buildRegisterField(
                      label: 'Konfirmasi Password',
                      controller: confirmPasswordController,
                      focusNode: confirmPasswordFocusNode,
                      hintText: 'Ulangi password baru',
                      obscureText: obscureConfirmPassword,
                      textInputAction: TextInputAction.done,
                      suffixIcon: IconButton(
                        onPressed: () {
                          setState(() {
                            obscureConfirmPassword =
                                !obscureConfirmPassword;
                          });
                        },
                        splashRadius: 18,
                        icon: Icon(
                          obscureConfirmPassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                          size: 18,
                          color: kTinted,
                        ),
                      ),
                      onSubmitted: (_) {
                        if (!isLoading) {
                          register();
                        }
                      },
                    ),

                    const SizedBox(height: 17),

                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: ElevatedButton.icon(
                        onPressed:
                            isLoading ? null : register,
                        icon: const Icon(
                          Icons.person_add_alt_1_rounded,
                          size: 17,
                        ),
                        label: Text(
                          isLoading
                              ? 'Memproses...'
                              : 'Daftar',
                          style: TextStyle(fontFamily: 'FunnelDisplay',

                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        style:
                            ElevatedButton.styleFrom(
                          backgroundColor:
                              kDarks,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor:
                              const Color(0xff8B8D94),
                          disabledForegroundColor:
                              Colors.white,
                          elevation: 0,
                          shape:
                              const StadiumBorder(),
                        ),
                      ),
                    ),

                    const SizedBox(height: 10),

                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: OutlinedButton(
                        onPressed: isLoading
                            ? null
                            : () => Navigator.pushReplacementNamed(
                                  context,
                                  AppRoutes.login,
                                ),
                        style:
                            OutlinedButton.styleFrom(
                          backgroundColor:
                              Colors.transparent,
                          foregroundColor:
                              kDarks,
                          side: const BorderSide(
                            color: kSecond,
                          ),
                          elevation: 0,
                          shape:
                              const StadiumBorder(),
                        ),
                        child: Text(
                          'Sudah punya akun? Masuk',
                          style: TextStyle(fontFamily: 'FunnelDisplay',

                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
          ],
        ),
      ),
    );
  }

  // Helper UI saja.
  Widget _buildRegisterField({
    required String label,
    required TextEditingController controller,
    required FocusNode focusNode,
    required String hintText,
    bool obscureText = false,
    TextInputType? keyboardType,
    TextInputAction? textInputAction,
    Widget? suffixIcon,
    ValueChanged<String>? onSubmitted,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(fontFamily: 'FunnelDisplay',

            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: kDarks,
          ),
        ),

        const SizedBox(height: 7),

        SizedBox(
          height: 44,
          child: TextField(
            controller: controller,
            focusNode: focusNode,
            obscureText: obscureText,
            keyboardType: keyboardType,
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
              contentPadding:
                  const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 0,
              ),
              suffixIcon: suffixIcon,
              suffixIconConstraints:
                  const BoxConstraints(
                minWidth: 44,
                minHeight: 44,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                  color: kDone,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
