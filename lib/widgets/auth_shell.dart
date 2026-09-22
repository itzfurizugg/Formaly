import 'package:flutter/material.dart';

// Palet Formaly (sama dengan formaly-web/src/index.css).
const Color kBase = Color(0xffF7F7F7);
const Color kSecond = Color(0xffEEEEEE);
const Color kTinted = Color(0xff929AAB);
const Color kDarks = Color(0xff393E46);
const Color kDone = Color(0xff007DCC);
const Color kPass = Color(0xff2FA084);
const Color kWrong = Color(0xffD90000);

class AuthShell extends StatelessWidget {
  // Layar pembungkus halaman autentikasi agar konsisten
  // dengan desain web (/login, /register, dan sebagainya):
  // - Mobile: band/banner abu gelap di atas, form di bawah.
  // - Desktop/tablet lebar: panel kiri + form kanan.
  final Widget child;

  // true untuk login/register: band menampilkan logo + headline + deskripsi.
  // false untuk forgot/otp/reset: hanya bar logo ramping.
  final bool showHeadline;

  const AuthShell({
    super.key,
    required this.child,
    this.showHeadline = true,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBase,
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth >= 1024) {
            return Row(
              children: [
                Expanded(
                  flex: 5,
                  child: _BrandSide(showHeadline: showHeadline),
                ),
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
          if (showHeadline) {
            // Mobile login/register: dark hero area ambil SISA tinggi saja;
            // form dapat tinggi natural dulu lalu nempel ke bawah (justify-end).
            return Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Expanded(child: _MobileHero()),
                Container(
                  constraints: BoxConstraints(
                    maxHeight: constraints.maxHeight,
                  ),
                  child: SingleChildScrollView(
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    padding: const EdgeInsets.fromLTRB(16, 24, 16, 40),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 576),
                        child: child,
                      ),
                    ),
                  ),
                ),
              ],
            );
          }
          return Column(
            children: [
              const _MobileTopBar(),
              Flexible(
                child: SingleChildScrollView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 40),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 576),
                      child: child,
                    ),
                  ),
                ),
              ),
            ],
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
      color: kDarks,
      padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 56),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Formaly',
            style: TextStyle(fontFamily: 'FunnelDisplay',

              color: Colors.white,
              fontSize: 36,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (showHeadline) ...[
            const SizedBox(height: 42),
            Text(
              'Buat lebih mudah.\nKerjakan dengan gampang.',
              style: TextStyle(fontFamily: 'FunnelDisplay',

                color: Colors.white,
                fontSize: 40,
                fontWeight: FontWeight.w700,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Kelola formulir dan data dengan cepat, mudah, dan efisien. Platform all-in-one untuk kebutuhan form kamu.',
              style: TextStyle(fontFamily: 'FunnelDisplay',

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

// Band atas mobile untuk login/register (konten rata bawah, mengisi sisa tinggi).
class _MobileHero extends StatelessWidget {
  const _MobileHero();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: kDarks,
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Formaly',
            style: TextStyle(fontFamily: 'FunnelDisplay',

              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Buat lebih mudah.',
            style: TextStyle(fontFamily: 'FunnelDisplay',

              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w700,
              height: 1.25,
            ),
          ),
          Text(
            'Kerjakan dengan gampang.',
            style: TextStyle(fontFamily: 'FunnelDisplay',

              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w700,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Kelola formulir dan data dengan cepat, mudah, dan efisien. Platform all-in-one untuk kebutuhan form kamu.',
            style: TextStyle(fontFamily: 'FunnelDisplay',

              color: Colors.white70,
              fontSize: 12,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }
}

// Bar atas mobile ramping: hanya logo (forgot/otp/reset/verify).
class _MobileTopBar extends StatelessWidget {
  const _MobileTopBar();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: kDarks,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Text(
        'Formaly',
        style: TextStyle(fontFamily: 'FunnelDisplay',

          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}