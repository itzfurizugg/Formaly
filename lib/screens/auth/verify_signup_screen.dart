import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/routes/app_routes.dart';
import '../../widgets/auth_shell.dart';

class VerifySignupScreen extends StatefulWidget {
  // Email yang digunakan untuk pendaftaran.
  final String email;

  // Nama user dari proses pendaftaran.
  final String name;

  const VerifySignupScreen({
    super.key,
    required this.email,
    required this.name,
  });

  @override
  State<VerifySignupScreen> createState() =>
      _VerifySignupScreenState();
}

class _VerifySignupScreenState
    extends State<VerifySignupScreen> {
  // Controller dan focus untuk input OTP.
  final TextEditingController otpController =
      TextEditingController();

  final FocusNode otpFocusNode =
      FocusNode();

  // Status proses verifikasi dan kirim ulang.
  bool isLoading = false;
  bool isResending = false;

  // Client untuk mengakses Supabase.
  SupabaseClient get supabase =>
      Supabase.instance.client;

  // Email yang sudah dinormalisasi.
  String get normalizedEmail =>
      widget.email.trim().toLowerCase();

  // Nama yang sudah dirapikan.
  String get normalizedName =>
      widget.name.trim();

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

  // Memverifikasi OTP untuk pendaftaran akun.
  Future<void> verifySignup() async {
    if (isLoading || isResending) {
      return;
    }

    final String token =
        otpController.text.trim();

    if (!RegExp(r'^\d{6}$').hasMatch(token)) {
      _showMessage(
        'Masukkan 6 digit kode verifikasi.',
      );
      _focusOtp();
      return;
    }

    FocusScope.of(context).unfocus();

    setState(() {
      isLoading = true;
    });

    try {
      // Verifikasi OTP signup menggunakan Supabase.
      final AuthResponse response =
          await supabase.auth.verifyOTP(
        type: OtpType.signup,
        token: token,
        email: normalizedEmail,
      );

      final User? user =
          response.user ??
          supabase.auth.currentUser;

      if (user == null) {
        throw const AuthException(
          'Email berhasil diverifikasi, tetapi akun tidak ditemukan.',
        );
      }

      // Menyimpan data profil user.
      await _syncProfileData(
        userId: user.id,
        name: normalizedName,
        email: normalizedEmail,
      );

      // Logout setelah verifikasi berhasil.
      await supabase.auth.signOut();

      if (!mounted) {
        return;
      }

      await _showSuccessDialog();

      if (!mounted) {
        return;
      }

      // Kembali ke halaman login.
      Navigator.pushNamedAndRemoveUntil(
        context,
        AppRoutes.login,
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
        'Data akun belum berhasil disimpan: ${e.message}',
      );
    } catch (e) {
      if (!mounted) {
        return;
      }

      _showMessage(
        'Verifikasi gagal: ${_cleanError(e)}',
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

  // Menyimpan data user ke tabel public.
  Future<void> _syncProfileData({
    required String userId,
    required String name,
    required String email,
  }) async {
    if (userId.trim().isEmpty) {
      throw Exception(
        'ID user tidak valid.',
      );
    }

    if (name.isEmpty) {
      throw Exception(
        'Nama pendaftar tidak ditemukan.',
      );
    }

    if (email.isEmpty) {
      throw Exception(
        'Email pendaftar tidak ditemukan.',
      );
    }

    // USERS menjadi sumber data utama profile.
    await supabase.from('users').upsert(
      {
        'id': userId,
        'name': name,
        'email': email,
      },
      onConflict: 'id',
    );

    // Sinkronisasi data ke profiles.
    try {
      await supabase.from('profiles').upsert(
        {
          'id': userId,
          'name': name,
        },
        onConflict: 'id',
      );
    } on PostgrestException {
      // Diabaikan karena data utama sudah tersimpan di users.
    }
  }

  // Mengirim ulang OTP pendaftaran.
  Future<void> resendSignupOtp() async {
    if (isLoading || isResending) {
      return;
    }

    setState(() {
      isResending = true;
    });

    try {
      // Mengirim kode verifikasi baru.
      await supabase.auth.resend(
        type: OtpType.signup,
        email: normalizedEmail,
      );

      if (!mounted) {
        return;
      }

      otpController.clear();

      _showMessage(
        'Kode verifikasi baru sudah dikirim ke email kamu.',
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
        'Gagal mengirim ulang kode verifikasi.',
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

  // Menampilkan dialog setelah verifikasi berhasil.
  Future<void> _showSuccessDialog() async {
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius:
                BorderRadius.circular(18),
          ),
          title: Text(
            'Pendaftaran Berhasil',
            style: GoogleFonts.poppins(
              fontWeight:
                  FontWeight.bold,
            ),
          ),
          content: Text(
            'Email kamu sudah terverifikasi dan data akun berhasil disimpan. Silakan login untuk mulai menggunakan Formaly.',
            style: GoogleFonts.poppins(
              height: 1.5,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(
                  dialogContext,
                );
              },
              child: const Text(
                'OK',
              ),
            ),
          ],
        );
      },
    );
  }

  // Mengarahkan focus ke input OTP.
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
        ? 'Verifikasi email gagal. Silakan coba lagi.'
        : clean;
  }

  // Membersihkan pesan error umum.
  String _cleanError(Object error) {
    final String text =
        error.toString();

    if (text.startsWith('Exception: ')) {
      return text.substring(
        'Exception: '.length,
      );
    }

    return text;
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
              'Verifikasi Email',
              style: GoogleFonts.poppins(
                fontSize: 26,
                fontWeight: FontWeight.w700,
                color: const Color(0xff393E46),
              ),
            ),

              const SizedBox(height: 8),

              // Informasi verifikasi.
              Text(
                'Masukkan kode 6 digit yang dikirim ke email kamu untuk menyelesaikan pendaftaran.',
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  color:
                      Colors.grey.shade600,
                  height: 1.6,
                ),
              ),

              const SizedBox(height: 5),

              Text(
                normalizedEmail,
                maxLines: 2,
                overflow:
                    TextOverflow.ellipsis,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight:
                      FontWeight.w600,
                ),
              ),

              const SizedBox(height: 36),

              // Label kode verifikasi.
              Text(
                'Kode Verifikasi',
                style: GoogleFonts.poppins(
                  fontWeight:
                      FontWeight.w600,
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
                  fontWeight:
                      FontWeight.bold,
                  letterSpacing: 8,
                ),
                decoration:
                    InputDecoration(
                  counterText: '',
                  hintText: '000000',
                  filled: true,
                  fillColor:
                      const Color(0xffF7F7F7),
                  border:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(14),
                    borderSide:
                        BorderSide.none,
                  ),
                  enabledBorder:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(14),
                    borderSide:
                        BorderSide(
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
                    borderSide:
                        BorderSide(
                      color:
                          Colors.grey.shade200,
                    ),
                  ),
                ),
                onChanged: (_) {
                  setState(() {});
                },
                onSubmitted: (_) {
                  if (canVerify) {
                    verifySignup();
                  }
                },
              ),

              const SizedBox(height: 24),

              // Tombol verifikasi email.
              SizedBox(
                width: double.infinity,
                height: 54,
                child:
                    ElevatedButton(
                  onPressed:
                      canVerify
                          ? verifySignup
                          : null,
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
                          'Verifikasi Email',
                          style:
                              GoogleFonts.poppins(
                            fontWeight:
                                FontWeight.bold,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 14),

              // Tombol kirim ulang kode.
              Center(
                child: TextButton(
                  onPressed:
                      busy
                          ? null
                          : resendSignupOtp,
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
                          'Kirim ulang kode',
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

              // Informasi verifikasi.
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.all(15),
                decoration:
                    BoxDecoration(
                  color:
                      const Color(0xffF8F9FA),
                  borderRadius:
                      BorderRadius.circular(14),
                  border:
                      Border.all(
                    color:
                        Colors.grey.shade200,
                  ),
                ),
                child: Row(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons
                          .mark_email_read_outlined,
                      size: 20,
                      color:
                          Colors.grey.shade700,
                    ),

                    const SizedBox(
                      width: 10,
                    ),

                    Expanded(
                      child: Text(
                        'Kode ini digunakan untuk memverifikasi email saat membuat akun Formaly. Gunakan kode terbaru yang kamu terima.',
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
    );
  }
}