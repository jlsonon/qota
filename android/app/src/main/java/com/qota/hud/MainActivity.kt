package com.qota.hud

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private val OVERLAY_PERMISSION_REQ_CODE = 1234
    private lateinit var webView: WebView
    private lateinit var btnToggleHud: Button
    private var isServiceRunning = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        btnToggleHud = findViewById(R.id.btn_toggle_hud)
        webView = findViewById(R.id.webview_dashboard)

        // Configure WebView for offline QOTA Dashboard
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            cacheMode = WebSettings.LOAD_DEFAULT
        }
        webView.webViewClient = WebViewClient()
        webView.loadUrl("file:///android_asset/index.html")

        btnToggleHud.setOnClickListener {
            if (checkOverlayPermission()) {
                toggleFloatingHud()
            } else {
                requestOverlayPermission()
            }
        }
    }

    private fun checkOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else {
            true
        }
    }

    private fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            startActivityForResult(intent, OVERLAY_PERMISSION_REQ_CODE)
            Toast.makeText(this, "Enable 'Display over other apps' to float QOTA HUD", Toast.LENGTH_LONG).show()
        }
    }

    private fun toggleFloatingHud() {
        val intent = Intent(this, FloatingHudService::class.java)
        if (!isServiceRunning) {
            startService(intent)
            isServiceRunning = true
            btnToggleHud.text = "STOP HUD"
            Toast.makeText(this, "QOTA Floating HUD active on screen", Toast.LENGTH_SHORT).show()
        } else {
            stopService(intent)
            isServiceRunning = false
            btnToggleHud.text = "FLOATING HUD"
        }
    }
}
