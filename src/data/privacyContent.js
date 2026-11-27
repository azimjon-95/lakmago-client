/*
 * MAXFIYLIK SIYOSATI — «Lokma Go» MChJ. Ilova (iOS, Android, Telegram Mini App, veb) va lokma.uz.
 * Asos: O'zbekiston Respublikasining «Shaxsga doir ma'lumotlar to'g'risida»gi Qonuni (O'RQ-547, 02.07.2019),
 * App Store / Google Play talablari. Matn ilovaning HAQIQIY ishlashiga mos (kod bilan tekshirilgan).
 * ⚠️ Nashr oldidan yurist ko'rib chiqishi tavsiya etiladi (rekvizitlar, saqlash muddatlari, server joylashuvi).
 * Blok turlari: { p } abzas · { ul: [] } ro'yxat. uzc — kirill (avtomatik), ru — qo'lda.
 */
const UZ = {
  ui: {
    title: 'Maxfiylik siyosati',
    subtitle: 'Ma‘lumotlaringiz sizniki. Qaysi ma‘lumot nega kerakligini ochiq tushuntiramiz.',
    effective: 'Amal qilish sanasi',
    version: 'Tahrir',
    operator: 'Operator',
    contents: 'Mundarija',
    summaryTitle: 'Qisqacha',
    rightsTitle: 'Sizning nazoratingiz',
    legalTitle: 'Operator rekvizitlari',
    stir: 'STIR', address: 'Manzil', email: 'E-pochta', site: 'Sayt',
    contact: 'Savolingiz bormi? Yordam chatiga yozing',
    contactBtn: 'Yordam chati',
    back: 'Orqaga',
    lastLine: 'Ushbu siyosat ilovadan foydalanishni davom ettirsangiz, o‘qilgan deb hisoblanadi. Rozilik talab qilinadigan joylarda (joylashuv, bildirishnoma) alohida rozilik so‘raymiz.',
  },
  summary: [
    ['Nimani olamiz', 'Faqat xizmat ishlashi uchun kerakligini: kim buyurtma berayotganini, qayerga yetkazishni va nima buyurtma qilinganini.'],
    ['Nega', 'Buyurtma va bronni bajarish, yetkazish, to‘lovni tekshirish, yordam ko‘rsatish va firibgarlikdan himoya.'],
    ['Kimga beramiz', 'Faqat buyurtmani bajarish uchun zarur tomonlarga: restoran/do‘kon, kuryer, to‘lov xizmati. Sotmaymiz.'],
    ['Karta', 'Karta raqami va CVV bizda saqlanmaydi — to‘lov xizmatining himoyalangan sahifasida kiritiladi.'],
  ],
  rights: [
    ['Ko‘rish va tuzatish', 'Profil bo‘limida ism, telefon va manzillaringizni o‘zingiz ko‘rasiz va tahrirlaysiz.'],
    ['O‘chirish', 'Yordam chatiga yozing — so‘rovingiz bo‘yicha shaxsiy ma‘lumotlaringiz o‘chiriladi.'],
    ['Rozilikni qaytarish', 'Taom takliflari — Profilda bir bosishda o‘chadi. Joylashuv — telefon sozlamalaridan.'],
    ['Savol va e‘tiroz', 'Yordam chatiga yozing — o‘qib, qonunda belgilangan muddatda javob beramiz.'],
  ],
  sections: [
    { id: 'operator', title: '1. Kim ma‘lumotlaringizni qayta ishlaydi', blocks: [
      { p: 'Ushbu siyosat «Lokma Go» mas‘uliyati cheklangan jamiyati («Lokma Go», «biz») tomonidan taqdim etiladigan Lokma Go va Lokma Market xizmatlariga — iOS va Android ilovalari, Telegram Mini App hamda lokma.uz veb-saytiga — tegishli.' },
      { p: 'Biz shaxsga doir ma‘lumotlar operatori (egasi) sifatida O‘zbekiston Respublikasining «Shaxsga doir ma‘lumotlar to‘g‘risida»gi Qonuni (O‘RQ-547) talablariga muvofiq ish yuritamiz.' },
    ] },
    { id: 'data', title: '2. Qanday ma‘lumotlar olinadi', blocks: [
      { ul: [
        '<b>Hisob:</b> Telegram orqali kirsangiz — Telegram identifikatori, ism, foydalanuvchi nomi, profil rasmi, til. Apple orqali kirsangiz — Apple bergan identifikator va (agar ruxsat bersangiz) ism. Telefon raqami — o‘zingiz kiritganda yoki buyurtma/bron uchun taqdim etganda.',
        '<b>Manzil va joylashuv:</b> kiritgan yetkazish manzillaringiz va izohlar. Qurilma joylashuvi (GPS) faqat siz tizim oynasida ruxsat berganingizda va faqat tumanni aniqlash yoki «Hozirgi joyimga yetkazish» uchun ishlatiladi. Bir martalik joylashuv saqlangan manzillaringizga o‘zi qo‘shilmaydi.',
        '<b>Buyurtma va bron:</b> taomlar/mahsulotlar, restoran yoki do‘kon, summa, yetkazish holati, to‘lov usuli va holati; bronda — sana, vaqt, mehmonlar soni, tanlangan taomlar va restoranga yozgan izohingiz.',
        '<b>To‘lov:</b> karta raqami, amal qilish muddati va CVV bizning serverlarimizda saqlanmaydi va bizga ko‘rinmaydi: ular to‘lov xizmatining (Click, Payme va boshqalar) sahifasida kiritiladi. Biz faqat to‘lov holati, summasi va xizmat bergan texnik identifikatorni olamiz.',
        '<b>Qurilma va ilova:</b> qurilmaning shaxsni aniqlamaydigan texnik identifikatori (xesh), platforma (iOS/Android/veb), ilova versiyasi, til, tuman. Bu xizmat ishlashi, yangilanishlar va xavfsizlik uchun kerak.',
        '<b>Bildirishnomalar:</b> rozilik bersangiz — qurilmaning push-tokeni (Apple yoki Google tomonidan beriladi) va bildirishnoma sozlamalaringiz.',
        '<b>Aloqa:</b> Yordam chatidagi xabarlaringiz.',
        '<b>Bonus va takliflar:</b> to‘plangan ballar, taklif havolasi orqali kelgan do‘stlar soni.',
      ] },
    ] },
    { id: 'purposes', title: '3. Nima uchun va qanday asosda foydalanamiz', blocks: [
      { ul: [
        '<b>Shartnomani bajarish:</b> buyurtma va bronni qabul qilish, restoranga/do‘konga yetkazish, yetkazib berish, to‘lovni tekshirish, holatni ko‘rsatish.',
        '<b>Sizning roziligingiz:</b> joylashuv, taom takliflari bildirishnomalari. Rozilikni istalgan vaqt qaytarib olish mumkin — bu xizmatdan foydalanishga to‘sqinlik qilmaydi.',
        '<b>Qonuniy majburiyat:</b> buxgalteriya va soliq hujjatlarini yuritish, vakolatli organlarning qonuniy so‘rovlariga javob.',
        '<b>Qonuniy manfaat:</b> firibgarlik va suiiste‘molning oldini olish, xizmat xavfsizligi, ishlashini yaxshilash.',
      ] },
      { p: 'Ma‘lumotlaringizni reklama maqsadida uchinchi shaxslarga sotmaymiz va ular bilan almashmaymiz.' },
    ] },
    { id: 'fraud', title: '4. Firibgarlikdan himoya (bron va buyurtma)', blocks: [
      { p: 'Restoranlar soxta bronlardan zarar ko‘rmasligi uchun bron yuborilganda mijozning ishonchlilik belgilari tekshiriladi: telefon raqami haqiqiyligi, sana va vaqt mantiqiyligi, takroriy va haddan ortiq bronlar, avvalgi bronlar va yetkazilgan buyurtmalar soni, Telegram foydalanuvchi nomi. Bu belgilar restoranga mijozni tanishda yordam sifatida ko‘rsatiladi.' },
      { p: 'Aniq soxta ma‘lumotlar yoki haddan ortiq urinishlar tizim tomonidan avtomatik rad etilishi mumkin. Agar noto‘g‘ri rad etilgan deb hisoblasangiz, Yordam chatiga yozing — holatni odam ko‘rib chiqadi.' },
    ] },
    { id: 'sharing', title: '5. Ma‘lumotlar kimlarga uzatiladi', blocks: [
      { ul: [
        '<b>Restoran yoki do‘kon:</b> buyurtmani bajarish uchun ismingiz, telefon, manzil, buyurtma tarkibi, izohlar.',
        '<b>Kuryer:</b> yetkazish uchun ism, telefon, manzil va buyurtma raqami.',
        '<b>To‘lov xizmatlari:</b> to‘lovni amalga oshirish uchun zarur ma‘lumotlar; ular o‘z maxfiylik qoidalariga ko‘ra ishlaydi.',
        '<b>Kirish va infratuzilma:</b> Telegram va Apple (kirish uchun), Apple va Google (push-bildirishnomalarni yetkazish uchun), xarita va manzilni aniqlash xizmatlari, hosting va texnik xizmat ko‘rsatuvchilar. Ularga faqat vazifasi uchun zarur minimal ma‘lumot beriladi.',
        '<b>Davlat organlari:</b> faqat qonunda belgilangan asosda va hajmda.',
      ] },
    ] },
    { id: 'transfer', title: '6. Ma‘lumotlarni chet elga uzatish', blocks: [
      { p: 'Telegram, Apple va Google kabi xizmatlar ma‘lumotlarni O‘zbekiston tashqarisida qayta ishlashi mumkin. Bunday uzatish faqat xizmat ishlashi uchun zarur hajmda va qonun talablariga muvofiq amalga oshiriladi.' },
    ] },
    { id: 'location', title: '7. Joylashuv', blocks: [
      { p: 'Joylashuv so‘rovi ilova ochilganda bloklovchi emas: rad etsangiz ham ilova to‘liq ishlaydi va manzilni qo‘lda kiritishingiz mumkin. Aniqlangan koordinata faqat tumanni belgilash yoki sizning buyurtmangizni yetkazish uchun ishlatiladi va avtomatik ravishda saqlangan manzilga yozilmaydi. Ruxsatni telefon sozlamalaridan istalgan payt o‘zgartirishingiz mumkin.' },
    ] },
    { id: 'push', title: '8. Bildirishnomalar', blocks: [
      { p: 'Buyurtma holati haqidagi xabarlar xizmat xabarlari hisoblanadi. Taom takliflari (reklama xarakteridagi bildirishnomalar) faqat ilovada aniq rozilik bersangiz yuboriladi — kuniga ko‘pi bilan 2 ta. Ularni Profil → «Taom takliflari» orqali yoki telefon sozlamalaridan istalgan payt o‘chirishingiz mumkin.' },
    ] },
    { id: 'retention', title: '9. Saqlash muddati va o‘chirish', blocks: [
      { p: 'Ma‘lumotlar maqsad uchun zarur muddat davomida saqlanadi. Akkauntni o‘chirishni so‘rasangiz (Yordam chatiga yozing), ismingiz, telefon raqamingiz, manzillaringiz va bonuslaringiz o‘chiriladi. Buyurtmalar tarixi hisob-kitob va qonuniy majburiyatlar uchun shaxsingizga bog‘lanmagan holda saqlanishi mumkin. Qonun talab qilgan muddat tugagach, ma‘lumotlar o‘chiriladi yoki shaxsni aniqlab bo‘lmaydigan shaklga keltiriladi.' },
    ] },
    { id: 'security', title: '10. Xavfsizlik', blocks: [
      { p: 'Ma‘lumotlar himoyalangan (HTTPS) ulanish orqali uzatiladi; tizimga kirish huquqi cheklangan; kirish tokenlari va maxfiy kalitlar jurnallarga yozilmaydi. Hech bir tizim mutlaq xavfsiz bo‘lmaydi, ammo biz zamonaviy texnik va tashkiliy choralarni ko‘ramiz va xavfsizlikni muntazam yaxshilab boramiz.' },
    ] },
    { id: 'rights', title: '11. Sizning huquqlaringiz', blocks: [
      { p: 'Qonunga muvofiq siz quyidagi huquqlarga egasiz:' },
      { ul: [
        'o‘z ma‘lumotlaringiz va ularning qanday qayta ishlanayotgani haqida bilib olish;',
        'noto‘g‘ri yoki eskirgan ma‘lumotlarni tuzatishni talab qilish;',
        'ma‘lumotlaringizni o‘chirishni yoki qayta ishlashni cheklashni so‘rash;',
        'rozilikni istalgan vaqt qaytarib olish;',
        'qayta ishlashga e‘tiroz bildirish;',
        'huquqlaringiz buzilgan deb hisoblasangiz, vakolatli davlat organiga yoki sudga murojaat qilish.',
      ] },
      { p: 'So‘rovingizni Yordam chati orqali yuboring. Shaxsingizni tasdiqlash uchun qo‘shimcha ma‘lumot so‘rashimiz mumkin.' },
    ] },
    { id: 'children', title: '12. Bolalar', blocks: [
      { p: 'Xizmat 18 yoshga to‘lmaganlar uchun mo‘ljallanmagan. Voyaga yetmaganlar ilovadan ota-ona yoki qonuniy vakil nazorati ostida foydalanishi kerak. Bola ma‘lumotlari bizga ruxsatsiz berilganini bilsangiz, Yordam chatiga yozing — ularni o‘chiramiz.' },
    ] },
    { id: 'changes', title: '13. Siyosatdagi o‘zgarishlar', blocks: [
      { p: 'Siyosat yangilansa, yangi tahriri shu sahifada e‘lon qilinadi va amal qilish sanasi o‘zgaradi. Muhim o‘zgarishlar haqida ilova orqali xabar beramiz.' },
    ] },
    { id: 'contact', title: '14. Aloqa', blocks: [
      { p: 'Maxfiylik bo‘yicha savol, so‘rov yoki shikoyat uchun ilovadagi Yordam chatiga yozing. Operator rekvizitlari quyida keltirilgan.' },
    ] },
  ],
};

const RU = {
  ui: {
    title: 'Политика конфиденциальности',
    subtitle: 'Ваши данные принадлежат вам. Открыто объясняем, какие данные и зачем нам нужны.',
    effective: 'Дата вступления в силу',
    version: 'Редакция',
    operator: 'Оператор',
    contents: 'Содержание',
    summaryTitle: 'Коротко',
    rightsTitle: 'Ваш контроль',
    legalTitle: 'Реквизиты оператора',
    stir: 'ИНН', address: 'Адрес', email: 'E-mail', site: 'Сайт',
    contact: 'Есть вопрос? Напишите в чат поддержки',
    contactBtn: 'Чат поддержки',
    back: 'Назад',
    lastLine: 'Продолжая пользоваться приложением, вы подтверждаете, что ознакомились с политикой. Там, где нужно согласие (геопозиция, уведомления), мы спрашиваем его отдельно.',
  },
  summary: [
    ['Что собираем', 'Только то, что нужно для работы сервиса: кто заказывает, куда доставить и что заказано.'],
    ['Зачем', 'Выполнение заказа и брони, доставка, проверка оплаты, поддержка и защита от мошенничества.'],
    ['Кому передаём', 'Только тем, кто нужен для выполнения заказа: ресторан/магазин, курьер, платёжный сервис. Не продаём.'],
    ['Карта', 'Номер карты и CVV у нас не хранятся — вводятся на защищённой странице платёжного сервиса.'],
  ],
  rights: [
    ['Просмотр и правка', 'В Профиле вы сами видите и меняете имя, телефон и адреса.'],
    ['Удаление', 'Напишите в чат поддержки — по вашему запросу персональные данные будут удалены.'],
    ['Отзыв согласия', 'Предложения блюд — отключаются в Профиле в один клик. Геопозиция — в настройках телефона.'],
    ['Вопросы и возражения', 'Напишите в чат поддержки — ответим в срок, установленный законом.'],
  ],
  sections: [
    { id: 'operator', title: '1. Кто обрабатывает ваши данные', blocks: [
      { p: 'Настоящая политика относится к сервисам Lokma Go и Lokma Market, предоставляемым обществом с ограниченной ответственностью «Lokma Go» («Lokma Go», «мы»): приложениям iOS и Android, Telegram Mini App и сайту lokma.uz.' },
      { p: 'Мы выступаем оператором персональных данных и действуем в соответствии с Законом Республики Узбекистан «О персональных данных» (ЗРУ-547).' },
    ] },
    { id: 'data', title: '2. Какие данные собираются', blocks: [
      { ul: [
        '<b>Аккаунт:</b> при входе через Telegram — идентификатор Telegram, имя, имя пользователя, фото профиля, язык. При входе через Apple — идентификатор от Apple и (с вашего разрешения) имя. Номер телефона — когда вы сами его указываете или предоставляете для заказа/брони.',
        '<b>Адрес и геопозиция:</b> указанные вами адреса доставки и примечания. Геопозиция устройства (GPS) используется только с вашего разрешения в системном окне и только для определения района или для «Доставить на моё текущее место». Разовая геопозиция не добавляется в сохранённые адреса автоматически.',
        '<b>Заказы и брони:</b> блюда/товары, ресторан или магазин, сумма, статус доставки, способ и статус оплаты; для брони — дата, время, число гостей, выбранные блюда и ваше примечание ресторану.',
        '<b>Оплата:</b> номер карты, срок действия и CVV на наших серверах не хранятся и нам не видны: они вводятся на странице платёжного сервиса (Click, Payme и др.). Мы получаем только статус и сумму платежа и технический идентификатор от сервиса.',
        '<b>Устройство и приложение:</b> неперсонифицирующий технический идентификатор устройства (хеш), платформа (iOS/Android/веб), версия приложения, язык, район. Это нужно для работы сервиса, обновлений и безопасности.',
        '<b>Уведомления:</b> при вашем согласии — push-токен устройства (выдаётся Apple или Google) и настройки уведомлений.',
        '<b>Обращения:</b> сообщения в чате поддержки.',
        '<b>Бонусы и приглашения:</b> накопленные баллы, число друзей, пришедших по вашей ссылке.',
      ] },
    ] },
    { id: 'purposes', title: '3. Зачем и на каком основании мы используем данные', blocks: [
      { ul: [
        '<b>Исполнение договора:</b> приём заказа и брони, передача ресторану/магазину, доставка, проверка оплаты, отображение статуса.',
        '<b>Ваше согласие:</b> геопозиция, уведомления с предложениями блюд. Согласие можно отозвать в любой момент — это не мешает пользоваться сервисом.',
        '<b>Требование закона:</b> ведение бухгалтерских и налоговых документов, ответы на законные запросы уполномоченных органов.',
        '<b>Законный интерес:</b> предотвращение мошенничества и злоупотреблений, безопасность и улучшение работы сервиса.',
      ] },
      { p: 'Мы не продаём ваши данные и не передаём их третьим лицам в рекламных целях.' },
    ] },
    { id: 'fraud', title: '4. Защита от мошенничества (брони и заказы)', blocks: [
      { p: 'Чтобы рестораны не страдали от ложных броней, при отправке брони проверяются признаки надёжности клиента: достоверность телефона, логичность даты и времени, повторные и чрезмерные брони, число прошлых броней и доставленных заказов, имя пользователя Telegram. Эти признаки показываются ресторану, чтобы помочь ему понять, кто пришёл.' },
      { p: 'Явно ложные данные или чрезмерное число попыток могут быть автоматически отклонены системой. Если считаете, что отказ ошибочен, напишите в чат поддержки — ситуацию рассмотрит человек.' },
    ] },
    { id: 'sharing', title: '5. Кому передаются данные', blocks: [
      { ul: [
        '<b>Ресторан или магазин:</b> для выполнения заказа — имя, телефон, адрес, состав заказа, примечания.',
        '<b>Курьер:</b> для доставки — имя, телефон, адрес и номер заказа.',
        '<b>Платёжные сервисы:</b> данные, необходимые для оплаты; они работают по собственным правилам конфиденциальности.',
        '<b>Вход и инфраструктура:</b> Telegram и Apple (для входа), Apple и Google (для доставки push-уведомлений), сервисы карт и определения адреса, хостинг и технические подрядчики. Им передаётся только минимум, необходимый для их задачи.',
        '<b>Государственные органы:</b> только на основании и в объёме, установленных законом.',
      ] },
    ] },
    { id: 'transfer', title: '6. Передача данных за рубеж', blocks: [
      { p: 'Такие сервисы, как Telegram, Apple и Google, могут обрабатывать данные за пределами Узбекистана. Такая передача осуществляется только в объёме, необходимом для работы сервиса, и в соответствии с требованиями закона.' },
    ] },
    { id: 'location', title: '7. Геопозиция', blocks: [
      { p: 'Запрос геопозиции при запуске не блокирует приложение: если вы откажетесь, оно будет работать полностью, а адрес можно ввести вручную. Определённые координаты используются только для выбора района или доставки вашего заказа и автоматически не записываются в сохранённый адрес. Разрешение можно изменить в настройках телефона в любой момент.' },
    ] },
    { id: 'push', title: '8. Уведомления', blocks: [
      { p: 'Сообщения о статусе заказа — служебные. Предложения блюд (рекламные уведомления) отправляются только при вашем явном согласии в приложении — не более 2 в день. Их можно отключить в любой момент: Профиль → «Предложения блюд» или настройки телефона.' },
    ] },
    { id: 'retention', title: '9. Сроки хранения и удаление', blocks: [
      { p: 'Данные хранятся столько, сколько нужно для цели обработки. Если вы запросите удаление аккаунта (напишите в чат поддержки), ваши имя, телефон, адреса и бонусы будут удалены. История заказов может храниться без привязки к вам для расчётов и исполнения требований закона. По истечении срока, установленного законом, данные удаляются или обезличиваются.' },
    ] },
    { id: 'security', title: '10. Безопасность', blocks: [
      { p: 'Данные передаются по защищённому соединению (HTTPS); доступ к системе ограничен; токены входа и секретные ключи не записываются в журналы. Абсолютно безопасных систем не существует, но мы применяем современные технические и организационные меры и постоянно совершенствуем защиту.' },
    ] },
    { id: 'rights', title: '11. Ваши права', blocks: [
      { p: 'В соответствии с законом вы вправе:' },
      { ul: [
        'узнать, какие ваши данные и как обрабатываются;',
        'требовать исправления неточных или устаревших данных;',
        'просить удалить данные или ограничить их обработку;',
        'отозвать согласие в любой момент;',
        'возразить против обработки;',
        'если считаете, что ваши права нарушены, обратиться в уполномоченный государственный орган или суд.',
      ] },
      { p: 'Отправьте запрос через чат поддержки. Для подтверждения личности мы можем запросить дополнительные сведения.' },
    ] },
    { id: 'children', title: '12. Дети', blocks: [
      { p: 'Сервис не предназначен для лиц младше 18 лет. Несовершеннолетние могут пользоваться приложением под присмотром родителя или законного представителя. Если вам известно, что данные ребёнка переданы нам без разрешения, напишите в чат поддержки — мы их удалим.' },
    ] },
    { id: 'changes', title: '13. Изменения политики', blocks: [
      { p: 'При обновлении политики новая редакция публикуется на этой странице, а дата вступления в силу меняется. О существенных изменениях сообщим через приложение.' },
    ] },
    { id: 'contact', title: '14. Контакты', blocks: [
      { p: 'По вопросам конфиденциальности, запросам и жалобам напишите в чат поддержки в приложении. Реквизиты оператора приведены ниже.' },
    ] },
  ],
};

export const PRIVACY_RAW = { uz: UZ, ru: RU };
