import 'package:flutter/material.dart';

import '../../core/models/history_model.dart';
import '../../core/services/history_service.dart';
import '../../widgets/auth_shell.dart';

class DetailHistoryScreen extends StatefulWidget {
  final HistoryModel history;

  const DetailHistoryScreen({super.key, required this.history});

  @override
  State<DetailHistoryScreen> createState() => _DetailHistoryScreenState();
}

class _DetailHistoryScreenState extends State<DetailHistoryScreen> {
  bool _isDeleting = false;

  // Mengambil teks yang aman untuk ditampilkan.
  String _safeText(String? value) {
    if (value == null) return '-';

    final String text = value.trim();

    return text.isEmpty ? '-' : text;
  }

  // Menghapus history setelah konfirmasi (popup bawah).
  Future<void> _deleteHistory() async {
    if (_isDeleting) return;

    final bool? confirmed = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom,
        ),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE0E0E0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Hapus Riwayat',
                style: TextStyle(
                  fontFamily: 'FunnelDisplay',
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: kWrong,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Riwayat pengerjaan ini akan dihapus. Tindakan ini tidak dapat dibatalkan.',
                style: TextStyle(
                  fontFamily: 'FunnelDisplay',
                  fontSize: 14,
                  color: kWrong.withValues(alpha: .8),
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 28),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(sheetContext, false),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        side: const BorderSide(color: Color(0xFFE0E0E0)),
                      ),
                      child: const Text(
                        'Batal',
                        style: TextStyle(
                          fontFamily: 'FunnelDisplay',
                          fontWeight: FontWeight.w700,
                          color: kTinted,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(sheetContext, true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kWrong,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Hapus',
                        style: TextStyle(
                          fontFamily: 'FunnelDisplay',
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _isDeleting = true);

    try {
      await HistoryService.deleteHistory(widget.history.submissionId ?? '');

      if (!mounted) return;

      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;

      setState(() => _isDeleting = false);

      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            backgroundColor: kWrong,
            content: Text(
              'Gagal menghapus riwayat: ${e.toString()}',
              style: const TextStyle(fontFamily: 'FunnelDisplay', fontSize: 13),
            ),
          ),
        );
    }
  }

  Color? _parseHeaderColor(String? value) {
    final String color = value?.trim() ?? '';
    if (!RegExp(r'^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$').hasMatch(color)) {
      return null;
    }

    final String hex = color.substring(1);
    final String normalized = hex.length == 3
        ? hex.split('').map((char) => '$char$char').join()
        : hex;
    return Color(int.parse('FF$normalized', radix: 16));
  }

  Widget _buildFormHeader() {
    final String media = widget.history.headerMedia?.trim() ?? '';
    final String image = widget.history.headerImage?.trim() ?? '';
    final Color? customColor = _parseHeaderColor(widget.history.headerColor);
    final String source = media.isNotEmpty ? media : image;

    Widget fallback() {
      return Container(
        color: customColor ?? kDarks,
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Text(
          _safeText(widget.history.title),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontFamily: 'FunnelDisplay',
            fontSize: 24,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
      );
    }

    return AspectRatio(
      aspectRatio: 3105 / 1100,
      child: source.isEmpty
          ? fallback()
          : Image.network(
              source,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => fallback(),
            ),
    );
  }

  // Menampilkan satu item informasi (tile info web /pages/form).
  Widget _buildInfoItem(String title, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: kBase,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(_getInfoIcon(title), size: 17, color: kTinted),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                title,
                style: const TextStyle(
                  fontFamily: 'FunnelDisplay',
                  fontSize: 12.5,
                  color: kTinted,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                value,
                textAlign: TextAlign.right,
                style: const TextStyle(
                  fontFamily: 'FunnelDisplay',
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: kDarks,
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

  Widget _statusBadge(Color color, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontFamily: 'FunnelDisplay',
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  // Judul section dengan garis hairline (pola web result).
  Widget _sectionHeading(String text) {
    return Row(
      children: [
        Text(
          text,
          style: const TextStyle(
            fontFamily: 'FunnelDisplay',
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: kDarks,
          ),
        ),
        const SizedBox(width: 14),
        const Expanded(child: Divider(height: 1, color: kSecond)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final String title = _safeText(widget.history.title);

    final String tag =
        widget.history.token.trim().isEmpty ||
            widget.history.token.trim() == '-'
        ? '-'
        : widget.history.token.trim();

    final String date = _safeText(widget.history.date);
    final String startTime = _safeText(widget.history.startTime);
    final String finishTime = _safeText(widget.history.finishTime);
    final String duration = _safeText(widget.history.duration);

    final String totalQuestion =
        (widget.history.totalQuestion < 0 ? 0 : widget.history.totalQuestion)
            .toString();

    final bool isFinished = widget.history.isFinished;
    final Color statusColor = isFinished ? kPass : kWrong;

    return Scaffold(
      backgroundColor: kSecond,
      appBar: AppBar(
        backgroundColor: kSecond,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Detail Riwayat',
          style: TextStyle(
            fontFamily: 'FunnelDisplay',
            fontWeight: FontWeight.bold,
            color: kDarks,
          ),
        ),
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 30),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: kSecond),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x07000000),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: _buildFormHeader(),
            ),

            const SizedBox(height: 16),

            Text(
              'Hasil Pengerjaan',
              style: const TextStyle(
                fontFamily: 'FunnelDisplay',
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: kDarks,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: const TextStyle(
                fontFamily: 'FunnelDisplay',
                fontSize: 14,
                color: kTinted,
              ),
            ),
            const SizedBox(height: 20),

            if (widget.history.showScore)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: kSecond),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x07000000),
                      blurRadius: 8,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Total Skor',
                            style: TextStyle(
                              fontFamily: 'FunnelDisplay',
                              fontSize: 12,
                              color: kTinted,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${widget.history.score}',
                            style: TextStyle(
                              fontFamily: 'FunnelDisplay',
                              fontSize: 42,
                              fontWeight: FontWeight.w700,
                              color: statusColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        _statusBadge(
                          statusColor,
                          isFinished ? 'SUBMITTED' : 'DRAFT',
                        ),
                        const SizedBox(height: 8),
                        Text(
                          date,
                          style: const TextStyle(
                            fontFamily: 'FunnelDisplay',
                            fontSize: 12,
                            color: kTinted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 20),

            // Tag pill.
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(
                color: kDone.withValues(alpha: .1),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: kDone.withValues(alpha: .2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.tag_rounded, size: 16, color: kDone),
                  const SizedBox(width: 7),
                  Text(
                    tag,
                    style: const TextStyle(
                      fontFamily: 'FunnelDisplay',
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: kDone,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            _sectionHeading('Informasi Pengerjaan'),
            const SizedBox(height: 12),

            // Card informasi.
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: kSecond),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x07000000),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: [
                  _buildInfoItem('Tag', tag),
                  _buildInfoItem('Tanggal', date),
                  _buildInfoItem('Jam Mulai', startTime),
                  _buildInfoItem('Jam Selesai', finishTime),
                  _buildInfoItem('Durasi', duration),
                  Divider(height: 12, color: kSecond),
                  const SizedBox(height: 4),
                  _buildInfoItem('Total Soal', totalQuestion),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Card status pengerjaan.
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: .08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: statusColor.withValues(alpha: .25)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: .12),
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Icon(
                      isFinished ? Icons.check_circle : Icons.schedule_rounded,
                      color: statusColor,
                      size: 22,
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
                          style: TextStyle(
                            fontFamily: 'FunnelDisplay',
                            fontWeight: FontWeight.w700,
                            color: statusColor,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          isFinished
                              ? 'Jawaban telah dikirim.'
                              : 'Pengerjaan belum selesai.',
                          style: const TextStyle(
                            fontFamily: 'FunnelDisplay',
                            fontSize: 12,
                            color: kTinted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Catatan privasi.
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: kDone.withValues(alpha: .08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: kDone.withValues(alpha: .2)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: kDone.withValues(alpha: .1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.info_outline_rounded,
                      color: kDone,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(top: 4),
                      child: Text(
                        'Detail nilai dan jawaban tidak ditampilkan pada riwayat user.',
                        style: TextStyle(
                          fontFamily: 'FunnelDisplay',
                          fontSize: 12,
                          color: kTinted,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Tombol hapus.
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: _isDeleting ? null : _deleteHistory,
                icon: _isDeleting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.2,
                          color: kWrong,
                        ),
                      )
                    : const Icon(Icons.delete_outline_rounded, size: 18),
                label: Text(
                  _isDeleting ? 'Menghapus...' : 'Hapus Riwayat',
                  style: const TextStyle(
                    fontFamily: 'FunnelDisplay',
                    fontWeight: FontWeight.w600,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: kWrong,
                  side: BorderSide(
                    color: kWrong.withValues(alpha: .25),
                    width: 2,
                  ),
                  backgroundColor: kWrong.withValues(alpha: .06),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
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
