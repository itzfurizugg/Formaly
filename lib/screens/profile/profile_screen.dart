import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/theme/theme_controller.dart';
import '../auth/login.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final SupabaseClient _supabase = Supabase.instance.client;

  bool _isLoading = true;
  bool _isLoggingOut = false;
  bool _isUpdatingAccount = false;
  String? _errorMessage;

  String _name = '';
  String _email = '';
  String _role = '';
  DateTime? _createdAt;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  // Memuat data profil user dari Supabase.
  Future<void> _loadProfile() async {
    if (!mounted) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final user = _supabase.auth.currentUser;

      if (user == null) {
        throw Exception('User belum login.');
      }

      final userResponse = await _supabase
          .from('users')
          .select('id, name, email, role, created_at')
          .eq('id', user.id)
          .maybeSingle();

      if (userResponse == null) {
        throw Exception(
          'Data profil tidak ditemukan di tabel users.',
        );
      }

      String loadedName =
          userResponse['name']?.toString().trim() ?? '';

      // Coba ambil nama dari tabel profiles.
      try {
        final profileResponse = await _supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .maybeSingle();

        final profileName =
            profileResponse?['name']?.toString().trim() ?? '';

        if (profileName.isNotEmpty) {
          loadedName = profileName;
        }
      } catch (_) {
        // Fallback menggunakan data dari users.
      }

      final String loadedEmail =
          userResponse['email']?.toString().trim().isNotEmpty == true
              ? userResponse['email'].toString().trim()
              : (user.email?.trim() ?? '');

      final String loadedRole =
          userResponse['role']?.toString().trim() ?? '';

      DateTime? loadedCreatedAt;
      final createdAtValue = userResponse['created_at'];

      if (createdAtValue != null) {
        loadedCreatedAt =
            DateTime.tryParse(createdAtValue.toString());
      }

      if (!mounted) return;

      setState(() {
        _name = loadedName.isEmpty ? 'Pengguna' : loadedName;
        _email = loadedEmail.isEmpty ? '-' : loadedEmail;
        _role = loadedRole;
        _createdAt = loadedCreatedAt;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _isLoading = false;
        _errorMessage = _cleanError(e);
      });
    }
  }

  // Mengubah username user.
  Future<void> _editUsername() async {
    if (_isUpdatingAccount) return;

    final TextEditingController controller =
        TextEditingController(
      text: _name,
    );

    final String? result = await showDialog<String>(
      context: context,
      builder: (dialogContext) {
        final colors =
            Theme.of(dialogContext).colorScheme;

        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            'Ubah Username',
            style: TextStyle(fontFamily: 'FunnelDisplay',

              fontWeight: FontWeight.bold,
              color: colors.onSurface,
            ),
          ),
          content: TextField(
            controller: controller,
            autofocus: true,
            textCapitalization:
                TextCapitalization.words,
            decoration: InputDecoration(
              labelText: 'Username',
              hintText: 'Masukkan username',
              border: OutlineInputBorder(
                borderRadius:
                    BorderRadius.circular(12),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(dialogContext);
              },
              child: Text(
                'Batal',
                style: TextStyle(fontFamily: 'FunnelDisplay',

                  color: colors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(
                  dialogContext,
                  controller.text.trim(),
                );
              },
              child: Text(
                'Simpan',
                style: TextStyle(fontFamily: 'FunnelDisplay',

                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );
      },
    );

    controller.dispose();

    if (result == null || !mounted) {
      return;
    }

    final String newName = result.trim();

    if (newName.isEmpty) {
      _showMessage(
        'Username wajib diisi.',
        isError: true,
      );
      return;
    }

    if (newName.length < 2) {
      _showMessage(
        'Username minimal 2 karakter.',
        isError: true,
      );
      return;
    }

    final user = _supabase.auth.currentUser;

    if (user == null) {
      _showMessage(
        'User belum login.',
        isError: true,
      );
      return;
    }

    if (newName == _name.trim()) {
      _showMessage(
        'Username masih sama.',
      );
      return;
    }

    setState(() {
      _isUpdatingAccount = true;
    });

    try {
      // Update nama di tabel users.
      await _supabase
          .from('users')
          .update({
        'name': newName,
      })
          .eq(
        'id',
        user.id,
      );

      // Update nama di tabel profiles.
      await _supabase
          .from('profiles')
          .update({
        'name': newName,
      })
          .eq(
        'id',
        user.id,
      );

      // Update metadata user di Supabase Auth.
      await _supabase.auth.updateUser(
        UserAttributes(
          data: {
            'name': newName,
          },
        ),
      );

      if (!mounted) return;

      setState(() {
        _name = newName;
      });

      _showMessage(
        'Username berhasil diperbarui.',
      );
    } on AuthException catch (e) {
      if (!mounted) return;

      _showMessage(
        _cleanError(e),
        isError: true,
      );
    } on PostgrestException catch (e) {
      if (!mounted) return;

      _showMessage(
        'Gagal memperbarui username: ${e.message}',
        isError: true,
      );
    } catch (e) {
      if (!mounted) return;

      _showMessage(
        'Gagal memperbarui username: ${_cleanError(e)}',
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isUpdatingAccount = false;
        });
      }
    }
  }

  // Mengubah email user.
  Future<void> _editEmail() async {
    if (_isUpdatingAccount) return;

    final TextEditingController controller =
        TextEditingController(
      text: _email == '-' ? '' : _email,
    );

    final String? result = await showDialog<String>(
      context: context,
      builder: (dialogContext) {
        final colors =
            Theme.of(dialogContext).colorScheme;

        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            'Ubah Email',
            style: TextStyle(fontFamily: 'FunnelDisplay',

              fontWeight: FontWeight.bold,
              color: colors.onSurface,
            ),
          ),
          content: TextField(
            controller: controller,
            autofocus: true,
            keyboardType:
                TextInputType.emailAddress,
            autocorrect: false,
            enableSuggestions: false,
            textCapitalization:
                TextCapitalization.none,
            decoration: InputDecoration(
              labelText: 'Email',
              hintText: 'nama@email.com',
              border: OutlineInputBorder(
                borderRadius:
                    BorderRadius.circular(12),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(dialogContext);
              },
              child: Text(
                'Batal',
                style: TextStyle(fontFamily: 'FunnelDisplay',

                  color: colors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(
                  dialogContext,
                  controller.text.trim().toLowerCase(),
                );
              },
              child: Text(
                'Simpan',
                style: TextStyle(fontFamily: 'FunnelDisplay',

                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );
      },
    );

    controller.dispose();

    if (result == null || !mounted) {
      return;
    }

    final String newEmail =
        result.trim().toLowerCase();

    if (newEmail.isEmpty) {
      _showMessage(
        'Email wajib diisi.',
        isError: true,
      );
      return;
    }

    final RegExp emailRegex = RegExp(
      r'^[^@\s]+@[^@\s]+\.[^@\s]+$',
    );

    if (!emailRegex.hasMatch(newEmail)) {
      _showMessage(
        'Masukkan alamat email yang valid.',
        isError: true,
      );
      return;
    }

    final user = _supabase.auth.currentUser;

    if (user == null) {
      _showMessage(
        'User belum login.',
        isError: true,
      );
      return;
    }

    if (newEmail ==
        _email.trim().toLowerCase()) {
      _showMessage(
        'Email masih sama.',
      );
      return;
    }

    setState(() {
      _isUpdatingAccount = true;
    });

    try {
      // Update email pada Supabase Auth.
      await _supabase.auth.updateUser(
        UserAttributes(
          email: newEmail,
        ),
      );

      // Menyamakan email pada tabel users.
      await _supabase
          .from('users')
          .update({
        'email': newEmail,
      })
          .eq(
        'id',
        user.id,
      );

      if (!mounted) return;

      setState(() {
        _email = newEmail;
      });

      _showMessage(
        'Email berhasil diperbarui.',
      );
    } on AuthException catch (e) {
      if (!mounted) return;

      _showMessage(
        _cleanError(e),
        isError: true,
      );
    } on PostgrestException catch (e) {
      if (!mounted) return;

      _showMessage(
        'Gagal memperbarui email pada data profil: ${e.message}',
        isError: true,
      );
    } catch (e) {
      if (!mounted) return;

      _showMessage(
        'Gagal memperbarui email: ${_cleanError(e)}',
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isUpdatingAccount = false;
        });
      }
    }
  }

  // Mengubah password user.
  Future<void> _editPassword() async {
    if (_isUpdatingAccount) return;

    final TextEditingController passwordController =
        TextEditingController();

    final TextEditingController confirmController =
        TextEditingController();

    final List<String>? result =
        await showDialog<List<String>>(
      context: context,
      builder: (dialogContext) {
        final colors =
            Theme.of(dialogContext).colorScheme;

        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            'Ubah Password',
            style: TextStyle(fontFamily: 'FunnelDisplay',

              fontWeight: FontWeight.bold,
              color: colors.onSurface,
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: passwordController,
                autofocus: true,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password Baru',
                  hintText:
                      'Masukkan password baru',
                  border: OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: confirmController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText:
                      'Konfirmasi Password',
                  hintText:
                      'Ulangi password baru',
                  border: OutlineInputBorder(
                    borderRadius:
                        BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(dialogContext);
              },
              child: Text(
                'Batal',
                style: TextStyle(fontFamily: 'FunnelDisplay',

                  color: colors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(
                  dialogContext,
                  [
                    passwordController.text,
                    confirmController.text,
                  ],
                );
              },
              child: Text(
                'Simpan',
                style: TextStyle(fontFamily: 'FunnelDisplay',

                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );
      },
    );

    passwordController.dispose();
    confirmController.dispose();

    if (result == null || !mounted) {
      return;
    }

    final String newPassword = result[0];
    final String confirmPassword = result[1];

    if (newPassword.isEmpty) {
      _showMessage(
        'Password baru wajib diisi.',
        isError: true,
      );
      return;
    }

    if (newPassword.length < 6) {
      _showMessage(
        'Password minimal 6 karakter.',
        isError: true,
      );
      return;
    }

    if (confirmPassword.isEmpty) {
      _showMessage(
        'Konfirmasi password wajib diisi.',
        isError: true,
      );
      return;
    }

    if (newPassword != confirmPassword) {
      _showMessage(
        'Konfirmasi password tidak sama.',
        isError: true,
      );
      return;
    }

    final user = _supabase.auth.currentUser;

    if (user == null) {
      _showMessage(
        'User belum login.',
        isError: true,
      );
      return;
    }

    setState(() {
      _isUpdatingAccount = true;
    });

    try {
      await _supabase.auth.updateUser(
        UserAttributes(
          password: newPassword,
        ),
      );

      if (!mounted) return;

      _showMessage(
        'Password berhasil diperbarui.',
      );
    } on AuthException catch (e) {
      if (!mounted) return;

      _showMessage(
        _cleanError(e),
        isError: true,
      );
    } catch (e) {
      if (!mounted) return;

      _showMessage(
        'Gagal memperbarui password: ${_cleanError(e)}',
        isError: true,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isUpdatingAccount = false;
        });
      }
    }
  }

  // Logout dari akun setelah konfirmasi.
  Future<void> _logout() async {
    if (_isLoggingOut) return;

    final bool? shouldLogout = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        final colors =
            Theme.of(dialogContext).colorScheme;

        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            'Keluar dari akun?',
            style: TextStyle(fontFamily: 'FunnelDisplay',

              fontWeight: FontWeight.bold,
              color: colors.onSurface,
            ),
          ),
          content: Text(
            'Kamu perlu login kembali untuk mengakses akun ini.',
            style: TextStyle(fontFamily: 'FunnelDisplay',

              height: 1.5,
              color: colors.onSurfaceVariant,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () =>
                  Navigator.pop(dialogContext, false),
              child: Text(
                'Batal',
                style: TextStyle(fontFamily: 'FunnelDisplay',

                  color: colors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            ElevatedButton(
              onPressed: () =>
                  Navigator.pop(dialogContext, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: colors.error,
                foregroundColor: colors.onError,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius:
                      BorderRadius.circular(12),
                ),
              ),
              child: Text(
                'Keluar',
                style: TextStyle(fontFamily: 'FunnelDisplay',

                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );
      },
    );

    if (shouldLogout != true || !mounted) return;

    setState(() {
      _isLoggingOut = true;
    });

    try {
      await _supabase.auth.signOut();

      if (!mounted) return;

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(
          builder: (_) => const LoginScreen(),
        ),
        (route) => false,
      );
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _isLoggingOut = false;
      });

      _showMessage(
        'Gagal keluar: ${_cleanError(e)}',
        isError: true,
      );
    }
  }

  // Mengubah mode tampilan aplikasi.
  Future<void> _changeTheme(ThemeMode mode) async {
    await ThemeController.instance.setThemeMode(mode);

    if (!mounted) return;

    _showMessage(
      mode == ThemeMode.dark
          ? 'Dark Mode aktif.'
          : 'Light Mode aktif.',
    );
  }

  // Membersihkan prefix error.
  String _cleanError(Object error) {
    final text = error.toString();

    if (text.startsWith('Exception: ')) {
      return text.substring('Exception: '.length);
    }

    return text;
  }

  // Mengubah role menjadi format yang lebih rapi.
  String _formatRole(String role) {
    final clean = role.trim();

    if (clean.isEmpty) {
      return 'Pengguna';
    }

    return clean
        .replaceAll('_', ' ')
        .split(' ')
        .where((word) => word.isNotEmpty)
        .map(
          (word) =>
              '${word[0].toUpperCase()}'
              '${word.substring(1).toLowerCase()}',
        )
        .join(' ');
  }

  // Memformat tanggal ke bahasa Indonesia.
  String _formatDate(DateTime? date) {
    if (date == null) return '-';

    final localDate = date.toLocal();

    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];

    return '${localDate.day} ${months[localDate.month - 1]} '
        '${localDate.year}';
  }

  // Membuat inisial nama user.
  String _initials(String name) {
    final words = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .toList();

    if (words.isEmpty) return 'U';

    if (words.length == 1) {
      final word = words.first;

      return word
          .substring(
            0,
            word.length >= 2 ? 2 : 1,
          )
          .toUpperCase();
    }

    return '${words.first[0]}${words.last[0]}'
        .toUpperCase();
  }

  bool get _isCreator =>
      _role.trim().toLowerCase() == 'creator';

  // Menampilkan pesan singkat kepada user.
  void _showMessage(
    String message, {
    bool isError = false,
  }) {
    if (!mounted) return;

    final colors = Theme.of(context).colorScheme;

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            message,
            style: TextStyle(fontFamily: 'FunnelDisplay',

              fontSize: 13,
              color: colors.onInverseSurface,
            ),
          ),
          behavior: SnackBarBehavior.floating,
          backgroundColor:
              isError
                  ? colors.error
                  : colors.inverseSurface,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        color:
            Theme.of(context).colorScheme.primary,
        onRefresh: _loadProfile,
        child: _isLoading
            ? _buildLoading()
            : _errorMessage != null
                ? _buildError()
                : _buildProfile(),
      ),
    );
  }

  // Tampilan saat memuat profil.
  Widget _buildLoading() {
    final colors = Theme.of(context).colorScheme;

    return ListView(
      physics:
          const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 240),
        Center(
          child: CircularProgressIndicator(
            color: colors.primary,
          ),
        ),
      ],
    );
  }

  // Tampilan saat gagal memuat profil.
  Widget _buildError() {
    final colors = Theme.of(context).colorScheme;

    return ListView(
      physics:
          const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(22),
      children: [
        const SizedBox(height: 90),
        Center(
          child: Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(
              color: colors.errorContainer,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.error_outline_rounded,
              size: 42,
              color: colors.onErrorContainer,
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'Gagal Memuat Profil',
          textAlign: TextAlign.center,
          style: TextStyle(fontFamily: 'FunnelDisplay',

            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: colors.onSurface,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          _errorMessage ??
              'Terjadi kesalahan.',
          textAlign: TextAlign.center,
          style: TextStyle(fontFamily: 'FunnelDisplay',

            fontSize: 14,
            color: colors.onSurfaceVariant,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 25),
        Center(
          child: ElevatedButton.icon(
            onPressed: _loadProfile,
            icon: const Icon(
              Icons.refresh_rounded,
            ),
            label: Text(
              'Coba Lagi',
              style: TextStyle(fontFamily: 'FunnelDisplay',

                fontWeight: FontWeight.w600,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: colors.primary,
              foregroundColor: colors.onPrimary,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius:
                    BorderRadius.circular(14),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // Tampilan utama profil.
  Widget _buildProfile() {
    final colors = Theme.of(context).colorScheme;

    final displayName =
        _name.trim().isEmpty
            ? 'Pengguna'
            : _name.trim();

    final displayEmail =
        _email.trim().isEmpty
            ? '-'
            : _email.trim();

    final role = _formatRole(_role);

    return ListView(
      physics:
          const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        20,
        12,
        20,
        28,
      ),
      children: [
        _buildProfileHeader(
          displayName,
          displayEmail,
          role,
        ),

        const SizedBox(height: 20),

        Text(
          'Tampilan',
          style: TextStyle(fontFamily: 'FunnelDisplay',

            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: colors.onSurface,
          ),
        ),

        const SizedBox(height: 12),

        _buildThemeCard(),

        const SizedBox(height: 20),

        Text(
          'Informasi Akun',
          style: TextStyle(fontFamily: 'FunnelDisplay',

            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: colors.onSurface,
          ),
        ),

        const SizedBox(height: 12),

        // Informasi akun user.
        Container(
          padding:
              const EdgeInsets.symmetric(
            horizontal: 18,
            vertical: 8,
          ),
          decoration: BoxDecoration(
            color: colors.surface,
            borderRadius:
                BorderRadius.circular(20),
            border: Border.all(
              color: colors.outlineVariant,
            ),
            boxShadow: [
              BoxShadow(
                color: colors.primary
                    .withAlpha(18),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              _buildInfoTile(
                Icons.badge_outlined,
                'Username',
                displayName,
                onEdit: _editUsername,
              ),
              _buildDivider(),
              _buildInfoTile(
                Icons.email_outlined,
                'Email',
                displayEmail,
                onEdit: _editEmail,
              ),
              _buildDivider(),
              _buildInfoTile(
                Icons.lock_outline_rounded,
                'Password',
                '••••••••',
                onEdit: _editPassword,
              ),
              _buildDivider(),
              _buildInfoTile(
                Icons
                    .admin_panel_settings_outlined,
                'Role',
                role,
              ),
              _buildDivider(),
              _buildInfoTile(
                Icons.calendar_today_outlined,
                'Bergabung',
                _formatDate(_createdAt),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Status role user.
        Container(
          padding: const EdgeInsets.all(17),
          decoration: BoxDecoration(
            color: _isCreator
                ? colors.primaryContainer
                : colors.secondaryContainer,
            borderRadius:
                BorderRadius.circular(18),
            border: Border.all(
              color: _isCreator
                  ? colors.primary.withAlpha(70)
                  : colors.secondary.withAlpha(70),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: _isCreator
                      ? colors.primary.withAlpha(32)
                      : colors.secondary.withAlpha(32),
                  borderRadius:
                      BorderRadius.circular(13),
                ),
                child: Icon(
                  _isCreator
                      ? Icons
                          .workspace_premium_outlined
                      : Icons
                          .verified_user_outlined,
                  color: _isCreator
                      ? colors.primary
                      : colors.secondary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _isCreator
                      ? 'Akun Creator\nAkun ini memiliki akses sebagai creator.'
                      : 'Akun Pengguna\nAkun siap digunakan untuk mengerjakan formulir.',
                  style: TextStyle(fontFamily: 'FunnelDisplay',

                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _isCreator
                        ? colors.onPrimaryContainer
                        : colors.onSecondaryContainer,
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Tombol logout.
        SizedBox(
          height: 54,
          child: OutlinedButton.icon(
            onPressed:
                _isLoggingOut ? null : _logout,
            icon: _isLoggingOut
                ? SizedBox(
                    width: 20,
                    height: 20,
                    child:
                        CircularProgressIndicator(
                      strokeWidth: 2.2,
                      color: colors.error,
                    ),
                  )
                : const Icon(
                    Icons.logout_rounded,
                  ),
            label: Text(
              _isLoggingOut
                  ? 'Keluar...'
                  : 'Keluar dari Akun',
              style: TextStyle(fontFamily: 'FunnelDisplay',

                fontWeight: FontWeight.w600,
              ),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: colors.error,
              side: BorderSide(
                color:
                    colors.error.withAlpha(90),
              ),
              backgroundColor:
                  colors.errorContainer,
              shape: RoundedRectangleBorder(
                borderRadius:
                    BorderRadius.circular(16),
              ),
            ),
          ),
        ),

        const SizedBox(height: 10),

        Center(
          child: Text(
            'Formaly',
            style: TextStyle(fontFamily: 'FunnelDisplay',

              fontSize: 12,
              color: colors.onSurfaceVariant,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }

  // Pengaturan Light Mode dan Dark Mode.
  Widget _buildThemeCard() {
    return AnimatedBuilder(
      animation: ThemeController.instance,
      builder: (context, _) {
        final colors =
            Theme.of(context).colorScheme;
        final current =
            ThemeController.instance.themeMode;

        final bool isDark =
            current == ThemeMode.dark;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark
                ? colors.surface
                : colors.primaryContainer,
            borderRadius:
                BorderRadius.circular(20),
            border: Border.all(
              color: colors.primary.withAlpha(70),
            ),
          ),
          child: Column(
            crossAxisAlignment:
                CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: isDark
                          ? colors.primaryContainer
                          : colors.primary
                              .withAlpha(35),
                      borderRadius:
                          BorderRadius.circular(13),
                    ),
                    child: Icon(
                      current == ThemeMode.dark
                          ? Icons.dark_mode_outlined
                          : Icons.light_mode_outlined,
                      color: isDark
                          ? colors
                              .onPrimaryContainer
                          : colors.primary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment:
                          CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Mode Tampilan',
                          style:
                              TextStyle(fontFamily: 'FunnelDisplay',

                            fontSize: 15,
                            fontWeight:
                                FontWeight.bold,
                            color: isDark
                                ? colors.onSurface
                                : colors
                                    .onPrimaryContainer,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          current == ThemeMode.dark
                              ? 'Dark Mode sedang digunakan'
                              : 'Light Mode sedang digunakan',
                          style:
                              TextStyle(fontFamily: 'FunnelDisplay',

                            fontSize: 12,
                            color: isDark
                                ? colors
                                    .onSurfaceVariant
                                : colors
                                    .onPrimaryContainer
                                    .withAlpha(190),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              SizedBox(
                width: double.infinity,
                child:
                    SegmentedButton<ThemeMode>(
                  segments: const [
                    ButtonSegment<ThemeMode>(
                      value:
                          ThemeMode.light,
                      icon: Icon(
                        Icons
                            .light_mode_outlined,
                      ),
                      label:
                          Text('Light'),
                    ),
                    ButtonSegment<ThemeMode>(
                      value:
                          ThemeMode.dark,
                      icon: Icon(
                        Icons
                            .dark_mode_outlined,
                      ),
                      label:
                          Text('Dark'),
                    ),
                  ],
                  selected: {
                    current == ThemeMode.dark
                        ? ThemeMode.dark
                        : ThemeMode.light,
                  },
                  onSelectionChanged:
                      (selection) {
                    if (selection.isEmpty) {
                      return;
                    }

                    _changeTheme(
                      selection.first,
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // Header profil user.
  Widget _buildProfileHeader(
    String name,
    String email,
    String role,
  ) {
    final colors = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.fromLTRB(
        22,
        22,
        22,
        20,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            colors.primaryContainer,
            colors.surface,
          ],
        ),
        borderRadius:
            BorderRadius.circular(24),
        border: Border.all(
          color: colors.primary.withAlpha(75),
        ),
        boxShadow: [
          BoxShadow(
            color: colors.primary.withAlpha(20),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      colors.primary,
                      colors.secondary,
                    ],
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: colors.primary
                          .withAlpha(55),
                      blurRadius: 14,
                      offset:
                          const Offset(0, 6),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    _initials(name),
                    style: TextStyle(fontFamily: 'FunnelDisplay',

                      fontSize: 28,
                      fontWeight:
                          FontWeight.bold,
                      color: colors.onPrimary,
                    ),
                  ),
                ),
              ),
              Positioned(
                right: -3,
                bottom: 2,
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: colors.surface,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color:
                          colors.primary.withAlpha(80),
                    ),
                  ),
                  child: Icon(
                    _isCreator
                        ? Icons.verified_rounded
                        : Icons
                            .check_circle_rounded,
                    size: 19,
                    color: _isCreator
                        ? colors.primary
                        : colors.secondary,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          Text(
            name,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow:
                TextOverflow.ellipsis,
            style: TextStyle(fontFamily: 'FunnelDisplay',

              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: colors.onSurface,
            ),
          ),

          const SizedBox(height: 5),

          Text(
            email,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow:
                TextOverflow.ellipsis,
            style: TextStyle(fontFamily: 'FunnelDisplay',

              fontSize: 13,
              color: colors.onSurfaceVariant,
            ),
          ),

          const SizedBox(height: 12),

          Container(
            padding:
                const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 7,
            ),
            decoration: BoxDecoration(
              color: _isCreator
                  ? colors.primaryContainer
                  : colors.secondaryContainer,
              borderRadius:
                  BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize:
                  MainAxisSize.min,
              children: [
                Icon(
                  _isCreator
                      ? Icons
                          .workspace_premium_outlined
                      : Icons
                          .person_outline_rounded,
                  size: 17,
                  color: _isCreator
                      ? colors
                          .onPrimaryContainer
                      : colors
                          .onSecondaryContainer,
                ),
                const SizedBox(width: 7),
                Text(
                  role,
                  style:
                      TextStyle(fontFamily: 'FunnelDisplay',

                    fontSize: 12.5,
                    fontWeight:
                        FontWeight.w600,
                    color: _isCreator
                        ? colors
                            .onPrimaryContainer
                        : colors
                            .onSecondaryContainer,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Menampilkan satu informasi akun.
  Widget _buildInfoTile(
    IconData icon,
    String title,
    String value, {
    VoidCallback? onEdit,
  }) {
    final colors = Theme.of(context).colorScheme;

    Color iconColor;

    switch (title) {
      case 'Username':
        iconColor = colors.primary;
        break;
      case 'Email':
        iconColor = colors.tertiary;
        break;
      case 'Password':
        iconColor = colors.primary;
        break;
      case 'Role':
        iconColor = colors.secondary;
        break;
      case 'Bergabung':
        iconColor = colors.tertiary;
        break;
      default:
        iconColor = colors.primary;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(
        vertical: 13,
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: iconColor.withAlpha(28),
              borderRadius:
                  BorderRadius.circular(13),
            ),
            child: Icon(
              icon,
              size: 21,
              color: iconColor,
            ),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(fontFamily: 'FunnelDisplay',

                    fontSize: 12,
                    color:
                        colors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  maxLines: 2,
                  overflow:
                      TextOverflow.ellipsis,
                  style: TextStyle(fontFamily: 'FunnelDisplay',

                    fontSize: 14,
                    fontWeight:
                        FontWeight.w600,
                    color: colors.onSurface,
                  ),
                ),
              ],
            ),
          ),
          if (onEdit != null)
            IconButton(
              onPressed: _isUpdatingAccount
                  ? null
                  : onEdit,
              icon: Icon(
                Icons.edit_outlined,
                size: 20,
                color: _isUpdatingAccount
                    ? colors.onSurfaceVariant
                    : colors.primary,
              ),
              tooltip: 'Edit',
            ),
        ],
      ),
    );
  }

  // Garis pemisah antar informasi.
  Widget _buildDivider() {
    final colors = Theme.of(context).colorScheme;

    return Divider(
      height: 1,
      thickness: 1,
      color: colors.outlineVariant,
    );
  }
}