# Discord Çekiliş Botu

`/cekilis` — panel açar: katılımcıları seç, listede olmayanları isimle ekle, kazanan sayısını
seç, **🎲 Çek**'e bas. Sonuç kanalda herkese açık paylaşılır. Panel açık kalır, aynı havuzdan
tekrar çekebilirsin. Paneli yalnızca açan kişi kullanabilir.

`/cekilis-son` — son çekilişin havuzuyla panel açmadan yeniden çeker.

## Erişim modeli

Bot **herkese açık değildir**: Developer Portal → Bot → **Public Bot kapalı**. Bu ayarla davet
linkini yalnızca uygulama sahibi kullanabilir; link başkasının eline geçse de işe yaramaz.

Birine bot vermek için:

1. Kişi seni sunucusuna davet eder ve **Sunucuyu Yönet** yetkisi verir.
2. Sen davet linkini açıp o sunucuyu seçersin.
3. İş bitince yetkin geri alınabilir — bot sunucuda kalmaya devam eder.

Davet linki: Developer Portal → OAuth2 → URL Generator

- Scope: `bot` + `applications.commands`
- Permission: **hiçbiri seçme** — komut cevapları interaction token'ıyla gider, botun mesaj
  yazma yetkisine ihtiyacı yok.

## Barındırma (bot-hosting.net)

Bot 7/24 açık olmalı; kapalıyken komutlar "The application did not respond" der.

1. Sunucu (server) oluştur → **Node.js**, sürüm **22 veya üstü**.
   (`--env-file-if-exists` Node 20.12+ ister.)
2. `node_modules/`, `.env` ve `bot.log` **hariç** tüm dosyaları yükle.
3. Panelde environment variable olarak `DISCORD_TOKEN` gir. **`GUILD_ID` girme** — boş
   bırakılınca komutlar global kaydolur ve botun bulunduğu her sunucuda görünür (yayılması ~1 saat).
4. Startup command: `npm start`
5. Başlat, log'da `Hazır: <bot adı> (global)` satırını gör.

Token'ı dosya olarak yükleme, panelin env değişkenlerine gir.

Aynı anda birden fazla kopya çalıştırma — her komuta iki kez cevap verir. Barındırmaya
geçtikten sonra yereldeki process'i kapat.

## Yerel geliştirme

```bash
npm install
npm start
```

`.env` içine `DISCORD_TOKEN` ve (isteğe bağlı) `GUILD_ID` koy. `GUILD_ID` verilirse komutlar
yalnızca o sunucuya kaydolur ve **anında** görünür — global kaydın ~1 saatlik yayılmasını
beklemeden test etmek için.

```bash
npm test
```

## Bilinen sınırlar

- Panel durumu bellekte tutulur; bot yeniden başlarsa açık paneller ölür (`/cekilis` ile
  yeniden açılır). Kalıcı depolama yok, bu bot için gerekmiyor.
- `state` ve `son` en fazla 500 kayıt tutar, en eskisi düşer (`koy()` / [cekilis.js](cekilis.js)).
- Bir panelde en fazla 25 kişi seçilebilir (Discord user select limiti); isimle eklemede sınır yok
  ama ilk 10'u buton olarak, kalanı metin olarak görünür.
- Bot 2 saat işlem görmezse "görünmez" olur — bağlantı sürer, komutlar çalışır, sadece üye
  listesinde görünmez. İlk komutta çevrim içine döner.
