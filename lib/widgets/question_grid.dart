import 'package:flutter/material.dart';

class QuestionGrid extends StatelessWidget {

  final int total;

  final int current;

  final Function(int) onSelected;

  const QuestionGrid({
    super.key,
    required this.total,
    required this.current,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {

    return GridView.builder(

      shrinkWrap: true,

      itemCount: total,

      gridDelegate:
          const SliverGridDelegateWithFixedCrossAxisCount(

        crossAxisCount: 5,

        crossAxisSpacing: 12,

        mainAxisSpacing: 12,
      ),

      itemBuilder: (_, index) {

        final active = index == current;

        return InkWell(

          onTap: () {

            Navigator.pop(context);

            onSelected(index);
          },

          child: CircleAvatar(

            backgroundColor:
                active
                    ? Colors.black
                    : Colors.grey.shade300,

            child: Text(

              "${index + 1}",

              style: TextStyle(

                color: active
                    ? Colors.white
                    : Colors.black,
              ),
            ),
          ),
        );
      },
    );
  }
}