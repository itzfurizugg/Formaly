import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../widgets/auth_shell.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState
    extends State<ForgotPasswordScreen> {
  // Controller untuk input email.
  final TextEditingController emailController =
      TextEditingController();

  // Focus untuk field email.
  final FocusNode emailFocusNode =
      FocusNode();

  // Menandakan proses sedang berjalan.
  bool isLoading = false;

  // Client untuk mengakses Supabase.
  SupabaseClient get supabase =>
      Supabase.instance.client;

  @override
  void dispose() {
    emailController.dispose();
    emailFocusNode.dispose();
    super.dispose();
  }

  // Mengirim link reset password ke email.
  Future<void> sendResetLink() async {
    if (isLoading) {
      return;
    }

    final String email =
        emailController.text.trim().toLowerCase();

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
      await supabase.auth.resetPasswordForEmail(
        email,
        redirectTo:
            'com.example.formaly://login-callback/',
      );

      if (!mounted) {
        return;
      }

      await _showSuccessDialog(email);
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
        'Gagal mengirim link reset password. Silakan coba lagi.',
      );
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }

  // Menampilkan dialog setelah link berhasil dikirim.
  Future<void> _showSuccessDialog(
    String email,
  ) async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          title: Text(
            'Link Reset Password Terkirim',
            style: TextStyle(fontFamily: 'FunnelDisplay',

              fontWeight: FontWeight.bold,
            ),
          ),
          content: Text(
            'Link untuk mengubah password sudah dikirim ke $email.\n\n'
            'Buka email tersebut, lalu tekan tombol "Reset Password".',
            style: TextStyle(fontFamily: 'FunnelDisplay',

              height: 1.6,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(dialogContext);
              },
              child: const Text(
                'Mengerti',
              ),
            ),
          ],
        );
      },
    );
  }

  // Memvalidasi format email.
  bool _isValidEmail(
    String email,
  ) {
    final RegExp emailRegex = RegExp(
      r'^[^@\s]+@[^@\s]+\.[^@\s]+$',
    );

    return emailRegex.hasMatch(email);
  }

  // Mengarahkan focus kembali ke field email.
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

  // Menampilkan pesan menggunakan SnackBar.
  void _showMessage(
    String message,
  ) {
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
          behavior: SnackBarBehavior.floating,
          duration: const Duration(
            seconds: 3,
          ),
        ),
      );
  }

  // Membersihkan pesan error dari Supabase.
  String _cleanAuthMessage(
    String message,
  ) {
    final String clean = message.trim();

    if (clean.isEmpty) {
      return 'Gagal mengirim link reset password. Silakan coba lagi.';
    }

    return clean;
  }

  @override
  Widget build(
    BuildContext context,
  ) {
    return AuthShell(
      showHeadline: false,
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
                      'Lupa Password',
                      style: TextStyle(fontFamily: 'FunnelDisplay',

                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: kDarks,
                        height: 1.2,
                      ),
                    ),

                    const SizedBox(height: 8),

                    Text(
                      'Masukkan email kamu, dan kami akan mengirimkan tautan untuk mengatur ulang password.',
                      style: TextStyle(fontFamily: 'FunnelDisplay',

                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: kTinted,
                        height: 1.5,
                      ),
                    ),

                    const SizedBox(height: 24),

                    Text(
                      'Email',
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
                        controller: emailController,
                        focusNode: emailFocusNode,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.done,
                        enabled: !isLoading,
                        autocorrect: false,
                        enableSuggestions: false,
                        textCapitalization: TextCapitalization.none,
                        onSubmitted: (_) => sendResetLink(),
                        style: TextStyle(fontFamily: 'FunnelDisplay',

                          fontSize: 13,
                          color: kDarks,
                        ),
                        decoration: InputDecoration(
                          hintText: 'nama@email.com',
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
                    ),

                    const SizedBox(height: 24),

                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: ElevatedButton.icon(
                        onPressed: isLoading ? null : sendResetLink,
                        icon: const Icon(
                          Icons.key_outlined,
                          size: 16,
                        ),
                        label: Text(
                          'Kirim Tautan Reset',
                          style: TextStyle(fontFamily: 'FunnelDisplay',

                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: kDarks,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor:
                              const Color(0xff96989D),
                          disabledForegroundColor: Colors.white,
                          elevation: 0,
                          shape: const StadiumBorder(),
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
                            : () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: kBase,
                          foregroundColor: kDarks,
                          side: const BorderSide(
                            color: kSecond,
                          ),
                          elevation: 0,
                          shape: const StadiumBorder(),
                        ),
                        child: Text(
                          'Sudah ingat? Masuk',
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
}