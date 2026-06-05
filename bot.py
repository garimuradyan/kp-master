import asyncio
import logging
import os
import random
import string
import uuid
from datetime import datetime, timedelta

import aiohttp
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    LabeledPrice,
    Message,
    PreCheckoutQuery,
)
from dotenv import load_dotenv
from yookassa import Configuration, Payment

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
YOOKASSA_SHOP_ID = os.getenv("YOOKASSA_SHOP_ID")
YOOKASSA_SECRET_KEY = os.getenv("YOOKASSA_SECRET_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

Configuration.account_id = YOOKASSA_SHOP_ID
Configuration.secret_key = YOOKASSA_SECRET_KEY

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(storage=MemoryStorage())

TARIFFS = {
    "1m": {"name": "1 месяц", "days": 30, "amount": 1490},
    "3m": {"name": "3 месяца", "days": 90, "amount": 3990},
    "12m": {"name": "12 месяцев", "days": 365, "amount": 11990},
}

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def gen_key() -> str:
    chars = string.ascii_uppercase + string.digits
    parts = ["".join(random.choices(chars, k=4)) for _ in range(4)]
    return "KP-" + "-".join(parts)


async def sb_insert(table: str, data: dict) -> dict:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=data, headers=HEADERS) as r:
            return await r.json()


async def sb_select(table: str, filters: str) -> list:
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filters}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=HEADERS) as r:
            return await r.json()


async def sb_update(table: str, filters: str, data: dict):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filters}"
    async with aiohttp.ClientSession() as session:
        async with session.patch(url, json=data, headers=HEADERS) as r:
            return await r.json()


# ─── HANDLERS ───────────────────────────────────────────────

@dp.message(Command("start"))
async def cmd_start(msg: Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💳 Тарифы и оплата", callback_data="tariffs")],
        [InlineKeyboardButton(text="🔑 Мой ключ", callback_data="mykey")],
        [InlineKeyboardButton(text="❓ Помощь", callback_data="help")],
    ])
    await msg.answer(
        "👋 Добро пожаловать в <b>КП Мастер</b>!\n\n"
        "Сервис для создания коммерческих предложений для монтажников кондиционеров.\n\n"
        "Выберите действие:",
        reply_markup=kb,
        parse_mode="HTML",
    )


@dp.message(Command("tariffs"))
@dp.callback_query(F.data == "tariffs")
async def cmd_tariffs(event):
    msg = event if isinstance(event, Message) else event.message
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="1 месяц — 1 490 ₽", callback_data="pay_1m")],
        [InlineKeyboardButton(text="3 месяца — 3 990 ₽ 🔥", callback_data="pay_3m")],
        [InlineKeyboardButton(text="12 месяцев — 11 990 ₽", callback_data="pay_12m")],
        [InlineKeyboardButton(text="◀ Назад", callback_data="back")],
    ])
    text = (
        "💳 <b>Тарифы КП Мастер</b>\n\n"
        "🗓 <b>1 месяц</b> — 1 490 ₽\n"
        "🗓 <b>3 месяца</b> — 3 990 ₽  <i>(экономия 480 ₽)</i>\n"
        "🗓 <b>12 месяцев</b> — 11 990 ₽  <i>(экономия 5 890 ₽)</i>\n\n"
        "После оплаты вы получите ключ доступа.\n"
        "Ключ привязывается к одному устройству."
    )
    await msg.answer(text, reply_markup=kb, parse_mode="HTML")
    if isinstance(event, CallbackQuery):
        await event.answer()


@dp.message(Command("mykey"))
@dp.callback_query(F.data == "mykey")
async def cmd_mykey(event):
    msg = event if isinstance(event, Message) else event.message
    uid = msg.chat.id
    rows = await sb_select("license_keys", f"telegram_id=eq.{uid}&is_active=eq.true&order=created_at.desc&limit=1")
    if rows and isinstance(rows, list) and len(rows) > 0:
        k = rows[0]
        expires = k.get("expires_at", "")[:10] if k.get("expires_at") else "—"
        await msg.answer(
            f"🔑 <b>Ваш ключ доступа:</b>\n\n"
            f"<code>{k['key']}</code>\n\n"
            f"📅 Действует до: <b>{expires}</b>\n"
            f"📦 Тариф: <b>{k.get('tariff_name', '—')}</b>",
            parse_mode="HTML",
        )
    else:
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="💳 Выбрать тариф", callback_data="tariffs")]
        ])
        await msg.answer("У вас нет активного ключа.\nПриобретите доступ:", reply_markup=kb)
    if isinstance(event, CallbackQuery):
        await event.answer()


@dp.message(Command("help"))
@dp.callback_query(F.data == "help")
async def cmd_help(event):
    msg = event if isinstance(event, Message) else event.message
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✉️ Написать @garimuradyan", url="https://t.me/garimuradyan")],
        [InlineKeyboardButton(text="◀ Назад", callback_data="back")],
    ])
    await msg.answer(
        "❓ <b>Помощь</b>\n\n"
        "По любым вопросам обращайтесь к разработчику:\n"
        "@garimuradyan\n\n"
        "Команды:\n"
        "/start — главное меню\n"
        "/tariffs — тарифы и оплата\n"
        "/mykey — мой ключ доступа\n"
        "/help — помощь",
        reply_markup=kb,
        parse_mode="HTML",
    )
    if isinstance(event, CallbackQuery):
        await event.answer()


@dp.callback_query(F.data == "back")
async def cb_back(cb: CallbackQuery):
    await cmd_start(cb.message)
    await cb.answer()


@dp.callback_query(F.data.startswith("pay_"))
async def cb_pay(cb: CallbackQuery):
    tariff_id = cb.data.replace("pay_", "")
    tariff = TARIFFS.get(tariff_id)
    if not tariff:
        await cb.answer("Ошибка тарифа")
        return

    idempotence_key = str(uuid.uuid4())
    try:
        payment = Payment.create({
            "amount": {
                "value": str(tariff["amount"]) + ".00",
                "currency": "RUB",
            },
            "confirmation": {
                "type": "redirect",
                "return_url": "https://t.me/" + (await bot.get_me()).username,
            },
            "capture": True,
            "description": f"КП Мастер — {tariff['name']} (TG:{cb.from_user.id})",
            "metadata": {
                "telegram_id": cb.from_user.id,
                "tariff_id": tariff_id,
            },
        }, idempotence_key)

        await sb_insert("payments", {
            "payment_id": payment.id,
            "telegram_id": cb.from_user.id,
            "tariff_id": tariff_id,
            "amount": tariff["amount"],
            "status": "pending",
        })

        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="💳 Оплатить", url=payment.confirmation.confirmation_url)],
            [InlineKeyboardButton(text="✅ Я оплатил", callback_data=f"check_{payment.id}")],
        ])
        await cb.message.answer(
            f"🧾 Заказ: <b>{tariff['name']}</b>\n"
            f"💰 Сумма: <b>{tariff['amount']} ₽</b>\n\n"
            f"Нажмите «Оплатить», затем вернитесь и нажмите «Я оплатил».",
            reply_markup=kb,
            parse_mode="HTML",
        )
    except Exception as e:
        log.error(f"Payment create error: {e}")
        await cb.message.answer("Ошибка создания платежа. Попробуйте позже или обратитесь к @garimuradyan")

    await cb.answer()


@dp.callback_query(F.data.startswith("check_"))
async def cb_check(cb: CallbackQuery):
    payment_id = cb.data.replace("check_", "")
    try:
        payment = Payment.find_one(payment_id)
        if payment.status == "succeeded":
            rows = await sb_select("payments", f"payment_id=eq.{payment_id}")
            if not rows or not isinstance(rows, list):
                await cb.answer("Ошибка проверки платежа")
                return

            p = rows[0]
            if p.get("status") == "succeeded":
                await cb.answer("Ключ уже был выдан ранее")
                keys = await sb_select("license_keys", f"telegram_id=eq.{cb.from_user.id}&is_active=eq.true&order=created_at.desc&limit=1")
                if keys:
                    await cb.message.answer(f"🔑 Ваш ключ: <code>{keys[0]['key']}</code>", parse_mode="HTML")
                return

            tariff = TARIFFS.get(p["tariff_id"], TARIFFS["1m"])
            key = gen_key()
            now = datetime.utcnow()
            expires = now + timedelta(days=tariff["days"])

            await sb_insert("license_keys", {
                "key": key,
                "tariff": p["tariff_id"],
                "tariff_name": tariff["name"],
                "days": tariff["days"],
                "telegram_id": cb.from_user.id,
                "telegram_username": cb.from_user.username or "",
                "expires_at": expires.isoformat(),
                "is_active": True,
            })

            await sb_update("payments", f"payment_id=eq.{payment_id}", {"status": "succeeded"})

            await cb.message.answer(
                f"✅ <b>Оплата прошла успешно!</b>\n\n"
                f"🔑 Ваш ключ доступа:\n<code>{key}</code>\n\n"
                f"📅 Действует до: <b>{expires.strftime('%d.%m.%Y')}</b>\n\n"
                f"Введите этот ключ на сайте приложения.\n"
                f"Ключ привязывается к одному устройству.",
                parse_mode="HTML",
            )
            await cb.answer("✅ Оплата подтверждена!")
        elif payment.status == "pending":
            await cb.answer("Платёж ещё не завершён. Попробуйте через минуту.", show_alert=True)
        else:
            await cb.answer(f"Статус платежа: {payment.status}", show_alert=True)
    except Exception as e:
        log.error(f"Check payment error: {e}")
        await cb.answer("Ошибка проверки. Обратитесь к @garimuradyan", show_alert=True)


async def main():
    log.info("Bot started")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
