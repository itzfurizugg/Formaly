import 'package:flutter/material.dart';

import 'auth_shell.dart';

class DockItem {
  final String label;
  final IconData icon;
  final IconData activeIcon;

  const DockItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
  });
}

// Dock navigasi melayang (capsule) — ala formaly-web, tapi bentuk/animasinya
// seperti LiquidNavBar di gsync_legacy:
// - Bar pill mengambang di tengah bawah.
// - Idle: hanya ikon outline.
// - Aktif: pill membesar menampilkan label + ikon filled (morph).
class FormalyDock extends StatelessWidget {
  final List<DockItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;

  const FormalyDock({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      minimum: const EdgeInsets.fromLTRB(16, 0, 16, 40),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(36),
              border: Border.all(color: Colors.white70),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x40000000),
                  blurRadius: 32,
                  offset: Offset(0, 10),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (int i = 0; i < items.length; i++) ...[
                  if (i > 0) const SizedBox(width: 2),
                  _DockItemButton(
                    item: items[i],
                    selected: i == currentIndex,
                    onTap: () => onTap(i),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DockItemButton extends StatelessWidget {
  final DockItem item;
  final bool selected;
  final VoidCallback onTap;

  const _DockItemButton({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final Color activeTile = kDarks.withValues(alpha: .1);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.symmetric(
          horizontal: selected ? 18 : 14,
          vertical: 10,
        ),
        decoration: BoxDecoration(
          color: selected ? activeTile : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 240),
              switchInCurve: Curves.easeOutBack,
              switchOutCurve: Curves.easeIn,
              transitionBuilder: (child, animation) => FadeTransition(
                opacity: animation,
                child: ScaleTransition(
                  scale: Tween<double>(
                    begin: .7,
                    end: 1,
                  ).animate(animation),
                  child: child,
                ),
              ),
              child: Icon(
                selected ? item.activeIcon : item.icon,
                key: ValueKey(selected),
                size: 20,
                color: kDarks.withValues(alpha: selected ? 1 : .7),
              ),
            ),
            AnimatedSize(
              duration: const Duration(milliseconds: 280),
              curve: Curves.easeOutCubic,
              child: selected
                  ? Padding(
                      padding: const EdgeInsets.only(left: 7),
                      child: Text(
                        item.label,
                        style: TextStyle(fontFamily: 'FunnelDisplay',

                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: kDarks,
                        ),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}