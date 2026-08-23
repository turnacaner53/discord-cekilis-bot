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

/** Serbest metni isim listesine çevirir; boşları atar, tekrarları teker. */
export function isimleriAyikla(metin) {
  const s = metin ?? '';
  // Virgül/satır sonu varsa ayırıcı onlar (soyisimler bölünmesin), yoksa boşluk.
  const ayirici = /[,;\r\n]/.test(s) ? /[,;\r\n]/ : /\s+/;
  return [...new Set(s.split(ayirici).map(x => x.trim()).filter(Boolean))];
}
