import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../widgets/auth_shell.dart';
import 'new_password_screen.dart';

class VerifyOtpScreen extends StatefulWidget {
  // Email yang digunakan untuk recovery password.
  final String email;

  const VerifyOtpScreen({
    super.key,
    required this.email,
  });

  @override
  State<VerifyOtpScreen> createState() =>
      _VerifyOtpScreenState();
}

class _VerifyOtpScreenState
    extends State<VerifyOtpScreen> {
  // Controller dan focus untuk input OTP.
  final TextEditingController otpController =
      TextEditingController();

  final FocusNode otpFocusNode =
      FocusNode();

  // Status proses verifikasi dan kirim ulang OTP.
  bool isLoading = false;
  bool isResending = false;

  // Client untuk mengakses Supabase.
  SupabaseClient get supabase =>
      Supabase.instance.client;

  // Email yang sudah dinormalisasi.
  String get normalizedEmail =>
      widget.email.trim().toLowerCase();

  @override
  void initState() {
    super.initState();

    // Otomatis fokus ke input OTP.
    WidgetsBinding.instance.addPostFrameCallback(
      (_) {
        if (!mounted) {
          return;
        }

        otpFocusNode.requestFocus();
      },
    );
  }

  @override
  void dispose() {
    otpController.dispose();
    otpFocusNode.dispose();
    super.dispose();
  }

  // Memverifikasi kode OTP recovery.
  Future<void> verifyOtp() async {
    if (isLoading || isResending) {
      return;
    }

    final String token =
        otpController.text.trim();

    if (!RegExp(r'^\d{6}$').hasMatch(token)) {
      _showMessage(
        'Masukkan 6 digit kode OTP.',
      );
      _focusOtp();
      return;
    }

    FocusScope.of(context).unfocus();

    setState(() {
      isLoading = true;
    });

    try {
      // Verifikasi OTP untuk recovery password.
      final AuthResponse response =
          await supabase.auth.verifyOTP(
        type: OtpType.recovery,
        token: token,
        email: normalizedEmail,
      );

      if (response.session == null &&
          supabase.auth.currentSession == null) {
        throw const AuthException(
          'OTP valid, tetapi sesi pemulihan password tidak tersedia.',
        );
      }

      if (!mounted) {
        return;
      }

      // Lanjut ke halaman password baru.
      await Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) =>
              const NewPasswordScreen(),
        ),
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
        'Kode OTP tidak valid atau sudah kedaluwarsa.',
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

  // Mengirim ulang OTP recovery.
  Future<void> resendOtp() async {
    if (isLoading || isResending) {
      return;
    }

    setState(() {
      isResending = true;
    });

    try {
      // Mengirim OTP recovery baru.
      await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
      );

      if (!mounted) {
        return;
      }

      otpController.clear();

      _showMessage(
        'OTP baru sudah dikirim ke email kamu.',
      );

      _focusOtp();
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
        'Gagal mengirim ulang OTP. Silakan coba lagi.',
      );
    } finally {
      if (!mounted) {
        return;
      }

      setState(() {
        isResending = false;
      });
    }
  }

  // Mengarahkan focus kembali ke input OTP.
  void _focusOtp() {
    if (!mounted) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback(
      (_) {
        if (!mounted) {
          return;
        }

        otpFocusNode.requestFocus();
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
            style: GoogleFonts.poppins(
              fontSize: 13,
            ),
          ),
          behavior:
              SnackBarBehavior.floating,
          duration:
              const Duration(seconds: 3),
        ),
      );
  }

  // Membersihkan pesan error dari Supabase.
  String _cleanAuthMessage(String message) {
    final String clean =
        message.trim();

    return clean.isEmpty
        ? 'Proses OTP gagal. Silakan coba lagi.'
        : clean;
  }

  @override
  Widget build(BuildContext context) {
    final bool busy =
        isLoading || isResending;

    final bool canVerify =
        otpController.text.trim().length == 6 &&
        !busy;

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
              color: const Color(0xffEEEEEE),
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: busy ? null : () => Navigator.pop(context),
                child: const SizedBox(
                  width: 40,
                  height: 40,
                  child: Icon(Icons.arrow_back_rounded, size: 20, color: Color(0xff393E46)),
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Judul halaman.
            Text(
              'Verifikasi OTP',
              style: GoogleFonts.poppins(
                fontSize: 26,
                fontWeight: FontWeight.w700,
                color: const Color(0xff393E46),
              ),
            ),

              const SizedBox(height: 8),

              // Informasi email.
              Text(
                'Masukkan kode 6 digit yang dikirim ke:',
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  color: Colors.grey.shade600,
                  height: 1.5,
                ),
              ),

              const SizedBox(height: 5),

              Text(
                normalizedEmail,
                maxLines: 2,
                overflow:
                    TextOverflow.ellipsis,
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),

              const SizedBox(height: 36),

              // Label OTP.
              Text(
                'Kode OTP',
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                ),
              ),

              const SizedBox(height: 8),

              // Input kode OTP.
              TextField(
                controller: otpController,
                focusNode: otpFocusNode,
                keyboardType:
                    TextInputType.number,
                textInputAction:
                    TextInputAction.done,
                enabled: !busy,
                maxLength: 6,
                textAlign: TextAlign.center,
                autocorrect: false,
                enableSuggestions: false,
                inputFormatters: [
                  FilteringTextInputFormatter
                      .digitsOnly,
                  LengthLimitingTextInputFormatter(
                    6,
                  ),
                ],
                style: GoogleFonts.poppins(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 8,
                ),
                decoration: InputDecoration(
                  counterText: '',
                  hintText: '000000',
                  filled: true,
                  fillColor:
                      const Color(0xffF7F7F7),
                  border: OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(14),
                    borderSide:
                        BorderSide.none,
                  ),
                  enabledBorder:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(14),
                    borderSide: BorderSide(
                      color:
                          Colors.grey.shade300,
                    ),
                  ),
                  focusedBorder:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(14),
                    borderSide:
                        const BorderSide(
                      color:
                          Color(0xff343A40),
                      width: 1.2,
                    ),
                  ),
                  disabledBorder:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(14),
                    borderSide: BorderSide(
                      color:
                          Colors.grey.shade200,
                    ),
                  ),
                  contentPadding:
                      const EdgeInsets.symmetric(
                    vertical: 17,
                  ),
                ),
                onChanged: (_) {
                  setState(() {});
                },
                onSubmitted: (_) {
                  if (canVerify) {
                    verifyOtp();
                  }
                },
              ),

              const SizedBox(height: 24),

              // Tombol verifikasi OTP.
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed:
                      canVerify ? verifyOtp : null,
                  style:
                      ElevatedButton.styleFrom(
                    backgroundColor:
                        const Color(0xff393E46),
                    disabledBackgroundColor:
                        Colors.grey.shade400,
                    foregroundColor:
                        Colors.white,
                    elevation: 0,
                    shape:
                        RoundedRectangleBorder(
                      borderRadius:
                          BorderRadius.circular(16),
                    ),
                  ),
                  child: isLoading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child:
                              CircularProgressIndicator(
                            strokeWidth: 2.2,
                            color:
                                Colors.white,
                          ),
                        )
                      : Text(
                          'Verifikasi',
                          style:
                              GoogleFonts.poppins(
                            fontWeight:
                                FontWeight.bold,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 14),

              // Tombol kirim ulang OTP.
              Center(
                child: TextButton(
                  onPressed:
                      busy ? null : resendOtp,
                  child: isResending
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child:
                              CircularProgressIndicator(
                            strokeWidth: 2,
                          ),
                        )
                      : Text(
                          'Kirim ulang OTP',
                          style:
                              GoogleFonts.poppins(
                            fontWeight:
                                FontWeight.w600,
                            color:
                                Colors.black,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 12),

              // Informasi keamanan OTP.
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  color:
                      const Color(0xffF8F9FA),
                  borderRadius:
                      BorderRadius.circular(14),
                  border: Border.all(
                    color:
                        Colors.grey.shade200,
                  ),
                ),
                child: Row(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 20,
                      color:
                          Colors.grey.shade700,
                    ),

                    const SizedBox(width: 10),

                    Expanded(
                      child: Text(
                        'Kode ini digunakan untuk mengatur ulang password akun kamu. Jangan berikan kode kepada orang lain.',
                        style:
                            GoogleFonts.poppins(
                          fontSize: 12,
                          color:
                              Colors.grey.shade700,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              ],
        ),
      ),
    );
  }
}