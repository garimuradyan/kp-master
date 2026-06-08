const SITE_URL = 'https://kpmaster.online';

const TARIFFS = [
  {
    id: '1m',
    name: '1 месяц',
    days: 30,
    amount: 1490,
    oldAmount: null,
    discount: null,
  },
  {
    id: '3m',
    name: '3 месяца',
    days: 90,
    amount: 3990,
    oldAmount: 4470,
    discount: 11,
  },
  {
    id: '12m',
    name: '12 месяцев',
    days: 365,
    amount: 10990,
    oldAmount: 17880,
    discount: 39,
  },
];

const CARDS = `💳 Реквизиты для оплаты:

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
    reply_markup: reply_markup || undefined,
  });
}

function mainMenu() {
  return {
    inline_keyboard: [
      [{text: '💳 Тарифы и оплата', callback_data: 'tariffs'}],
      [{text: '🎁 Получить демо-доступ', callback_data: 'demo'}],
      [{text: '🔑 Мои ключи', callback_data: 'mykeys'}],
      [{text: '💬 Консультация', callback_data: 'consult'}],
    ],
  };
}

function backBtn() {
  return {inline_keyboard: [[{text: '◀ Назад', callback_data: 'back'}]]};
}

function tariffsText() {
  let text = '💳 <b>Тарифы КП Мастер</b>\n\n';
  for (const t of TARIFFS) {
    if (t.oldAmount) {
      text += `🗓 <b>${t.name}</b> — ${t.amount.toLocaleString('ru-RU')} ₽  <s>${t.oldAmount.toLocaleString('ru-RU')} ₽</s>  <b>-${t.discount}%</b>\n`;
    } else {
      text += `🗓 <b>${t.name}</b> — ${t.amount.toLocaleString('ru-RU')} ₽\n`;
    }
  }
  text += `\n<b>Как оплатить:</b>\n`;
  text += `1️⃣ Выберите тариф\n`;
  text += `2️⃣ Переведите сумму по реквизитам ниже\n`;
  text += `3️⃣ Отправьте скриншот оплаты @garimuradyan\n`;
  text += `4️⃣ Получите ключ доступа в течение нескольких минут\n\n`;
  text += CARDS;
  return text;
}

async function handleMessage(env, msg) {
  const chat_id = msg.chat.id;
  const text = msg.text || '';

  if (text.startsWith('/start')) {
    await send(env, chat_id,
      '👋 Добро пожаловать в <b>КП Мастер</b>!\n\n' +
      'Профессиональный сервис создания коммерческих предложений для монтажников кондиционеров.\n\n' +
      '✏️ Создавайте КП за 3 шага\n' +
      '📋 Храните историю до 15 КП\n' +
      '🖨 Экспортируйте в PDF\n' +
      '💰 Прайс-лист и скидки\n\n' +
      'Выберите действие:',
      mainMenu()
    );
  } else if (text === '/tariffs') {
    await send(env, chat_id, tariffsText(), {
      inline_keyboard: [
        [{text: '✉️ Написать @garimuradyan', url: 'https://t.me/garimuradyan'}],
        [{text: '◀ Назад', callback_data: 'back'}],
      ],
    });
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
  const rows = await sbSelect(env, 'access_keys',
    `device_id=not.is.null&is_active=eq.true&order=created_at.desc&limit=10`
  );
  // Filter by telegram_id if column exists, otherwise show all active keys for this user
  const licenseRows = await sbSelect(env, 'license_keys',
    `telegram_id=eq.${chat_id}&is_active=eq.true&order=created_at.desc&limit=5`
  );

  if (licenseRows && Array.isArray(licenseRows) && licenseRows.length > 0) {
    let text = '🔑 <b>Ваши активные ключи:</b>\n\n';
    for (const k of licenseRows) {
      const expires = k.expires_at ? k.expires_at.slice(0, 10) : '—';
      text += `<code>${k.key}</code>\n`;
      text += `📦 ${k.tariff_name || '—'} · до <b>${expires}</b>\n\n`;
    }
    await send(env, chat_id, text, backBtn());
  } else {
    await send(env, chat_id,
      '🔑 У вас нет активных ключей.\n\nПолучите демо-доступ или выберите тариф:',
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
    '💬 <b>Консультация</b>\n\nПо любым вопросам обращайтесь:\n@garimuradyan\n\nОтветим в течение нескольких часов.',
    {
      inline_keyboard: [
        [{text: '✉️ Написать @garimuradyan', url: 'https://t.me/garimuradyan'}],
        [{text: '◀ Назад', callback_data: 'back'}],
      ],
    }
  );
}

async function handleDemo(env, chat_id) {
  // Check if already used demo
  const existing = await sbSelect(env, 'access_keys',
    `key=like.DEMO-*&master_name=eq.Тестовый доступ (TG:${chat_id})`
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

  // Show warning before issuing demo
  await send(env, chat_id,
    '🎁 <b>Демо-доступ к КП Мастер</b>\n\n' +
    '⚠️ <b>Важно прочитать перед получением:</b>\n\n' +
    '⏱ Доступ действует ровно <b>30 минут</b> с момента первого входа\n' +
    '🔒 Ключ привязывается к первому устройству — на другом браузере или телефоне не откроется\n' +
    '👤 Демо выдаётся <b>один раз</b> на этот аккаунт Telegram\n' +
    '❌ После истечения 30 минут доступ закрывается автоматически\n\n' +
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
  // Double check
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
  const expires = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

  await sbInsert(env, 'access_keys', {
    key: key,
    master_name: `Тестовый доступ (TG:${chat_id})`,
    is_active: true,
    is_admin: false,
    days_left: 0,
    expires_at: expires.toISOString(),
  });

  await send(env, chat_id,
    `🎁 <b>Ваш демо-ключ:</b>\n\n` +
    `<code>${key}</code>\n\n` +
    `⏱ Действует <b>30 минут</b> с момента первого входа\n` +
    `🔒 Привязывается к первому устройству\n\n` +
    `Перейдите на сайт и введите ключ:\n${SITE_URL}\n\n` +
    `⚠️ После входа таймер запущен — у вас 30 минут для знакомства с сервисом.`,
    {
      inline_keyboard: [
        [{text: '🌐 Открыть приложение', url: SITE_URL}],
        [{text: '💳 Выбрать тариф', callback_data: 'tariffs'}],
      ],
    }
  );
}

async function handleCallback(env, cb) {
  const chat_id = cb.message.chat.id;
  const data = cb.data;

  if (data === 'tariffs') {
    await send(env, chat_id, tariffsText(), {
      inline_keyboard: [
        [{text: '✉️ Написать @garimuradyan', url: 'https://t.me/garimuradyan'}],
        [{text: '◀ Назад', callback_data: 'back'}],
      ],
    });
  } else if (data === 'demo') {
    await handleDemo(env, chat_id);
  } else if (data === 'demo_confirm') {
    await handleDemoConfirm(env, chat_id);
  } else if (data === 'mykeys') {
    await handleMyKeys(env, chat_id);
  } else if (data === 'consult') {
    await handleConsult(env, chat_id);
  } else if (data === 'back') {
    await send(env, chat_id,
      '👋 <b>КП Мастер</b>\n\nВыберите действие:',
      mainMenu()
    );
  }

  await tg(env, 'answerCallbackQuery', {callback_query_id: cb.id});
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
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
