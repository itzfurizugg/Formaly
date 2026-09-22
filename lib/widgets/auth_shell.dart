import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AuthShell extends StatelessWidget {
  // Layar pembungkus halaman autentikasi agar konsisten
  // dengan desain web (/login, /register, dan sebagainya):
  // - Mobile: panel abu gelap di atas, form di bawah.
  // - Desktop/tablet lebar: panel kiri + form kanan.
  final Widget child;

  // Menampilkan judul dan deskripsi brand di panel (login/register),
  // atau hanya logo (forgot/otp/reset).
  final bool showHeadline;

  const AuthShell({
    super.key,
    required this.child,
    this.showHeadline = true,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xffF7F7F7),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final bool wide = constraints.maxWidth >= 1024;
          if (wide) {
            return Row(
              children: [
                Expanded(flex: 5, child: _BrandSide(showHeadline: showHeadline)),
                Expanded(
                  flex: 5,
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(32),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 520),
                        child: child,
                      ),
                    ),
                  ),
                ),
              ],
            );
          }
          return SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            child: Column(
              children: [
                const _MobileBar(),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 520),
                      child: child,
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// Panel kiri desktop: latar abu gelap dengan logo, judul, dan deskripsi.
class _BrandSide extends StatelessWidget {
  final bool showHeadline;

  const _BrandSide({required this.showHeadline});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xff393E46),
      padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 56),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Formaly',
            style: GoogleFonts.poppins(
              color: Colors.white,
              fontSize: 36,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (showHeadline) ...[
            const SizedBox(height: 42),
            Text(
              'Buat lebih mudah.\nKerjakan dengan gampang.',
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 40,
                fontWeight: FontWeight.w700,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Kelola formulir dan data dengan cepat, mudah, dan efisien. Platform all-in-one untuk kebutuhan form kamu.',
              style: GoogleFonts.poppins(
                color: Colors.white70,
                fontSize: 16,
                height: 1.6,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// Panel atas mobile: bar abu gelap berisi logo.
class _MobileBar extends StatelessWidget {
  const _MobileBar();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xff393E46),
      padding:
          const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Text(
        'Formaly',
        style: GoogleFonts.poppins(
          color: Colors.white,
          fontSize: 22,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}