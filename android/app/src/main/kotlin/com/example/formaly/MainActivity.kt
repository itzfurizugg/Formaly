package com.example.formaly

import android.app.admin.DevicePolicyManager
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.ToneGenerator
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowManager

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    companion object {
        var currentInstance: MainActivity? = null
    }

    // Channel untuk menerima perintah security dari Flutter.
    private val channelName = "com.example.formaly/exam_security"

    // Security hanya aktif setelah tombol START ditekan.
    private var examSecurityActive = false

    // Menandakan apakah Lock Task / Screen Pinning sudah dimulai.
    private var lockTaskStarted = false

    private lateinit var methodChannel: MethodChannel

    private val focusHandler = Handler(Looper.getMainLooper())
    private var focusViolationRunnable: Runnable? = null
    private var violationSent = false

    // Player untuk alarm pelanggaran.
    private var violationPlayer: MediaPlayer? = null

    // Tone untuk bunyi saat QR berhasil terbaca.
    private var qrToneGenerator: ToneGenerator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        currentInstance = this
    }

    override fun onDestroy() {
        stopViolationAlarm()

        try {
            qrToneGenerator?.release()
        } catch (_: Exception) {
        }

        qrToneGenerator = null

        if (currentInstance === this) {
            currentInstance = null
        }
        super.onDestroy()
    }

    override fun configureFlutterEngine(
        flutterEngine: FlutterEngine
    ) {
        super.configureFlutterEngine(flutterEngine)

        methodChannel = MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            channelName
        )

        methodChannel.setMethodCallHandler { call, result ->

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

                // Memainkan alarm pelanggaran dari Flutter.
                "playViolationAlarm" -> {
                    playViolationAlarm()
                    result.success(true)
                }

                // Memainkan bunyi singkat saat QR berhasil terbaca.
                "playQrScanSound" -> {
                    playQrScanSound()
                    result.success(true)
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
            violationSent = false

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

            // Minta Android masuk Lock Task / Screen Pinning.
            //
            // Jika perangkat sudah mengizinkan Lock Task,
            // Android dapat masuk langsung.
            //
            // Jika belum, Android dapat menampilkan dialog
            // sistem untuk Screen Pinning.
            lockTaskStarted = false

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                try {
                    startLockTask()
                    lockTaskStarted = true
                } catch (e: Exception) {
                    lockTaskStarted = false
                }
            }

            true

        } catch (e: Exception) {

            examSecurityActive = false
            lockTaskStarted = false
            violationSent = false

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

            focusViolationRunnable?.let {
                focusHandler.removeCallbacks(it)
            }
            focusViolationRunnable = null

            // Keluar dari Lock Task / Screen Pinning
            // jika sebelumnya berhasil dimulai.
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
            violationSent = false

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

        if (!examSecurityActive) {
            return
        }

        if (hasFocus) {
            focusViolationRunnable?.let {
                focusHandler.removeCallbacks(it)
            }
            focusViolationRunnable = null
            enterImmersiveMode()
            return
        }

        // Beri sedikit jeda untuk membedakan kehilangan fokus sesaat
        // dengan benar-benar meninggalkan mode ujian / membuka system UI.
        focusViolationRunnable = Runnable {
            if (examSecurityActive && !hasWindowFocus()) {
                sendSecurityViolation("focus_lost")
            }
        }

        focusHandler.postDelayed(
            focusViolationRunnable!!,
            700L
        )
    }

    override fun onMultiWindowModeChanged(
        isInMultiWindowMode: Boolean
    ) {
        super.onMultiWindowModeChanged(isInMultiWindowMode)

        if (examSecurityActive && isInMultiWindowMode) {
            sendSecurityViolation("multi_window")
        }
    }

    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode)

        if (examSecurityActive && isInPictureInPictureMode) {
            sendSecurityViolation("picture_in_picture")
        }
    }

    private fun sendSecurityViolation(reason: String) {
        if (!examSecurityActive || violationSent) {
            return
        }

        violationSent = true

        try {
            methodChannel.invokeMethod(
                "securityViolation",
                reason
            )
        } catch (e: Exception) {
            // Jangan menghentikan aplikasi bila Flutter belum siap menerima event.
        }
    }

    fun onExamNotificationDetected() {
        if (examSecurityActive) {
            sendSecurityViolation("notification")
        }
    }

    private fun playQrScanSound() {
        try {
            val audioManager =
                getSystemService(
                    Context.AUDIO_SERVICE
                ) as AudioManager

            // Naikkan volume alarm sistem ke maksimum
            // yang diizinkan oleh perangkat.
            if (!audioManager.isVolumeFixed()) {
                val maxVolume =
                    audioManager.getStreamMaxVolume(
                        AudioManager.STREAM_ALARM
                    )

                audioManager.setStreamVolume(
                    AudioManager.STREAM_ALARM,
                    maxVolume,
                    0
                )
            }

            try {
                qrToneGenerator?.release()
            } catch (_: Exception) {
            }

            qrToneGenerator =
                ToneGenerator(
                    AudioManager.STREAM_ALARM,
                    100
                )

            qrToneGenerator?.startTone(
                ToneGenerator.TONE_PROP_BEEP,
                180
            )

            focusHandler.postDelayed(
                {
                    try {
                        qrToneGenerator?.release()
                    } catch (_: Exception) {
                    }

                    qrToneGenerator = null
                },
                250L
            )

        } catch (e: Exception) {
            try {
                qrToneGenerator?.release()
            } catch (_: Exception) {
            }

            qrToneGenerator = null
        }
    }

    private fun playViolationAlarm() {
        if (!examSecurityActive) {
            return
        }

        stopViolationAlarm()

        try {
            val audioManager =
                getSystemService(
                    Context.AUDIO_SERVICE
                ) as AudioManager

            // Naikkan volume alarm sistem ke maksimum
            // yang diizinkan oleh perangkat.
            if (!audioManager.isVolumeFixed()) {
                val maxVolume =
                    audioManager.getStreamMaxVolume(
                        AudioManager.STREAM_ALARM
                    )

                audioManager.setStreamVolume(
                    AudioManager.STREAM_ALARM,
                    maxVolume,
                    0
                )
            }

            val audioAttributes =
                AudioAttributes.Builder()
                    .setUsage(
                        AudioAttributes.USAGE_ALARM
                    )
                    .setContentType(
                        AudioAttributes.CONTENT_TYPE_SONIFICATION
                    )
                    .build()

            violationPlayer =
                MediaPlayer.create(
                    this,
                    R.raw.alarm_violation,
                    audioAttributes,
                    0
                )

            violationPlayer?.apply {

                // Playback aplikasi 100%.
                setVolume(1.0f, 1.0f)

                // Putar satu kali sampai seluruh durasi
                // file alarm selesai.
                isLooping = false

                setOnCompletionListener {
                    stopViolationAlarm()
                }

                setOnErrorListener { _, _, _ ->
                    stopViolationAlarm()
                    true
                }

                start()
            }

        } catch (e: Exception) {
            stopViolationAlarm()
        }
    }

    private fun stopViolationAlarm() {
        try {
            violationPlayer?.stop()
        } catch (_: Exception) {
        }

        try {
            violationPlayer?.release()
        } catch (_: Exception) {
        }

        violationPlayer = null
    }
}