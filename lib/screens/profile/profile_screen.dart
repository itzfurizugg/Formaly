import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/theme/theme_controller.dart';
import '../../widgets/auth_shell.dart';
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
        throw Exception('Data profil tidak ditemukan di tabel users.');
      }

      String loadedName = userResponse['name']?.toString().trim() ?? '';

      // Coba ambil nama dari tabel profiles.
      try {
        final profileResponse = await _supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .maybeSingle();

        final profileName = profileResponse?['name']?.toString().trim() ?? '';

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

      final String loadedRole = userResponse['role']?.toString().trim() ?? '';

      DateTime? loadedCreatedAt;
      final createdAtValue = userResponse['created_at'];

      if (createdAtValue != null) {
        loadedCreatedAt = DateTime.tryParse(createdAtValue.toString());
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

  // Logout dari akun setelah konfirmasi.
  Future<void> _logout() async {
    if (_isLoggingOut) return;

    final bool? shouldLogout = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: .28),
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) => _SheetBox(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SheetHandle(),
            const SizedBox(height: 24),
            const _SheetHeader(
              icon: Icons.logout_rounded,
              title: 'Keluar Akun',
              color: kWrong,
            ),
            const SizedBox(height: 12),
            Text(
              'Kamu perlu login kembali untuk mengakses akun ini.',
              style: TextStyle(
                fontFamily: 'FunnelDisplay',
                fontSize: 14,
                color: kWrong.withValues(alpha: .8),
                height: 1.5,
              ),
            ),
            const SizedBox(height: 28),
            _SheetActions(
              cancelLabel: 'Batal',
              confirmLabel: 'Keluar',
              onCancel: () => Navigator.pop(sheetContext, false),
              onConfirm: () => Navigator.pop(sheetContext, true),
              confirmColor: kWrong,
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
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
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _isLoggingOut = false;
      });

      _showMessage('Gagal keluar: ${_cleanError(e)}', isError: true);
    }
  }

  // Mengubah mode tampilan aplikasi.
  Future<void> _changeTheme(ThemeMode mode) async {
    await ThemeController.instance.setThemeMode(mode);

    if (!mounted) return;

    _showMessage(
      mode == ThemeMode.dark ? 'Dark Mode aktif.' : 'Light Mode aktif.',
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

  bool get _isCreator => _role.trim().toLowerCase() == 'creator';

  // Menampilkan pesan singkat kepada user.
  void _showMessage(String message, {bool isError = false}) {
    if (!mounted) return;

    final colors = Theme.of(context).colorScheme;

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            message,
            style: TextStyle(
              fontFamily: 'FunnelDisplay',

              fontSize: 13,
              color: colors.onInverseSurface,
            ),
          ),
          behavior: SnackBarBehavior.floating,
          backgroundColor: isError ? colors.error : colors.inverseSurface,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _loadProfile,
        child: _isLoading
            ? _buildLoading()
            : _errorMessage != null
            ? _buildError()
            : _buildProfile(),
      ),
    );
  }

  Widget _buildLoading() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: const [
        SizedBox(height: 240),
        Center(child: CircularProgressIndicator(color: kDone)),
      ],
    );
  }

  Widget _buildError() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(22),
      children: [
        const SizedBox(height: 90),
        const Center(
          child: SizedBox(
            width: 76,
            height: 76,
            child: CircleAvatar(
              backgroundColor: Color(0x1AD90000),
              child: Icon(Icons.error_outline_rounded, size: 42, color: kWrong),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'Gagal Memuat Profil',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'FunnelDisplay',
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: kDarks,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          _errorMessage ?? 'Terjadi kesalahan.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: 'FunnelDisplay',
            fontSize: 14,
            color: kTinted,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 24),
        Center(
          child: SizedBox(
            height: 44,
            child: ElevatedButton.icon(
              onPressed: _loadProfile,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Coba Lagi'),
              style: ElevatedButton.styleFrom(
                backgroundColor: kDone,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: const StadiumBorder(),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // Tampilan profil utama (mirip web).
  Widget _buildProfile() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 40),
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Column(
              children: [
                _buildHeaderCard(),
                const SizedBox(height: 12),
                _buildMenuGroup(
                  children: [
                    _buildMenuItem(
                      icon: Icons.person_outline_rounded,
                      iconColor: kDarks,
                      iconBg: kBase,
                      title: 'Informasi Akun',
                      subtitle: 'Ubah username dan email kamu',
                      onTap: _openAccountModal,
                    ),
                    _buildMenuItem(
                      icon: Icons.lock_outline_rounded,
                      iconColor: kDarks,
                      iconBg: kBase,
                      title: 'Ubah Kata Sandi',
                      subtitle: 'Perbarui kata sandi akun kamu',
                      onTap: _openPasswordModal,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildMenuGroup(
                  children: [
                    if (!_isCreator)
                      _buildMenuItem(
                        icon: Icons.workspace_premium_rounded,
                        iconColor: kDone,
                        iconBg: kDone.withValues(alpha: .1),
                        title: 'Upgrade ke Creator',
                        subtitle:
                            'Jadilah yang membuat formulir untuk banyak orang.',
                        onTap: () => _showMessage(
                          'Fitur Upgrade Creator belum tersedia.',
                        ),
                      ),
                    _buildMenuItem(
                      icon: Icons.settings_outlined,
                      iconColor: kDarks,
                      iconBg: kBase,
                      title: 'Pengaturan',
                      subtitle: 'Kelola preferensi tampilan dan aplikasi.',
                      onTap: _openSettings,
                    ),
                  ],
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // Header: avatar + nama + role badge + email + tanggal bergabung.
  Widget _buildHeaderCard() {
    final String initial = _name.trim().isEmpty
        ? 'U'
        : _name.trim().substring(0, 1).toUpperCase();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kSecond),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 80,
            height: 80,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              color: kDone,
              shape: BoxShape.circle,
            ),
            child: Text(
              initial,
              style: TextStyle(
                fontFamily: 'FunnelDisplay',
                fontSize: 36,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Flexible(
                      child: Text(
                        _name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: 'FunnelDisplay',
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: kDarks,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    _buildRoleBadge(),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.mail_outline_rounded, size: 14, color: kTinted),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _email,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: 'FunnelDisplay',
                          fontSize: 14,
                          color: kTinted,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(
                      Icons.calendar_today_outlined,
                      size: 12,
                      color: kTinted,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Bergabung pada ${_formatDate(_createdAt)}',
                      style: TextStyle(
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
    );
  }

  Widget _buildRoleBadge() {
    final String raw = _role.trim().toLowerCase();
    final bool admin = raw == 'admin';
    final Color color = admin ? kWrong : kDone;
    final String label = raw == 'admin'
        ? 'Admin'
        : raw == 'creator'
        ? 'Creator'
        : 'User';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: 'FunnelDisplay',
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  // Kelompok menu: card putih dengan pembatas antar item.
  Widget _buildMenuGroup({required List<Widget> children}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kSecond),
      ),
      child: Column(
        children: [
          for (int i = 0; i < children.length; i++) ...[
            if (i > 0) Divider(height: 1, thickness: 1, color: kSecond),
            children[i],
          ],
        ],
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: iconBg,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 16, color: iconColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontFamily: 'FunnelDisplay',
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: kDarks,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontFamily: 'FunnelDisplay',
                        fontSize: 12,
                        color: kTinted,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, size: 16, color: kTinted),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLogoutButton() {
    return SizedBox(
      height: 48,
      child: OutlinedButton.icon(
        onPressed: _isLoggingOut ? null : _logout,
        icon: _isLoggingOut
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  color: kWrong,
                ),
              )
            : const Icon(Icons.logout_rounded, size: 18),
        label: Text(
          _isLoggingOut ? 'Keluar...' : 'Keluar',
          style: TextStyle(
            fontFamily: 'FunnelDisplay',
            fontWeight: FontWeight.w600,
          ),
        ),
        style: OutlinedButton.styleFrom(
          foregroundColor: kWrong,
          backgroundColor: kBase,
          elevation: 0,
          side: BorderSide(color: kWrong.withValues(alpha: .2), width: 2),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }

  // ============================================================
  // MODAL
  // ============================================================

  Future<void> _openAccountModal() async {
    if (_isUpdatingAccount) return;

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: .28),
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _SheetBox(
        child: _AccountModal(
          name: _name,
          email: _email,
          onSubmit: _saveAccount,
        ),
      ),
    );
  }

  Future<void> _openPasswordModal() async {
    if (_isUpdatingAccount) return;

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: .28),
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _SheetBox(child: _PasswordModal(onSubmit: _savePassword)),
    );
  }

  // Menyimpan username dan email dari modal Informasi Akun.
  Future<String?> _saveAccount(String name, String email) async {
    final user = _supabase.auth.currentUser;

    if (user == null) return 'User belum login.';

    try {
      await _supabase
          .from('users')
          .update({'name': name, 'email': email})
          .eq('id', user.id);

      await _supabase.from('profiles').update({'name': name}).eq('id', user.id);

      await _supabase.auth.updateUser(
        UserAttributes(email: email, data: {'name': name}),
      );

      if (!mounted) return null;

      setState(() {
        _name = name;
        _email = email;
      });

      return null;
    } on AuthException catch (e) {
      return _cleanError(e);
    } on PostgrestException catch (e) {
      return 'Gagal memperbarui profil: ${e.message}';
    } catch (e) {
      return 'Gagal memperbarui profil: ${_cleanError(e)}';
    }
  }

  // Menyimpan password baru dari modal Ubah Kata Sandi.
  Future<String?> _savePassword(
    String newPassword,
    String confirmPassword,
  ) async {
    if (newPassword.length < 6) {
      return 'Kata sandi minimal 6 karakter.';
    }

    if (newPassword != confirmPassword) {
      return 'Konfirmasi kata sandi tidak cocok.';
    }

    try {
      await _supabase.auth.updateUser(UserAttributes(password: newPassword));

      return null;
    } on AuthException catch (e) {
      return _cleanError(e);
    } catch (e) {
      return 'Gagal mengubah kata sandi: ${_cleanError(e)}';
    }
  }

  // Bottom sheet Pengaturan: pilihan Light / Dark.
  Future<void> _openSettings() async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: .28),
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) => _SheetBox(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SheetHandle(),
            const SizedBox(height: 24),
            const _SheetHeader(
              icon: Icons.settings_outlined,
              title: 'Pengaturan',
              onClose: null,
            ),
            const SizedBox(height: 20),
            const Text(
              'Mode Tampilan',
              style: TextStyle(
                fontFamily: 'FunnelDisplay',
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: kDarks,
              ),
            ),
            const SizedBox(height: 10),
            StatefulBuilder(
              builder: (context, setModalState) {
                return SizedBox(
                  width: double.infinity,
                  child: SegmentedButton<ThemeMode>(
                    segments: const [
                      ButtonSegment<ThemeMode>(
                        value: ThemeMode.light,
                        icon: Icon(Icons.light_mode_outlined, size: 18),
                        label: Text('Light'),
                      ),
                      ButtonSegment<ThemeMode>(
                        value: ThemeMode.dark,
                        icon: Icon(Icons.dark_mode_outlined, size: 18),
                        label: Text('Dark'),
                      ),
                    ],
                    selected: {
                      ThemeController.instance.themeMode == ThemeMode.dark
                          ? ThemeMode.dark
                          : ThemeMode.light,
                    },
                    onSelectionChanged: (selection) {
                      if (selection.isEmpty) return;
                      _changeTheme(selection.first);
                      setModalState(() {});
                    },
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            const Divider(height: 1, color: kSecond),
            const SizedBox(height: 16),
            _buildLogoutButton(),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// BOTTOM SHEET HELPERS (gaya popup bawah)
// ============================================================

class _SheetHandle extends StatelessWidget {
  const _SheetHandle();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 40,
        height: 4,
        decoration: BoxDecoration(
          color: const Color(0xFFE0E0E0),
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }
}

class _SheetHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback? onClose;
  final Color color;

  const _SheetHeader({
    required this.icon,
    required this.title,
    this.onClose,
    this.color = kDarks,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: const BoxDecoration(color: kBase, shape: BoxShape.circle),
          child: Icon(icon, size: 16, color: color),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontFamily: 'FunnelDisplay',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ),
        if (onClose != null)
          IconButton(
            onPressed: onClose,
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.close_rounded, size: 18, color: kTinted),
          ),
      ],
    );
  }
}

// Wrapper umum sheet: padding keyboard + sudut atas rounded + bg putih.
class _SheetBox extends StatelessWidget {
  final Widget child;

  const _SheetBox({required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.zero,
        ),
        child: child,
      ),
    );
  }
}

// Pasangan tombol bawah: Batal (outline) + aksi (filled), ala muslimnoob.
class _SheetActions extends StatelessWidget {
  final String cancelLabel;
  final String confirmLabel;
  final VoidCallback onCancel;
  final VoidCallback onConfirm;
  final bool loading;
  final Color confirmColor;

  const _SheetActions({
    required this.cancelLabel,
    required this.confirmLabel,
    required this.onCancel,
    required this.onConfirm,
    this.loading = false,
    this.confirmColor = kDarks,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: loading ? null : onCancel,
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              side: const BorderSide(color: Color(0xFFE0E0E0)),
            ),
            child: Text(
              cancelLabel,
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
            onPressed: loading ? null : onConfirm,
            style: ElevatedButton.styleFrom(
              backgroundColor: confirmColor,
              foregroundColor: Colors.white,
              disabledBackgroundColor: confirmColor.withValues(alpha: .4),
              padding: const EdgeInsets.symmetric(vertical: 16),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: loading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    confirmLabel,
                    style: TextStyle(
                      fontFamily: 'FunnelDisplay',
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
          ),
        ),
      ],
    );
  }
}

// Modal: Informasi Akun.
class _AccountModal extends StatefulWidget {
  final String name;
  final String email;
  final Future<String?> Function(String name, String email) onSubmit;

  const _AccountModal({
    required this.name,
    required this.email,
    required this.onSubmit,
  });

  @override
  State<_AccountModal> createState() => _AccountModalState();
}

class _AccountModalState extends State<_AccountModal> {
  late final TextEditingController _name;
  late final TextEditingController _email;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.name);
    _email = TextEditingController(text: widget.email);
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final String name = _name.text.trim();
    final String email = _email.text.trim().toLowerCase();

    if (name.isEmpty) {
      setState(() => _error = 'Username tidak boleh kosong.');
      return;
    }

    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) {
      setState(() => _error = 'Format email tidak valid.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    final String? error = await widget.onSubmit(name, email);

    if (!mounted) return;

    if (error != null) {
      setState(() {
        _saving = false;
        _error = error;
      });
      return;
    }

    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SheetHandle(),
        const SizedBox(height: 24),
        const _SheetHeader(
          icon: Icons.person_outline_rounded,
          title: 'Informasi Akun',
          onClose: null,
        ),
        const SizedBox(height: 12),
        const Text(
          'Perbarui username dan email kamu. Perubahan email akan memerlukan verifikasi ulang.',
          style: TextStyle(
            fontFamily: 'FunnelDisplay',
            fontSize: 12,
            color: kTinted,
            height: 1.5,
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: kWrong.withValues(alpha: .1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              _error!,
              style: TextStyle(
                fontFamily: 'FunnelDisplay',
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: kWrong,
              ),
            ),
          ),
        ],
        const SizedBox(height: 16),
        _buildModalField(
          label: 'Username',
          controller: _name,
          icon: Icons.person_outline_rounded,
          hint: 'Nama kamu',
        ),
        const SizedBox(height: 14),
        _buildModalField(
          label: 'Email',
          controller: _email,
          icon: Icons.mail_outline_rounded,
          hint: 'nama@email.com',
          email: true,
        ),
        const SizedBox(height: 22),
        _SheetActions(
          cancelLabel: 'Batal',
          confirmLabel: 'Simpan',
          onCancel: _saving ? () {} : () => Navigator.pop(context),
          onConfirm: _submit,
          loading: _saving,
        ),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildModalField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    required String hint,
    bool email = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'FunnelDisplay',
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: kDarks,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: email ? TextInputType.emailAddress : TextInputType.text,
          autocorrect: !email,
          enableSuggestions: !email,
          textCapitalization: email
              ? TextCapitalization.none
              : TextCapitalization.words,
          style: const TextStyle(
            fontFamily: 'FunnelDisplay',
            fontSize: 14,
            color: kDarks,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(
              fontFamily: 'FunnelDisplay',
              fontSize: 13,
              color: kTinted,
            ),
            prefixIcon: Icon(icon, size: 18, color: kTinted),
            filled: true,
            fillColor: kBase,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 12,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: kSecond),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: kDone),
            ),
          ),
        ),
      ],
    );
  }
}

// Modal: Ubah Kata Sandi.
class _PasswordModal extends StatefulWidget {
  final Future<String?> Function(String newPassword, String confirm) onSubmit;

  const _PasswordModal({required this.onSubmit});

  @override
  State<_PasswordModal> createState() => _PasswordModalState();
}

class _PasswordModalState extends State<_PasswordModal> {
  final TextEditingController _password = TextEditingController();
  final TextEditingController _confirm = TextEditingController();
  bool _showPw = false;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final String pw = _password.text;
    final String confirm = _confirm.text;

    if (pw.isEmpty) {
      setState(() => _error = 'Kata sandi tidak boleh kosong.');
      return;
    }

    if (pw.length < 6) {
      setState(() => _error = 'Kata sandi minimal 6 karakter.');
      return;
    }

    if (pw != confirm) {
      setState(() => _error = 'Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    final String? error = await widget.onSubmit(pw, confirm);

    if (!mounted) return;

    if (error != null) {
      setState(() {
        _saving = false;
        _error = error;
      });
      return;
    }

    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SheetHandle(),
        const SizedBox(height: 24),
        _SheetHeader(
          icon: Icons.lock_outline_rounded,
          title: 'Ubah Kata Sandi',
          onClose: _saving ? null : () => Navigator.pop(context),
        ),
        const SizedBox(height: 12),
        const Text(
          'Gunakan kata sandi yang kuat dan belum pernah dipakai sebelumnya.',
          style: TextStyle(
            fontFamily: 'FunnelDisplay',
            fontSize: 12,
            color: kTinted,
            height: 1.5,
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: kWrong.withValues(alpha: .1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              _error!,
              style: TextStyle(
                fontFamily: 'FunnelDisplay',
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: kWrong,
              ),
            ),
          ),
        ],
        const SizedBox(height: 16),
        _buildPasswordField(
          label: 'Kata Sandi Baru',
          controller: _password,
          hint: 'Minimal 6 karakter',
        ),
        const SizedBox(height: 14),
        _buildPasswordField(
          label: 'Konfirmasi Kata Sandi',
          controller: _confirm,
          hint: 'Ulangi kata sandi baru',
        ),
        const SizedBox(height: 22),
        _SheetActions(
          cancelLabel: 'Batal',
          confirmLabel: 'Simpan',
          onCancel: _saving ? () {} : () => Navigator.pop(context),
          onConfirm: _submit,
          loading: _saving,
        ),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildPasswordField({
    required String label,
    required TextEditingController controller,
    required String hint,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'FunnelDisplay',
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: kDarks,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          obscureText: !_showPw,
          autocorrect: false,
          enableSuggestions: false,
          style: const TextStyle(
            fontFamily: 'FunnelDisplay',
            fontSize: 14,
            color: kDarks,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(
              fontFamily: 'FunnelDisplay',
              fontSize: 13,
              color: kTinted,
            ),
            prefixIcon: const Icon(Icons.key_rounded, size: 18, color: kTinted),
            suffixIcon: IconButton(
              onPressed: () => setState(() => _showPw = !_showPw),
              icon: Icon(
                _showPw
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined,
                size: 18,
                color: kTinted,
              ),
            ),
            filled: true,
            fillColor: kBase,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 12,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: kSecond),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: kDone),
            ),
          ),
        ),
      ],
    );
  }
}
