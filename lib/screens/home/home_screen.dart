import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../widgets/auth_shell.dart';
import '../../widgets/formaly_dock.dart';
import '../../widgets/formaly_top_bar.dart';
import '../form/form_detail_screen.dart';
import '../history/history.dart';
import '../profile/profile_screen.dart';

/// Home screen untuk mencari formulir berdasarkan tag.
///
/// Alur:
/// 1. User memasukkan tag.
/// 2. Tag dicari di tabel `tags`.
/// 3. Form yang terhubung dicari melalui `form_tags`.
/// 4. Satu form langsung dibuka.
/// 5. Beberapa form ditampilkan untuk dipilih.
/// 6. User juga dapat membuka form melalui QR Code.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int currentIndex = 0;

  final List<Widget> pages = const [
    HomePage(),
    HistoryScreen(),
    ProfileScreen(),
  ];

  static const List<DockItem> _dockItems = [
    DockItem(
      label: 'Beranda',
      icon: Icons.home_outlined,
      activeIcon: Icons.home_rounded,
    ),
    DockItem(
      label: 'Riwayat',
      icon: Icons.history_outlined,
      activeIcon: Icons.history_rounded,
    ),
    DockItem(
      label: 'Profil',
      icon: Icons.person_outline_rounded,
      activeIcon: Icons.person_rounded,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    // Sembunyikan dock saat keyboard terbuka (seperti di web).
    final bool keyboardOpen = MediaQuery.of(context).viewInsets.bottom > 0;

    return Scaffold(
      backgroundColor:
          Theme.of(context).scaffoldBackgroundColor,
      body: Stack(
        children: [
          Column(
            children: [
              const FormalyTopBar(),
              Expanded(
                child: IndexedStack(index: currentIndex, children: pages),
              ),
            ],
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: AnimatedSlide(
              offset: keyboardOpen ? const Offset(0, 1.5) : Offset.zero,
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeInOut,
              child: FormalyDock(
                items: _dockItems,
                currentIndex: currentIndex,
                onTap: (index) {
                  if (index == currentIndex) return;
                  setState(
                    () => currentIndex = index,
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ===============================================================
// HOME PAGE
// ===============================================================

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final SupabaseClient _supabase =
      Supabase.instance.client;

  final TextEditingController searchController = TextEditingController();

  bool isSearching = false;
  String? errorMessage;

  // Data form tiruan yang diputar di kartu showcase (sama dengan web).
  static const List<_ShowcaseForm> _showcaseForms = [
    _ShowcaseForm(
      title: 'Kuesioner Kepuasan',
      author: 'Formaly Team',
      question:
          'Apakah anda menyukai Formaly: a form maker?',
      options: [
        'Sangat suka',
        'Tidak suka',
      ],
    ),
    _ShowcaseForm(
      title: 'Ujian Matematika',
      author: 'Teacher',
      question:
          'Berapa hasil dari 2 + 2?',
      options: [
        '4',
        '67',
      ],
    ),
    _ShowcaseForm(
      title: 'Survey Lingkungan',
      author: 'Tim Penghijauan',
      question:
          'Apakah anda peduli lingkungan?',
      options: [
        'Sangat peduli',
        'Kurang peduli',
      ],
    ),
    _ShowcaseForm(
      title: 'Absensi Kelas',
      author: 'Wali Kelas',
      question:
          'Hadir atau tidak hari ini?',
      options: [
        'Hadir',
        'Tidak hadir',
      ],
    ),
    _ShowcaseForm(
      title: 'Cerdas Cermat',
      author: 'OSIS SMAN 1 Digital',
      question:
          'Apakah angin memiliki KTP?',
      options: [
        'Tidak',
        'Iya',
      ],
    ),
  ];

  int _formIndex = 0;
  Timer? _rotator;

  final FocusNode _searchFocusNode =
      FocusNode();
  bool _searchFocused = false;

  @override
  void initState() {
    super.initState();

    _rotator = Timer.periodic(
      const Duration(seconds: 3),
      (_) {
        if (!mounted) return;

        setState(() {
          _formIndex =
              (_formIndex + 1) %
                  _showcaseForms.length;
        });
      },
    );

    _searchFocusNode.addListener(
      _onSearchFocusChanged,
    );

    searchController.addListener(
      _onSearchContentChanged,
    );
  }

  void _onSearchFocusChanged() {
    if (_searchFocused ==
        _searchFocusNode.hasFocus) {
      return;
    }

    setState(
      () => _searchFocused =
          _searchFocusNode.hasFocus,
    );
  }

  void _onSearchContentChanged() {
    setState(() {});
  }

  @override
  void dispose() {
    _rotator?.cancel();

    _searchFocusNode.removeListener(
      _onSearchFocusChanged,
    );

    _searchFocusNode.dispose();

    searchController.removeListener(
      _onSearchContentChanged,
    );

    searchController.dispose();

    super.dispose();
  }

  // ============================================================
  // CARI FORM DENGAN TAG
  // ============================================================

  Future<void> searchForm() async {
    if (isSearching) {
      return;
    }

    final enteredTag =
        searchController.text.trim();

    if (enteredTag.isEmpty) {
      _showMessage('Masukkan tag terlebih dahulu.', isError: true);
      return;
    }

    setState(() {
      isSearching = true;
      errorMessage = null;
    });

    try {
      final tag =
          await _findTag(enteredTag);

      if (tag == null) {
        throw Exception('Tag "$enteredTag" tidak ditemukan.');
      }

      final tagId =
          tag['id']?.toString().trim() ?? '';

      final tagName = tag['name']?.toString().trim().isNotEmpty == true
          ? tag['name'].toString().trim()
          : enteredTag;

      if (tagId.isEmpty) {
        throw Exception('ID tag tidak ditemukan.');
      }

      final formIds =
          await _findFormIdsByTag(
        tagId,
      );

      if (formIds.isEmpty) {
        throw Exception('Belum ada formulir yang menggunakan tag "$tagName".');
      }

      final forms =
          await _findFormsByIds(
        formIds,
      );

      if (forms.isEmpty) {
        throw Exception('Formulir untuk tag "$tagName" tidak ditemukan.');
      }

      if (!mounted) {
        return;
      }

      if (forms.length == 1) {
        final formId = forms.first['id']?.toString().trim() ?? '';

        if (formId.isEmpty) {
          throw Exception('ID formulir tidak valid.');
        }

        await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => FormDetailScreen(formId: formId)),
        );

        return;
      }

      await _showFormPicker(tagName: tagName, forms: forms);
    } catch (e) {
      if (!mounted) {
        return;
      }

      final message =
          _cleanError(e);

      setState(() {
        errorMessage = message;
      });

      _showMessage(message, isError: true);
    } finally {
      if (mounted) {
        setState(() {
          isSearching = false;
        });
      }
    }
  }

  // Mencari tag pada tabel `tags`.
  Future<Map<String, dynamic>?> _findTag(String tagName) async {
    final response = await _supabase
        .from('tags')
        .select('id, name')
        .ilike('name', tagName)
        .maybeSingle();

    if (response == null) {
      return null;
    }

    return Map<String, dynamic>.from(
      response,
    );
  }

  // Mencari ID form berdasarkan tag.
  Future<List<String>> _findFormIdsByTag(String tagId) async {
    final response = await _supabase
        .from('form_tags')
        .select('form_id')
        .eq('tag_id', tagId);

    final ids =
        <String>{};

    for (final row in response) {
      final formId = row['form_id']?.toString().trim() ?? '';

      if (formId.isNotEmpty) {
        ids.add(formId);
      }
    }

    return ids.toList();
  }

  // Mengambil data form berdasarkan ID.
  Future<List<Map<String, dynamic>>>
      _findFormsByIds(
    List<String> formIds,
  ) async {
    if (formIds.isEmpty) {
      return [];
    }

    final response = await _supabase
        .from('forms')
        .select(
          'id, title, description, status, '
          'exam_mode, duration, created_at',
        )
        .inFilter('id', formIds)
        .order('created_at', ascending: false);

    return response
        .map<Map<String, dynamic>>((row) => Map<String, dynamic>.from(row))
        .toList();
  }

  // Menampilkan pilihan form jika hasil pencarian lebih dari satu.
  Future<void> _showFormPicker({
    required String tagName,
    required List<Map<String, dynamic>> forms,
  }) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        final colors = Theme.of(sheetContext).colorScheme;

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
            child: SizedBox(
              height: MediaQuery.of(sheetContext).size.height * 0.7,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 45,
                      height: 5,
                      decoration: BoxDecoration(
                        color: colors.outlineVariant,
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                  ),
                  const SizedBox(
                      height: 20),
                  Text(
                    'Pilih Formulir',
                    style: TextStyle(
                      fontFamily: 'FunnelDisplay',

                      fontSize: 22,
                      fontWeight:
                          FontWeight.bold,
                      color:
                          colors.onSurface,
                    ),
                  ),
                  const SizedBox(
                      height: 6),
                  Text(
                    'Tag "$tagName" memiliki ${forms.length} formulir.',
                    style: TextStyle(
                      fontFamily: 'FunnelDisplay',

                      color: colors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(
                      height: 16),
                  Expanded(
                    child: ListView.separated(
                      itemCount: forms.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final form = forms[index];

                        final formId = form['id']?.toString().trim() ?? '';

                        final title =
                            form['title']?.toString().trim().isNotEmpty == true
                            ? form['title'].toString().trim()
                            : 'Form tanpa judul';

                        final description =
                            form['description']?.toString().trim() ?? '';

                        return Material(
                          color: colors.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(16),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: formId.isEmpty
                                ? null
                                : () {
                                    Navigator.pop(sheetContext);

                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) =>
                                            FormDetailScreen(formId: formId),
                                      ),
                                    );
                                  },
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                border: Border.all(
                                  color: colors.outlineVariant,
                                ),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child:
                                  Row(
                                children: [
                                  Container(
                                    width: 46,
                                    height: 46,
                                    decoration: BoxDecoration(
                                      color: colors.surface,
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: Icon(
                                      Icons.description_outlined,
                                      color: colors.onSurface,
                                    ),
                                  ),
                                  const SizedBox(
                                      width: 14),
                                  Expanded(
                                    child:
                                        Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          title,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontFamily: 'FunnelDisplay',

                                            fontWeight: FontWeight.bold,
                                            fontSize: 15,
                                            color: colors.onSurface,
                                          ),
                                        ),
                                        if (description.isNotEmpty) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            description,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              fontFamily: 'FunnelDisplay',

                                              fontSize: 12,
                                              color: colors.onSurfaceVariant,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                  const SizedBox(
                                      width: 8),
                                  Icon(
                                    Icons.arrow_forward_ios_rounded,
                                    size: 18,
                                    color: colors.onSurfaceVariant,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // Menampilkan pesan kepada user.
  void _showMessage(String message, {bool isError = false}) {
    if (!mounted) {
      return;
    }

    final colors =
        Theme.of(context)
            .colorScheme;

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            message,
            style: TextStyle(
              fontFamily:
                  'FunnelDisplay',
              color:
                  colors.onInverseSurface,
            ),
          ),
          backgroundColor:
              isError
                  ? colors.error
                  : colors.inverseSurface,
          behavior:
              SnackBarBehavior.floating,
        ),
      );
  }

  // Membersihkan prefix "Exception:" dari error.
  String _cleanError(Object error) {
    final text =
        error.toString();

    if (text.startsWith(
      'Exception: ',
    )) {
      return text.substring(
        'Exception: '.length,
      );
    }

    return text;
  }

  @override
  Widget build(BuildContext context) {
    final _ShowcaseForm f =
        _showcaseForms[_formIndex];

    return SafeArea(
      child:
          SingleChildScrollView(
        // Ruang bawah dibuat cukup agar tombol Scan QR dapat berhenti
        // di atas FormalyDock dan tidak tertutup saat scroll mentok.
        padding:
            const EdgeInsets.fromLTRB(
          16,
          24,
          16,
          120,
        ),
        child: Center(
          child: ConstrainedBox(
            constraints:
                const BoxConstraints(
              maxWidth: 900,
            ),
            child: Column(
              children: [
                // Kartu showcase berisi kartu form tiruan.
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.all(
                    16,
                  ),
                  decoration:
                      BoxDecoration(
                    color: Theme.of(context)
                        .colorScheme
                        .surfaceContainerHighest,
                    borderRadius:
                        BorderRadius.circular(
                      12,
                    ),
                    border: Border.all(
                      color: Theme.of(context)
                          .colorScheme
                          .outlineVariant,
                    ),
                  ),
                  child:
                      Center(
                    child:
                        _buildFormDecoy(
                      f,
                    ),
                  ),
                ),

                const SizedBox(
                    height: 28),

                // Judul.
                Text(
                  'Mulai Mengerjakan!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: 'FunnelDisplay',

                    fontSize: 36,
                    fontWeight:
                        FontWeight.w900,
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface,
                    letterSpacing:
                        -1.2,
                    height: 1.1,
                  ),
                ),

                const SizedBox(
                    height: 8),

                Text(
                  'Mulai Mengerjakan formulir dengan memasukkan tag di bawah.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: 'FunnelDisplay',

                    fontSize: 14,
                    color: Theme.of(context)
                        .colorScheme
                        .onSurfaceVariant,
                  ),
                ),

                const SizedBox(
                    height: 32),

                ConstrainedBox(
                  constraints:
                      const BoxConstraints(
                    maxWidth: 576,
                  ),
                  child:
                      _buildSearch(),
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const QrScanScreen()),
                  ),
                  icon: const Icon(Icons.qr_code_scanner_rounded),
                  label: const Text('Scan QR'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.onSurface,
                    side: BorderSide(
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                    shape: const StadiumBorder(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Kartu form tiruan yang berputar (animasi mirip web).
  Widget _buildFormDecoy(
    _ShowcaseForm f,
  ) {
    final colors =
        Theme.of(context)
            .colorScheme;

    final bool showText =
        MediaQuery.of(context)
                .size
                .width >=
            360;

    return Container(
      width: 280,
      padding:
          const EdgeInsets.all(
        18,
      ),
      decoration:
          BoxDecoration(
        color:
            colors.surface,
        borderRadius:
            BorderRadius.circular(
          24,
        ),
        border: Border.all(
          color:
              colors.outlineVariant,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black
                .withValues(
              alpha: .15,
            ),
            blurRadius: 40,
            offset:
                const Offset(
              0,
              16,
            ),
          ),
        ],
      ),
      child:
          Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                alignment:
                    Alignment.center,
                decoration:
                    BoxDecoration(
                  gradient:
                      LinearGradient(
                    colors: [
                      kDone,
                      kDone.withValues(
                        alpha: .7,
                      ),
                    ],
                    begin:
                        Alignment.topLeft,
                    end:
                        Alignment.bottomRight,
                  ),
                  borderRadius:
                      BorderRadius.circular(
                    12,
                  ),
                ),
                child: const Text(
                  'F',
                  style: TextStyle(
                    fontFamily: 'FunnelDisplay',

                    color: Colors.white,
                    fontSize: 14,
                    fontWeight:
                        FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(
                  width: 12),
              Expanded(
                child:
                    AnimatedSwitcher(
                  duration:
                      const Duration(
                    milliseconds: 300,
                  ),
                  child:
                      Column(
                    key:
                        ValueKey(
                      f.title,
                    ),
                    crossAxisAlignment:
                        CrossAxisAlignment
                            .start,
                    children: [
                      Text(
                        f.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: 'FunnelDisplay',

                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: colors.onSurface,
                        ),
                      ),
                      const SizedBox(
                          height: 3),
                      Text(
                        f.author,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily:
                              'FunnelDisplay',
                          fontSize:
                              10,
                          color: colors
                              .onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(
                  width: 6),
              Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration:
                        BoxDecoration(
                      shape:
                          BoxShape.circle,
                      color: kWrong.withValues(
                        alpha: .6,
                      ),
                    ),
                  ),
                  const SizedBox(
                      width: 6),
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFFBBF24).withValues(alpha: .7),
                    ),
                  ),
                  const SizedBox(
                      width: 6),
                  Container(
                    width: 6,
                    height: 6,
                    decoration:
                        BoxDecoration(
                      shape:
                          BoxShape.circle,
                      color: kDone.withValues(
                        alpha: .6,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(
              height: 20),

          AnimatedSwitcher(
            duration:
                const Duration(
              milliseconds: 300,
            ),
            child: Text(
              f.question,
              key: ValueKey(f.question),
              style: TextStyle(
                fontFamily: 'FunnelDisplay',

                fontSize: 16,
                fontWeight:
                    FontWeight.w700,
                color:
                    colors.onSurface,
                height: 1.3,
              ),
            ),
          ),

          const SizedBox(
              height: 12),

          _buildOptionPill(
            text: f.options.first,
            primary: true,
            showText: showText,
          ),
          const SizedBox(height: 6),
          _buildOptionPill(
            text: f.options.last,
            primary: false,
            showText: showText,
          ),
        ],
      ),
    );
  }

  Widget _buildOptionPill({
    required String text,
    required bool primary,
    required bool showText,
  }) {
    final colors =
        Theme.of(context)
            .colorScheme;

    return Container(
      width: double.infinity,
      padding:
          const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 10,
      ),
      decoration:
          BoxDecoration(
        color: primary
            ? kDone
            : colors
                .surfaceContainerHighest,
        borderRadius:
            BorderRadius.circular(
          12,
        ),
        border: primary
            ? null
            : Border.all(
                color: colors
                    .outlineVariant,
              ),
      ),
      child:
          Row(
        children: [
          Expanded(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontFamily: 'FunnelDisplay',

                fontSize: 12,
                fontWeight:
                    FontWeight.w600,
                color: primary
                    ? Colors.white
                    : colors
                        .onSurfaceVariant,
              ),
            ),
          ),
          if (primary)
            const SizedBox(
              width: 6,
              height: 6,
              child:
                  DecoratedBox(
                decoration:
                    BoxDecoration(
                  shape:
                      BoxShape.circle,
                  color:
                      Colors.white,
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ============================================================
  // SEARCH BAR
  // ============================================================

  Widget _buildSearch() {
    final colors =
        Theme.of(context)
            .colorScheme;

    final bool showText =
        MediaQuery.of(context)
                .size
                .width >=
            380;

    final bool canSearch =
        !isSearching &&
            searchController.text
                .trim()
                .isNotEmpty;

    return Column(
      children: [
        Container(
          width: double.infinity,

          // Memastikan isi search tidak keluar dari
          // rounded container.
          clipBehavior:
              Clip.antiAlias,

          decoration:
              BoxDecoration(
            color:
                colors.surface,
            borderRadius:
                BorderRadius.circular(
              30,
            ),
            border: Border.all(
              color: _searchFocused
                  ? colors
                      .primary
                      .withValues(
                    alpha: .6,
                  )
                  : colors
                      .outlineVariant,
            ),
            boxShadow: [
              BoxShadow(
                color: colors
                    .shadow
                    .withValues(
                  alpha:
                      _searchFocused
                          ? .12
                          : .05,
                ),
                blurRadius:
                    _searchFocused
                        ? 18
                        : 10,
                offset:
                    const Offset(
                  0,
                  4,
                ),
              ),
            ],
          ),

          child:
              Row(
            children: [
              Expanded(
                child:
                    TextField(
                  controller:
                      searchController,
                  focusNode:
                      _searchFocusNode,
                  enabled:
                      !isSearching,
                  textInputAction:
                      TextInputAction.search,
                  autocorrect:
                      false,
                  enableSuggestions:
                      false,
                  maxLines: 1,

                  onSubmitted:
                      (_) {
                    if (canSearch) {
                      searchForm();
                    }
                  },

                  style:
                      TextStyle(
                    fontFamily:
                        'FunnelDisplay',
                    color:
                        colors.onSurface,
                    fontSize:
                        14,
                  ),

                  decoration:
                      InputDecoration(
                    hintText:
                        'Cari berdasarkan tag',
                    hintStyle:
                        TextStyle(
                      fontFamily:
                          'FunnelDisplay',
                      color:
                          colors.onSurfaceVariant,
                      fontSize:
                          14,
                    ),
                    border:
                        InputBorder.none,
                    contentPadding:
                        const EdgeInsets.symmetric(
                      horizontal:
                          18,
                      vertical:
                          14,
                    ),
                    isDense:
                        true,
                  ),
                ),
              ),

              // Tombol hapus hanya muncul ketika ada teks.
              if (searchController
                  .text
                  .isNotEmpty)
                SizedBox(
                  width: 38,
                  height: 44,
                  child:
                      IconButton(
                    onPressed:
                        () {
                      searchController
                          .clear();
                      _searchFocusNode
                          .requestFocus();
                    },
                    padding:
                        EdgeInsets.zero,
                    visualDensity:
                        VisualDensity
                            .compact,
                    icon:
                        Icon(
                      Icons
                          .close_rounded,
                      size: 16,
                      color: colors
                          .onSurfaceVariant,
                    ),
                  ),
                ),

              const SizedBox(
                  width: 2),

              // Tombol Cari diberi ukuran tetap supaya
              // tidak keluar dari container.
              Padding(
                padding:
                    const EdgeInsets.all(
                  4,
                ),
                child:
                    SizedBox(
                  width:
                      showText ? 78 : 44,
                  height: 44,
                  child:
                      ElevatedButton(
                    onPressed:
                        canSearch
                            ? searchForm
                            : null,

                    style:
                        ElevatedButton
                            .styleFrom(
                      elevation:
                          0,

                      minimumSize:
                          Size.zero,

                      fixedSize:
                          Size(
                        showText
                            ? 78
                            : 44,
                        44,
                      ),

                      backgroundColor:
                          kDone,

                      disabledBackgroundColor:
                          kDone.withValues(
                        alpha: .4,
                      ),

                      foregroundColor:
                          Colors.white,

                      padding:
                          EdgeInsets.zero,

                      shape:
                          const StadiumBorder(),
                    ),

                    child:
                        isSearching
                            ? const SizedBox(
                                width:
                                    16,
                                height:
                                    16,
                                child:
                                    CircularProgressIndicator(
                                  strokeWidth:
                                      2.2,
                                  color:
                                      Colors.white,
                                ),
                              )
                            : Row(
                                mainAxisAlignment:
                                    MainAxisAlignment
                                        .center,
                                mainAxisSize:
                                    MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons
                                        .search_rounded,
                                    size:
                                        16,
                                  ),
                                  if (showText) ...[
                                    const SizedBox(
                                        width: 5),
                                    const Text(
                                      'Cari',
                                      style:
                                          TextStyle(
                                        fontFamily:
                                            'FunnelDisplay',
                                        fontSize:
                                            13,
                                        fontWeight:
                                            FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Banner error.
        if (errorMessage != null) ...[
          const SizedBox(
              height: 16),
          Container(
            width: double.infinity,
            padding:
                const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
            ),
            decoration:
                BoxDecoration(
              color:
                  colors.error.withValues(
                alpha: .1,
              ),
              borderRadius:
                  BorderRadius.circular(
                12,
              ),
              border:
                  Border.all(
                color:
                    colors.error.withValues(
                  alpha: .2,
                ),
              ),
            ),
            child:
                Text(
              errorMessage!,
              textAlign:
                  TextAlign.center,
              style:
                  TextStyle(
                fontFamily:
                    'FunnelDisplay',
                fontSize:
                    12,
                fontWeight:
                    FontWeight.w500,
                color:
                    colors.error,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

// Data form tiruan untuk kartu showcase di home.
class QrScanScreen extends StatefulWidget {
  const QrScanScreen({super.key});

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> {
  bool _handled = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan QR')),
      body: MobileScanner(
        onDetect: (capture) {
          if (_handled || capture.barcodes.isEmpty) return;
          final value = capture.barcodes.first.rawValue;
          if (value == null || value.isEmpty) return;
          _handled = true;
          Navigator.pop(context, value);
        },
      ),
    );
  }
}

class _ShowcaseForm {
  final String title;
  final String author;
  final String question;
  final List<String> options;

  const _ShowcaseForm({
    required this.title,
    required this.author,
    required this.question,
    required this.options,
  });
}
 