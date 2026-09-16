import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

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
      if (!mounted) {
        return;
      }

      setState(() {
        isLoading = false;
      });
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
            style: GoogleFonts.poppins(
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Text(
            'Link untuk mengubah password sudah dikirim ke $email.\n\n'
            'Buka email tersebut, lalu tekan tombol "Reset Password".',
            style: GoogleFonts.poppins(
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
            style: GoogleFonts.poppins(
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
    return Scaffold(
      // Design saja yang disesuaikan dengan gambar referensi.
      backgroundColor: const Color(0xffF7F7F7),

      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior:
              ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(
            10,
            28,
            10,
            24,
          ),
          child: Column(
            children: [
              // Logo Formaly:
              // "Form" bold, "aly" regular.
              RichText(
                text: TextSpan(
                  children: [
                    TextSpan(
                      text: 'Form',
                      style: GoogleFonts.poppins(
                        fontSize: 36,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xff3E4149),
                        letterSpacing: -1,
                        height: 1,
                      ),
                    ),
                    TextSpan(
                      text: 'aly',
                      style: GoogleFonts.poppins(
                        fontSize: 36,
                        fontWeight: FontWeight.w400,
                        color: const Color(0xff3E4149),
                        letterSpacing: -1,
                        height: 1,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 30),

              // Card utama mengikuti gambar referensi.
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(
                  20,
                  22,
                  20,
                  22,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Tombol kembali berada di dalam card.
                    Material(
                      color: const Color(0xffF7F7F7),
                      elevation: 1,
                      shadowColor: Colors.black12,
                      shape: const CircleBorder(),
                      child: InkWell(
                        customBorder: const CircleBorder(),
                        onTap: isLoading
                            ? null
                            : () => Navigator.pop(context),
                        child: const SizedBox(
                          width: 34,
                          height: 34,
                          child: Icon(
                            Icons.arrow_back_rounded,
                            size: 17,
                            color: Color(0xff3E4149),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 11),

                    Text(
                      'Kata Sandi Lupa',
                      style: GoogleFonts.poppins(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xff3E4149),
                        height: 1.2,
                      ),
                    ),

                    const SizedBox(height: 8),

                    Text(
                      'Masukkan email kamu, dan kami akan\n'
                      'mengirimkan tautan untuk mengatur\n'
                      'ulang kata sandi.',
                      style: GoogleFonts.poppins(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w400,
                        color: const Color(0xff9299AA),
                        height: 1.5,
                      ),
                    ),

                    const SizedBox(height: 22),

                    Text(
                      'E-mail',
                      style: GoogleFonts.poppins(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xff30333A),
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
                        style: GoogleFonts.poppins(
                          fontSize: 12.5,
                          color: const Color(0xff30333A),
                        ),
                        decoration: InputDecoration(
                          hintText: 'nama@email.com',
                          hintStyle: GoogleFonts.poppins(
                            fontSize: 12.5,
                            color: const Color(0xff929292),
                          ),
                          filled: true,
                          fillColor: const Color(0xffF5F5F5),
                          contentPadding:
                              const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 0,
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(4),
                            borderSide: const BorderSide(
                              color: Color(0xffE6E6E6),
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(4),
                            borderSide: const BorderSide(
                              color: Color(0xffCFCFCF),
                            ),
                          ),
                          disabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(4),
                            borderSide: const BorderSide(
                              color: Color(0xffE6E6E6),
                            ),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    SizedBox(
                      width: double.infinity,
                      height: 40,
                      child: ElevatedButton.icon(
                        onPressed: isLoading ? null : sendResetLink,
                        icon: const Icon(
                          Icons.key_outlined,
                          size: 16,
                        ),
                        label: Text(
                          'Kirim Tautan Reset',
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xff3E4149),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor:
                              const Color(0xff96989D),
                          disabledForegroundColor: Colors.white,
                          elevation: 0,
                          padding: EdgeInsets.zero,
                          shape: const StadiumBorder(),
                        ),
                      ),
                    ),

                    const SizedBox(height: 8),

                    SizedBox(
                      width: double.infinity,
                      height: 40,
                      child: OutlinedButton(
                        onPressed: isLoading
                            ? null
                            : () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: const Color(0xffF7F7F7),
                          foregroundColor: const Color(0xff30333A),
                          side: const BorderSide(
                            color: Color(0xffE6E6E6),
                          ),
                          elevation: 0,
                          padding: EdgeInsets.zero,
                          shape: const StadiumBorder(),
                        ),
                        child: Text(
                          'Sudah Ingat? Masuk',
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
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
}
