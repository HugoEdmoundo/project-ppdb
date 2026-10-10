"""WhatApp proxy module.

Menyediakan endpoint manajemen WhatsApp di FastAPI (superadmin panel) yang
meneruskan request ke WhatsApp microservice (apps/whatsapp/). Alasan:

  - Frontend TIDAK menyentuh :3100 langsung; semua komunikasi lewat backend
    dengan API key yang hanya tersimpan di env backend (wa_service_api_key).
  - Otentikasi ke microservice memakai header `Authorization: Bearer` (sama
    dengan helper di src/core/notif_service.py).
  - Status dinormalisasi + disertai hint konfigurasi webhook supaya admin
    langsung tahu kalau backend/microservice salah setting.
"""
