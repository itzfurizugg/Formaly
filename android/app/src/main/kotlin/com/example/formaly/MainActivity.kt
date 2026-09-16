package com.example.formaly

import android.os.Bundle
import android.view.WindowManager

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    // Channel untuk menerima perintah security dari Flutter.
    private val channelName = "com.example.formaly/exam_security"

    override fun configureFlutterEngine(
        flutterEngine: FlutterEngine
    ) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            channelName
        ).setMethodCallHandler { call, result ->

            when (call.method) {

                // Security ON saat masuk ke halaman ujian.
                "startExamSecurity" -> {
                    result.success(
                        startExamSecurity()
                    )
                }

                // Security OFF saat keluar dari ujian.
                "stopExamSecurity" -> {
                    result.success(
                        stopExamSecurity()
                    )
                }

                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    private fun startExamSecurity(): Boolean {
        return try {

            // Blok screenshot dan screen recording
            // selama halaman ujian menggunakan security ini.
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SECURE
            )

            true

        } catch (e: Exception) {
            false
        }
    }

    private fun stopExamSecurity(): Boolean {
        return try {

            // Kembalikan kemampuan screenshot
            // setelah keluar dari halaman ujian.
            window.clearFlags(
                WindowManager.LayoutParams.FLAG_SECURE
            )

            true

        } catch (e: Exception) {
            false
        }
    }
}