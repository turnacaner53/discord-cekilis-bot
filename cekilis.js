import { randomInt } from 'node:crypto';

/** Havuzdan `adet` kadar kazananı yansız (Fisher-Yates + CSPRNG) seçer. */
export function cek(havuz, adet) {
  const a = [...havuz];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(adet, a.length));
}

/**
 * Map'e yazar ve `limit`i aşarsa en eskisini düşürür (kaba LRU).
 * Map ekleme sırasını koruduğu için ilk anahtar = en eski.
 */
export function koy(m, k, v, limit = 500) {
  m.delete(k); // yeniden ekleyince sona gider = en taze
  m.set(k, v);
  if (m.size > limit) m.delete(m.keys().next().value);
  return m;
}

/**
 * Üyeleri dropdown sırasına dizer: `sesliIds`'tekiler önce, sonra diğerleri;
 * her grup displayName'e göre Türkçe alfabetik sıralı.
 */
export function kisiListesi(uyeler, sesliIds) {
  const grup = (u) => (sesliIds.has(u.id) ? 0 : 1);
  return [...uyeler].sort(
    (a, b) => grup(a) - grup(b) || a.displayName.localeCompare(b.displayName, 'tr'),
  );
}

export const SAYFA = 25; // Discord bir select menüye en fazla 25 seçenek sığdırıyor

/** s.uyeler listesinden s.sayfa indeksli dilim: { toplam, sn, liste } — indeks uçlara vurunca sarar. */
export function sayfala(s) {
  const toplam = Math.max(1, Math.ceil(s.uyeler.length / SAYFA));
  const sn = ((s.sayfa % toplam) + toplam) % toplam;
  return { toplam, sn, liste: s.uyeler.slice(sn * SAYFA, sn * SAYFA + SAYFA) };
}

/**
 * StringSelect yalnızca o sayfadaki seçenekleri döndürür:
 * bu sayfanın eski seçimi bırakılır, `values`'tekiler eklenir; diğer sayfalar aynen kalır.
 */
export function secimGuncelle(s, values) {
  const buSayfa = new Set(sayfala(s).liste.map((u) => u.id));
  const kalan = s.users.filter((u) => !buSayfa.has(u.id));
  const yeniler = values.map((id) => s.uyeler.find((u) => u.id === id)).filter(Boolean);
  return [...kalan, ...yeniler];
}

/** Serbest metni isim listesine çevirir; boşları atar, tekrarları teker. */
export function isimleriAyikla(metin) {
  const s = metin ?? '';
  // Virgül/satır sonu varsa ayırıcı onlar (soyisimler bölünmesin), yoksa boşluk.
  const ayirici = /[,;\r\n]/.test(s) ? /[,;\r\n]/ : /\s+/;
  return [...new Set(s.split(ayirici).map(x => x.trim()).filter(Boolean))];
}
