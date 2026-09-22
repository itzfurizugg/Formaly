import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/routes/app_routes.dart';
import '../../widgets/auth_shell.dart';

class NewPasswordScreen extends StatefulWidget {
  // Halaman untuk membuat password baru.
  const NewPasswordScreen({super.key});

  @override
  State<NewPasswordScreen> createState() =>
      _NewPasswordScreenState();
}

class _NewPasswordScreenState
    extends State<NewPasswordScreen> {
  // Controller untuk password dan konfirmasi password.
  final TextEditingController passwordController =
      TextEditingController();

  final TextEditingController confirmPasswordController =
      TextEditingController();

  // Focus untuk field password.
  final FocusNode passwordFocusNode =
      FocusNode();

  final FocusNode confirmPasswordFocusNode =
      FocusNode();

  // Status proses dan visibilitas password.
  bool isLoading = false;
  bool obscurePassword = true;
  bool obscureConfirmPassword = true;

  // Client untuk mengakses Supabase.
  SupabaseClient get supabase =>
      Supabase.instance.client;

  @override
  void dispose() {
    passwordController.dispose();
    confirmPasswordController.dispose();
    passwordFocusNode.dispose();
    confirmPasswordFocusNode.dispose();
    super.dispose();
  }

  // Mengubah password user di Supabase.
  Future<void> updatePassword() async {
    if (isLoading) {
      return;
    }

    final String password =
        passwordController.text;

    final String confirmPassword =
        confirmPasswordController.text;

    // Validasi password.
    if (password.isEmpty) {
      _showMessage(
        'Masukkan password baru terlebih dahulu.',
      );
      _focusPassword();
      return;
    }

    if (password.length < 6) {
      _showMessage(
        'Password minimal 6 karakter.',
      );
      _focusPassword();
      return;
    }

    if (confirmPassword.isEmpty) {
      _showMessage(
        'Masukkan konfirmasi password.',
      );
      _focusConfirmPassword();
      return;
    }

    if (password != confirmPassword) {
      _showMessage(
        'Konfirmasi password tidak sama.',
      );
      _focusConfirmPassword();
      return;
    }

    // Memastikan recovery session tersedia.
    final session =
        supabase.auth.currentSession;

    if (session == null) {
      _showMessage(
        'Sesi pemulihan tidak ditemukan. '
        'Silakan ulangi proses lupa password.',
      );
      return;
    }

    FocusScope.of(context).unfocus();

    setState(() {
      isLoading = true;
    });

    try {
      // Mengubah password di Supabase Auth.
      await supabase.auth.updateUser(
        UserAttributes(
          password: password,
        ),
      );

      // Logout setelah password berhasil diubah.
      await supabase.auth.signOut();

      if (!mounted) {
        return;
      }

      // Dialog konfirmasi password berhasil diubah.
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
              'Password Berhasil Diubah',
              style: TextStyle(fontFamily: 'FunnelDisplay',

                fontWeight: FontWeight.bold,
              ),
            ),
            content: Text(
              'Password kamu sudah berhasil '
              'diperbarui. Silakan login kembali.',
              style: TextStyle(fontFamily: 'FunnelDisplay',

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
    } catch (_) {
      if (!mounted) {
        return;
      }

      _showMessage(
        'Gagal mengubah password. Silakan coba lagi.',
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

  // Mengarahkan focus ke password baru.
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

  // Mengarahkan focus ke konfirmasi password.
  void _focusConfirmPassword() {
    if (!mounted) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback(
      (_) {
        if (!mounted) {
          return;
        }

        confirmPasswordFocusNode.requestFocus();
      },
    );
  }

  // Menampilkan atau menyembunyikan password.
  void _togglePasswordVisibility() {
    if (isLoading) {
      return;
    }

    setState(() {
      obscurePassword =
          !obscurePassword;
    });
  }

  // Menampilkan atau menyembunyikan konfirmasi password.
  void _toggleConfirmPasswordVisibility() {
    if (isLoading) {
      return;
    }

    setState(() {
      obscureConfirmPassword =
          !obscureConfirmPassword;
    });
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
              const Duration(seconds: 3),
        ),
      );
  }

  // Membersihkan pesan error dari Supabase.
  String _cleanAuthMessage(String message) {
    final String clean =
        message.trim();

    if (clean.isEmpty) {
      return 'Password gagal diperbarui. Silakan coba lagi.';
    }

    return clean;
  }

  @override
  Widget build(BuildContext context) {
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
                onTap: isLoading ? null : () => Navigator.pop(context),
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
              'Buat Password Baru',
              style:
                  TextStyle(fontFamily: 'FunnelDisplay',

                fontSize: 24,
                fontWeight:
                    FontWeight.w700,
                color: kDarks,
                height: 1.2,
              ),
            ),

              const SizedBox(
                height: 8,
              ),

              // Deskripsi halaman.
              Text(
                'Masukkan password baru untuk akun kamu.',
                style:
                    TextStyle(fontFamily: 'FunnelDisplay',

                  fontSize: 14,
                  color: kTinted,
                  height: 1.5,
                ),
              ),

              const SizedBox(
                height: 24,
              ),

              // Label password baru.
              Text(
                'Password Baru',
                style:
                    TextStyle(fontFamily: 'FunnelDisplay',

                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: kDarks,
                ),
              ),

              const SizedBox(
                height: 8,
              ),

              // Input password baru.
              TextField(
                controller:
                    passwordController,
                focusNode:
                    passwordFocusNode,
                enabled: !isLoading,
                obscureText:
                    obscurePassword,
                textInputAction:
                    TextInputAction.next,
                autocorrect: false,
                enableSuggestions: false,
                onSubmitted: (_) {
                  confirmPasswordFocusNode
                      .requestFocus();
                },
                decoration:
                    InputDecoration(
                  hintText:
                      'Masukkan password baru',
                  suffixIcon:
                      IconButton(
                    onPressed:
                        _togglePasswordVisibility,
                    icon: Icon(
                      obscurePassword
                          ? Icons
                              .visibility_outlined
                          : Icons
                              .visibility_off_outlined,
                    ),
                  ),
                  filled: true,
                  fillColor: kSecond,
                  border:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(12),
                    borderSide:
                        BorderSide.none,
                  ),
                  enabledBorder:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(12),
                    borderSide:
                        BorderSide(
                      color:
                          Colors.grey.shade300,
                    ),
                  ),
                  focusedBorder:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(12),
                    borderSide:
                        const BorderSide(
                      color: kDone,
                      width: 1.2,
                    ),
                  ),
                  disabledBorder:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(12),
                    borderSide:
                        BorderSide(
                      color:
                          Colors.grey.shade200,
                    ),
                  ),
                  contentPadding:
                      const EdgeInsets
                          .symmetric(
                    vertical: 17,
                    horizontal: 16,
                  ),
                ),
              ),

              const SizedBox(
                height: 20,
              ),

              // Label konfirmasi password.
              Text(
                'Konfirmasi Password',
                style:
                    TextStyle(fontFamily: 'FunnelDisplay',

                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: kDarks,
                ),
              ),

              const SizedBox(
                height: 8,
              ),

              // Input konfirmasi password.
              TextField(
                controller:
                    confirmPasswordController,
                focusNode:
                    confirmPasswordFocusNode,
                enabled: !isLoading,
                obscureText:
                    obscureConfirmPassword,
                textInputAction:
                    TextInputAction.done,
                autocorrect: false,
                enableSuggestions: false,
                onSubmitted: (_) =>
                    updatePassword(),
                decoration:
                    InputDecoration(
                  hintText:
                      'Ulangi password baru',
                  suffixIcon:
                      IconButton(
                    onPressed:
                        _toggleConfirmPasswordVisibility,
                    icon: Icon(
                      obscureConfirmPassword
                          ? Icons
                              .visibility_outlined
                          : Icons
                              .visibility_off_outlined,
                    ),
                  ),
                  filled: true,
                  fillColor: kSecond,
                  border:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(12),
                    borderSide:
                        BorderSide.none,
                  ),
                  enabledBorder:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(12),
                    borderSide:
                        BorderSide(
                      color:
                          Colors.grey.shade300,
                    ),
                  ),
                  focusedBorder:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(12),
                    borderSide:
                        const BorderSide(
                      color: kDone,
                      width: 1.2,
                    ),
                  ),
                  disabledBorder:
                      OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(12),
                    borderSide:
                        BorderSide(
                      color:
                          Colors.grey.shade200,
                    ),
                  ),
                  contentPadding:
                      const EdgeInsets
                          .symmetric(
                    vertical: 17,
                    horizontal: 16,
                  ),
                ),
              ),

              const SizedBox(
                height: 28,
              ),

              // Tombol menyimpan password.
              SizedBox(
                width:
                    double.infinity,
                height: 48,
                child:
                    ElevatedButton(
                  onPressed:
                      isLoading
                          ? null
                          : updatePassword,
                  style:
                      ElevatedButton.styleFrom(
                    backgroundColor: kDarks,
                    disabledBackgroundColor:
                        Colors.grey.shade400,
                    foregroundColor:
                        Colors.white,
                    elevation: 0,
                    shape: const StadiumBorder(),
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
                          'Simpan Password',
                          style:
                              TextStyle(fontFamily: 'FunnelDisplay',

                            fontSize: 15,
                            fontWeight:
                                FontWeight.bold,
                          ),
                        ),
                ),
              ),

              const SizedBox(
                height: 20,
              ),

              // Informasi setelah password diubah.
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
                      Icons.security_outlined,
                      size: 20,
                      color:
                          Colors.grey.shade700,
                    ),

                    const SizedBox(
                      width: 10,
                    ),

                    Expanded(
                      child:
                          Text(
                        'Setelah password berhasil diubah, '
                        'kamu akan diarahkan kembali ke halaman '
                        'login untuk masuk dengan password baru.',
                        style:
                            TextStyle(fontFamily: 'FunnelDisplay',

                          fontSize:
                              12,
                          color:
                              Colors.grey.shade700,
                          height:
                              1.5,
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