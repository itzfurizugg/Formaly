 package com.example.formaly

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent

class MyDeviceAdminReceiver : DeviceAdminReceiver() {

    // Dipanggil saat Device Admin berhasil diaktifkan.
    override fun onEnabled(
        context: Context,
        intent: Intent
    ) {
        super.onEnabled(context, intent)
    }

    // Dipanggil saat Device Admin dinonaktifkan.
    override fun onDisabled(
        context: Context,
        intent: Intent
    ) {
        super.onDisabled(context, intent)
    }
}