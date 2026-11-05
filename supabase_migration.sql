-- ================================================================
-- KP MASTER — миграция: задачи + статусы канбана
-- Запустить в Supabase: Dashboard → SQL Editor → New query
-- ================================================================

-- ── 1. Таблица задач ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kp_tasks (
  id          BIGSERIAL PRIMARY KEY,
  key_id      BIGINT NOT NULL,
  title       TEXT NOT NULL,
  assignee    TEXT DEFAULT '',
  due         DATE,
  priority    TEXT DEFAULT 'mid',
  done        BOOLEAN DEFAULT false,
  created_by  TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Загрузить задачи ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION kp_load_tasks(
  p_key_id BIGINT, p_key TEXT, p_device_id TEXT
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM kp_keys WHERE id = p_key_id AND key = p_key AND is_active = true) THEN
    RETURN json_build_object('ok', false, 'message', 'Auth failed');
  END IF;
  RETURN json_build_object('ok', true, 'tasks', (
    SELECT json_agg(row_to_json(t) ORDER BY t.created_at DESC)
    FROM kp_tasks t WHERE t.key_id = p_key_id
  ));
END;
$$;

-- ── 3. Создать задачу ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION kp_save_task(
  p_key_id    BIGINT, p_key TEXT, p_device_id TEXT,
  p_title     TEXT,
  p_assignee  TEXT DEFAULT '',
  p_due       TEXT DEFAULT '',
  p_priority  TEXT DEFAULT 'mid',
  p_created_by TEXT DEFAULT ''
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM kp_keys WHERE id = p_key_id AND key = p_key AND is_active = true) THEN
    RETURN json_build_object('ok', false, 'message', 'Auth failed');
  END IF;
  INSERT INTO kp_tasks (key_id, title, assignee, due, priority, created_by)
  VALUES (
    p_key_id, p_title, p_assignee,
    CASE WHEN p_due = '' OR p_due IS NULL THEN NULL ELSE p_due::DATE END,
    p_priority, p_created_by
  ) RETURNING id INTO v_id;
  RETURN json_build_object('ok', true, 'id', v_id);
END;
$$;

-- ── 4. Обновить задачу (выполнена / снята) ───────────────────────
CREATE OR REPLACE FUNCTION kp_update_task(
  p_key_id   BIGINT, p_key TEXT, p_device_id TEXT,
  p_task_id  BIGINT,
  p_done     BOOLEAN
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM kp_keys WHERE id = p_key_id AND key = p_key AND is_active = true) THEN
    RETURN json_build_object('ok', false, 'message', 'Auth failed');
  END IF;
  UPDATE kp_tasks SET done = p_done, updated_at = NOW()
  WHERE id = p_task_id AND key_id = p_key_id;
  RETURN json_build_object('ok', true);
END;
$$;

-- ── 5. Удалить задачу ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION kp_delete_task(
  p_key_id  BIGINT, p_key TEXT, p_device_id TEXT,
  p_task_id BIGINT
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM kp_keys WHERE id = p_key_id AND key = p_key AND is_active = true) THEN
    RETURN json_build_object('ok', false, 'message', 'Auth failed');
  END IF;
  DELETE FROM kp_tasks WHERE id = p_task_id AND key_id = p_key_id;
  RETURN json_build_object('ok', true);
END;
$$;

-- ── 6. Обновить статус КП (канбан drag & drop) ───────────────────
-- Таблица называется 'quotes', колонка с JSON-данными — 'data'
CREATE OR REPLACE FUNCTION kp_update_quote_status(
  p_key_id BIGINT, p_key TEXT, p_device_id TEXT,
  p_id     BIGINT,
  p_status TEXT
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM kp_keys WHERE id = p_key_id AND key = p_key AND is_active = true) THEN
    RETURN json_build_object('ok', false, 'message', 'Auth failed');
  END IF;
  UPDATE quotes
    SET data = data || json_build_object('status', p_status)::jsonb
  WHERE id = p_id AND key_id = p_key_id;
  RETURN json_build_object('ok', true);
END;
$$;

-- ── Права доступа (если используешь Row Level Security) ──────────
GRANT EXECUTE ON FUNCTION kp_load_tasks TO anon, authenticated;
GRANT EXECUTE ON FUNCTION kp_save_task TO anon, authenticated;
GRANT EXECUTE ON FUNCTION kp_update_task TO anon, authenticated;
GRANT EXECUTE ON FUNCTION kp_delete_task TO anon, authenticated;
GRANT EXECUTE ON FUNCTION kp_update_quote_status TO anon, authenticated;
