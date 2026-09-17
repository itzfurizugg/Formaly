package com.example.formaly

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class ExamNotificationListenerService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)

        val notification = sbn ?: return

        // Jangan anggap notifikasi dari aplikasi Formally sendiri sebagai pelanggaran.
        if (notification.packageName == packageName) {
            return
        }

        MainActivity.currentInstance?.onExamNotificationDetected()
    }
}
