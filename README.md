# Discord Çekiliş Botu

`/cekilis` — panel açar: katılımcıları seç, listede olmayanları isimle ekle, kazanan sayısını
seç, **🎲 Çek**'e bas. Sonuç kanalda herkese açık paylaşılır. Panel açık kalır, aynı havuzdan
tekrar çekebilirsin. Paneli yalnızca açan kişi kullanabilir. Çekilişi veren sesli kanaldaysa
dropdown'da o kanalın üyeleri **🔊 ile en üstte** listelenir; sonrası alfabetik gelir.

`/cekilis-son` — son çekilişin havuzuyla panel açmadan yeniden çeker.

## Ayrıcalıklı intent (bir seferlik, uygulama düzeyinde)

Developer Portal → Bot → **Privileged Gateway Intents** → **Server Members Intent: AÇIK**.

Üye listesi gateway chunking ile istenir (Discord toplu üye listesi REST ucunu intent'siz
403 donuyor). Intent Portal'da açılmazsa bot baglanirken "Used disallowed intents" alir.
Uygulama sahibi oldugun icin onay gerekmez — anahtari sen acarsin; sunucuya eklenen her kopya
icin ayrica acilMAZ (uygulama ayaridir).

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

⚠️ Portaldaki **Installation → "Uygulamayı Kur"** akışı (yalnız `applications.commands`
kapsamlı) botu sunucuya **üye yapmaz** — komutlar yine cevaplanır ama üye listesi ve sesli
kanal özelliği "Unknown Guild" verir. Üye olarak eklemenin tek yolu yukarıdaki URL Generator
linkidir (`bot` kapsamı).

## Barındırma (bot-hosting.net)

Bot 7/24 açık olmalı; kapalıyken komutlar "The application did not respond" der.

1. Sunucu oluştur → **Node.js**, sürüm **20.12 veya üstü** (`process.loadEnvFile` bu sürümde geldi).
2. **GitHub** sekmesinden bu repo'yu klonla. İlk kurulumda _Replace all files_, sonraki
   güncellemelerde **Merge** seç — Replace, repoda olmayan dosyaları siler.
3. **Env** sekmesi → **+ Add** → `DISCORD_TOKEN` = bot token'ı, mümkünse _secret_ işaretle.
   **`GUILD_ID` ekleme** — boş kalınca komutlar global kaydolur ve botun ekli olduğu her
   sunucuda görünür (yayılması ~1 saat).
4. `STARTUP_FILE` sistem değişkeni `index.js` olmalı; panel `npm install` sonrası
   `node index.js` çalıştırır. `npm start` kullanılmaz.
5. Başlat, konsolda `Hazır: <bot adı> (global)` satırını gör.

Token'ı repoya **koyma** — repo public. Env sekmesi doğru yer. `.env` dosyası da çalışır
(kod varsa okur) ama Env değişkeni varsa o öncelikli.

Aynı anda birden fazla kopya çalıştırma — her komuta iki kez cevap verir. Barındırmaya
geçtikten sonra yereldeki process'i kapat.

## Yerel geliştirme

```bash
npm install
npm start
```

Yerel için **ayrı bir Discord uygulaması** aç (örn. `cekilis-local-bot`) ve token'ını `.env`'e
koy. Panelle aynı token kullanılırsa ikisi aynı bot olur: hangisinin cevap verdiği anlaşılmaz
ve ikisi birden açıkken her komuta iki cevap gelir. Ayrı uygulamayla ikisi yan yana çalışır,
açılış log'undaki isim hangisi olduğunu söyler.

`GUILD_ID` verilirse komutlar yalnızca o sunucuya kaydolur ve **anında** görünür — global
kaydın ~1 saatlik yayılmasını beklemeden test etmek için.

```bash
npm test
```

## Bilinen sınırlar

- Panel durumu bellekte tutulur; bot yeniden başlarsa açık paneller ölür (`/cekilis` ile
  yeniden açılır). Kalıcı depolama yok, bu bot için gerekmiyor.
- `state` ve `son` en fazla 500 kayıt tutar, en eskisi düşer (`koy()` / [cekilis.js](cekilis.js)).
- Katılımcı listesi sayfa başına 25 kişi gösterir (Discord select menü limiti); ◀ / 📄 butonlarıyla
  sayfa gezilir, toplam seçimde sınır yok. Liste `/cekilis` anındaki üyelerden oluşur —
  sonradan katılanlar düşer, "İsim ekle" her zaman çalışır.
- Sesli kanal sıralaması (🔊) için botun o kanalı görme yetkisi olmalı; yoksa liste yalnız
  alfabetik olur, panel yine çalışır.
- İsimle eklemede sınır yok ama ilk 10'u buton olarak, kalanı metin olarak görünür.
- Bot 1 saat işlem görmezse "görünmez" olur — bağlantı sürer, komutlar çalışır, sadece üye
  listesinde görünmez. İlk komutta çevrim içine döner.
