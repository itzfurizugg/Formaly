import 'package:flutter/material.dart';

import 'package:flutter_svg/flutter_svg.dart';

class FormalyTopBar extends StatelessWidget {
  const FormalyTopBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: 70,
          child: Align(
            alignment: Alignment.centerLeft,
            child: Container(
              margin: const EdgeInsets.only(left: 27, top: 20),
              child: SvgPicture.asset(
                'assets/logo/logo.svg',
                width: 104,
                height: 31,
                fit: BoxFit.contain,
                colorFilter:
                    Theme.of(context).brightness == Brightness.dark
                        ? const ColorFilter.mode(
                            Colors.white,
                            BlendMode.srcIn,
                          )
                        : null,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
