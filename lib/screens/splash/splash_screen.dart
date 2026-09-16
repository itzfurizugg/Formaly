import 'dart:async';
 
import 'package:animate_do/animate_do.dart'; 
import 'package:flutter/material.dart'; 
import 'package:google_fonts/google_fonts.dart'; 
import 'package:supabase_flutter/supabase_flutter.dart'; 
 
import '../../core/services/exam_draft_service.dart'; 
import '../auth/login_screen.dart'; 
import '../form/question_screen.dart'; 
import '../home/home_screen.dart'; 
 
class SplashScreen extends StatefulWidget { 
  const SplashScreen({super.key}); 
 
  @override 
  State<SplashScreen> createState() => _SplashScreenState(); 
} 
 
class _SplashScreenState extends State<SplashScreen> { 
  Timer? _timer; 
 
  @override 
  void initState() { 
    super.initState(); 
 
    _timer = Timer( 
      const Duration(milliseconds: 1200), 
      _goNext, 
    ); 
  } 
 
  // Menentukan halaman setelah splash selesai. 
  Future<void> _goNext() async { 
    if (!mounted) return; 
 
    final supabase = Supabase.instance.client; 
    final session = supabase.auth.currentSession; 
 
    if (session == null) { 
      _replace(const LoginScreen()); 
      return; 
    } 
 
    try { 
      // Cek apakah ada draft ujian yang masih aktif. 
      final draft = await ExamDraftService.loadActiveDraft( 
        session.user.id, 
      ); 
 
      if (draft != null && 
          draft.formId.trim().isNotEmpty) { 
        _replace( 
          QuestionScreen( 
            formId: draft.formId, 
            tokenId: draft.tokenId, 
          ), 
        ); 
        return; 
      } 
    } catch (_) { 
      // Abaikan error cache dan lanjut ke Home. 
    } 
 
    _replace(const HomeScreen()); 
  } 
 
  // Mengganti halaman dan menghapus halaman sebelumnya. 
  void _replace(Widget page) { 
    if (!mounted) return; 
 
    Navigator.of(context).pushAndRemoveUntil( 
      MaterialPageRoute( 
        builder: (_) => page, 
      ), 
      (route) => false, 
    ); 
  } 
 
  @override 
  void dispose() { 
    _timer?.cancel(); 
    super.dispose(); 
  } 
 
  @override 
  Widget build(BuildContext context) { 
    return Scaffold( 
      backgroundColor: Colors.white, 
      body: SafeArea( 
        child: Center( 
          child: FadeIn( 
            duration: const Duration(milliseconds: 700), 
            child: ZoomIn( 
              duration: const Duration(milliseconds: 700), 
              child: Column( 
                mainAxisAlignment: MainAxisAlignment.center, 
                children: [ 
                  RichText( 
                    text: TextSpan( 
                      children: [ 
                        TextSpan( 
                          text: 'Form', 
                          style: GoogleFonts.poppins( 
                            fontSize: 46, 
                            fontWeight: FontWeight.w800, 
                            color: Colors.black, 
                          ), 
                        ), 
                        TextSpan( 
                          text: 'aly', 
                          style: GoogleFonts.poppins( 
                            fontSize: 46, 
                            fontWeight: FontWeight.w400, 
                            color: Colors.black, 
                          ), 
                        ), 
                      ], 
                    ), 
                  ), 
                  const SizedBox(height: 12), 
                  Text( 
                    'Form Maker App', 
                    style: GoogleFonts.poppins( 
                      fontSize: 15, 
                      color: Colors.grey, 
                    ), 
                  ), 
                  const SizedBox(height: 55), 
                  const SizedBox( 
                    width: 30, 
                    height: 30, 
                    child: CircularProgressIndicator( 
                      strokeWidth: 2.8, 
                      color: Colors.black, 
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
