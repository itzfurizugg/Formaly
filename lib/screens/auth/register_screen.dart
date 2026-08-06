import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../widgets/custom_button.dart';
import '../../widgets/custom_textfield.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final TextEditingController namaController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController =
      TextEditingController();

  @override
  void dispose() {
    namaController.dispose();
    emailController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
  }

  void register() {
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,

      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(
            Icons.arrow_back_ios_new,
            color: Colors.black,
          ),
        ),
      ),

      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: 28,
            vertical: 10,
          ),

          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [

              Text(
                "Daftar",
                style: GoogleFonts.poppins(
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
              ),

              const SizedBox(height: 6),

              Text(
                "Buat akun baru untuk mulai menggunakan Formaly",
                style: GoogleFonts.poppins(
                  color: Colors.grey.shade600,
                  fontSize: 14,
                ),
              ),

              const SizedBox(height: 40),

              Text(
                "Nama Lengkap",
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                ),
              ),

              const SizedBox(height: 8),

              CustomTextField(
                controller: namaController,
                hintText: "Masukkan nama lengkap",
              ),

              const SizedBox(height: 20),

              Text(
                "Email",
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                ),
              ),

              const SizedBox(height: 8),

              CustomTextField(
                controller: emailController,
                hintText: "Masukkan email",
              ),

              const SizedBox(height: 20),

              Text(
                "Password",
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                ),
              ),

              const SizedBox(height: 8),

              CustomTextField(
                controller: passwordController,
                hintText: "Masukkan password",
                obscureText: true,
              ),

              const SizedBox(height: 20),

              Text(
                "Konfirmasi Password",
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                ),
              ),

              const SizedBox(height: 8),

              CustomTextField(
                controller: confirmPasswordController,
                hintText: "Ulangi password",
                obscureText: true,
              ),

              const SizedBox(height: 35),

              CustomButton(
                text: "Daftar",
                onPressed: register,
              ),

              const SizedBox(height: 25),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [

                  Text(
                    "Sudah punya akun?",
                    style: GoogleFonts.poppins(
                      color: Colors.grey.shade700,
                    ),
                  ),

                  TextButton(
                    onPressed: () {
                      Navigator.pop(context);
                    },
                    child: Text(
                      "Masuk",
                      style: GoogleFonts.poppins(
                        color: Colors.black,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),

                ],
              ),

              const SizedBox(height: 20),

            ],
          ),
        ),
      ),
    );
  }
}