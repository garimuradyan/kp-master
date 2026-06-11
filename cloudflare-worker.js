const SITE_URL = 'https://kpmaster.online';

const TARIFFS = [
  {
    id: '1m',
    name: '1 месяц',
    days: 30,
    amount: 1490,
    oldAmount: null,
    discount: null,
    economy: null,
  },
  {
    id: '3m',
    name: '3 месяца',
    days: 90,
    amount: 3990,
    oldAmount: 4470,
    discount: 11,
    economy: 480,
  },
  {
    id: '12m',
    name: '12 месяцев',
    days: 365,
    amount: 9990,
    oldAmount: 17880,
    discount: 44,
    economy: 7890,
  },
];

const CARDS = `💳 <b>Реквизиты для оплаты:</b>

🏦 <b>OZON Банк</b>
<code>2204321196608087</code>

🏦 <b>Т-Банк</b>
<code>2200702094541021</code>

После перевода отправьте скриншот оплаты сюда — @garimuradyan`;

async function sbRequest(env, method, table, filters, body) {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}${filters ? '?' + filters : ''}`;
  const res = await fetch(url, {
    method: method || 'GET',
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function sbSelect(env, table, filters) {
  return sbRequest(env, 'GET', table, filters);
}

async function sbInsert(env, table, data) {
  return sbRequest(env, 'POST', table, null, data);
}

function genDemoKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (n) => Array.from({length: n}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `DEMO-${part(4)}-${part(4)}`;
}

async function tg(env, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  return res.json();
}

async function send(env, chat_id, text, reply_markup) {
  return tg(env, 'sendMessage', {
    chat_id,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: reply_markup || undefined,
  });
}

function mainMenu() {
  return {
    inline_keyboard: [
      [{text: '💳 Тарифы и оплата', callback_data: 'tariffs'}],
      [{text: '🎁 Получить демо-доступ', callback_data: 'demo'}],
      [{text: '🔑 Мои ключи', callback_data: 'mykeys'}],
      [{text: '🌐 Открыть приложение', url: SITE_URL}],
      [{text: '💬 Консультация', callback_data: 'consult'}],
    ],
  };
}

function backBtn() {
  return {inline_keyboard: [[{text: '◀ Назад', callback_data: 'back'}]]};
}

function tariffsKeyboard() {
  return {
    inline_keyboard: [
      [{text: '🌐 Открыть приложение', url: SITE_URL}],
      [{text: '✉️ Отправить скриншот / написать', url: 'https://t.me/garimuradyan'}],
      [{text: '◀ Назад', callback_data: 'back'}],
    ],
  };
}

function formatRub(n) {
  return Number(n || 0).toLocaleString('ru-RU') + ' ₽';
}

function tariffsText() {
  let text = '💳 <b>Тарифы КП Мастер</b>\n\n';
  for (const t of TARIFFS) {
    if (t.oldAmount) {
      text += `🗓 <b>${t.name}</b> — <b>${formatRub(t.amount)}</b>  <s>${formatRub(t.oldAmount)}</s>  <b>-${t.discount}%</b>\n`;
      text += `   Экономия ${formatRub(t.economy)}\n`;
    } else {
      text += `🗓 <b>${t.name}</b> — <b>${formatRub(t.amount)}</b>\n`;
    }
  }
  text += `\n<b>Что входит в доступ:</b>\n`;
  text += `✅ коммерческие предложения\n`;
  text += `✅ договор на монтаж и акт выполненных работ\n`;
  text += `✅ график выездов и календарь монтажей\n`;
  text += `✅ свой прайс услуг и оборудования\n`;
  text += `✅ подпись мастера и история КП\n\n`;
  text += `<b>Как оплатить:</b>\n`;
  text += `1️⃣ Выберите тариф\n`;
  text += `2️⃣ Переведите сумму по реквизитам ниже\n`;
  text += `3️⃣ Отправьте скриншот оплаты @garimuradyan\n`;
  text += `4️⃣ Получите ключ доступа в течение нескольких минут\n\n`;
  text += CARDS;
  return text;
}

function welcomeText() {
  return '👋 Добро пожаловать в <b>КП Мастер</b>!\n\n' +
    'Сервис для монтажников кондиционеров: коммерческие предложения, договоры, акты и график выездов в одном рабочем кабинете.\n\n' +
    '✏️ КП за несколько минут\n' +
    '🧾 Договор и акт в один клик\n' +
    '📅 График осмотров, монтажей, ТО и ремонтов\n' +
    '📋 Свой прайс услуг и оборудования\n' +
    '✍️ Подпись мастера и история КП\n\n' +
    'Выберите действие:';
}

async function handleMessage(env, msg) {
  const chat_id = msg.chat.id;
  const text = msg.text || '';

  if (text.startsWith('/start')) {
    await send(env, chat_id, welcomeText(), mainMenu());
  } else if (text === '/tariffs') {
    await send(env, chat_id, tariffsText(), tariffsKeyboard());
  } else if (text === '/mykeys') {
    await handleMyKeys(env, chat_id);
  } else if (text === '/help') {
    await handleConsult(env, chat_id);
  } else {
    await send(env, chat_id,
      'Используйте кнопки меню или команды:\n/start — главное меню',
      mainMenu()
    );
  }
}

async function handleMyKeys(env, chat_id) {
  const licenseRows = await sbSelect(env, 'license_keys',
    `telegram_id=eq.${chat_id}&order=created_at.desc&limit=10`
  );
  const demoRows = await sbSelect(env, 'access_keys',
    `master_name=like.*TG%3A${chat_id}*&order=created_at.desc&limit=5`
  );

  const hasLicense = licenseRows && Array.isArray(licenseRows) && licenseRows.length > 0;
  const hasDemo = demoRows && Array.isArray(demoRows) && demoRows.length > 0;

  if (hasLicense || hasDemo) {
    let text = '🔑 <b>Ваши ключи:</b>\n\n';

    if (hasLicense) {
      for (const k of licenseRows) {
        const expires = k.expires_at ? k.expires_at.slice(0, 10) : '—';
        const active = k.is_active ? '✅' : '❌';
        text += `${active} <code>${k.key}</code>\n`;
        text += `📦 ${k.tariff_name || k.tariff || '—'} · до <b>${expires}</b>\n\n`;
      }
    }

    if (hasDemo) {
      for (const k of demoRows) {
        const active = k.is_active ? '🎁' : '⏰';
        const status = k.is_active ? 'Активен' : 'Истёк';
        const expires = k.expires_at ? k.expires_at.slice(0, 10) : '—';
        text += `${active} <code>${k.key}</code>\n`;
        text += `Демо-доступ · ${status} · до <b>${expires}</b>\n\n`;
      }
    }

    await send(env, chat_id, text, {
      inline_keyboard: [
        [{text: '🌐 Открыть приложение', url: SITE_URL}],
        [{text: '◀ Назад', callback_data: 'back'}],
      ],
    });
  } else {
    await send(env, chat_id,
      '🔑 У вас нет ключей.\n\nПолучите демо-доступ или выберите тариф:',
      {
        inline_keyboard: [
          [{text: '🎁 Получить демо', callback_data: 'demo'}],
          [{text: '💳 Тарифы', callback_data: 'tariffs'}],
          [{text: '◀ Назад', callback_data: 'back'}],
        ],
      }
    );
  }
}

async function handleConsult(env, chat_id) {
  await send(env, chat_id,
    '💬 <b>Консультация</b>\n\n' +
    'Поможем с доступом, оплатой и вопросами по работе сервиса.\n\n' +
    'Писать сюда: @garimuradyan',
    {
      inline_keyboard: [
        [{text: '✉️ Написать @garimuradyan', url: 'https://t.me/garimuradyan'}],
        [{text: '◀ Назад', callback_data: 'back'}],
      ],
    }
  );
}

async function handleDemo(env, chat_id) {
  const existing = await sbSelect(env, 'access_keys',
    `master_name=eq.${encodeURIComponent('Тестовый доступ (TG:' + chat_id + ')')}`
  );

  if (existing && Array.isArray(existing) && existing.length > 0) {
    await send(env, chat_id,
      '❌ <b>Демо-доступ уже использован</b>\n\nВы уже получали демо-доступ. Каждый аккаунт может получить демо только один раз.\n\nДля полного доступа выберите тариф:',
      {
        inline_keyboard: [
          [{text: '💳 Тарифы', callback_data: 'tariffs'}],
          [{text: '✉️ Написать @garimuradyan', url: 'https://t.me/garimuradyan'}],
          [{text: '◀ Назад', callback_data: 'back'}],
        ],
      }
    );
    return;
  }

  await send(env, chat_id,
    '🎁 <b>Демо-доступ к КП Мастер</b>\n\n' +
    'Демо позволит посмотреть, как работает сервис: КП, документы, прайс и график выездов.\n\n' +
    '⚠️ <b>Важно:</b>\n' +
    '⏱ Доступ действует <b>1 день</b>\n' +
    '🔒 Ключ привязывается к первому браузеру на конкретном устройстве\n' +
    '👤 Демо выдаётся <b>один раз</b> на этот аккаунт Telegram\n' +
    '❌ После истечения срока доступ закрывается автоматически\n\n' +
    'Готовы получить демо-доступ?',
    {
      inline_keyboard: [
        [{text: '✅ Да, получить демо', callback_data: 'demo_confirm'}],
        [{text: '◀ Назад', callback_data: 'back'}],
      ],
    }
  );
}

async function handleDemoConfirm(env, chat_id) {
  const existing = await sbSelect(env, 'access_keys',
    `master_name=eq.${encodeURIComponent('Тестовый доступ (TG:' + chat_id + ')')}`
  );

  if (existing && Array.isArray(existing) && existing.length > 0) {
    await send(env, chat_id,
      '❌ Вы уже получали демо-доступ. Для полного доступа выберите тариф.',
      {
        inline_keyboard: [
          [{text: '💳 Тарифы', callback_data: 'tariffs'}],
          [{text: '◀ Назад', callback_data: 'back'}],
        ],
      }
    );
    return;
  }

  const key = genDemoKey();
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const insertResult = await sbInsert(env, 'access_keys', {
    key,
    master_name: `Тестовый доступ (TG:${chat_id})`,
    is_active: true,
    is_admin: false,
    days_left: 0,
    expires_at: expires.toISOString(),
  });

  if (!insertResult || (Array.isArray(insertResult) && insertResult.length === 0) || insertResult.error) {
    await send(env, chat_id, `❌ Ошибка создания демо: ${JSON.stringify(insertResult)}`);
    return;
  }

  await send(env, chat_id,
    `🎁 <b>Ваш демо-ключ:</b>\n\n` +
    `<code>${key}</code>\n\n` +
    `⏱ Действует <b>1 день</b>\n` +
    `🔒 Привязывается к первому браузеру на конкретном устройстве\n\n` +
    `Перейдите на сайт и введите ключ:\n${SITE_URL}\n\n` +
    `⚠️ После входа у вас 1 день для знакомства с сервисом.`,
    {
      inline_keyboard: [
        [{text: '🌐 Открыть приложение', url: SITE_URL}],
        [{text: '💳 Выбрать тариф', callback_data: 'tariffs'}],
        [{text: '◀ Назад', callback_data: 'back'}],
      ],
    }
  );
}

async function handleCallback(env, cb) {
  const chat_id = cb.message.chat.id;
  const data = cb.data;

  if (data === 'tariffs') {
    await send(env, chat_id, tariffsText(), tariffsKeyboard());
  } else if (data === 'demo') {
    await handleDemo(env, chat_id);
  } else if (data === 'demo_confirm') {
    await handleDemoConfirm(env, chat_id);
  } else if (data === 'mykeys') {
    await handleMyKeys(env, chat_id);
  } else if (data === 'consult') {
    await handleConsult(env, chat_id);
  } else if (data === 'back') {
    await send(env, chat_id, welcomeText(), mainMenu());
  }

  await tg(env, 'answerCallbackQuery', {callback_query_id: cb.id});
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      await tg(env, 'setMyCommands', {
        commands: [
          {command: 'start', description: '🏠 Главное меню'},
          {command: 'tariffs', description: '💳 Тарифы и оплата'},
          {command: 'mykeys', description: '🔑 Мои ключи'},
          {command: 'help', description: '💬 Консультация'},
        ],
      });
      return new Response('KP Master Bot is running ✓', {status: 200});
    }
    try {
      const update = await request.json();
      if (update.message) {
        await handleMessage(env, update.message);
      } else if (update.callback_query) {
        await handleCallback(env, update.callback_query);
      }
    } catch (e) {
      console.error('Error:', e);
    }
    return new Response('ok', {status: 200});
  },
};
