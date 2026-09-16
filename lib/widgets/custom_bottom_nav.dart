import 'package:flutter/material.dart';

class CustomBottomNav extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;

  const CustomBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return NavigationBar(
      height: 70,
      elevation: 10,
      selectedIndex: currentIndex,
      onDestinationSelected: onTap,

      // Mengikuti tema aplikasi.
      backgroundColor: colors.surface,

      // Sedikit highlight pada item yang sedang dipilih.
      indicatorColor: colors.primary.withAlpha(38),

      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,

      destinations: [
        NavigationDestination(
          icon: Icon(
            Icons.home_outlined,
            color: colors.onSurfaceVariant,
          ),
          selectedIcon: Icon(
            Icons.home,
            color: colors.onSurface,
          ),
          label: 'Beranda',
        ),
        NavigationDestination(
          icon: Icon(
            Icons.person_outline,
            color: colors.onSurfaceVariant,
          ),
          selectedIcon: Icon(
            Icons.person,
            color: colors.onSurface,
          ),
          label: 'Profil',
        ),
        NavigationDestination(
          icon: Icon(
            Icons.history,
            color: colors.onSurfaceVariant,
          ),
          selectedIcon: Icon(
            Icons.history,
            color: colors.onSurface,
          ),
          label: 'Riwayat',
        ),
      ],
    );
  }
}
