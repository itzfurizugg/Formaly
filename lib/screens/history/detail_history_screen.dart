import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/constants/app_color.dart';
import '../../core/models/history_model.dart';
import '../../core/services/history_service.dart';

class DetailHistoryScreen extends StatefulWidget {
  final HistoryModel history;

  const DetailHistoryScreen({
    super.key,
    required this.history,
  });

  @override
  State<DetailHistoryScreen> createState() =>
      _DetailHistoryScreenState();
}

class _DetailHistoryScreenState extends State<DetailHistoryScreen> {
  bool _isDeleting = false;

  // Mengambil teks yang aman untuk ditampilkan.
  String _safeText(String? value) {
    if (value == null) {
      return '-';
    }

    final String text = value.trim();

    return text.isEmpty ? '-' : text;
  }

  // Menghapus history setelah konfirmasi.
  Future<void> _deleteHistory() async {
    if (_isDeleting) {
      return;
    }

    final colors = Theme.of(context).colorScheme;

    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            'Hapus riwayat?',
            style: GoogleFonts.poppins(
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Text(
            'Riwayat pengerjaan ini akan dihapus. '
            'Tindakan ini tidak dapat dibatalkan.',
            style: GoogleFonts.poppins(
              height: 1.5,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(
                  dialogContext,
                  false,
                );
              },
              child: Text(
                'Batal',
                style: GoogleFonts.poppins(
                  color: colors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(
                  dialogContext,
                  true,
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: colors.error,
                foregroundColor: colors.onError,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                'Hapus',
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );
      },
    );

    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _isDeleting = true;
    });

    try {
      await HistoryService.deleteHistory(
        widget.history.submissionId ?? '',
      );

      if (!mounted) {
        return;
      }

      Navigator.pop(
        context,
        true,
      );
    } catch (e) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isDeleting = false;
      });

      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            backgroundColor: colors.error,
            content: Text(
              'Gagal menghapus riwayat: ${e.toString()}',
              style: GoogleFonts.poppins(
                fontSize: 13,
              ),
            ),
          ),
        );
    }
  }

  // Menampilkan satu item informasi.
  Widget buildItem(
    BuildContext context,
    String title,
    String value,
    Color accentColor,
  ) {
    final colors = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.only(
        bottom: 16,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: accentColor.withAlpha(28),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              _getInfoIcon(title),
              size: 18,
              color: accentColor,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.only(
                top: 7,
              ),
              child: Text(
                title,
                style: GoogleFonts.poppins(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: colors.onSurfaceVariant,
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Padding(
            padding: const EdgeInsets.only(
              top: 7,
            ),
            child: Text(
              ':',
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.w600,
                color: colors.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 3,
            child: Padding(
              padding: const EdgeInsets.only(
                top: 7,
              ),
              child: Text(
                value,
                style: GoogleFonts.poppins(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: colors.onSurface,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Menentukan icon berdasarkan jenis informasi.
  IconData _getInfoIcon(String title) {
    switch (title) {
      case 'Tag':
        return Icons.tag_rounded;
      case 'Tanggal':
        return Icons.calendar_today_outlined;
      case 'Jam Mulai':
        return Icons.play_circle_outline;
      case 'Jam Selesai':
        return Icons.stop_circle_outlined;
      case 'Durasi':
        return Icons.timer_outlined;
      case 'Total Soal':
        return Icons.quiz_outlined;
      default:
        return Icons.info_outline_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    final String title = _safeText(
      widget.history.title,
    );

    final String tag = widget.history.token.trim().isEmpty ||
            widget.history.token.trim() == '-'
        ? '-'
        : widget.history.token.trim();

    final String date = _safeText(
      widget.history.date,
    );

    final String startTime = _safeText(
      widget.history.startTime,
    );

    final String finishTime = _safeText(
      widget.history.finishTime,
    );

    final String duration = _safeText(
      widget.history.duration,
    );

    final String totalQuestion =
        (widget.history.totalQuestion < 0
                ? 0
                : widget.history.totalQuestion)
            .toString();

    final bool isFinished = widget.history.isFinished;

    // Warna status pengerjaan.
    final Color statusBackground = isFinished
        ? AppColor.success.withAlpha(28)
        : AppColor.warning.withAlpha(32);

    final Color statusBorder = isFinished
        ? AppColor.success.withAlpha(90)
        : AppColor.warning.withAlpha(100);

    final Color statusIcon =
        isFinished ? AppColor.success : AppColor.warning;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,

      // App bar halaman detail.
      appBar: AppBar(
        backgroundColor: colors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: Text(
          'Detail Riwayat',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.bold,
            color: colors.onSurface,
          ),
        ),
      ),

      // Isi halaman detail.
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header informasi riwayat.
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    colors.primaryContainer,
                    colors.surface,
                  ],
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: colors.primary.withAlpha(70),
                ),
                boxShadow: [
                  BoxShadow(
                    color: colors.primary.withAlpha(18),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              colors.primary,
                              colors.secondary,
                            ],
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(
                          Icons.description_outlined,
                          color: colors.onPrimary,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          title,
                          style: GoogleFonts.poppins(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: colors.onSurface,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: colors.secondaryContainer,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: colors.secondary.withAlpha(65),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.tag_rounded,
                          size: 17,
                          color: colors.onSecondaryContainer,
                        ),
                        const SizedBox(width: 7),
                        Text(
                          'Tag: $tag',
                          style: GoogleFonts.poppins(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: colors.onSecondaryContainer,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Judul informasi pengerjaan.
            Text(
              'Informasi Pengerjaan',
              style: GoogleFonts.poppins(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: colors.onSurface,
              ),
            ),

            const SizedBox(height: 12),

            // Detail data pengerjaan.
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: colors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: colors.outlineVariant,
                ),
                boxShadow: [
                  BoxShadow(
                    color: colors.primary.withAlpha(13),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  buildItem(
                    context,
                    'Tag',
                    tag,
                    colors.secondary,
                  ),
                  buildItem(
                    context,
                    'Tanggal',
                    date,
                    colors.tertiary,
                  ),
                  buildItem(
                    context,
                    'Jam Mulai',
                    startTime,
                    colors.primary,
                  ),
                  buildItem(
                    context,
                    'Jam Selesai',
                    finishTime,
                    AppColor.danger,
                  ),
                  buildItem(
                    context,
                    'Durasi',
                    duration,
                    colors.tertiary,
                  ),
                  Divider(
                    height: 10,
                    color: colors.outlineVariant,
                  ),
                  const SizedBox(height: 12),
                  buildItem(
                    context,
                    'Total Soal',
                    totalQuestion,
                    colors.primary,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Status pengerjaan.
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: 18,
                vertical: 16,
              ),
              decoration: BoxDecoration(
                color: statusBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: statusBorder,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: statusIcon.withAlpha(28),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      isFinished
                          ? Icons.check_circle
                          : Icons.schedule_outlined,
                      color: statusIcon,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isFinished
                              ? 'Pengerjaan Selesai'
                              : 'Pengerjaan Belum Selesai',
                          style: GoogleFonts.poppins(
                            fontWeight: FontWeight.bold,
                            color: statusIcon,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          isFinished
                              ? 'Jawaban telah dikirim.'
                              : 'Pengerjaan belum selesai.',
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            color: colors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Catatan privasi untuk user.
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colors.primaryContainer,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: colors.primary.withAlpha(60),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: colors.primary.withAlpha(25),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.info_outline,
                      color: colors.primary,
                      size: 21,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        'Detail nilai dan jawaban tidak ditampilkan pada riwayat user.',
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          color: colors.onSurfaceVariant,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Tombol hapus riwayat.
            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton.icon(
                onPressed: _isDeleting ? null : _deleteHistory,
                icon: _isDeleting
                    ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          color: colors.error,
                        ),
                      )
                    : const Icon(
                        Icons.delete_outline_rounded,
                      ),
                label: Text(
                  _isDeleting
                      ? 'Menghapus...'
                      : 'Hapus Riwayat',
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: colors.error,
                  side: BorderSide(
                    color: colors.error.withAlpha(100),
                  ),
                  backgroundColor: colors.errorContainer,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 25),
          ],
        ),
      ),
    );
  }
}