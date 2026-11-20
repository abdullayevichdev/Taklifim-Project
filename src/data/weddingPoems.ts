import type { Language } from '../types';

/**
 * Original wedding poems — one per template, in Uzbek, Russian and English.
 * Stanzas are arrays of lines; rendered by SharedPoem inside every template.
 */
export interface PoemText {
  title: string;
  stanzas: string[][];
}

export type WeddingPoem = Record<Language, PoemText>;

export const POEM_SECTION_LABEL: Record<Language, string> = {
  uz: 'Sizga bag‘ishlov',
  ru: 'Стихи для вас',
  en: 'A Poem for You',
};

export const WEDDING_POEMS: Record<string, WeddingPoem> = {
  'template-1': {
    uz: {
      title: 'Oltin ostona',
      stanzas: [
        [
          'Ikki yurak bir yo‘lga chiqqan kun,',
          'Osmon ham kulib boqar shu tun.',
          'Oltin ostonada yangi bir hayot,',
          'Mehr-u sadoqat bo‘lsin unga qanot.',
        ],
        [
          'Bir umr birga bo‘lish ahdi bilan',
          'Qo‘l ushlab yurishar sevgi yo‘lidan.',
          'Duolar yog‘ilsin boshlariga nur,',
          'Har kunlari bo‘lsin shodlik va surur.',
        ],
        [
          'Aziz mehmon, keling, bo‘ling hamroh,',
          'Shu baxtli oqshomga siz bo‘ling guvoh.',
          'Sizsiz to‘yimizning ko‘rki kam bo‘lur,',
          'Kelsangiz, dilimiz quvonchga to‘lur.',
        ],
      ],
    },
    ru: {
      title: 'Золотой порог',
      stanzas: [
        [
          'Две судьбы сегодня стали одной,',
          'Свет любви зажёгся над нами с тобой.',
          'На пороге золотом — новый путь,',
          'Пусть счастье в наш дом не забудет заглянуть.',
        ],
        [
          'Мы клянёмся быть вместе всегда —',
          'В радости, в горе, сквозь годы, года.',
          'Приходите, родные, разделить этот час —',
          'Без вас наш праздник не праздник для нас.',
        ],
      ],
    },
    en: {
      title: 'The Golden Threshold',
      stanzas: [
        [
          'Two hearts today become as one,',
          'A brand-new story has begun;',
          'Upon this golden threshold bright',
          'We step together into light.',
        ],
        [
          'We promise love through every year,',
          'In joy and storm, through smile and tear;',
          'So come, dear friends, and share our day —',
          'With you, our joy will always stay.',
        ],
      ],
    },
  },

  'template-2': {
    uz: {
      title: 'Oq serenada',
      stanzas: [
        [
          'Oppoq libos, qo‘lda nozik guldasta,',
          'Kelinning ko‘zlari porlar ohista.',
          'Kuyov yonida g‘urur-la turar,',
          'Ikki yurak bitta kuyni kuylar.',
        ],
        [
          'Serenada yangrar oqshom bag‘rida,',
          'Sevgi yashnar har bir so‘z mag‘zida.',
          'Bir-biriga bergan va’dasi pokdir,',
          'Bu ahd abadiy, bu ahd mustahkamdir.',
        ],
        [
          'Siz ham keling, aziz, qadrdon inson,',
          'Bayramimiz bo‘lsin yanada shon.',
          'Sizning tashrifingiz — eng oliy hadya,',
          'Quvonchimiz to‘lsin shu kun bu yerda.',
        ],
      ],
    },
    ru: {
      title: 'Белая серенада',
      stanzas: [
        [
          'Белое платье, фата, как туман,',
          'В сердце — весна, а в глазах — океан.',
          'Тихо звучит серенада любви —',
          'Двое сегодня навеки свои.',
        ],
        [
          'Слово, что дали друг другу они,',
          'Пусть берегут все грядущие дни.',
          'Будьте и вы в этот вечер у нас —',
          'Ваша улыбка согреет не раз.',
        ],
      ],
    },
    en: {
      title: 'White Serenade',
      stanzas: [
        [
          'A gown of white, a veil of lace,',
          'A quiet glow upon her face;',
          'He stands beside her, proud and true —',
          'Two hearts that sing one song anew.',
        ],
        [
          'The vows they speak are pure and deep,',
          'A promise they will always keep;',
          'So join us, friend, on this sweet night —',
          'Your smile will make the evening bright.',
        ],
      ],
    },
  },

  'template-3': {
    uz: {
      title: 'Sharq kechasi',
      stanzas: [
        [
          'Sharq kechasi — oy nur sochar tomga,',
          'Doira sadosi taraladi shomga.',
          'Karnay-surnay chalinar, qutlug‘ dam,',
          '«To‘y muborak!» — deya kular olam.',
        ],
        [
          'Ota-onamiz duosi — bizga tumor,',
          'Ul duo-la qadamimiz bo‘lar barqaror.',
          'Ikki oila endi bitta dasturxon,',
          'Mehr bilan to‘lsin har bir xonadon.',
        ],
        [
          'Aziz mehmon, to‘rimizdan joy oling,',
          'Bayram dasturxonidan bahra oling.',
          'Sizsiz bu oqshomning nuri kam bo‘lur,',
          'Kelsangiz, ko‘nglimiz shodlikka to‘lur.',
        ],
      ],
    },
    ru: {
      title: 'Восточная ночь',
      stanzas: [
        [
          'Ночь Востока, луна над айваном,',
          'Звонкий бубен над пышным садом.',
          'Двое сегодня — одна семья,',
          'Благословенье родных — их броня.',
        ],
        [
          'Сядьте, родные, за наш дастархан,',
          'Пусть будет праздник щедро вам дан.',
          'Без вас этот вечер не будет полон —',
          'Ждём вас с любовью и низким поклоном.',
        ],
      ],
    },
    en: {
      title: 'An Eastern Night',
      stanzas: [
        [
          'The moon of the East lights the garden of old,',
          'The doira is ringing, the evening is gold;',
          'Two families gather, one table, one home,',
          'With blessings of elders, no heart walks alone.',
        ],
        [
          'So come, honoured guest, take a seat at our feast,',
          'Share bread and share laughter, from greatest to least;',
          'Without you this evening would not be complete —',
          'We wait with warm hearts for the friends we will greet.',
        ],
      ],
    },
  },

  'template-4': {
    uz: {
      title: 'Oltin simfoniya',
      stanzas: [
        [
          'Hayot — bir simfoniya, sevgi — uning kuyi,',
          'Bugun yangrar ikki qalbning bir ovozi.',
          'Har nota — bir orzu, har sado — bir tilak,',
          '«Baxtli bo‘l!» — deb urar ikki yurak.',
        ],
        [
          'Skripka yig‘lar quvonchdan, nay kular,',
          'Sevgi qo‘shig‘ini yulduzlar tinglar.',
          'Bu kuy tugamaydi, davom etar abad,',
          'Unda bor sadoqat, mehr va hurmat.',
        ],
        [
          'Keling, birga tinglaylik shu go‘zal kuyni,',
          'Bezaylik muhabbat bilan bu to‘yni.',
          'Sizning tashrifingiz — kuyning eng yorqin pardasi,',
          'Shu oqshom bo‘lsin umrning eng go‘zal sahifasi.',
        ],
      ],
    },
    ru: {
      title: 'Золотая симфония',
      stanzas: [
        [
          'Жизнь — это музыка, любовь — её мотив,',
          'Сегодня два сердца звучат, как один.',
          'Скрипка смеётся, и вторит рояль,',
          'Счастье уводит их в светлую даль.',
        ],
        [
          'Пусть не смолкает их нежный дуэт',
          'Сквозь много лет и сквозь много побед.',
          'Будьте же с нами в этот вечер, друзья, —',
          'Музыку счастья без вас слушать нельзя.',
        ],
      ],
    },
    en: {
      title: 'Golden Symphony',
      stanzas: [
        [
          'Our life is a symphony, love is its theme,',
          'Two hearts play together as one gentle dream;',
          'The violins laugh and the cellos reply,',
          'A melody rising to touch the night sky.',
        ],
        [
          'May this duet never fall silent or fade,',
          'Through all of the seasons, through sunshine and shade;',
          'So come, dearest friends, let the music begin —',
          'Our song is complete only with you within.',
        ],
      ],
    },
  },

  'template-5': {
    uz: {
      title: 'Zumrad bog‘',
      stanzas: [
        [
          'Zumrad bog‘ ichra ochildi ikki gul,',
          'Bir-biriga intilib, topishdi yo‘l.',
          'Shabboda shivirlar: «Baxtli bo‘linglar»,',
          'Bulbul ham kuylar: «Abadiy qolinglar».',
        ],
        [
          'Ildizi chuqur, shoxlari baland,',
          'Bo‘lsin bu oila doim xursand.',
          'Mevasi shirin, soyasi salqin,',
          'Har kuni bo‘lsin baxtga yaqin.',
        ],
        [
          'Shu bog‘ga sizni chorlaymiz, aziz,',
          'Bayramni bezasin samimiy so‘zingiz.',
          'Kelsangiz, bog‘imiz yanada gullar,',
          'Quvonchdan sayraydi shodon bulbullar.',
        ],
      ],
    },
    ru: {
      title: 'Изумрудный сад',
      stanzas: [
        [
          'В изумрудном саду два цветка расцвели,',
          'Друг к другу дорогу сквозь годы нашли.',
          'Шепчет им ветер: «Счастливыми будьте»,',
          'Поёт соловей: «Друг о друге не забудьте».',
        ],
        [
          'Пусть корни их дома растут глубоко,',
          'А ветви — к солнцу, светло и легко.',
          'Приходите в наш сад, дорогие друзья, —',
          'Без вас этот праздник представить нельзя.',
        ],
      ],
    },
    en: {
      title: 'The Emerald Garden',
      stanzas: [
        [
          'Within an emerald garden two blossoms have grown,',
          'And each found the other, no longer alone;',
          'The breeze softly whispers, “Be happy and free,”',
          'The nightingale sings, “Grow as one, like a tree.”',
        ],
        [
          'May roots of their home reach deep into the ground,',
          'May branches rise high where the sunlight is found;',
          'So come to our garden, dear friends, come and stay —',
          'You’ll make it bloom brighter on our wedding day.',
        ],
      ],
    },
  },

  'template-6': {
    uz: {
      title: 'Pushti orzular',
      stanzas: [
        [
          'Pushti shafaq tushdi yurak tubiga,',
          'Orzular yetishdi o‘z manziliga.',
          'Birinchi uchrashuv, ilk bor uyalish —',
          'Bugun esa to‘y, abadiy bog‘lanish.',
        ],
        [
          'Kelin chehrasida bahor kuladi,',
          'Kuyov ko‘zlarida mehr to‘ladi.',
          'Qo‘l ushlab kirishar yangi bir dunyoga,',
          'Baxt yo‘ldosh bo‘lsin shu go‘zal juftga.',
        ],
        [
          'Siz ham keling, ulashing quvonchni,',
          'Birga kutib olaylik shu shodon tunni.',
          'Bir og‘iz tilagingiz — biz uchun dur,',
          'Kelsangiz, to‘yimizga qo‘shilar nur.',
        ],
      ],
    },
    ru: {
      title: 'Пастельные мечты',
      stanzas: [
        [
          'Первый взгляд, и смущенье, и робкий привет —',
          'А сегодня мы вместе на тысячу лет.',
          'Нежно-розовый свет над весенним окном —',
          'Мы с тобою построим уютный наш дом.',
        ],
        [
          'Приходите, родные, порадуйтесь с нами,',
          'Поделитесь улыбкой и добрыми словами.',
          'Ваши тёплые пожелания — жемчуг для нас,',
          'Ждём вас на свадьбе в назначенный час.',
        ],
      ],
    },
    en: {
      title: 'Pastel Dreams',
      stanzas: [
        [
          'A glance, then a blush, then a shy little smile —',
          'And now we will walk down the very same aisle;',
          'The pastel-pink dawn softly lights up the sky',
          'As we build a home where our dreams learn to fly.',
        ],
        [
          'So come, share our gladness, our laughter, our cheer,',
          'Each wish that you give us we’ll treasure each year;',
          'We’ll wait for you, smiling — the moment is near,',
          'Our day is complete only when you are here.',
        ],
      ],
    },
  },

  'template-7': {
    uz: {
      title: 'Nafis tuyg‘u',
      stanzas: [
        [
          'Nafis bir tuyg‘u yashar dillarda,',
          'Gulday ochildi go‘zal yillarda.',
          'U na so‘zga sig‘ar, na qog‘ozga,',
          'Yashirin edi — chiqdi bugun ovozga.',
        ],
        [
          'Ikki qalb bir-biridan topdi taskin,',
          'Hayot yo‘llari bo‘lsin doim yorqin.',
          'Sabr va sadoqat — oila poydevori,',
          'Mehr bo‘lsin uyning eng go‘zal bahori.',
        ],
        [
          'Aziz mehmonlar, sizlarni kutamiz,',
          'Shodligimizni sizga ulashamiz.',
          'Sizning tashrifingiz — ko‘nglimiz bayrami,',
          'Shu kunning eng aziz va go‘zal dami.',
        ],
      ],
    },
    ru: {
      title: 'Нежное чувство',
      stanzas: [
        [
          'Тихое чувство в сердцах родилось,',
          'Как утренний цвет, в тишине расцвелось.',
          'Его не вместить ни в слова, ни в листы —',
          'Сегодня оно как сбывшиеся мечты.',
        ],
        [
          'Терпенье и верность — опора семьи,',
          'Пусть будут светлы их счастливые дни.',
          'Мы ждём вас, родные, на праздник любви —',
          'Вы радость и свет в этот день принесли.',
        ],
      ],
    },
    en: {
      title: 'A Tender Feeling',
      stanzas: [
        [
          'A tender feeling quietly grew,',
          'Like morning roses touched with dew;',
          'No page could hold it, words fell short —',
          'Today it sings with all its heart.',
        ],
        [
          'May patience, faith and gentle care',
          'Become the walls of all they share;',
          'Dear guests, we wait to welcome you —',
          'Our joy is whole when you come too.',
        ],
      ],
    },
  },

  'template-8': {
    uz: {
      title: 'Gullar uyg‘unligi',
      stanzas: [
        [
          'Lola, nargis, atirgul — bari bir bog‘da,',
          'Uyg‘un yashnar quyosh nuri chog‘da.',
          'Biz ham shunday — ikki xil gul edik,',
          'Endi bir guldastada birga yashnadik.',
        ],
        [
          'Har bir gulbarg — bir orzu, bir tilak,',
          'Har bir rang — mehrdan yaralgan yurak.',
          'Bu guldasta so‘lmasin hech qachon,',
          'Baxt va salomatlik yor bo‘lsin har zamon.',
        ],
        [
          'Keling, bog‘imizning mehmoni bo‘ling,',
          'Guldek ochilib, quvonchga to‘ling.',
          'Sizsiz bu bog‘da bir gul kam bo‘lur,',
          'Kelsangiz, to‘yimiz bahorga to‘lur.',
        ],
      ],
    },
    ru: {
      title: 'Гармония цветов',
      stanzas: [
        [
          'Тюльпан и роза, нарцисс и жасмин',
          'Цветут в одном саду — и мир их един.',
          'Так и мы — два разных цветка —',
          'Стали букетом на долгие века.',
        ],
        [
          'Пусть этот букет никогда не завянет,',
          'Пусть счастье с годами сильнее лишь станет.',
          'Придите в наш сад, разделите наш свет —',
          'Без вас в этом празднике радости нет.',
        ],
      ],
    },
    en: {
      title: 'Floral Harmony',
      stanzas: [
        [
          'The tulip, the rose and the jasmine so white',
          'All bloom in one garden in harmony bright;',
          'And we, once two flowers on separate stems,',
          'Are now one bouquet, bound like delicate gems.',
        ],
        [
          'May this bouquet never wither or fade,',
          'May joy be the sunlight and love be the shade;',
          'So come to our garden and bloom with us too —',
          'One flower is missing until we see you.',
        ],
      ],
    },
  },

  'template-9': {
    uz: {
      title: 'Billur qalblar',
      stanzas: [
        [
          'Billurday tiniq, sof bir muhabbat,',
          'Unda yo‘q yolg‘on, yo‘q g‘ubor, kudurat.',
          'Ikki qalb oynadek bir-birin aks etar,',
          'Biri kulsa, ikkinchisi baxtdan yashnar.',
        ],
        [
          'Qor kabi oppoq bo‘lsin niyatlari,',
          'Sinovlarda mustahkam qanotlari.',
          'Billur jom misoli asrashsin sevgini,',
          'Ehtiyot qilishsin bir-birin ko‘nglini.',
        ],
        [
          'Shu toza tuyg‘uga guvoh bo‘ling, keling,',
          'Quvonchimizdan bahramand bo‘ling.',
          'Sizning duoingiz — billurdan ham tiniq,',
          'Kelsangiz, bayramimiz bo‘lar yanada yorug‘.',
        ],
      ],
    },
    ru: {
      title: 'Хрустальные сердца',
      stanzas: [
        [
          'Чиста, как хрусталь, их большая любовь,',
          'В ней нет ни обмана, ни горечи слов.',
          'Два сердца, как зеркало, друг в друге видны:',
          'Один улыбнётся — и оба светлы.',
        ],
        [
          'Пусть берегут это чувство всегда,',
          'Как хрупкий хрусталь, сквозь любые года.',
          'Приходите, родные, на праздник наш светлый —',
          'Ваш тёплый привет нам подарок заветный.',
        ],
      ],
    },
    en: {
      title: 'Crystal Hearts',
      stanzas: [
        [
          'Their love is as clear as the crystal is pure,',
          'No shadow, no doubt, only faith to endure;',
          'Like mirrors, their hearts in each other reside —',
          'When one of them smiles, there is joy on each side.',
        ],
        [
          'May they guard this fine treasure through all of their years,',
          'As crystal is cherished through laughter and tears;',
          'So come, dearest guests, let your blessings be told —',
          'Your wishes are clearer than crystal or gold.',
        ],
      ],
    },
  },

  'template-10': {
    uz: {
      title: 'Yarim tun yulduzlari',
      stanzas: [
        [
          'Yarim tun, osmonda yulduzlar raqsi,',
          'Sapfir rang ko‘kda oyning aksi.',
          'Shu tun ikki qalb qasamyod qildi,',
          'Yulduzlar guvoh bo‘lib tingladi.',
        ],
        [
          'Har bir yulduz — bir orzu, bir umid,',
          'Ular yo‘lini yoritsin to abad.',
          'Qorong‘u tunda ham adashmasinlar,',
          'Bir-birin qo‘lini hech qo‘ymasinlar.',
        ],
        [
          'Siz ham keling, bo‘ling shu tun yulduzi,',
          'Bayramimizning eng yorqin, aziz yuzi.',
          'Sizning nuringiz-la tun ham yorishar,',
          'Kelsangiz, ko‘ngillar baxtga qorishar.',
        ],
      ],
    },
    ru: {
      title: 'Полночный сапфир',
      stanzas: [
        [
          'Полночь. Сапфировый свод в вышине,',
          'Звёзды танцуют в ночной тишине.',
          'Этою ночью два сердца клялись —',
          'И звёзды в свидетели к ним собрались.',
        ],
        [
          'Пусть каждая звёздочка путь освещает',
          'И в самую тёмную ночь не оставляет.',
          'Будьте и вы в эту ночь нам звездой —',
          'Праздник разделите с нашей семьёй.',
        ],
      ],
    },
    en: {
      title: 'Midnight Sapphire',
      stanzas: [
        [
          'At midnight the stars start to dance in the blue,',
          'A sapphire sky shines on vows ever true;',
          'Tonight two hearts promised forever as one,',
          'The stars bore their witness till night was undone.',
        ],
        [
          'May every star guide them wherever they go,',
          'Through dark and through silence, through wind and through snow;',
          'So come be a star on our beautiful night —',
          'Your presence will make all our heaven more bright.',
        ],
      ],
    },
  },

  'template-11': {
    uz: {
      title: 'Marvarid so‘z',
      stanzas: [
        [
          'Ko‘p so‘z shart emas — bitta so‘z kifoya:',
          '«Sevaman» — shu so‘zda butun bir dunyo.',
          'Marvariddek sodda, lekin qimmatbaho,',
          'Shu so‘z bilan boshlandi bizning hikoya.',
        ],
        [
          'Sodda bo‘lsin hayot, lekin samimiy,',
          'Har kuni kichik baxt — bizga eng muhimi.',
          'Bir piyola choy, bir iliq nigoh —',
          'Shular bilan to‘lsin uyimiz har chog‘.',
        ],
        [
          'Sizni chorlaymiz shu sodda bayramga,',
          'Qo‘shiling quvonchga, guvoh bo‘ling ahdga.',
          'Ko‘p narsa so‘ramaymiz — faqat tashrifingiz,',
          'Bizga eng qimmatli sovg‘a — o‘zingiz.',
        ],
      ],
    },
    ru: {
      title: 'Жемчужное слово',
      stanzas: [
        [
          'Не нужно много слов — довольно одного:',
          '«Люблю» — и в нём весь мир и всё его тепло.',
          'Простое, как жемчуг, но ценнее всего —',
          'С него началось наше счастье само.',
        ],
        [
          'Пусть будет жизнь простой, но настоящей:',
          'Чай на двоих и взгляд, теплом манящий.',
          'Мы ждём вас на скромный и искренний праздник —',
          'Ваш приход для нас — самый лучший подарок.',
        ],
      ],
    },
    en: {
      title: 'A Pearl of a Word',
      stanzas: [
        [
          'We don’t need many words — just one will do:',
          '“I love you” — and the whole world shines anew;',
          'As simple as a pearl, yet worth far more,',
          'That word became our story’s open door.',
        ],
        [
          'Let life be simple, honest, warm and kind —',
          'A cup of tea, a glance, a peaceful mind;',
          'We ask for nothing grand — just come and stay,',
          'Your presence is our gift on this bright day.',
        ],
      ],
    },
  },

  'template-12': {
    uz: {
      title: 'Eski maktub',
      stanzas: [
        [
          'Bobolarimizdan qolgan qadim odat:',
          'To‘y — bu ikki oila, bir nasl, bir saodat.',
          'Eski maktublardagi samimiy so‘zlar',
          'Bugun yana jonlanar, porlaydi ko‘zlar.',
        ],
        [
          'Vaqt o‘tar, lekin sevgi eskirmas,',
          'Haqiqiy tuyg‘uni hech zang bosmas.',
          'Yillar o‘tib, sochlarga qor tushsa ham,',
          'Qo‘l ushlab yurishsin, ko‘rishmasin g‘am.',
        ],
        [
          'Siz ham shu go‘zal an’anaga qo‘shiling,',
          'Duolaringiz bilan to‘yni bezang, keling.',
          'Eski do‘stlar, yangi tanishlar — barchangiz',
          'To‘rimizdan joy oling, aziz mehmonimiz.',
        ],
      ],
    },
    ru: {
      title: 'Старое письмо',
      stanzas: [
        [
          'Старое письмо в шкатулке храню,',
          'В нём первые строки: «Тебя я люблю».',
          'Годы проходят, но чувство не стареет —',
          'Любовь настоящая с временем крепнет.',
        ],
        [
          'Пусть и седыми за руки идут,',
          'Друг друга, как прежде, с улыбкой зовут.',
          'Придите, друзья, как велит старина, —',
          'Ведь радость в кругу дорогих нам нужна.',
        ],
      ],
    },
    en: {
      title: 'An Old Love Letter',
      stanzas: [
        [
          'A letter lies hidden in grandmother’s chest,',
          'Its words of first love still the sweetest and best;',
          'The years have gone by, yet the feeling stays young —',
          'True love is a song that is never unsung.',
        ],
        [
          'May they still walk hand in hand, silver-haired,',
          'With all the same tenderness that they once shared;',
          'So come, as tradition has always decreed —',
          'With friends and with family, our joy is complete.',
        ],
      ],
    },
  },

  'template-13': {
    uz: {
      title: 'Atirgul va oltin',
      stanzas: [
        [
          'Atirgul — sevgining eng nafis ramzi,',
          'Oltin — sadoqatning abadiy nazmi.',
          'Ikkisi qo‘shilsa — yarqirar uzuk,',
          'Barmoqda porlar ahdning nishoni buyuk.',
        ],
        [
          'Atirgulning tikoni bor — hayot ham shunday,',
          'Lekin gul hidi bor — umr ham bunday.',
          'Qiyinchilikda ham bir-biriga suyanib,',
          'Baxt yo‘lida yurishsin, mehrga to‘yinib.',
        ],
        [
          'Kelinglar, azizlar, shu nafis oqshomga,',
          'Atirgul ochilgan bu go‘zal shomga.',
          'Sizning tilaklaringiz — oltindan ham qimmat,',
          'Tashrifingiz bilan bizga bering izzat.',
        ],
      ],
    },
    ru: {
      title: 'Роза и золото',
      stanzas: [
        [
          'Роза — символ нежной любви,',
          'Золото — верность на долгие дни.',
          'Вместе — кольцо, что сияет огнём',
          'И клятву хранит на пальце твоём.',
        ],
        [
          'Есть и шипы у прекрасной розы,',
          'Но вместе пройдут и ветра, и грозы.',
          'Ждём вас, родные, на вечер наш нежный —',
          'Ваш тёплый привет — дар наш самый бесценный.',
        ],
      ],
    },
    en: {
      title: 'Rose and Gold',
      stanzas: [
        [
          'A rose is the symbol of love’s tender art,',
          'And gold is the promise that’s kept by the heart;',
          'Together they shine in a ring on her hand —',
          'A vow made of beauty that ever will stand.',
        ],
        [
          'Each rose has its thorns, as each life has its storms,',
          'But love keeps them sheltered and tender and warm;',
          'So come to our evening of roses and light —',
          'Your wishes are golden, and so is this night.',
        ],
      ],
    },
  },

  'template-14': {
    uz: {
      title: 'Bahor bog‘i',
      stanzas: [
        [
          'Bahor keldi, bog‘lar uyg‘ondi,',
          'Shoxlar oq-pushti gulga burkandi.',
          'Shunday bir kun ikki yosh yurak',
          'Bir-biriga bo‘ldi eng aziz tilak.',
        ],
        [
          'Bugun birga ekdik bir yosh nihol,',
          'Uni mehr bilan o‘stiramiz, xushhol.',
          'Yillar o‘tib, bersin u soya, meva,',
          'Shodlikka to‘lsin har oqshom va kecha.',
        ],
        [
          'Bahor bayramiga sizni chorlaymiz,',
          'Gullar orasida kutib olamiz.',
          'Kelsangiz, bog‘imiz yanada ko‘rkam,',
          'Siz bilan baxtimiz bo‘lar mukammal.',
        ],
      ],
    },
    ru: {
      title: 'Весенний сад',
      stanzas: [
        [
          'Весна пришла, проснулся сад,',
          'Цветут деревья — белый наряд.',
          'В такой же день два юных сердца',
          'Нашли друг друга — открылась дверца.',
        ],
        [
          'Сегодня мы саженец вместе сажаем,',
          'Любовью его каждый день поливаем.',
          'Придите в наш сад, где цветёт весна, —',
          'С вами наша радость будет полна.',
        ],
      ],
    },
    en: {
      title: 'The Spring Garden',
      stanzas: [
        [
          'The spring has arrived and the garden’s awake,',
          'The branches in blossom, white petals that shake;',
          'On just such a day two young hearts came to find',
          'That each was the other’s sweet peace of mind.',
        ],
        [
          'Today we have planted a sapling as one,',
          'We’ll water with kindness, we’ll warm it with sun;',
          'So come to our garden where springtime is new —',
          'Our joy will be fuller in sharing with you.',
        ],
      ],
    },
  },

  'template-15': {
    uz: {
      title: 'Samoviy tush',
      stanzas: [
        [
          'Bir kecha tushimda ko‘rgandim seni,',
          'Oy nuri yoritgan edi yo‘limni.',
          'Uyg‘onib, shu tushni izladim uzoq —',
          'Bugun u ro‘yo emas, haqiqat, porloq.',
        ],
        [
          'Samolar guvoh, yulduzlar shohid,',
          'Bu ahd mangu, bu ahd sobit.',
          'Somon yo‘lidek uzun bo‘lsin umr,',
          'Har kuni bo‘lsin mehrga to‘la nur.',
        ],
        [
          'Keling, shu orzular kechasiga keling,',
          'Osmon ostida quvonchni bo‘lishing.',
          'Sizning tashrifingiz — tushdagi mo‘jiza,',
          'Kutamiz sizni eng go‘zal kunimizda.',
        ],
      ],
    },
    ru: {
      title: 'Небесный сон',
      stanzas: [
        [
          'Однажды во сне я увидел тебя,',
          'Луна освещала дорогу, любя.',
          'Проснувшись, искал этот сон наяву —',
          'И вот я тебя своей жизнью зову.',
        ],
        [
          'Свидетели — небо и звёзды над нами,',
          'Наш путь, словно Млечный, усыпан огнями.',
          'Придите, родные, на праздник мечты —',
          'Без вас не сияют здесь даже цветы.',
        ],
      ],
    },
    en: {
      title: 'A Celestial Dream',
      stanzas: [
        [
          'One night in a dream I saw you in my sleep,',
          'The moonlight was shining, the silence was deep;',
          'I woke and I searched for that dream far and wide —',
          'And now it is real, and you stand at my side.',
        ],
        [
          'The heavens bear witness, the stars hold our vow,',
          'As long as the Milky Way, love begins now;',
          'So come to our night where the dreams all come true —',
          'The sky would be dimmer if not shared with you.',
        ],
      ],
    },
  },

  'template-16': {
    uz: {
      title: 'Quyoshli ostona',
      stanzas: [
        [
          'Quyosh nuri tushdi uy ostonasiga,',
          'Iliqlik ko‘chdi ikki qalb xonasiga.',
          'Loy devorlar, gulli hovli, tok soyasi —',
          'Shu yerda boshlanar oila qissasi.',
        ],
        [
          'Non va tuz bilan kutamiz mehmonni,',
          'Mehr bilan to‘ldiramiz har bir xonani.',
          'Bu uyda bo‘lsin kulgu, bolalar ovozi,',
          'Qut-baraka bo‘lsin dasturxon bezagi.',
        ],
        [
          'Keling, quyoshli hovlimizga marhamat,',
          'Siz bilan bayram — eng katta ne’mat.',
          'Tok ostida o‘tiraylik, suhbat quraylik,',
          'Shodlik va baxtni birga baham ko‘raylik.',
        ],
      ],
    },
    ru: {
      title: 'Солнечный порог',
      stanzas: [
        [
          'Солнце легло на порог у ворот,',
          'В сердце тепло, и надежда живёт.',
          'Глиняный двор, виноградная тень —',
          'Здесь начинается новый наш день.',
        ],
        [
          'Хлебом и солью встречаем гостей,',
          'Пусть будет смех и шаги детей.',
          'Ждём вас, родные, на солнечный двор,',
          'Чтоб вместе вести задушевный разговор.',
        ],
      ],
    },
    en: {
      title: 'A Sunlit Threshold',
      stanzas: [
        [
          'The sun lays its gold on the step of our door,',
          'And warmth fills two hearts as it never did before;',
          'A courtyard of clay and a vine’s gentle shade —',
          'Here, stone upon stone, our new home will be made.',
        ],
        [
          'With bread and with salt we will welcome each guest,',
          'May laughter and children make this house blessed;',
          'So come to our sunlit courtyard, sit near —',
          'The feast is not whole till our loved ones are here.',
        ],
      ],
    },
  },

  'template-17': {
    uz: {
      title: 'Oq gul',
      stanzas: [
        [
          'Oq gul ochildi tong shabbodasida,',
          'Shudring yaltirar uning yaprog‘ida.',
          'Kelin ham shunday — pok, nafis va go‘zal,',
          'Kuyov ko‘nglida u — eng aziz g‘azal.',
        ],
        [
          'Oq rang — poklik, oq rang — yangi sahifa,',
          'Unga yozilsin faqat mehr va vafo.',
          'Har bir satrida bo‘lsin shodlik va kulgu,',
          'Bu kitob bo‘lsin baxtga to‘la mangu.',
        ],
        [
          'Sizni chorlaymiz shu oq gul bayramiga,',
          'Qo‘shiling yangi hayotning ilk qadamiga.',
          'Sizning duolaringiz — gulga shudringdek,',
          'Kelsangiz, to‘yimiz ochilar chechakdek.',
        ],
      ],
    },
    ru: {
      title: 'Белый цветок',
      stanzas: [
        [
          'Белый цветок распустился с зарёй,',
          'Капли росы на нём блещут игрой.',
          'Так и невеста — чиста и нежна,',
          'Жениху на всю жизнь подарена она.',
        ],
        [
          'Белый — начало, страница пустая,',
          'Пусть её пишет любовь золотая.',
          'Ждём вас, родные, на праздник наш светлый —',
          'Ваши слова для нас — дар самый заветный.',
        ],
      ],
    },
    en: {
      title: 'The Ivory Blossom',
      stanzas: [
        [
          'An ivory blossom has opened at dawn,',
          'With dewdrops that glisten on petals reborn;',
          'The bride is as gentle, as graceful and fair,',
          'The groom holds her hand with the tenderest care.',
        ],
        [
          'White is a page where a new life is penned —',
          'May love write each line, every word to the end;',
          'So come to our celebration of blossom and light —',
          'Your blessings, like dewdrops, will make it more bright.',
        ],
      ],
    },
  },

  'template-18': {
    uz: {
      title: 'La’l yurak',
      stanzas: [
        [
          'Qizil la’l — qalbning eng qaynoq rangi,',
          'Unda yashar sevgining bor ohangi.',
          'Shoh saroyida emas, ko‘ngil saroyida',
          'Toj kiydi muhabbat — baxt ziyosida.',
        ],
        [
          'Har bir yoqut — bir iliq xotira,',
          'Ular terilsin umr marjoniga.',
          'Sadoqat — oltin, sabr — gavhar dona,',
          'Shu xazina bilan boy bo‘lsin oila.',
        ],
        [
          'Kelinglar, azizlar, shu shohona to‘yga,',
          'Qadamingiz qutlug‘, kiring bu uyga.',
          'Sizning tashrifingiz — eng yorqin gavhar,',
          'Bayramimiz siz bilan bo‘lar muattar.',
        ],
      ],
    },
    ru: {
      title: 'Рубиновое сердце',
      stanzas: [
        [
          'Рубин — это сердца горячий цвет,',
          'В нём песня любви на тысячу лет.',
          'Не трон и не замок — а сердце одно',
          'Любовь коронует, и в нём всё дано.',
        ],
        [
          'Верность — как золото, терпенье — алмаз,',
          'Пусть это богатство хранится у вас.',
          'Ждём вас, родные, на царственный пир —',
          'Без вас не сияет наш праздничный мир.',
        ],
      ],
    },
    en: {
      title: 'The Ruby Heart',
      stanzas: [
        [
          'A ruby is red as the warmth of the heart,',
          'It holds every song love has sung from the start;',
          'Not crowned in a palace, but crowned deep inside —',
          'Our love wears the crown, with a groom and a bride.',
        ],
        [
          'Let faithfulness glitter like gold through the years,',
          'Let patience be diamonds that shine through the tears;',
          'So come to our royal and radiant night —',
          'Your presence, dear guest, is our jewel of light.',
        ],
      ],
    },
  },

  'template-19': {
    uz: {
      title: 'Tun va nur',
      stanzas: [
        [
          'Shahar uxlar, chiroqlar yonar,',
          'Tun bag‘rida ikki yurak uyg‘onar.',
          'Qora libos, oq ko‘ylak, oltin uzuk —',
          'Zamonaviy ertak, sodda va buyuk.',
        ],
        [
          'Tun qanchalik qorong‘u bo‘lmasin,',
          'Sevgi nuri sira so‘nmasin.',
          'Bir-biriga mayoq bo‘lib yonsin,',
          'Ikki qalb doim bir-biriga suyansin.',
        ],
        [
          'Keling, shu nafis oqshomga hamroh bo‘ling,',
          'Musiqa, nur va quvonchga to‘ling.',
          'Sizning tashrifingiz — tunning eng yorqin chirog‘i,',
          'Kutamiz, aziz, bayramning eng go‘zal bezagi.',
        ],
      ],
    },
    ru: {
      title: 'Ночь и свет',
      stanzas: [
        [
          'Город уснул, но огни зажжены,',
          'Два сердца не спят в объятьях весны.',
          'Чёрный костюм, белоснежный наряд,',
          'Кольца из золота ярко горят.',
        ],
        [
          'Пусть ночь будет тёмной — любовь не угаснет,',
          'И каждый их день будет светлым и ясным.',
          'Ждём вас на вечер огней и мелодий,',
          'Где счастье и свет в каждом новом аккорде.',
        ],
      ],
    },
    en: {
      title: 'Night and Light',
      stanzas: [
        [
          'The city’s asleep, but the lights still glow on,',
          'Two hearts are awake in the quiet till dawn;',
          'A black tie, a gown, and two rings made of gold —',
          'A modern fairytale, simple and bold.',
        ],
        [
          'However the night may grow darker and deep,',
          'The light of their love is a promise they keep;',
          'So come to our evening of music and light —',
          'You’re the brightest of stars on this elegant night.',
        ],
      ],
    },
  },

  'template-20': {
    uz: {
      title: 'Kapalak qanoti',
      stanzas: [
        [
          'Bahor bog‘ida bir kapalak uchdi,',
          'Gulga qo‘ndi-yu, bir sirni ochdi:',
          '«Sevgi — bu yengil, nozik qanot,',
          'Uni asrasang — umr bo‘lar obod».',
        ],
        [
          'Ikki kapalak birga uchar osmonga,',
          'Quvonch ulashar butun bir bo‘stonga.',
          'Shamol ham, yomg‘ir ham to‘xtatolmas ularni,',
          'Chunki sevgi yengar barcha qiyinchiliklarni.',
        ],
        [
          'Siz ham keling, bog‘imizga qo‘ning,',
          'Kapalakdek shodon, quvonchga to‘ling.',
          'Sizning tabassumingiz — gulga quyosh nuri,',
          'Kelsangiz, bayramimiz bo‘lar yanada nurli.',
        ],
      ],
    },
    ru: {
      title: 'Крылья бабочки',
      stanzas: [
        [
          'В весеннем саду пролетала бабочка,',
          'Села на цветок и шепнула загадочно:',
          '«Любовь — это крылья, лёгкие, тонкие,',
          'Береги их — и будут дни звонкие».',
        ],
        [
          'Две бабочки вместе летят в небеса,',
          'Им не страшны ни ветра, ни гроза.',
          'Прилетайте и вы в наш цветущий сад —',
          'Каждому гостю мы искренне рады.',
        ],
      ],
    },
    en: {
      title: 'The Butterfly’s Wings',
      stanzas: [
        [
          'A butterfly flew through the garden in spring',
          'And landed on blossoms to whisper one thing:',
          '“Love is a wing that is gentle and light —',
          'Protect it, and life will be ever so bright.”',
        ],
        [
          'Two butterflies now in the blue sky take flight,',
          'No wind and no rain can disturb their delight;',
          'So flutter to us in our garden in bloom —',
          'Your smile is the sunshine that brightens the room.',
        ],
      ],
    },
  },
};

export function getWeddingPoem(templateSlug: string | undefined, language: Language): PoemText | null {
  const slug = String(templateSlug || '').toLowerCase();
  const poem = WEDDING_POEMS[slug];
  if (!poem) return null;
  return poem[language] || poem.uz;
}
