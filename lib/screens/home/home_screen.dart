import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/routes/app_routes.dart';
import '../form/form_detail_screen.dart';
import '../history/history_screen.dart';
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
    ProfileScreen(),
    HistoryScreen(),
  ];

  void _openDrawerPage(int index) {
    if (index < 0 || index >= pages.length) {
      return;
    }

    Navigator.pop(context);

    setState(() {
      currentIndex = index;
    });
  }

  Future<void> _logoutFromDrawer() async {
    await Supabase.instance.client.auth.signOut();

    if (!mounted) {
      return;
    }

    Navigator.pushNamedAndRemoveUntil(
      context,
      AppRoutes.login,
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    final user = Supabase.instance.client.auth.currentUser;
    final userName =
        user?.userMetadata?['name']?.toString().trim().isNotEmpty == true
            ? user!.userMetadata!['name'].toString().trim()
            : 'Pengguna';
    final userEmail = user?.email ?? '-';

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: colors.surface,
        elevation: 0,
        centerTitle: false,
        title: RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: 'Form',
                style: GoogleFonts.poppins(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: colors.onSurface,
                  letterSpacing: -0.8,
                ),
              ),
              TextSpan(
                text: 'aly',
                style: GoogleFonts.poppins(
                  fontSize: 28,
                  fontWeight: FontWeight.w400,
                  color: colors.onSurface,
                  letterSpacing: -0.8,
                ),
              ),
            ],
          ),
        ),
        leading: Builder(
          builder: (context) {
            return IconButton(
              onPressed: () => Scaffold.of(context).openDrawer(),
              icon: Icon(
                Icons.menu_rounded,
                color: colors.onSurface,
              ),
              tooltip: 'Menu',
            );
          },
        ),
      ),
      drawer: Drawer(
        width: 310,
        backgroundColor: colors.surface,
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 8, 12),
                child: Row(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: colors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        userName.isNotEmpty
                            ? userName[0].toUpperCase()
                            : 'U',
                        style: GoogleFonts.poppins(
                          color: colors.onPrimary,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            userName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: colors.onSurface,
                            ),
                          ),
                          Text(
                            userEmail,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.poppins(
                              fontSize: 9,
                              color: colors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: Icon(
                        Icons.close_rounded,
                        size: 20,
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Divider(height: 1, color: colors.outlineVariant),
              const SizedBox(height: 10),
              _drawerItem(
                context: context,
                icon: Icons.home_outlined,
                label: 'Beranda',
                selected: currentIndex == 0,
                onTap: () => _openDrawerPage(0),
              ),
              _drawerItem(
                context: context,
                icon: Icons.history_rounded,
                label: 'Riwayat',
                selected: currentIndex == 2,
                onTap: () => _openDrawerPage(2),
              ),
              _drawerItem(
                context: context,
                icon: Icons.person_outline_rounded,
                label: 'Profil',
                selected: currentIndex == 1,
                onTap: () => _openDrawerPage(1),
              ),
              const Spacer(),
              Divider(height: 1, color: colors.outlineVariant),
              const SizedBox(height: 8),
              _drawerItem(
                context: context,
                icon: Icons.logout_rounded,
                label: 'Keluar',
                selected: false,
                onTap: _logoutFromDrawer,
                textColor: colors.error,
                iconColor: colors.error,
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
      body: pages[currentIndex],
    );
  }

  Widget _drawerItem({
    required BuildContext context,
    required IconData icon,
    required String label,
    required bool selected,
    required VoidCallback onTap,
    Color? textColor,
    Color? iconColor,
  }) {
    final colors = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: SizedBox(
        width: double.infinity,
        height: 44,
        child: Material(
          color: selected
              ? colors.primary
              : Colors.transparent,
          borderRadius: BorderRadius.circular(9),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(9),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: Row(
                children: [
                  Icon(
                    icon,
                    size: 18,
                    color: selected
                        ? colors.onPrimary
                        : (iconColor ?? colors.onSurfaceVariant),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    label,
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: selected
                          ? FontWeight.w600
                          : FontWeight.w500,
                      color: selected
                          ? colors.onPrimary
                          : (textColor ?? colors.onSurface),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
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
  final SupabaseClient _supabase = Supabase.instance.client;

  final TextEditingController searchController =
      TextEditingController();

  bool isSearching = false;
  bool isScanning = false;
  String? errorMessage;

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  // ============================================================
  // SCAN QR
  // ============================================================

  Future<void> scanQrForm() async {
    if (isScanning) {
      return;
    }

    setState(() {
      isScanning = true;
      errorMessage = null;
    });

    try {
      final String? scannedValue = await Navigator.push<String>(
        context,
        MaterialPageRoute(
          builder: (_) => const _QrScannerPage(),
        ),
      );

      if (!mounted) {
        return;
      }

      if (scannedValue == null ||
          scannedValue.trim().isEmpty) {
        return;
      }

      final rawValue = scannedValue.trim();
      final uri = Uri.tryParse(rawValue);

      if (uri == null) {
        throw Exception(
          'QR Code tidak valid.',
        );
      }

      // ==========================================================
      // FORMAT 1
      // https://formaly.my.id/form/description?formId=UUID
      // ==========================================================

      final qrFormId =
          uri.queryParameters['formId']?.trim() ?? '';

      if (qrFormId.isNotEmpty) {
        final formResponse = await _supabase
            .from('forms')
            .select('id')
            .eq(
              'id',
              qrFormId,
            )
            .maybeSingle();

        if (!mounted) {
          return;
        }

        if (formResponse == null) {
          throw Exception(
            'Formulir dari QR tidak ditemukan.',
          );
        }

        final verifiedFormId =
            formResponse['id']?.toString().trim() ?? '';

        if (verifiedFormId.isEmpty) {
          throw Exception(
            'ID formulir dari QR tidak valid.',
          );
        }

        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => FormDetailScreen(
              formId: verifiedFormId,
            ),
          ),
        );

        return;
      }

      // ==========================================================
      // FORMAT 2
      // https://formaly.my.id/form/TAGS
      // ==========================================================

      final pathSegments = uri.pathSegments;

      if (pathSegments.length >= 2 &&
          pathSegments[0].toLowerCase() == 'form') {
        final enteredTag =
            pathSegments.sublist(1).join('/').trim();

        if (enteredTag.isEmpty) {
          throw Exception(
            'Tag dari QR tidak ditemukan.',
          );
        }

        final tag = await _findTag(enteredTag);

        if (tag == null) {
          throw Exception(
            'Tag "$enteredTag" tidak ditemukan.',
          );
        }

        final tagId =
            tag['id']?.toString().trim() ?? '';

        final tagName =
            tag['name']?.toString().trim().isNotEmpty == true
                ? tag['name'].toString().trim()
                : enteredTag;

        if (tagId.isEmpty) {
          throw Exception(
            'ID tag tidak ditemukan.',
          );
        }

        final formIds =
            await _findFormIdsByTag(tagId);

        if (formIds.isEmpty) {
          throw Exception(
            'Belum ada formulir yang menggunakan tag "$tagName".',
          );
        }

        final forms =
            await _findFormsByIds(formIds);

        if (forms.isEmpty) {
          throw Exception(
            'Formulir untuk tag "$tagName" tidak ditemukan.',
          );
        }

        if (!mounted) {
          return;
        }

        if (forms.length == 1) {
          final formId =
              forms.first['id']?.toString().trim() ?? '';

          if (formId.isEmpty) {
            throw Exception(
              'ID formulir tidak valid.',
            );
          }

          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => FormDetailScreen(
                formId: formId,
              ),
            ),
          );

          return;
        }

        await _showFormPicker(
          tagName: tagName,
          forms: forms,
        );

        return;
      }

      throw Exception(
        'Format QR Code tidak dikenali.',
      );
    } catch (e) {
      if (!mounted) {
        return;
      }

      final message = _cleanError(e);

      setState(() {
        errorMessage = message;
      });

      _showMessage(
        message,
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          isScanning = false;
        });
      }
    }
  }

  // ============================================================
  // CARI FORM DENGAN TAG
  // ============================================================

  Future<void> searchForm() async {
    if (isSearching) {
      return;
    }

    final enteredTag = searchController.text.trim();

    if (enteredTag.isEmpty) {
      _showMessage(
        'Masukkan tag terlebih dahulu.',
        isError: true,
      );
      return;
    }

    setState(() {
      isSearching = true;
      errorMessage = null;
    });

    try {
      final tag = await _findTag(enteredTag);

      if (tag == null) {
        throw Exception(
          'Tag "$enteredTag" tidak ditemukan.',
        );
      }

      final tagId = tag['id']?.toString().trim() ?? '';

      final tagName =
          tag['name']?.toString().trim().isNotEmpty == true
              ? tag['name'].toString().trim()
              : enteredTag;

      if (tagId.isEmpty) {
        throw Exception(
          'ID tag tidak ditemukan.',
        );
      }

      final formIds = await _findFormIdsByTag(tagId);

      if (formIds.isEmpty) {
        throw Exception(
          'Belum ada formulir yang menggunakan tag "$tagName".',
        );
      }

      final forms = await _findFormsByIds(formIds);

      if (forms.isEmpty) {
        throw Exception(
          'Formulir untuk tag "$tagName" tidak ditemukan.',
        );
      }

      if (!mounted) {
        return;
      }

      if (forms.length == 1) {
        final formId =
            forms.first['id']?.toString().trim() ?? '';

        if (formId.isEmpty) {
          throw Exception(
            'ID formulir tidak valid.',
          );
        }

        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => FormDetailScreen(
              formId: formId,
            ),
          ),
        );

        return;
      }

      await _showFormPicker(
        tagName: tagName,
        forms: forms,
      );
    } catch (e) {
      if (!mounted) {
        return;
      }

      final message = _cleanError(e);

      setState(() {
        errorMessage = message;
      });

      _showMessage(
        message,
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          isSearching = false;
        });
      }
    }
  }

  // Mencari tag pada tabel `tags`.
  Future<Map<String, dynamic>?> _findTag(
    String tagName,
  ) async {
    final response = await _supabase
        .from('tags')
        .select('id, name')
        .ilike(
          'name',
          tagName,
        )
        .maybeSingle();

    if (response == null) {
      return null;
    }

    return Map<String, dynamic>.from(response);
  }

  // Mencari ID form berdasarkan tag.
  Future<List<String>> _findFormIdsByTag(
    String tagId,
  ) async {
    final response = await _supabase
        .from('form_tags')
        .select('form_id')
        .eq(
          'tag_id',
          tagId,
        );

    final ids = <String>{};

    for (final row in response) {
      final formId =
          row['form_id']?.toString().trim() ?? '';

      if (formId.isNotEmpty) {
        ids.add(formId);
      }
    }

    return ids.toList();
  }

  // Mengambil data form berdasarkan ID.
  Future<List<Map<String, dynamic>>> _findFormsByIds(
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
        .inFilter(
          'id',
          formIds,
        )
        .order(
          'created_at',
          ascending: false,
        );

    return response
        .map<Map<String, dynamic>>(
          (row) => Map<String, dynamic>.from(row),
        )
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
      backgroundColor:
          Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(24),
        ),
      ),
      builder: (sheetContext) {
        final colors =
            Theme.of(sheetContext).colorScheme;

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              20,
              20,
              20,
              28,
            ),
            child: SizedBox(
              height:
                  MediaQuery.of(sheetContext).size.height *
                      0.7,
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 45,
                      height: 5,
                      decoration: BoxDecoration(
                        color: colors.outlineVariant,
                        borderRadius:
                            BorderRadius.circular(20),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Pilih Formulir',
                    style: GoogleFonts.poppins(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: colors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Tag "$tagName" memiliki ${forms.length} formulir.',
                    style: GoogleFonts.poppins(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: ListView.separated(
                      itemCount: forms.length,
                      separatorBuilder: (_, __) =>
                          const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final form = forms[index];

                        final formId =
                            form['id']?.toString().trim() ??
                                '';

                        final title =
                            form['title']
                                        ?.toString()
                                        .trim()
                                        .isNotEmpty ==
                                    true
                                ? form['title']
                                    .toString()
                                    .trim()
                                : 'Form tanpa judul';

                        final description =
                            form['description']
                                    ?.toString()
                                    .trim() ??
                                '';

                        return Material(
                          color:
                              colors.surfaceContainerHighest,
                          borderRadius:
                              BorderRadius.circular(16),
                          child: InkWell(
                            borderRadius:
                                BorderRadius.circular(16),
                            onTap: formId.isEmpty
                                ? null
                                : () {
                                    Navigator.pop(
                                      sheetContext,
                                    );

                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) =>
                                            FormDetailScreen(
                                          formId: formId,
                                        ),
                                      ),
                                    );
                                  },
                            child: Container(
                              padding:
                                  const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                border: Border.all(
                                  color:
                                      colors.outlineVariant,
                                ),
                                borderRadius:
                                    BorderRadius.circular(16),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 46,
                                    height: 46,
                                    decoration:
                                        BoxDecoration(
                                      color: colors.surface,
                                      borderRadius:
                                          BorderRadius.circular(
                                        14,
                                      ),
                                    ),
                                    child: Icon(
                                      Icons
                                          .description_outlined,
                                      color:
                                          colors.onSurface,
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment
                                              .start,
                                      children: [
                                        Text(
                                          title,
                                          maxLines: 2,
                                          overflow:
                                              TextOverflow
                                                  .ellipsis,
                                          style:
                                              GoogleFonts.poppins(
                                            fontWeight:
                                                FontWeight
                                                    .bold,
                                            fontSize: 15,
                                            color:
                                                colors.onSurface,
                                          ),
                                        ),
                                        if (description
                                            .isNotEmpty) ...[
                                          const SizedBox(
                                            height: 4,
                                          ),
                                          Text(
                                            description,
                                            maxLines: 2,
                                            overflow:
                                                TextOverflow
                                                    .ellipsis,
                                            style:
                                                GoogleFonts.poppins(
                                              fontSize: 12,
                                              color: colors
                                                  .onSurfaceVariant,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Icon(
                                    Icons
                                        .arrow_forward_ios_rounded,
                                    size: 18,
                                    color:
                                        colors.onSurfaceVariant,
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
  void _showMessage(
    String message, {
    bool isError = false,
  }) {
    if (!mounted) {
      return;
    }

    final colors = Theme.of(context).colorScheme;

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor:
              isError ? colors.error : null,
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  // Membersihkan prefix "Exception:" dari error.
  String _cleanError(Object error) {
    final text = error.toString();

    if (text.startsWith('Exception: ')) {
      return text.substring('Exception: '.length);
    }

    return text;
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          24,
          20,
          24,
          30,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Mulai mengerjakan!',
              style: GoogleFonts.poppins(
                fontSize: 34,
                fontWeight: FontWeight.bold,
                color: colors.onSurface,
                height: 1.15,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Pilih cara untuk menemukan formulir yang ingin kamu kerjakan.',
              style: GoogleFonts.poppins(
                fontSize: 15,
                color: colors.onSurfaceVariant,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 28),

            // ====================================================
            // PILIHAN 1 - TAG
            // ====================================================

            Text(
              'Cari lewat Tag',
              style: GoogleFonts.poppins(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: colors.onSurface,
              ),
            ),

            const SizedBox(height: 10),

            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: colors.surface,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: colors.outlineVariant,
                ),
                boxShadow: [
                  BoxShadow(
                    color: colors.shadow.withOpacity(.08),
                    blurRadius: 14,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: colors.primaryContainer,
                          borderRadius:
                              BorderRadius.circular(14),
                        ),
                        child: Icon(
                          Icons.search_rounded,
                          color:
                              colors.onPrimaryContainer,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Cari Formulir',
                          style: GoogleFonts.poppins(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: colors.onSurface,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Masukkan tag formulir untuk menemukan ujian yang tersedia.',
                    style: GoogleFonts.poppins(
                      fontSize: 13,
                      color: colors.onSurfaceVariant,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Input tag.
                  Container(
                    height: 56,
                    decoration: BoxDecoration(
                      color: colors.surfaceContainerHighest,
                      borderRadius:
                          BorderRadius.circular(18),
                      border: Border.all(
                        color: colors.outlineVariant,
                      ),
                    ),
                    child: Row(
                      children: [
                        const SizedBox(width: 16),
                        Icon(
                          Icons.tag_rounded,
                          color: colors.onSurfaceVariant,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: searchController,
                            enabled: !isSearching,
                            textInputAction:
                                TextInputAction.search,
                            autocorrect: false,
                            enableSuggestions: false,
                            onSubmitted: (_) => searchForm(),
                            style: GoogleFonts.poppins(
                              color: colors.onSurface,
                              fontSize: 14,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Masukkan Tag',
                              hintStyle:
                                  GoogleFonts.poppins(
                                color:
                                    colors.onSurfaceVariant,
                                fontSize: 14,
                              ),
                              border: InputBorder.none,
                              contentPadding:
                                  const EdgeInsets.symmetric(
                                vertical: 16,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          height: 44,
                          width: 86,
                          child: Padding(
                            padding:
                                const EdgeInsets.only(
                              right: 6,
                            ),
                            child: ElevatedButton(
                              onPressed:
                                  isSearching
                                      ? null
                                      : searchForm,
                              style:
                                  ElevatedButton.styleFrom(
                                elevation: 0,
                                backgroundColor:
                                    colors.primary,
                                disabledBackgroundColor:
                                    colors
                                        .surfaceContainerHighest,
                                foregroundColor:
                                    colors.onPrimary,
                                padding: EdgeInsets.zero,
                                shape:
                                    RoundedRectangleBorder(
                                  borderRadius:
                                      BorderRadius.circular(
                                    14,
                                  ),
                                ),
                              ),
                              child: isSearching
                                  ? SizedBox(
                                      width: 20,
                                      height: 20,
                                      child:
                                          CircularProgressIndicator(
                                        strokeWidth: 2.2,
                                        color:
                                            colors.onPrimary,
                                      ),
                                    )
                                  : Text(
                                      'Cari',
                                      style:
                                          GoogleFonts.poppins(
                                        fontWeight:
                                            FontWeight.bold,
                                      ),
                                    ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // ====================================================
            // PEMISAH
            // ====================================================

            Row(
              children: [
                Expanded(
                  child: Divider(
                    color: colors.outlineVariant,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                  ),
                  child: Text(
                    'ATAU',
                    style: GoogleFonts.poppins(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                ),
                Expanded(
                  child: Divider(
                    color: colors.outlineVariant,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // ====================================================
            // PILIHAN 2 - QR
            // ====================================================

            Text(
              'Masuk lewat QR Code',
              style: GoogleFonts.poppins(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: colors.onSurface,
              ),
            ),

            const SizedBox(height: 10),

            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: colors.surface,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: colors.outlineVariant,
                ),
                boxShadow: [
                  BoxShadow(
                    color: colors.shadow.withOpacity(.08),
                    blurRadius: 14,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: colors.primaryContainer,
                      borderRadius:
                          BorderRadius.circular(16),
                    ),
                    child: Icon(
                      Icons.qr_code_scanner_rounded,
                      size: 28,
                      color:
                          colors.onPrimaryContainer,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment:
                          CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Scan QR Code',
                          style: GoogleFonts.poppins(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: colors.onSurface,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Scan QR formulir untuk langsung membukanya.',
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            color:
                                colors.onSurfaceVariant,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  SizedBox(
                    height: 44,
                    child: ElevatedButton(
                      onPressed:
                          isScanning ? null : scanQrForm,
                      style:
                          ElevatedButton.styleFrom(
                        elevation: 0,
                        backgroundColor:
                            colors.primary,
                        disabledBackgroundColor:
                            colors.surfaceContainerHighest,
                        foregroundColor:
                            colors.onPrimary,
                        padding:
                            const EdgeInsets.symmetric(
                          horizontal: 16,
                        ),
                        shape:
                            RoundedRectangleBorder(
                          borderRadius:
                              BorderRadius.circular(14),
                        ),
                      ),
                      child: isScanning
                          ? SizedBox(
                              width: 20,
                              height: 20,
                              child:
                                  CircularProgressIndicator(
                                strokeWidth: 2.2,
                                color:
                                    colors.onPrimary,
                              ),
                            )
                          : Text(
                              'Scan',
                              style:
                                  GoogleFonts.poppins(
                                fontWeight:
                                    FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),

            // Pesan error.
            if (errorMessage != null) ...[
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: colors.errorContainer,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: colors.error.withOpacity(.25),
                  ),
                ),
                child: Row(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.error_outline,
                      color: colors.onErrorContainer,
                      size: 22,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        errorMessage!,
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          color:
                              colors.onErrorContainer,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 90),

            // Empty state.
            Center(
              child: Column(
                children: [
                  Container(
                    width: 104,
                    height: 104,
                    decoration: BoxDecoration(
                      color: colors.surface,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: colors.outlineVariant,
                      ),
                    ),
                    child: Icon(
                      Icons.assignment_rounded,
                      size: 48,
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Siap untuk mengerjakan?',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.poppins(
                      fontSize: 21,
                      fontWeight: FontWeight.bold,
                      color: colors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Cari formulir melalui tag atau\n'
                    'scan QR Code untuk memulai.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.poppins(
                      fontSize: 14,
                      color: colors.onSurfaceVariant,
                      height: 1.6,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }
}

// ===============================================================
// QR SCANNER
// ===============================================================

class _QrScannerPage extends StatefulWidget {
  const _QrScannerPage();

  @override
  State<_QrScannerPage> createState() =>
      _QrScannerPageState();
}

class _QrScannerPageState
    extends State<_QrScannerPage> {
  final MobileScannerController controller =
      MobileScannerController();

  static const MethodChannel _qrFeedbackChannel =
      MethodChannel('com.example.formaly/exam_security');

  bool hasScanned = false;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void _handleQrCode(BarcodeCapture capture) {
    if (hasScanned) {
      return;
    }

    if (capture.barcodes.isEmpty) {
      return;
    }

    final rawValue =
        capture.barcodes.first.rawValue?.trim() ?? '';

    if (rawValue.isEmpty) {
      return;
    }

    _finishScan(rawValue);
  }

  Future<void> _finishScan(String rawValue) async {
    hasScanned = true;

    // Getaran saat QR berhasil terbaca.
    HapticFeedback.mediumImpact();

    // Bunyi beep dibuat native Android agar tidak bergantung
    // pada system click sound perangkat.
    try {
      await _qrFeedbackChannel.invokeMethod<void>(
        'playQrScanSound',
      );
    } catch (_) {
      // Jangan menggagalkan proses scan jika feedback audio gagal.
    }

    if (!mounted) {
      return;
    }

    Navigator.pop(
      context,
      rawValue,
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(
          'Scan QR Code',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
        actions: [
          IconButton(
            onPressed: () {
              controller.toggleTorch();
            },
            icon: const Icon(
              Icons.flash_on_rounded,
            ),
          ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(
            controller: controller,
            onDetect: _handleQrCode,
          ),

          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                border: Border.all(
                  color: colors.primary,
                  width: 3,
                ),
                borderRadius:
                    BorderRadius.circular(24),
              ),
            ),
          ),

          Positioned(
            left: 24,
            right: 24,
            bottom: 40,
            child: Text(
              'Arahkan kamera ke QR Code formulir.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
