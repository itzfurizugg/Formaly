import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/models/history_model.dart';
import '../../core/services/history_service.dart';
import 'detail_history_screen.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  bool _isLoading = true;

  List<HistoryModel> get historyList =>
      HistoryService.historyList;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  // Memuat data history.
  Future<void> _loadHistory() async {
    if (mounted) {
      setState(() => _isLoading = true);
    }

    try {
      await HistoryService.getHistory();
    } catch (_) {
      // Cache tetap digunakan oleh HistoryService.
    }

    if (!mounted) return;

    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    // Salinan list agar aman saat proses build.
    final histories = List<HistoryModel>.from(historyList);

    return Scaffold(
      backgroundColor:
          Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: colors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: Text(
          'Riwayat',
          style: GoogleFonts.poppins(
            color: colors.onSurface,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _isLoading ? null : _loadHistory,
            tooltip: 'Refresh riwayat',
            icon: Icon(
              Icons.refresh_rounded,
              color: _isLoading
                  ? colors.onSurfaceVariant
                  : colors.primary,
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: _isLoading
          ? Center(
              child: CircularProgressIndicator(
                color: colors.primary,
              ),
            )
          : histories.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  color: colors.primary,
                  backgroundColor: colors.surface,
                  onRefresh: _loadHistory,
                  child: ListView.builder(
                    physics:
                        const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(20),
                    itemCount: histories.length,
                    itemBuilder: (context, index) {
                      return _buildHistoryCard(
                        context,
                        histories[index],
                      );
                    },
                  ),
                ),
    );
  }

  // Tampilan saat belum ada history.
  Widget _buildEmptyState() {
    final colors = Theme.of(context).colorScheme;

    return RefreshIndicator(
      color: colors.primary,
      backgroundColor: colors.surface,
      onRefresh: _loadHistory,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 190),
          Container(
            width: 76,
            height: 76,
            margin: const EdgeInsets.symmetric(
              horizontal: 150,
            ),
            decoration: BoxDecoration(
              color: colors.primaryContainer,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.history_rounded,
              size: 42,
              color: colors.onPrimaryContainer,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Belum ada riwayat.',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              fontSize: 16,
              color: colors.onSurface,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Riwayat pengerjaan form akan muncul di sini.',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(
              fontSize: 13,
              color: colors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  // Membuat card untuk setiap history.
  Widget _buildHistoryCard(
    BuildContext context,
    HistoryModel history,
  ) {
    final colors = Theme.of(context).colorScheme;

    final String title = history.title.trim().isEmpty
        ? 'Form tanpa judul'
        : history.title.trim();

    final String tag =
        history.token.trim().isEmpty ||
                history.token.trim() == '-'
            ? '-'
            : history.token.trim();

    final String duration =
        history.duration.trim().isEmpty
            ? '-'
            : history.duration.trim();

    final String date =
        history.date.trim().isEmpty
            ? '-'
            : history.date.trim();

    final int totalQuestion =
        history.totalQuestion < 0
            ? 0
            : history.totalQuestion;

    return Container(
      margin: const EdgeInsets.only(bottom: 18),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colors.outlineVariant,
        ),
        boxShadow: [
          BoxShadow(
            color: colors.primary.withAlpha(18),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => DetailHistoryScreen(
                  history: history,
                ),
              ),
            ).then((deleted) {
              if (deleted == true && mounted) {
                setState(() {});
              }
            });
          },
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: colors.primaryContainer,
                        borderRadius:
                            BorderRadius.circular(14),
                      ),
                      child: Icon(
                        Icons.description_outlined,
                        color: colors.onPrimaryContainer,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.poppins(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: colors.onSurface,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 16,
                      color: colors.primary,
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                Divider(
                  height: 1,
                  color: colors.outlineVariant,
                ),

                const SizedBox(height: 14),

                _buildInfoRow(
                  Icons.calendar_today_outlined,
                  'Tanggal',
                  date,
                  colors.tertiary,
                ),

                const SizedBox(height: 10),

                _buildInfoRow(
                  Icons.tag_rounded,
                  'Tag',
                  tag,
                  colors.secondary,
                ),

                const SizedBox(height: 10),

                _buildInfoRow(
                  Icons.play_circle_outline,
                  'Waktu Mulai',
                  _safeText(history.startTime),
                  colors.primary,
                ),

                const SizedBox(height: 10),

                _buildInfoRow(
                  Icons.stop_circle_outlined,
                  'Waktu Selesai',
                  _safeText(history.finishTime),
                  colors.error,
                ),

                const SizedBox(height: 10),

                _buildInfoRow(
                  Icons.timer_outlined,
                  'Durasi',
                  duration,
                  colors.tertiary,
                ),

                const SizedBox(height: 10),

                _buildInfoRow(
                  Icons.quiz_outlined,
                  'Jumlah Soal',
                  totalQuestion.toString(),
                  colors.secondary,
                ),

                const SizedBox(height: 16),

                _buildStatusBadge(history),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Menampilkan status pengerjaan.
  Widget _buildStatusBadge(HistoryModel history) {
    final colors = Theme.of(context).colorScheme;

    final bool finished = history.isFinished;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 7,
      ),
      decoration: BoxDecoration(
        color: finished
            ? colors.secondaryContainer
            : colors.tertiaryContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: finished
              ? colors.secondary.withAlpha(70)
              : colors.tertiary.withAlpha(70),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            finished
                ? Icons.check_circle
                : Icons.schedule_outlined,
            size: 17,
            color: finished
                ? colors.secondary
                : colors.tertiary,
          ),
          const SizedBox(width: 7),
          Text(
            finished ? 'SELESAI' : 'BELUM SELESAI',
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: finished
                  ? colors.onSecondaryContainer
                  : colors.onTertiaryContainer,
            ),
          ),
        ],
      ),
    );
  }

  // Menampilkan satu baris informasi.
  Widget _buildInfoRow(
    IconData icon,
    String label,
    String value,
    Color iconColor,
  ) {
    final colors = Theme.of(context).colorScheme;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: iconColor.withAlpha(25),
            borderRadius: BorderRadius.circular(9),
          ),
          child: Icon(
            icon,
            size: 17,
            color: iconColor,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 5),
            child: Text(
              label,
              style: GoogleFonts.poppins(
                fontSize: 13,
                color: colors.onSurfaceVariant,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Flexible(
          child: Padding(
            padding: const EdgeInsets.only(top: 5),
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: colors.onSurface,
              ),
            ),
          ),
        ),
      ],
    );
  }

  // Menghindari teks null atau kosong.
  String _safeText(String? value) {
    if (value == null) return '-';

    final text = value.trim();
    return text.isEmpty ? '-' : text;
  }
}