import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/models/history_model.dart';
import 'review_answer_screen.dart';

class DetailHistoryScreen extends StatelessWidget {
  final HistoryModel history;

  const DetailHistoryScreen({
    super.key,
    required this.history,
  });

  Widget buildItem(String title,String value){
    return Padding(
      padding: const EdgeInsets.only(bottom: 15),
      child: Row(
        children:[
          Expanded(flex:2,child:Text(title,style: GoogleFonts.poppins(fontWeight: FontWeight.w600))),
          const Text(": "),
          Expanded(flex:3,child:Text(value,style: GoogleFonts.poppins())),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context){
    return DefaultTabController(
      length:3,
      child:Scaffold(
        backgroundColor: const Color(0xffF5F5F5),
        appBar: AppBar(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          elevation:0,
          centerTitle:true,
          title: Text("Detail Riwayat",style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
          bottom: const TabBar(
            tabs:[
              Tab(text:"Informasi"),
              Tab(text:"Hasil"),
              Tab(text:"Jawaban"),
            ],
          ),
        ),
        body: TabBarView(
          children:[
            SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(color: Colors.white,borderRadius: BorderRadius.circular(20)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start,children:[
                  Text(history.title,style: GoogleFonts.poppins(fontSize:22,fontWeight: FontWeight.bold)),
                  const SizedBox(height:25),
                  buildItem("Token",history.token),
                  buildItem("Tanggal",history.date),
                  buildItem("Jam Mulai",history.startTime),
                  buildItem("Jam Selesai",history.finishTime),
                  buildItem("Durasi",history.duration),
                  const Divider(),
                  buildItem("Total Soal",history.totalQuestion.toString()),
                  buildItem("Jawaban Benar",history.correctAnswer.toString()),
                  buildItem("Jawaban Salah",history.wrongAnswer.toString()),
                  buildItem("Nilai",history.score.toString()),
                ]),
              ),
            ),
            Center(
              child: Column(mainAxisAlignment: MainAxisAlignment.center,children:[
                Text("${history.score}",style: GoogleFonts.poppins(fontSize:64,fontWeight: FontWeight.bold)),
                const SizedBox(height:10),
                Text("Nilai Akhir",style: GoogleFonts.poppins()),
                const SizedBox(height:30),
                Text("Benar : ${history.correctAnswer}",style: GoogleFonts.poppins()),
                Text("Salah : ${history.wrongAnswer}",style: GoogleFonts.poppins()),
                Text("Total : ${history.totalQuestion}",style: GoogleFonts.poppins()),
              ]),
            ),
            Center(
              child:SizedBox(
                width:250,
                height:50,
                child:ElevatedButton.icon(
                  onPressed:(){
                    Navigator.push(context,MaterialPageRoute(builder:(_)=>const ReviewAnswerScreen()));
                  },
                  icon: const Icon(Icons.visibility),
                  label: const Text("Lihat Jawaban"),
                ),
              ),
            )
          ],
        ),
      ),
    );
  }
}
