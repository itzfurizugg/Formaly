import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class TimerCard extends StatefulWidget {
  final int minutes;

  const TimerCard({
    super.key,
    this.minutes = 120,
  });

  @override
  State<TimerCard> createState() => _TimerCardState();
}

class _TimerCardState extends State<TimerCard> {

  late Duration duration;
  Timer? timer;

  @override
  void initState() {
    super.initState();

    duration = Duration(minutes: widget.minutes);

    timer = Timer.periodic(
      const Duration(seconds: 1),
      (_) {

        if (duration.inSeconds == 0) {
          timer?.cancel();
          return;
        }

        setState(() {
          duration -= const Duration(seconds: 1);
        });
      },
    );
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  String format(Duration d) {

    final hour = d.inHours.toString().padLeft(2, '0');

    final minute =
        (d.inMinutes % 60).toString().padLeft(2, '0');

    final second =
        (d.inSeconds % 60).toString().padLeft(2, '0');

    return "$hour:$minute:$second";
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 18,
        vertical: 10,
      ),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [

          const Icon(
            Icons.timer,
            color: Colors.red,
            size: 18,
          ),

          const SizedBox(width: 8),

          Text(
            format(duration),
            style: GoogleFonts.poppins(
              fontWeight: FontWeight.bold,
              color: Colors.red,
            ),
          ),
        ],
      ),
    );
  }
}