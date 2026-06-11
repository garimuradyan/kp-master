-- =========================================================
-- KP MASTER — CLEAN SUPABASE SQL FROM ZERO
-- Version: 2026-06-11
-- ВНИМАНИЕ: скрипт удаляет старые таблицы и функции проекта KP Master.
-- Перед запуском замени ADMIN-KP-MASTER-CHANGE-ME на новый рабочий админ-ключ.
-- Пункт ограничения device_id НЕ менялся: 1 ключ = 1 браузер/устройство, как было.
-- =========================================================

begin;

-- -----------------------------
-- 0. Очистка старой схемы проекта
-- -----------------------------
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.payments cascade;
drop table if exists public.license_keys cascade;
drop table if exists public.schedule_jobs cascade;
drop table if exists public.quotes cascade;
drop table if exists public.price_lists cascade;
drop table if exists public.master_settings cascade;
drop table if exists public.profiles cascade;
drop table if exists public.access_keys cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.kp_check_key(bigint,text,text) cascade;
drop function if exists public.kp_login(text,text) cascade;
drop function if exists public.kp_verify(bigint,text,text) cascade;
drop function if exists public.kp_get_user_data(bigint,text,text) cascade;
drop function if exists public.kp_save_settings(bigint,text,text,jsonb,jsonb) cascade;
drop function if exists public.kp_save_quote(bigint,text,text,text,text,numeric,jsonb) cascade;
drop function if exists public.kp_delete_quote(bigint,text,text,bigint) cascade;
drop function if exists public.kp_get_schedule_jobs(bigint,text,text) cascade;
drop function if exists public.kp_save_schedule_job(bigint,text,text,bigint,jsonb) cascade;
drop function if exists public.kp_delete_schedule_job(bigint,text,text,bigint) cascade;
drop function if exists public.kp_admin_data(bigint,text,text) cascade;
drop function if exists public.kp_admin_add_key(bigint,text,text,text,text) cascade;
drop function if exists public.kp_admin_add_days(bigint,text,text,bigint,int) cascade;
drop function if exists public.kp_admin_add_days(bigint,text,text,bigint,numeric) cascade;
drop function if exists public.kp_admin_set_active(bigint,text,text,bigint,bool) cascade;
drop function if exists public.kp_admin_reset_device(bigint,text,text,bigint) cascade;
drop function if exists public.kp_admin_delete_key(bigint,text,text,bigint) cascade;
drop function if exists public.kp_touch_updated_at() cascade;

-- -----------------------------
-- 1. Таблицы
-- -----------------------------

create table public.access_keys (
  id bigserial primary key,
  "key" text unique not null,
  master_name text default 'Мастер',
  device_id text,
  is_active boolean not null default true,
  is_admin boolean not null default false,
  days_left integer not null default 0,
  expires_at timestamptz,
  last_used timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.master_settings (
  id bigserial primary key,
  user_id bigint not null unique references public.access_keys(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.price_lists (
  id bigserial primary key,
  user_id bigint not null unique references public.access_keys(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotes (
  id bigserial primary key,
  user_id bigint not null references public.access_keys(id) on delete cascade,
  client_name text default '',
  client_phone text default '',
  total numeric default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schedule_jobs (
  id bigserial primary key,
  user_id bigint not null references public.access_keys(id) on delete cascade,
  quote_id bigint references public.quotes(id) on delete set null,
  job_date date,
  job_time text default '',
  visit_type text default '',
  client_name text default '',
  client_phone text default '',
  address text default '',
  total numeric default 0,
  status text default '',
  comment text default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Таблица ключей, которые выдаёт Telegram-бот / Cloudflare Worker.
create table public.license_keys (
  id bigserial primary key,
  "key" text unique not null,
  tariff text not null,
  tariff_name text,
  days integer not null,
  telegram_id bigint not null,
  telegram_username text default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  is_active boolean not null default true
);

-- Таблица платежей бота.
create table public.payments (
  id bigserial primary key,
  payment_id text unique not null,
  telegram_id bigint not null,
  tariff_id text not null,
  amount integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------
-- 2. Индексы
-- -----------------------------
create index access_keys_key_idx on public.access_keys (upper("key"));
create index access_keys_active_idx on public.access_keys (is_active, is_admin);
create index master_settings_user_idx on public.master_settings (user_id);
create index price_lists_user_idx on public.price_lists (user_id);
create index quotes_user_created_idx on public.quotes (user_id, created_at desc);
create index schedule_jobs_user_date_idx on public.schedule_jobs (user_id, job_date, created_at desc);
create index schedule_jobs_quote_idx on public.schedule_jobs (quote_id);
create index license_keys_telegram_idx on public.license_keys (telegram_id, created_at desc);
create index payments_telegram_idx on public.payments (telegram_id, created_at desc);

-- -----------------------------
-- 3. updated_at триггер
-- -----------------------------
create or replace function public.kp_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger access_keys_touch_updated_at before update on public.access_keys
for each row execute function public.kp_touch_updated_at();
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.kp_touch_updated_at();
create trigger master_settings_touch_updated_at before update on public.master_settings
for each row execute function public.kp_touch_updated_at();
create trigger price_lists_touch_updated_at before update on public.price_lists
for each row execute function public.kp_touch_updated_at();
create trigger quotes_touch_updated_at before update on public.quotes
for each row execute function public.kp_touch_updated_at();
create trigger schedule_jobs_touch_updated_at before update on public.schedule_jobs
for each row execute function public.kp_touch_updated_at();
create trigger payments_touch_updated_at before update on public.payments
for each row execute function public.kp_touch_updated_at();

-- -----------------------------
-- 4. RLS и права
-- Основной сайт работает через SECURITY DEFINER RPC.
-- Telegram-бот использует SUPABASE_SERVICE_KEY и работает через REST.
-- -----------------------------
alter table public.access_keys enable row level security;
alter table public.master_settings enable row level security;
alter table public.price_lists enable row level security;
alter table public.quotes enable row level security;
alter table public.schedule_jobs enable row level security;
alter table public.license_keys enable row level security;
alter table public.payments enable row level security;
alter table public.profiles enable row level security;

revoke all on table public.access_keys from anon, authenticated;
revoke all on table public.master_settings from anon, authenticated;
revoke all on table public.price_lists from anon, authenticated;
revoke all on table public.quotes from anon, authenticated;
revoke all on table public.schedule_jobs from anon, authenticated;
revoke all on table public.license_keys from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;

grant usage on schema public to anon, authenticated;

-- -----------------------------
-- 5. Auth-профиль, если понадобится Supabase Auth
-- -----------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- -----------------------------
-- 6. RPC: проверка ключей
-- -----------------------------
create or replace function public.kp_check_key(p_key_id bigint, p_key text, p_device_id text)
returns public.access_keys
language plpgsql
security definer
set search_path = public
as $$
declare k public.access_keys%rowtype;
begin
  select * into k
  from public.access_keys
  where id = p_key_id and upper("key") = upper(p_key)
  limit 1;

  if not found then raise exception 'AUTH_FAILED'; end if;
  if coalesce(k.is_active,false) = false then raise exception 'AUTH_BLOCKED'; end if;
  if coalesce(k.is_admin,false) = false and (k.expires_at is null or k.expires_at <= now()) then
    raise exception 'AUTH_EXPIRED';
  end if;

  -- ВАЖНО: ограничение 1 ключ = 1 браузер/устройство оставлено как было.
  if coalesce(k.is_admin,false) = false and k.device_id is not null and k.device_id <> p_device_id then
    raise exception 'AUTH_DEVICE';
  end if;

  return k;
end;
$$;

create or replace function public.kp_login(p_key text, p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare k public.access_keys%rowtype;
begin
  select * into k
  from public.access_keys
  where upper("key") = upper(p_key)
  limit 1;

  if not found then return jsonb_build_object('ok',false,'message','Ключ не найден'); end if;
  if coalesce(k.is_active,false) = false then return jsonb_build_object('ok',false,'message','Ключ заблокирован'); end if;
  if coalesce(k.is_admin,false) = false and (k.expires_at is null or k.expires_at <= now()) then
    return jsonb_build_object('ok',false,'message','Срок доступа истёк. Обратитесь к администратору.');
  end if;

  -- ВАЖНО: привязка device_id сохранена.
  if coalesce(k.is_admin,false) = false then
    if k.device_id is not null and k.device_id <> p_device_id then
      return jsonb_build_object('ok',false,'message','Ключ уже используется на другом устройстве');
    end if;
    update public.access_keys
    set device_id = coalesce(device_id, p_device_id), last_used = now()
    where id = k.id
    returning * into k;
  else
    update public.access_keys
    set last_used = now()
    where id = k.id
    returning * into k;
  end if;

  return jsonb_build_object('ok',true,'key_data',to_jsonb(k));
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка входа');
end;
$$;

create or replace function public.kp_verify(p_key_id bigint, p_key text, p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare k public.access_keys%rowtype;
begin
  select * into k
  from public.access_keys
  where id = p_key_id and upper("key") = upper(p_key)
  limit 1;

  if not found then return jsonb_build_object('ok',false,'message','Сессия не найдена'); end if;
  if coalesce(k.is_active,false) = false then return jsonb_build_object('ok',false,'message','Ключ заблокирован'); end if;
  if coalesce(k.is_admin,false) = false and (k.expires_at is null or k.expires_at <= now()) then
    return jsonb_build_object('ok',false,'message','Срок доступа истёк');
  end if;
  if coalesce(k.is_admin,false) = false and k.device_id is not null and k.device_id <> p_device_id then
    return jsonb_build_object('ok',false,'message','Ключ используется на другом устройстве');
  end if;

  update public.access_keys set last_used = now() where id = k.id returning * into k;
  return jsonb_build_object('ok',true,'key_data',to_jsonb(k));
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка проверки доступа');
end;
$$;

-- -----------------------------
-- 7. RPC: загрузка и сохранение данных пользователя
-- -----------------------------
create or replace function public.kp_get_user_data(p_key_id bigint, p_key text, p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.access_keys%rowtype;
  st jsonb;
  pr jsonb;
  qs jsonb;
  sj jsonb;
begin
  k := public.kp_check_key(p_key_id,p_key,p_device_id);

  select settings into st from public.master_settings where user_id = k.id limit 1;
  select items into pr from public.price_lists where user_id = k.id limit 1;

  select coalesce(
    jsonb_agg(to_jsonb(q.data) || jsonb_build_object('id',q.id) order by q.created_at desc),
    '[]'::jsonb
  ) into qs
  from public.quotes q
  where q.user_id = k.id;

  select coalesce(
    jsonb_agg(to_jsonb(s.data) || jsonb_build_object('id',s.id) order by coalesce(s.job_date, s.created_at::date) asc, s.created_at asc),
    '[]'::jsonb
  ) into sj
  from public.schedule_jobs s
  where s.user_id = k.id;

  return jsonb_build_object(
    'ok', true,
    'settings', coalesce(st,'{}'::jsonb),
    'price_items', coalesce(pr,'[]'::jsonb),
    'quotes', coalesce(qs,'[]'::jsonb),
    'schedule_jobs', coalesce(sj,'[]'::jsonb),
    'schedule', coalesce(sj,'[]'::jsonb)
  );
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка доступа');
end;
$$;

create or replace function public.kp_save_settings(
  p_key_id bigint,
  p_key text,
  p_device_id text,
  p_settings jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.access_keys%rowtype;
begin
  k := public.kp_check_key(p_key_id,p_key,p_device_id);

  insert into public.master_settings(user_id, settings)
  values(k.id, coalesce(p_settings,'{}'::jsonb))
  on conflict (user_id) do update
  set settings = excluded.settings, updated_at = now();

  insert into public.price_lists(user_id, items)
  values(k.id, coalesce(p_items,'[]'::jsonb))
  on conflict (user_id) do update
  set items = excluded.items, updated_at = now();

  return jsonb_build_object('ok',true);
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка сохранения настроек');
end;
$$;

-- -----------------------------
-- 8. RPC: КП / история
-- -----------------------------
create or replace function public.kp_save_quote(
  p_key_id bigint,
  p_key text,
  p_device_id text,
  p_client_name text,
  p_client_phone text,
  p_total numeric,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.access_keys%rowtype;
  qid bigint;
  cnt int;
begin
  k := public.kp_check_key(p_key_id,p_key,p_device_id);

  if coalesce(k.is_admin,false) = false then
    select count(*) into cnt from public.quotes where user_id = k.id;
    if cnt >= 15 then
      return jsonb_build_object('ok',false,'message','Память заполнена (15 КП). Удалите хотя бы одно.');
    end if;
  end if;

  insert into public.quotes(user_id, client_name, client_phone, total, data)
  values(k.id, coalesce(p_client_name,''), coalesce(p_client_phone,''), coalesce(p_total,0), coalesce(p_data,'{}'::jsonb))
  returning id into qid;

  return jsonb_build_object('ok',true,'id',qid);
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка сохранения КП');
end;
$$;

create or replace function public.kp_delete_quote(
  p_key_id bigint,
  p_key text,
  p_device_id text,
  p_quote_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare k public.access_keys%rowtype;
begin
  k := public.kp_check_key(p_key_id,p_key,p_device_id);
  delete from public.quotes where id = p_quote_id and user_id = k.id;
  return jsonb_build_object('ok',true);
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка удаления КП');
end;
$$;

-- -----------------------------
-- 9. RPC: график выездов
-- p_data — весь объект события из frontend.
-- -----------------------------
create or replace function public.kp_get_schedule_jobs(
  p_key_id bigint,
  p_key text,
  p_device_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.access_keys%rowtype;
  sj jsonb;
begin
  k := public.kp_check_key(p_key_id,p_key,p_device_id);

  select coalesce(
    jsonb_agg(to_jsonb(s.data) || jsonb_build_object('id',s.id) order by coalesce(s.job_date, s.created_at::date) asc, s.created_at asc),
    '[]'::jsonb
  ) into sj
  from public.schedule_jobs s
  where s.user_id = k.id;

  return jsonb_build_object('ok',true,'schedule_jobs',coalesce(sj,'[]'::jsonb),'schedule',coalesce(sj,'[]'::jsonb));
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка загрузки графика');
end;
$$;

create or replace function public.kp_save_schedule_job(
  p_key_id bigint,
  p_key text,
  p_device_id text,
  p_job_id bigint,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.access_keys%rowtype;
  sid bigint;
  v_quote_id bigint;
  v_job_date date;
begin
  k := public.kp_check_key(p_key_id,p_key,p_device_id);

  v_quote_id := nullif(coalesce(p_data->>'quote_id', p_data->>'quoteId', ''), '')::bigint;
  v_job_date := nullif(coalesce(p_data->>'date', p_data->>'job_date', p_data->>'day', ''), '')::date;

  if p_job_id is null then
    insert into public.schedule_jobs(
      user_id, quote_id, job_date, job_time, visit_type,
      client_name, client_phone, address, total, status, comment, data
    ) values(
      k.id,
      v_quote_id,
      v_job_date,
      coalesce(p_data->>'time', p_data->>'job_time', ''),
      coalesce(p_data->>'visit_type', p_data->>'visitType', p_data->>'type', ''),
      coalesce(p_data->>'client_name', p_data->>'clientName', p_data->>'name', ''),
      coalesce(p_data->>'client_phone', p_data->>'clientPhone', p_data->>'phone', ''),
      coalesce(p_data->>'address', ''),
      coalesce(nullif(coalesce(p_data->>'total', p_data->>'sum', ''), '')::numeric, 0),
      coalesce(p_data->>'status', ''),
      coalesce(p_data->>'comment', p_data->>'note', ''),
      coalesce(p_data,'{}'::jsonb)
    ) returning id into sid;
  else
    update public.schedule_jobs
    set
      quote_id = v_quote_id,
      job_date = v_job_date,
      job_time = coalesce(p_data->>'time', p_data->>'job_time', ''),
      visit_type = coalesce(p_data->>'visit_type', p_data->>'visitType', p_data->>'type', ''),
      client_name = coalesce(p_data->>'client_name', p_data->>'clientName', p_data->>'name', ''),
      client_phone = coalesce(p_data->>'client_phone', p_data->>'clientPhone', p_data->>'phone', ''),
      address = coalesce(p_data->>'address', ''),
      total = coalesce(nullif(coalesce(p_data->>'total', p_data->>'sum', ''), '')::numeric, 0),
      status = coalesce(p_data->>'status', ''),
      comment = coalesce(p_data->>'comment', p_data->>'note', ''),
      data = coalesce(p_data,'{}'::jsonb),
      updated_at = now()
    where id = p_job_id and user_id = k.id
    returning id into sid;

    if sid is null then
      insert into public.schedule_jobs(
        user_id, quote_id, job_date, job_time, visit_type,
        client_name, client_phone, address, total, status, comment, data
      ) values(
        k.id,
        v_quote_id,
        v_job_date,
        coalesce(p_data->>'time', p_data->>'job_time', ''),
        coalesce(p_data->>'visit_type', p_data->>'visitType', p_data->>'type', ''),
        coalesce(p_data->>'client_name', p_data->>'clientName', p_data->>'name', ''),
        coalesce(p_data->>'client_phone', p_data->>'clientPhone', p_data->>'phone', ''),
        coalesce(p_data->>'address', ''),
        coalesce(nullif(coalesce(p_data->>'total', p_data->>'sum', ''), '')::numeric, 0),
        coalesce(p_data->>'status', ''),
        coalesce(p_data->>'comment', p_data->>'note', ''),
        coalesce(p_data,'{}'::jsonb)
      ) returning id into sid;
    end if;
  end if;

  return jsonb_build_object('ok',true,'id',sid);
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка сохранения графика');
end;
$$;

create or replace function public.kp_delete_schedule_job(
  p_key_id bigint,
  p_key text,
  p_device_id text,
  p_job_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare k public.access_keys%rowtype;
begin
  k := public.kp_check_key(p_key_id,p_key,p_device_id);
  delete from public.schedule_jobs where id = p_job_id and user_id = k.id;
  return jsonb_build_object('ok',true);
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка удаления выезда');
end;
$$;

-- -----------------------------
-- 10. RPC: админка
-- -----------------------------
create or replace function public.kp_admin_data(p_key_id bigint, p_key text, p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.access_keys%rowtype;
  ks jsonb;
begin
  k := public.kp_check_key(p_key_id,p_key,p_device_id);
  if coalesce(k.is_admin,false) = false then
    return jsonb_build_object('ok',false,'message','Нет прав администратора');
  end if;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc),'[]'::jsonb)
  into ks
  from public.access_keys a;

  return jsonb_build_object('ok',true,'keys',ks);
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка загрузки админки');
end;
$$;

create or replace function public.kp_admin_add_key(
  p_key_id bigint,
  p_key text,
  p_device_id text,
  p_new_key text,
  p_master_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare k public.access_keys%rowtype;
begin
  k := public.kp_check_key(p_key_id,p_key,p_device_id);
  if coalesce(k.is_admin,false) = false then
    return jsonb_build_object('ok',false,'message','Нет прав администратора');
  end if;

  insert into public.access_keys("key", master_name, is_active, is_admin, days_left)
  values(upper(p_new_key), coalesce(p_master_name,'Мастер'), true, false, 0);

  return jsonb_build_object('ok',true);
exception when unique_violation then
  return jsonb_build_object('ok',false,'message','Такой ключ уже существует');
when others then
  return jsonb_build_object('ok',false,'message','Ошибка добавления ключа');
end;
$$;

create or replace function public.kp_admin_add_days(
  p_key_id bigint,
  p_key text,
  p_device_id text,
  p_target_id bigint,
  p_days int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.access_keys%rowtype;
  cur timestamptz;
  nexp timestamptz;
begin
  k := public.kp_check_key(p_key_id,p_key,p_device_id);
  if coalesce(k.is_admin,false) = false then
    return jsonb_build_object('ok',false,'message','Нет прав администратора');
  end if;

  select expires_at into cur from public.access_keys where id = p_target_id;
  nexp := greatest(coalesce(cur,now()),now()) + make_interval(days => greatest(p_days,1));

  update public.access_keys
  set expires_at = nexp,
      days_left = greatest(p_days,1),
      is_active = true
  where id = p_target_id;

  return jsonb_build_object('ok',true);
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка продления ключа');
end;
$$;

create or replace function public.kp_admin_set_active(
  p_key_id bigint,
  p_key text,
  p_device_id text,
  p_target_id bigint,
  p_is_active bool
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare k public.access_keys%rowtype;
begin
  k := public.kp_check_key(p_key_id,p_key,p_device_id);
  if coalesce(k.is_admin,false) = false then
    return jsonb_build_object('ok',false,'message','Нет прав администратора');
  end if;

  update public.access_keys
  set is_active = p_is_active
  where id = p_target_id and coalesce(is_admin,false) = false;

  return jsonb_build_object('ok',true);
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка изменения статуса');
end;
$$;

create or replace function public.kp_admin_reset_device(
  p_key_id bigint,
  p_key text,
  p_device_id text,
  p_target_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare k public.access_keys%rowtype;
begin
  k := public.kp_check_key(p_key_id,p_key,p_device_id);
  if coalesce(k.is_admin,false) = false then
    return jsonb_build_object('ok',false,'message','Нет прав администратора');
  end if;

  update public.access_keys set device_id = null where id = p_target_id;
  return jsonb_build_object('ok',true);
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка сброса устройства');
end;
$$;

create or replace function public.kp_admin_delete_key(
  p_key_id bigint,
  p_key text,
  p_device_id text,
  p_target_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare k public.access_keys%rowtype;
begin
  k := public.kp_check_key(p_key_id,p_key,p_device_id);
  if coalesce(k.is_admin,false) = false then
    return jsonb_build_object('ok',false,'message','Нет прав администратора');
  end if;

  delete from public.access_keys
  where id = p_target_id and coalesce(is_admin,false) = false;

  return jsonb_build_object('ok',true);
exception when others then
  return jsonb_build_object('ok',false,'message','Ошибка удаления ключа');
end;
$$;

-- -----------------------------
-- 11. GRANT EXECUTE
-- -----------------------------
grant execute on function public.kp_login(text,text) to anon, authenticated;
grant execute on function public.kp_verify(bigint,text,text) to anon, authenticated;
grant execute on function public.kp_get_user_data(bigint,text,text) to anon, authenticated;
grant execute on function public.kp_save_settings(bigint,text,text,jsonb,jsonb) to anon, authenticated;
grant execute on function public.kp_save_quote(bigint,text,text,text,text,numeric,jsonb) to anon, authenticated;
grant execute on function public.kp_delete_quote(bigint,text,text,bigint) to anon, authenticated;
grant execute on function public.kp_get_schedule_jobs(bigint,text,text) to anon, authenticated;
grant execute on function public.kp_save_schedule_job(bigint,text,text,bigint,jsonb) to anon, authenticated;
grant execute on function public.kp_delete_schedule_job(bigint,text,text,bigint) to anon, authenticated;
grant execute on function public.kp_admin_data(bigint,text,text) to anon, authenticated;
grant execute on function public.kp_admin_add_key(bigint,text,text,text,text) to anon, authenticated;
grant execute on function public.kp_admin_add_days(bigint,text,text,bigint,int) to anon, authenticated;
grant execute on function public.kp_admin_set_active(bigint,text,text,bigint,bool) to anon, authenticated;
grant execute on function public.kp_admin_reset_device(bigint,text,text,bigint) to anon, authenticated;
grant execute on function public.kp_admin_delete_key(bigint,text,text,bigint) to anon, authenticated;

-- -----------------------------
-- 12. Стартовый админ-ключ
-- ОБЯЗАТЕЛЬНО ЗАМЕНИ ADMIN-KP-MASTER-CHANGE-ME перед запуском.
-- -----------------------------
insert into public.access_keys("key", master_name, is_active, is_admin, days_left, expires_at)
values ('ADMIN-KP-MASTER-CHANGE-ME', 'Администратор', true, true, 9999, now() + interval '9999 days')
on conflict ("key") do update
set master_name = excluded.master_name,
    is_active = true,
    is_admin = true,
    days_left = 9999,
    expires_at = excluded.expires_at,
    updated_at = now();

commit;
