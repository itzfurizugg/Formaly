import 'package:flutter/material.dart';

class NavigationButton extends StatelessWidget {
  final bool isFirst;
  final bool isLast;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  const NavigationButton({
    super.key,
    required this.isFirst,
    required this.isLast,
    required this.onPrevious,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: isFirst ? null : onPrevious,
            icon: Icon(
              Icons.arrow_back_rounded,
              color: isFirst
                  ? colors.onSurfaceVariant
                  : colors.primary,
            ),
            label: Text(
              'Sebelumnya',
              style: TextStyle(fontFamily: 'FunnelDisplay',

                fontWeight: FontWeight.w600,
                color: isFirst
                    ? colors.onSurfaceVariant
                    : colors.primary,
              ),
            ),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(
                double.infinity,
                52,
              ),
              side: BorderSide(
                color: isFirst
                    ? colors.outlineVariant
                    : colors.primary,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ),

        const SizedBox(width: 15),

        Expanded(
          child: ElevatedButton.icon(
            onPressed: onNext,
            icon: Icon(
              isLast
                  ? Icons.check_rounded
                  : Icons.arrow_forward_rounded,
              color: colors.onPrimary,
            ),
            label: Text(
              isLast
                  ? 'Submit'
                  : 'Selanjutnya',
              style: TextStyle(fontFamily: 'FunnelDisplay',

                fontWeight: FontWeight.w600,
                color: colors.onPrimary,
              ),
            ),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(
                double.infinity,
                52,
              ),
              backgroundColor: colors.primary,
              foregroundColor: colors.onPrimary,
              disabledBackgroundColor:
                  colors.surfaceContainerHighest,
              disabledForegroundColor:
                  colors.onSurfaceVariant,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ),
      ],
    );
  }
}