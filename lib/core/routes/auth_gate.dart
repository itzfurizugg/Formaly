import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../screens/auth/login_screen.dart';
import '../../screens/auth/new_password_screen.dart';
import '../../screens/form/question_screen.dart';
import '../../screens/home/home_screen.dart';
import '../services/exam_draft_service.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({
    super.key,
  });

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final SupabaseClient _supabase =
      Supabase.instance.client;

  Session? _session;
  ExamDraft? _draft;

  bool _loading = true;

  // Menandakan user sedang dalam proses reset password.
  bool _isPasswordRecovery = false;

  StreamSubscription<AuthState>?
      _authSubscription;

  @override
  void initState() {
    super.initState();

    _initialize();

    _authSubscription =
        _supabase.auth.onAuthStateChange.listen(
      (AuthState data) {
        if (data.event ==
            AuthChangeEvent.passwordRecovery) {
          _isPasswordRecovery = true;
        }

        if (data.event ==
            AuthChangeEvent.signedOut) {
          _isPasswordRecovery = false;
        }

        _handleAuthStateChange(
          data.session,
        );
      },
      onError: (error, stackTrace) {
        // Jangan menghentikan aplikasi jika terjadi
        // error pada auth listener.
      },
    );
  }

  Future<void> _initialize() async {
    _session =
        _supabase.auth.currentSession;

    await _loadDraft();

    if (!mounted) {
      return;
    }

    setState(() {
      _loading = false;
    });
  }

  Future<void> _handleAuthStateChange(
    Session? session,
  ) async {
    _session = session;

    await _loadDraft();

    if (!mounted) {
      return;
    }

    setState(() {});
  }

  Future<void> _loadDraft() async {
    _draft = null;

    final Session? session = _session;

    if (session == null) {
      return;
    }

    try {
      _draft =
          await ExamDraftService.loadActiveDraft(
        session.user.id,
      );
    } catch (_) {
      _draft = null;
    }
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Color(0xffF5F5F5),
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    final Session? session = _session;

    if (session == null) {
      return const LoginScreen();
    }

    // Saat link reset password berhasil dibuka,
    // tampilkan halaman untuk membuat password baru.
    if (_isPasswordRecovery) {
      return const NewPasswordScreen();
    }

    final ExamDraft? draft = _draft;

    if (draft != null &&
        draft.formId.trim().isNotEmpty) {
      return QuestionScreen(
        formId: draft.formId,
        tokenId: draft.tokenId,
      );
    }

    return const HomeScreen();
  }
}