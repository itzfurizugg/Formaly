import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_widget_from_html/flutter_widget_from_html.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'question_screen.dart';

class FormDetailScreen extends StatefulWidget {
  /// ID form dari tabel `forms` di Supabase.
  ///
  /// TAG sudah digunakan pada HomeScreen untuk mencari form.
  /// Screen ini menerima formId hasil pencarian tersebut, lalu
  /// mengambil detail form, tag, dan jumlah soal dari Supabase.
  final String formId;

  const FormDetailScreen({
    super.key,
    required this.formId,
  });

  @override
  State<FormDetailScreen> createState() => _FormDetailScreenState();
}

class _FormDetailScreenState extends State<FormDetailScreen> {
  final SupabaseClient _supabase =
      Supabase.instance.client;

  bool isLoading = true;
  bool isStarting = false;

  String? errorMessage;

  String formTitle = 'Memuat form...';
  String formDescription = '';
  String formTag = '-';

  // Banner form dari Creator Web.
  String formBanner = '';

  int durationMinutes = 0;
  int questionCount = 0;

  // Channel untuk mengaktifkan keamanan ujian Android.
  static const MethodChannel _examSecurityChannel =
      MethodChannel(
    'com.example.formaly/exam_security',
  );

  // Base URL Go Storage Formaly.
  static const String _storageBaseUrl =
      'https://formaly-storage.commandspes.tech';

  // Mengubah path media relatif dari Go Storage menjadi URL lengkap.
  String _resolveMediaUrl(String raw) {
    final String value = raw.trim();

    if (value.isEmpty) {
      return '';
    }

    if (value.startsWith('http://') ||
        value.startsWith('https://')) {
      return value;
    }

    if (value.startsWith('/')) {
      return '$_storageBaseUrl$value';
    }

    return '$_storageBaseUrl/$value';
  }

  @override
  void initState() {
    super.initState();
    loadForm();
  }

  // ============================================================
  // LOAD FORM
  // ============================================================

  Future<void> loadForm() async {
    if (!mounted) return;

    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    try {
      final String cleanFormId =
          widget.formId.trim();

      if (cleanFormId.isEmpty) {
        throw Exception(
          'ID form kosong.',
        );
      }

      // ========================================================
      // 1. AMBIL DATA FORM
      //
      // header_image adalah banner form yang diatur oleh
      // Creator Web. Android hanya mengambil dan menampilkan.
      // ========================================================

      final formResponse = await _supabase
          .from('forms')
          .select(
            'id, title, description, duration, header_image, media_url',
          )
          .eq(
            'id',
            cleanFormId,
          )
          .maybeSingle();

      if (formResponse == null) {
        throw Exception(
          'Form dengan ID "$cleanFormId" tidak ditemukan di Supabase.',
        );
      }

      final String loadedFormId =
          formResponse['id']
                  ?.toString()
                  .trim() ??
              '';

      if (loadedFormId.isEmpty) {
        throw Exception(
          'ID form dari Supabase tidak ditemukan.',
        );
      }

      final String loadedTitle =
          formResponse['title']
                  ?.toString()
                  .trim() ??
              '';

      final String loadedDescription =
          formResponse['description']
                  ?.toString() ??
              '';

      final int loadedDuration =
          _toInt(
        formResponse['duration'],
      );

      // ========================================================
      // AMBIL BANNER
      //
      // Banner hanya ditampilkan dari kolom header_image.
      // Tidak ada proses set / upload / edit banner di Android.
      // ========================================================

      final String headerImage =
          formResponse['header_image']
                  ?.toString()
                  .trim() ??
              '';

      final String headerMedia =
          formResponse['media_url']
                  ?.toString()
                  .trim() ??
              '';

      final String loadedBanner =
          _resolveMediaUrl(
        headerMedia.isNotEmpty
            ? headerMedia
            : headerImage,
      );

      // ========================================================
      // 2. AMBIL TAG MELALUI form_tags -> tags
      //
      // Relasi:
      // form_tags.form_id -> forms.id
      // form_tags.tag_id  -> tags.id
      //
      // Satu form secara teori bisa memiliki lebih dari satu tag.
      // Untuk tampilan detail, gunakan tag pertama yang ditemukan.
      // ========================================================

      String loadedTag = '-';

      try {
        final formTagResponse =
            await _supabase
                .from('form_tags')
                .select('tag_id')
                .eq(
                  'form_id',
                  loadedFormId,
                )
                .limit(1);

        if (formTagResponse.isNotEmpty) {
          final String tagId =
              formTagResponse.first[
                        'tag_id']
                    ?.toString()
                    .trim() ??
                  '';

          if (tagId.isNotEmpty) {
            final tagResponse =
                await _supabase
                    .from('tags')
                    .select('id, name')
                    .eq(
                      'id',
                      tagId,
                    )
                    .maybeSingle();

            if (tagResponse != null) {
              final String tagName =
                  tagResponse['name']
                          ?.toString()
                          .trim() ??
                      '';

              if (tagName.isNotEmpty) {
                loadedTag =
                    tagName;
              }
            }
          }
        }
      } catch (_) {
        // Tag hanya untuk informasi pada halaman detail.
        // Form tetap dapat dibuka karena formId sudah valid.
        loadedTag = '-';
      }

      // ========================================================
      // 3. HITUNG JUMLAH SOAL
      //
      // Soal terhubung ke forms melalui questions.form_id.
      // ========================================================

      final questionRows =
          await _supabase
              .from('questions')
              .select('id')
              .eq(
                'form_id',
                loadedFormId,
              );

      final int loadedQuestionCount =
          questionRows.length;

      if (!mounted) return;

      setState(() {
        formTitle =
            loadedTitle.isEmpty
                ? 'Form Ujian'
                : loadedTitle;

        formDescription =
            loadedDescription;

        formTag =
            loadedTag;

        formBanner =
            loadedBanner;

        durationMinutes =
            loadedDuration;

        questionCount =
            loadedQuestionCount;

        isLoading = false;
        errorMessage = null;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        isLoading = false;
        errorMessage =
            _cleanError(e);
      });
    }
  }

  // ============================================================
  // START EXAM
  // ============================================================

  Future<void> startExam() async {
    if (isStarting || isLoading) {
      return;
    }

    final String cleanFormId =
        widget.formId.trim();

    if (cleanFormId.isEmpty) {
      _showMessage(
        'ID form tidak valid.',
      );
      return;
    }

    if (questionCount <= 0) {
      _showMessage(
        'Belum ada soal untuk form ini.',
      );
      return;
    }

    setState(() {
      isStarting = true;
    });

    try {
      // ========================================================
      // 1. VERIFIKASI FORM
      // ========================================================

      final formResponse =
          await _supabase
              .from('forms')
              .select(
                'id, allow_multiple_submissions',
              )
              .eq(
                'id',
                cleanFormId,
              )
              .maybeSingle();

      if (formResponse == null) {
        throw Exception(
          'Form tidak ditemukan atau sudah tidak tersedia.',
        );
      }

      final String verifiedFormId =
          formResponse['id']
                  ?.toString()
                  .trim() ??
              '';

      if (verifiedFormId.isEmpty) {
        throw Exception(
          'ID form dari Supabase tidak valid.',
        );
      }

      // ========================================================
      // 1A. CEK BATAS PENGERJAAN FORM
      //
      // allow_multiple_submissions = false
      // -> satu user hanya boleh mengerjakan satu kali.
      //
      // allow_multiple_submissions = true
      // -> user boleh mengerjakan form lebih dari satu kali.
      //
      // Pengecekan dilakukan berdasarkan:
      // submissions.form_id
      // submissions.user_id
      // ========================================================

      final bool allowMultipleSubmissions =
          formResponse['allow_multiple_submissions'] == true;

      if (!allowMultipleSubmissions) {
        final user =
            _supabase.auth.currentUser;

        if (user == null) {
          throw Exception(
            'User belum login. Silakan login terlebih dahulu.',
          );
        }

        final previousSubmissions =
            await _supabase
                .from('submissions')
                .select('id')
                .eq(
                  'form_id',
                  verifiedFormId,
                )
                .eq(
                  'user_id',
                  user.id,
                )
                .limit(1);

        if (previousSubmissions.isNotEmpty) {
          throw Exception(
            'Form ini hanya dapat dikerjakan satu kali. '
            'Kamu sudah pernah mengerjakan form ini.',
          );
        }
      }

      // ========================================================
      // 2. VERIFIKASI SOAL
      // ========================================================

      final questionCheck =
          await _supabase
              .from('questions')
              .select('id')
              .eq(
                'form_id',
                verifiedFormId,
              );

      if (questionCheck.isEmpty) {
        throw Exception(
          'Belum ada soal untuk form ini.',
        );
      }

      if (!mounted) return;

      // ========================================================
      // 3. SECURITY ON
      //
      // Android akan:
      // - mengaktifkan FLAG_SECURE
      // - mencoba masuk Lock Task
      // ========================================================

      final bool securityStarted =
          await _examSecurityChannel
                  .invokeMethod<bool>(
                'startExamSecurity',
              ) ??
              false;

      // Jangan buka QuestionScreen kalau security
      // belum berhasil diaktifkan.
      if (!securityStarted || !mounted) {
        _showMessage(
          'Keamanan ujian belum aktif. '
          'Perangkat belum dikonfigurasi untuk mode ujian.',
        );
        return;
      }

      // ========================================================
      // 4. FULLSCREEN
      // ========================================================

      await SystemChrome
          .setEnabledSystemUIMode(
        SystemUiMode.immersiveSticky,
      );

      if (!mounted) return;

      // ========================================================
      // 5. BUKA QUESTION SCREEN
      //
      // TAG sudah digunakan sebelum masuk ke halaman ini.
      // QuestionScreen cukup menerima formId.
      // Tidak bergantung pada token.
      // ========================================================

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) =>
              QuestionScreen(
            formId:
                verifiedFormId,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;

      _showMessage(
        'Gagal membuka ujian: '
        '${_cleanError(e)}',
      );
    } finally {
      if (mounted) {
        setState(() {
          isStarting = false;
        });
      }
    }
  }

  // ============================================================
  // MESSAGE
  // ============================================================

  void _showMessage(
    String message,
  ) {
    if (!mounted) return;

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content:
              Text(message),
          behavior:
              SnackBarBehavior.floating,
        ),
      );
  }

  // ============================================================
  // INTEGER HELPER
  // ============================================================

  int _toInt(dynamic value) {
    if (value == null) {
      return 0;
    }

    if (value is int) {
      return value;
    }

    if (value is num) {
      return value.toInt();
    }

    return int.tryParse(
          value.toString().trim(),
        ) ??
        0;
  }

  // ============================================================
  // ERROR HELPER
  // ============================================================

  String _cleanError(
    Object error,
  ) {
    final String text =
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

  // ============================================================
  // DURATION
  // ============================================================

  String get durationText {
    if (durationMinutes <= 0) {
      return '-';
    }

    if (durationMinutes >= 60) {
      final int hours =
          durationMinutes ~/ 60;

      final int minutes =
          durationMinutes % 60;

      if (minutes == 0) {
        return '$hours Jam';
      }

      return '$hours Jam $minutes Menit';
    }

    return '$durationMinutes Menit';
  }

  // ============================================================
  // BUILD
  // ============================================================

  @override
  Widget build(
    BuildContext context,
  ) {
    final colors =
        Theme.of(context)
            .colorScheme;

    return Scaffold(
      backgroundColor:
          Theme.of(context)
              .scaffoldBackgroundColor,

      appBar: AppBar(
        backgroundColor:
            colors.surface,
        surfaceTintColor:
            Colors.transparent,
        elevation: 0,

        leading:
            IconButton(
          icon: Icon(
            Icons
                .arrow_back_ios_new,
            color:
                colors.onSurface,
          ),
          onPressed: () =>
              Navigator.pop(
            context,
          ),
        ),

        title:
            Text(
          'Detail Form',
          style:
              GoogleFonts.poppins(
            color:
                colors.onSurface,
            fontWeight:
                FontWeight.w600,
          ),
        ),

        centerTitle: true,
      ),

      body: isLoading
          ? _buildLoading()
          : errorMessage !=
                  null
              ? _buildError()
              : _buildContent(),
    );
  }

  // ============================================================
  // LOADING
  // ============================================================

  Widget _buildLoading() {
    return const Center(
      child:
          CircularProgressIndicator(),
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  Widget _buildError() {
    final colors =
        Theme.of(context)
            .colorScheme;

    return Center(
      child:
          SingleChildScrollView(
        padding:
            const EdgeInsets.all(
          30,
        ),
        child: Column(
          mainAxisAlignment:
              MainAxisAlignment
                  .center,

          children: [
            Icon(
              Icons
                  .error_outline,
              size: 64,
              color:
                  colors.error,
            ),

            const SizedBox(
                height: 20),

            Text(
              'Gagal Memuat Form',
              textAlign:
                  TextAlign.center,
              style:
                  GoogleFonts.poppins(
                fontSize: 20,
                fontWeight:
                    FontWeight.bold,
              ),
            ),

            const SizedBox(
                height: 12),

            Text(
              errorMessage ??
                  'Terjadi kesalahan.',
              textAlign:
                  TextAlign.center,
              style:
                  GoogleFonts.poppins(
                fontSize: 14,
                color: colors
                    .onSurfaceVariant,
                height: 1.5,
              ),
            ),

            const SizedBox(
                height: 25),

            SizedBox(
              height: 50,
              child:
                  ElevatedButton.icon(
                onPressed:
                    isLoading
                        ? null
                        : loadForm,
                icon:
                    const Icon(
                  Icons.refresh,
                ),
                label:
                    Text(
                  'Coba Lagi',
                  style:
                      GoogleFonts
                          .poppins(
                    fontWeight:
                        FontWeight.bold,
                  ),
                ),
                style:
                    ElevatedButton
                        .styleFrom(
                  backgroundColor:
                      colors.primary,
                  foregroundColor:
                      colors.onPrimary,
                  shape:
                      RoundedRectangleBorder(
                    borderRadius:
                        BorderRadius
                            .circular(
                      14,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // CONTENT
  // ============================================================

  Widget _buildContent() {
    final colors =
        Theme.of(context)
            .colorScheme;

    return SingleChildScrollView(
      padding:
          const EdgeInsets.all(
        24,
      ),

      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment
                .start,

        children: [
          // ======================================================
          // BANNER
          // ======================================================

          if (formBanner.trim().isNotEmpty)
            _buildBanner(),

          if (formBanner.trim().isNotEmpty)
            const SizedBox(
                height: 20),

          // ======================================================
          // HEADER
          // ======================================================

          Container(
            width:
                double.infinity,

            padding:
                const EdgeInsets.all(
              24,
            ),

            decoration:
                BoxDecoration(
              color:
                  colors.surface,

              borderRadius:
                  BorderRadius.circular(
                24,
              ),

              boxShadow: [
                BoxShadow(
                  color: Colors
                      .black
                      .withValues(
                    alpha: .05,
                  ),
                  blurRadius: 12,
                  offset:
                      const Offset(
                    0,
                    5,
                  ),
                ),
              ],
            ),

            child: Column(
              children: [
                Text(
                  formTitle,
                  textAlign:
                      TextAlign.center,
                  style:
                      GoogleFonts.poppins(
                    fontSize: 28,
                    fontWeight:
                        FontWeight.bold,
                  ),
                ),

                const SizedBox(
                    height: 8),

                Text(
                  'Form ditemukan dari TAG Supabase',
                  textAlign:
                      TextAlign.center,
                  style:
                      GoogleFonts.poppins(
                    color: colors
                        .onSurfaceVariant,
                    fontSize: 14,
                  ),
                ),

                const SizedBox(
                    height: 15),

                Container(
                  padding:
                      const EdgeInsets
                          .symmetric(
                    horizontal: 14,
                    vertical: 8,
                  ),

                  decoration:
                      BoxDecoration(
                    color: colors
                        .surfaceContainerHighest,
                    borderRadius:
                        BorderRadius
                            .circular(
                      12,
                    ),
                  ),

                  child: Row(
                    mainAxisSize:
                        MainAxisSize.min,

                    children: [
                      Icon(
                        Icons.tag,
                        size: 17,
                        color:
                            colors.onSurface,
                      ),

                      const SizedBox(
                          width: 7),

                      Text(
                        'Tag: $formTag',
                        style:
                            GoogleFonts
                                .poppins(
                          fontWeight:
                              FontWeight
                                  .w600,
                          fontSize:
                              13,
                          color:
                              colors.onSurface,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(
              height: 25),

          // ======================================================
          // INFO
          // ======================================================

          Row(
            children: [
              Expanded(
                child: _infoCard(
                  Icons
                      .timer_outlined,
                  'Durasi',
                  durationText,
                ),
              ),

              const SizedBox(
                  width: 15),

              Expanded(
                child: _infoCard(
                  Icons
                      .quiz_outlined,
                  'Jumlah Soal',
                  '$questionCount',
                ),
              ),
            ],
          ),

          const SizedBox(
              height: 25),

          // ======================================================
          // DESKRIPSI
          // ======================================================

          Text(
            'Deskripsi',
            style:
                GoogleFonts.poppins(
              fontSize: 18,
              fontWeight:
                  FontWeight.bold,
            ),
          ),

          const SizedBox(
              height: 12),

          Container(
            width:
                double.infinity,

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
                18,
              ),
            ),

            child:
                formDescription
                        .trim()
                        .isEmpty
                    ? Text(
                        'Tidak ada deskripsi untuk form ini.',
                        style:
                            GoogleFonts.poppins(
                          fontSize: 14,
                          height: 1.7,
                          color:
                              colors.onSurface,
                        ),
                      )
                    : HtmlWidget(
                        formDescription,
                        renderMode:
                            RenderMode.column,
                        textStyle:
                            GoogleFonts.poppins(
                          fontSize: 14,
                          color:
                              colors.onSurface,
                          height: 1.7,
                        ),
                        customStylesBuilder: (element) {
                          if (element.localName == 'p') {
                            return {
                              'margin': '0 0 8px 0',
                            };
                          }
                          return null;
                        },
                      ),
          ),

          const SizedBox(
              height: 35),

          // ======================================================
          // START
          // ======================================================

          SizedBox(
            width:
                double.infinity,
            height: 56,

            child:
                ElevatedButton(
              onPressed:
                  isStarting ||
                          questionCount <=
                              0
                      ? null
                      : startExam,

              style:
                  ElevatedButton
                      .styleFrom(
                backgroundColor:
                    colors.primary,
                foregroundColor:
                    colors.onPrimary,
                disabledBackgroundColor:
                    colors
                        .surfaceContainerHighest,
                elevation: 0,

                shape:
                    RoundedRectangleBorder(
                  borderRadius:
                      BorderRadius
                          .circular(
                    18,
                  ),
                ),
              ),

              child:
                  isStarting
                      ? SizedBox(
                          width: 24,
                          height: 24,
                          child:
                              CircularProgressIndicator(
                            strokeWidth:
                                2.5,
                            color:
                                colors.onPrimary,
                          ),
                        )
                      : Text(
                          questionCount <=
                                  0
                              ? 'TIDAK ADA SOAL'
                              : 'START',
                          style:
                              GoogleFonts
                                  .poppins(
                            color:
                                colors.onPrimary,
                            fontWeight:
                                FontWeight
                                    .bold,
                            fontSize:
                                17,
                          ),
                        ),
            ),
          ),

          const SizedBox(
              height: 20),
        ],
      ),
    );
  }

  // ============================================================
  // BANNER WIDGET
  // ============================================================

  Widget _buildBanner() {
    final colors =
        Theme.of(context)
            .colorScheme;

    return ClipRRect(
      borderRadius:
          BorderRadius.circular(
        22,
      ),

      child:
          AspectRatio(
        aspectRatio: 16 / 7,

        child:
            Container(
          color:
              colors.surfaceContainerHighest,

          child:
              Image.network(
            formBanner,
            width:
                double.infinity,
            height:
                double.infinity,
            fit:
                BoxFit.cover,

            loadingBuilder:
                (
              context,
              child,
              loadingProgress,
            ) {
              if (loadingProgress ==
                  null) {
                return child;
              }

              return Center(
                child:
                    CircularProgressIndicator(
                  value:
                      loadingProgress
                                  .expectedTotalBytes !=
                              null
                          ? loadingProgress
                                  .cumulativeBytesLoaded /
                              loadingProgress
                                  .expectedTotalBytes!
                          : null,
                ),
              );
            },

            errorBuilder:
                (
              context,
              error,
              stackTrace,
            ) {
              return Container(
                color: colors
                    .surfaceContainerHighest,

                alignment:
                    Alignment.center,

                child: Column(
                  mainAxisAlignment:
                      MainAxisAlignment
                          .center,

                  children: [
                    Icon(
                      Icons
                          .image_not_supported_outlined,
                      size: 38,
                      color: colors
                          .onSurfaceVariant,
                    ),

                    const SizedBox(
                        height: 8),

                    Text(
                      'Banner tidak dapat dimuat',
                      style:
                          GoogleFonts.poppins(
                        fontSize:
                            12,
                        color: colors
                            .onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  // ============================================================
  // INFO CARD
  // ============================================================

  Widget _infoCard(
    IconData icon,
    String title,
    String value,
  ) {
    final colors =
        Theme.of(context)
            .colorScheme;

    return Container(
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
          18,
        ),
      ),

      child: Column(
        children: [
          Icon(
            icon,
            size: 32,
            color:
                colors.onSurface,
          ),

          const SizedBox(
              height: 10),

          Text(
            title,
            textAlign:
                TextAlign.center,
            style:
                GoogleFonts.poppins(
              color:
                  colors.onSurfaceVariant,
            ),
          ),

          const SizedBox(
              height: 5),

          Text(
            value,
            textAlign:
                TextAlign.center,
            style:
                GoogleFonts.poppins(
              fontWeight:
                  FontWeight.bold,
              fontSize: 18,
            ),
          ),
        ],
      ),
    );
  }
}