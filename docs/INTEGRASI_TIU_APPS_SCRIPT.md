# Integrasi Sinkronisasi Soal TIU

Google Form sumber harus berupa **Quiz** dan semua pertanyaannya bertipe pilihan ganda dengan satu jawaban benar. Apps Script mengirim pertanyaan sesuai urutan Form ke endpoint PPDB. Paket valid menggantikan paket aktif; payload gagal tidak mengubah paket aktif.

## Konfigurasi Script Properties

Di Apps Script buka **Project Settings → Script Properties**, lalu isi:

- `PPDB_API_BASE`: URL API PPDB, tanpa slash di akhir.
- `TIU_GOOGLE_FORM_ID`: ID Form sumber.
- `TIU_WEBHOOK_SECRET`: secret yang sama dengan nilai yang disimpan di Pengaturan TIU.

Simpan secret yang dipilih di Script Properties dan Pengaturan TIU. Secret tidak dikirim ke browser dan tidak ditampilkan ulang setelah disimpan.

## Sinkronkan soal

Buat fungsi berikut di Apps Script, lalu jalankan `syncTiuQuestions` setelah soal atau kunci Google Form diubah. Fungsi memeriksa semua item: pertanyaan non-pilihan-ganda atau soal tanpa tepat satu jawaban benar akan menggagalkan sync dan melaporkan alasannya ke backoffice.

```javascript
function syncTiuQuestions() {
  const props = PropertiesService.getScriptProperties();
  const apiBase = props.getProperty('PPDB_API_BASE');
  const formId = props.getProperty('TIU_GOOGLE_FORM_ID');
  const secret = props.getProperty('TIU_WEBHOOK_SECRET');
  const endpoint = apiBase + '/ppdb/tiu-questions/sync';

  if (!apiBase || !formId || !secret) {
    throw new Error('Isi PPDB_API_BASE, TIU_GOOGLE_FORM_ID, dan TIU_WEBHOOK_SECRET.');
  }

  let payload;
  try {
    const form = FormApp.openById(formId);
    const questions = [];
    form.getItems().forEach(function(item) {
      const type = item.getType();
      const typeName = type.name();
      if (type === FormApp.ItemType.SECTION_HEADER ||
          type === FormApp.ItemType.PAGE_BREAK ||
          type === FormApp.ItemType.IMAGE ||
          type === FormApp.ItemType.VIDEO) return;
      if (type !== FormApp.ItemType.MULTIPLE_CHOICE) {
        throw new Error('Item "' + item.getTitle() + '" bertipe ' + typeName +
          '. Semua pertanyaan TIU harus pilihan ganda.');
      }

      const multipleChoice = item.asMultipleChoiceItem();
      if (multipleChoice.hasOtherOption()) {
        throw new Error('Soal "' + item.getTitle() +
          '" tidak boleh memakai opsi jawaban bebas (Other).');
      }
      const choices = multipleChoice.getChoices();
      const correct = choices
        .map(function(choice, index) { return choice.isCorrectAnswer() ? index : -1; })
        .filter(function(index) { return index >= 0; });
      if (correct.length !== 1) {
        throw new Error('Soal "' + item.getTitle() +
          '" harus memiliki tepat satu kunci jawaban pada Google Form Quiz.');
      }
      if (choices.length < 2) {
        throw new Error('Soal "' + item.getTitle() + '" harus memiliki minimal dua opsi.');
      }

      questions.push({
        id: String(item.getId()),
        title: item.getTitle(),
        options: choices.map(function(choice) { return choice.getValue(); }),
        correct_option_index: correct[0]
      });
    });

    if (questions.length === 0) throw new Error('Form tidak memiliki soal pilihan ganda.');
    payload = { source_form_id: formId, questions: questions };
  } catch (error) {
    postTiuSync_(endpoint, secret, { error: String(error.message || error) });
    throw error;
  }

  const response = postTiuSync_(endpoint, secret, payload);
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('Sync TIU gagal (' + status + '): ' + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}

function postTiuSync_(endpoint, secret, payload) {
  return UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-TIU-Secret': secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}
```

Kunci jawaban dikirim server-to-server dan tidak dikembalikan oleh endpoint sync. Status serta waktu percobaan terakhir terlihat di halaman Pengaturan TIU. Bila Form gagal divalidasi, paket valid terakhir tetap dipakai.

## Hasil ujian otomatis

Setelah aplikasi PPDB menyimpan jawaban attempt dan menghitung nilai otomatis saat peserta submit atau timer habis, pengirim hasil memanggil `POST /notifications/webhook/tiu-result` dengan header `X-TIU-Secret`. Payload minimal: `applicant_id` atau `attempt_id`, `score` (0–100), dan `idempotency_key`. Backend memvalidasi, menyimpan idempoten, lalu memicu notifikasi WhatsApp; tidak ada input nilai TIU manual di backoffice.

Script menggunakan API resmi Google Apps Script Forms: [Choice](https://developers.google.com/apps-script/reference/forms/choice), [MultipleChoiceItem](https://developers.google.com/apps-script/reference/forms/multiple-choice-item), dan [Form](https://developers.google.com/apps-script/reference/forms/form).
