import 'package:flutter/material.dart';

import '../../core/models/history_model.dart';
import '../../core/services/history_service.dart';
import '../../widgets/auth_shell.dart';
import 'result.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);
    try {
      await HistoryService.getHistory();
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final histories = List<HistoryModel>.from(HistoryService.historyList);
    return Scaffold(
      backgroundColor: kBase,
      appBar: AppBar(
        backgroundColor: kBase,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Riwayat',
          style: TextStyle(
            fontFamily: 'FunnelDisplay',
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: kDarks,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _isLoading ? null : _loadHistory,
            icon: const Icon(Icons.refresh_rounded, color: kDone),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: kDone))
          : histories.isEmpty
          ? _emptyState()
          : RefreshIndicator(
              color: kDone,
              onRefresh: _loadHistory,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final padding = const EdgeInsets.fromLTRB(14, 8, 14, 32);
                  if (constraints.maxWidth < 600) {
                    return ListView.separated(
                      padding: padding,
                      physics: const AlwaysScrollableScrollPhysics(),
                      itemCount: histories.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) =>
                          _card(context, histories[index]),
                    );
                  }

                  return GridView.builder(
                    padding: padding,
                    physics: const AlwaysScrollableScrollPhysics(),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          mainAxisExtent: 290,
                        ),
                    itemCount: histories.length,
                    itemBuilder: (context, index) =>
                        _card(context, histories[index]),
                  );
                },
              ),
            ),
    );
  }

  Widget _emptyState() => RefreshIndicator(
    color: kDone,
    onRefresh: _loadHistory,
    child: ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: const [
        SizedBox(height: 170),
        Icon(Icons.description_outlined, size: 52, color: kTinted),
        SizedBox(height: 14),
        Center(
          child: Text(
            'Belum ada histori formulir.',
            style: TextStyle(fontFamily: 'FunnelDisplay', color: kTinted),
          ),
        ),
      ],
    ),
  );

  Color? _parseHeaderColor(String? value) {
    final color = value?.trim() ?? '';
    if (!RegExp(r'^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$').hasMatch(color)) {
      return null;
    }
    final hex = color.substring(1);
    final normalized = hex.length == 3
        ? hex.split('').map((char) => '$char$char').join()
        : hex;
    return Color(int.parse('FF$normalized', radix: 16));
  }

  Widget _header(HistoryModel history) {
    final image = history.headerImage?.trim() ?? '';
    final media = history.headerMedia?.trim() ?? '';
    final source = media.isNotEmpty ? media : image;
    final color = _parseHeaderColor(history.headerColor) ?? kDarks;
    final title = history.title.trim().isEmpty ? 'Form' : history.title;

    final fallback = Container(
      color: color,
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Text(
        title,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          fontFamily: 'FunnelDisplay',
          fontSize: 21,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
    );

    return AspectRatio(
      aspectRatio: 3105 / 1100,
      child: source.isEmpty
          ? fallback
          : Image.network(
              source,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => fallback,
            ),
    );
  }

  Widget _card(BuildContext context, HistoryModel history) {
    final failed =
        history.showScore &&
        history.passingScore != null &&
        history.score < history.passingScore!;
    final status = !history.showScore
        ? 'Selesai'
        : failed
        ? 'Gagal'
        : 'Lulus';
    final color = !history.showScore
        ? kTinted
        : failed
        ? kWrong
        : kDone;
    final duration = history.duration == '-' || history.duration.isEmpty
        ? 'Tanpa Waktu'
        : history.duration;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => DetailHistoryScreen(history: history),
          ),
        ).then((_) => setState(() {})),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(14),
              ),
              child: _header(history),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          history.title.trim().isEmpty ? 'Form' : history.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: 'FunnelDisplay',
                            fontSize: 19,
                            fontWeight: FontWeight.w700,
                            color: kDarks,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 9,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: .1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          status,
                          style: TextStyle(
                            fontFamily: 'FunnelDisplay',
                            fontSize: 11,
                            color: color,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Oleh ${history.author}',
                    style: const TextStyle(
                      fontFamily: 'FunnelDisplay',
                      fontSize: 12,
                      color: kTinted,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      const Icon(
                        Icons.timer_outlined,
                        size: 15,
                        color: kTinted,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        duration,
                        style: const TextStyle(
                          fontFamily: 'FunnelDisplay',
                          fontSize: 12,
                          color: kTinted,
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Icon(
                        Icons.description_outlined,
                        size: 15,
                        color: kTinted,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        '${history.totalQuestion} soal',
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
          ],
        ),
      ),
    );
  }
}
