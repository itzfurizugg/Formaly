package com.example.formaly

import android.app.admin.DevicePolicyManager
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    // Channel untuk menerima perintah security dari Flutter.
    private val channelName = "com.example.formaly/exam_security"

    // Security hanya aktif setelah tombol START ditekan.
    private var examSecurityActive = false

    // Menandakan apakah Lock Task benar-benar berhasil dimulai.
    private var lockTaskStarted = false

    override fun configureFlutterEngine(
        flutterEngine: FlutterEngine
    ) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            channelName
        ).setMethodCallHandler { call, result ->

            when (call.method) {

                // Security ON saat ujian dimulai.
                "startExamSecurity" -> {
                    result.success(
                        startExamSecurity()
                    )
                }

                // Security OFF setelah submit ujian berhasil.
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

            examSecurityActive = true

            // Blok screenshot dan screen recording
            // hanya selama ujian berlangsung.
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SECURE
            )

            // Layar tetap menyala selama ujian.
            window.addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )

            // Aktifkan fullscreen immersive.
            enterImmersiveMode()

            // Coba masuk Lock Task / kiosk mode.
            // Ini berhasil penuh jika aplikasi/perangkat
            // memang sudah diizinkan oleh Android Device Policy.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {

                val devicePolicyManager =
                    getSystemService(
                        Context.DEVICE_POLICY_SERVICE
                    ) as DevicePolicyManager

                if (
                    devicePolicyManager.isLockTaskPermitted(
                        packageName
                    )
                ) {
                    startLockTask()
                    lockTaskStarted = true
                }
            }

            true

        } catch (e: Exception) {

            // Kalau proses security gagal total,
            // kembalikan flag yang mungkin sudah aktif.
            examSecurityActive = false

            window.clearFlags(
                WindowManager.LayoutParams.FLAG_SECURE
            )

            window.clearFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )

            false
        }
    }

    private fun stopExamSecurity(): Boolean {
        return try {

            // Keluar dari Lock Task jika sebelumnya berhasil aktif.
            if (
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP &&
                lockTaskStarted
            ) {
                try {
                    stopLockTask()
                } catch (e: Exception) {
                    // Jangan menggagalkan proses ResultScreen.
                }

                lockTaskStarted = false
            }

            // Kembalikan kemampuan screenshot.
            window.clearFlags(
                WindowManager.LayoutParams.FLAG_SECURE
            )

            // Kembalikan kondisi layar normal.
            window.clearFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )

            examSecurityActive = false

            // Kembalikan system UI setelah ujian selesai.
            window.decorView.systemUiVisibility = 0

            true

        } catch (e: Exception) {
            false
        }
    }

    private fun enterImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {

            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        }
    }

    override fun onWindowFocusChanged(
        hasFocus: Boolean
    ) {
        super.onWindowFocusChanged(hasFocus)

        // Kalau fokus kembali ke aplikasi ketika ujian aktif,
        // fullscreen diterapkan lagi.
        if (
            hasFocus &&
            examSecurityActive
        ) {
            enterImmersiveMode()
        }
    }
}
