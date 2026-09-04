import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { existsSync } from 'node:fs';
import { cek, isimleriAyikla, kisiListesi, koy, sayfala, secimGuncelle } from './cekilis.js';

// Barındırma paneli `node index.js` ile başlatıyor, --env-file bayrağı yok.
// Panelin env değişkenleri varsa onlar geçerli; yoksa yanındaki .env dosyasından okuruz.
if (existsSync('.env')) process.loadEnvFile();

const CHIP = 10; // 5 satır sınırı: 2 select + 2 chip satırı + 1 kontrol satırı

// ponytail: panel durumu bellekte; bot yeniden başlarsa /cekilis ile panel yeniden açılır.
// ponytail: koy() kaba LRU ile sınırlar (varsayılan 500) — halka açık botta Map'ler sonsuz büyümesin.
const state = new Map(); // messageId -> { users, adet, isimler, sahip, uyeler, sayfa }
const son = new Map(); // userId -> son çekilişin havuzu (/cekilis-son için)

const goster = (x) => (typeof x === 'string' ? x : `<@${x.id}>`);

const sonucEmbed = (s, kullanici) => {
  const havuz = [...s.users, ...s.isimler];
  const kazananlar = cek(havuz, s.adet);
  return new EmbedBuilder()
    .setTitle('🎉 Çekiliş sonucu')
    .setColor(0x5865f2)
    .setDescription(kazananlar.map((u, n) => `**${n + 1}.** ${goster(u)}`).join('\n'))
    .setFooter({
      text: `${havuz.length} kişi arasından ${kazananlar.length} kazanan • ${kullanici.tag}`,
    });
};

const chipRows = (s) =>
  Array.from({ length: Math.ceil(Math.min(s.isimler.length, CHIP) / 5) }, (_, r) =>
    new ActionRowBuilder().addComponents(
      s.isimler.slice(r * 5, r * 5 + 5).map((ad, k) =>
        new ButtonBuilder()
          .setCustomId(`sil:${r * 5 + k}`)
          .setLabel(`${ad.slice(0, 60)} ✕`)
          .setEmoji('👤')
          .setStyle(ButtonStyle.Secondary),
      ),
    ),
  );

const panel = (s) => {
  const { toplam, sn, liste } = sayfala(s);
  const secili = new Set(s.users.map((u) => u.id));
  const sesliVar = s.uyeler.some((u) => u.sesli);
  return {
    content:
      `**Havuz:** ${s.users.length + s.isimler.length} kişi • **Kazanan:** ${s.adet}` +
      (s.isimler.length > CHIP
        ? `\n_${s.isimler.length - CHIP} isim daha: ${s.isimler.slice(CHIP).join(', ')}_`
        : '') +
      (s.uyeler.length ? '' : '\n_Üye listesi alınamadı — "İsim ekle" ile devam edebilirsin._'),
    components: [
      // Native "kişi seç" menüsünün sırasını Discord belirliyor; özel sıra tek yol: botun doldurduğu StringSelect.
      ...(s.uyeler.length
        ? [
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('katilimcilar')
                .setPlaceholder(
                  `${sesliVar ? '🔊 sesli kanalındakiler • ' : ''}${s.users.length} seçili • sayfa ${sn + 1}/${toplam}`,
                )
                .setMinValues(0)
                .setMaxValues(liste.length)
                .setOptions(
                  liste.map((u) => {
                    const o = new StringSelectMenuOptionBuilder()
                      .setLabel(u.ad.slice(0, 100))
                      .setValue(u.id)
                      .setDefault(secili.has(u.id));
                    if (u.sesli) o.setEmoji('🔊');
                    return o;
                  }),
                ),
            ),
          ]
        : []),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('adet')
          .setPlaceholder('Kaç kişi kazanacak?')
          .setOptions(
            Array.from({ length: 15 }, (_, n) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(`${n + 1} kişi`)
                .setValue(`${n + 1}`)
                .setDefault(n + 1 === s.adet),
            ),
          ),
      ),
      ...chipRows(s),
      new ActionRowBuilder().addComponents(
        // liste 25 kişiden uzunsa oklarla sayfa gezilir
        ...(toplam > 1
          ? [
              new ButtonBuilder()
                .setCustomId('sayfa-')
                .setLabel('◀')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('sayfa+')
                .setLabel(`📄 ${sn + 1}/${toplam}`)
                .setStyle(ButtonStyle.Secondary),
            ]
          : []),
        new ButtonBuilder().setCustomId('isim').setLabel('İsim ekle').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cek').setLabel('🎲 Çek').setStyle(ButtonStyle.Success),
      ),
    ],
  };
};

const isimModal = (s) =>
  new ModalBuilder()
    .setCustomId('isimModal')
    .setTitle('Listede olmayanlar')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('İsimler')
        .setDescription('Alt alta, virgülle ya da boşlukla ayır')
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId('ekstra')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setValue(s.isimler.join('\n')),
        ),
    );

const UYKU = 60 * 60 * 1000; // 1 saat işlem olmazsa görünmez

const client = new Client({
  // GuildVoiceStates (ayrıcalıksız): sesli kanal üyeleri ancak voice state önbelleğiyle bilinir.
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  presence: { status: 'invisible' }, // açılışta görünmez; ilk komutla çevrim içi olur
});

// Bot bağlı kalmak zorunda (komutları gateway'den alıyor), ama görünmesi zorunda değil.
let zamanlayici;
const uyan = () => {
  client.user?.setStatus('online');
  clearTimeout(zamanlayici);
  zamanlayici = setTimeout(() => client.user?.setStatus('invisible'), UYKU);
};
client.on('error', console.error); // tek bir hatalı etkileşim botu düşürmesin

client.once('clientReady', async (c) => {
  // GUILD_ID varsa komut anında görünür; yoksa global kayıt (yayılması ~1 saat)
  await c.application.commands.set(
    [
      { name: 'cekilis', description: 'Seçtiğin kişiler arasında çekiliş yapar' },
      { name: 'cekilis-son', description: 'Son çekilişin havuzuyla yeniden çeker' },
    ],
    process.env.GUILD_ID,
  );
  console.log(
    `Hazır: ${c.user.tag}${process.env.GUILD_ID ? ` (guild ${process.env.GUILD_ID})` : ' (global)'}`,
  );
});

client.on('interactionCreate', async (i) => {
  uyan(); // her etkileşim uyku sayacını sıfırlar
  if (i.isChatInputCommand() && i.commandName === 'cekilis-son') {
    const onceki = son.get(i.user.id);
    if (!onceki) {
      return i.reply({
        content: 'Hatırladığım bir çekilişin yok, `/cekilis` ile başla.',
        flags: MessageFlags.Ephemeral,
      });
    }
    return i.reply({ embeds: [sonucEmbed(onceki, i.user)] });
  }
  if (i.isChatInputCommand() && i.commandName === 'cekilis') {
    const s = { users: [], adet: 5, isimler: [], sahip: i.user.id, uyeler: [], sayfa: 0 };
    // Üye listesi botun doldurduğu bir StringSelect'e yazılır (özel sıra tek yol);
    // çekilişi veren sesli kanaldaysa o kanalın üyeleri en üstte, alfabetik yerleşir.
    // members.fetch() gateway chunking kullanır → GuildMembers (ayrıcalıklı) intent gerektirir;
    // onun yerine intent'siz çalışan REST listesi 1000'erlik sayfalarla çekilir.
    await i.deferReply();
    try {
      const sesliKanalId = i.member?.voice?.channelId;
      const sesliIds = new Set(
        sesliKanalId
          ? [...i.guild.voiceStates.cache.values()]
              .filter((vs) => vs.channelId === sesliKanalId)
              .map((vs) => vs.id)
          : [],
      );
      const uyeler = new Map();
      let after;
      for (;;) {
        const dilim = await i.guild.members.list({ limit: 1000, after, cache: false });
        for (const [id, m] of dilim) uyeler.set(id, m);
        if (dilim.size < 1000) break;
        after = dilim.lastKey();
      }
      s.uyeler = kisiListesi(
        [...uyeler.values()].filter((m) => !m.user.bot),
        sesliIds,
      ).map((m) => ({ id: m.id, ad: m.displayName, sesli: sesliIds.has(m.id) }));
    } catch (e) {
      console.error('üye listesi alınamadı:', e); // panel yine açılır; isimle ekle çalışır
    }
    await i.editReply(panel(s));
    const msg = await i.fetchReply(); // deferred yanıtta panelin mesajı
    koy(state, msg.id, s);
    return;
  }
  if (!i.isMessageComponent() && !i.isModalSubmit()) return;

  const s = state.get(i.message?.id);
  if (!s) {
    return i.reply({
      content: 'Bu panel eskimiş, `/cekilis` ile yeniden aç.',
      flags: MessageFlags.Ephemeral,
    });
  }
  koy(state, i.message.id, s); // kullanımda olan panel tazelenir, sıranın sonuna geçer
  if (i.user.id !== s.sahip) {
    return i.reply({
      content: `Bu çekilişi <@${s.sahip}> yönetiyor. Kendi çekilişin için \`/cekilis\` yaz.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  if (i.isStringSelectMenu() && i.customId === 'katilimcilar') {
    s.users = secimGuncelle(s, i.values);
    return i.update(panel(s));
  }
  if (i.isButton() && (i.customId === 'sayfa-' || i.customId === 'sayfa+')) {
    s.sayfa += i.customId === 'sayfa+' ? 1 : -1;
    return i.update(panel(s));
  }
  if (i.isStringSelectMenu() && i.customId === 'adet') {
    s.adet = Number(i.values[0]);
    return i.update(panel(s));
  }
  if (i.isButton() && i.customId.startsWith('sil:')) {
    s.isimler.splice(Number(i.customId.slice(4)), 1);
    return i.update(panel(s));
  }
  if (i.isButton() && i.customId === 'isim') return i.showModal(isimModal(s));
  if (i.isModalSubmit() && i.customId === 'isimModal') {
    s.isimler = isimleriAyikla(i.fields.getTextInputValue('ekstra'));
    return i.update(panel(s));
  }

  if (i.isButton() && i.customId === 'cek') {
    const havuz = [...s.users, ...s.isimler];
    if (!havuz.length) {
      return i.reply({
        content: 'Havuz boş: en az bir kişi seç ya da isim ekle.',
        flags: MessageFlags.Ephemeral,
      });
    }
    koy(son, i.user.id, { users: [...s.users], isimler: [...s.isimler], adet: s.adet });
    // Panel açık kalır: aynı havuzdan tekrar çekmek için yine "Çek"e basılır.
    return i.reply({ embeds: [sonucEmbed(s, i.user)] });
  }
});

client.login(process.env.DISCORD_TOKEN);
