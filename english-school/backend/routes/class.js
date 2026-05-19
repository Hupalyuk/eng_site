const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { google } = require('googleapis');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeName = `material-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

const uploadMaterial = multer({
  storage: materialStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

function handleMaterialUpload(req, res, next) {
  uploadMaterial.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл завеликий. Максимальний розмір: 20 MB.' });
    }
    return res.status(400).json({ error: err.message || 'Не вдалося завантажити файл.' });
  });
}

const DAY_TO_INDEX = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function parseTime(timeValue) {
  const [hourRaw, minuteRaw] = String(timeValue || '18:00').split(':');
  return {
    hour: Number(hourRaw) || 18,
    minute: Number(minuteRaw) || 0,
  };
}

function computeNextLesson(daysKey, timeValue) {
  const days = String(daysKey || '')
    .split(',')
    .map((day) => day.trim().toLowerCase())
    .filter(Boolean);
  const { hour, minute } = parseTime(timeValue);

  const now = new Date();
  let nextLesson = null;

  for (let shift = 0; shift <= 13; shift += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + shift);
    candidate.setHours(hour, minute, 0, 0);

    const dayIndex = candidate.getDay();
    const dayMatched = days.some((dayCode) => DAY_TO_INDEX[dayCode] === dayIndex);
    if (!dayMatched) continue;
    if (candidate <= now) continue;

    nextLesson = candidate;
    break;
  }

  return nextLesson;
}

async function findLatestGroupByUser(userId) {
  const result = await pool.query(
    `SELECT cg.id, cg.name, cg.course_code, cg.days_key, cg.times_key, cg.meet_link, cg.meet_space_name, u.name AS user_name
     FROM course_group_members cgm
     JOIN course_groups cg ON cg.id = cgm.group_id
     JOIN users u ON u.id = cgm.user_id
     WHERE cgm.user_id = $1
     ORDER BY cgm.created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length > 0) return result.rows[0];

  const userResult = await pool.query('SELECT email, name FROM users WHERE id = $1 LIMIT 1', [userId]);
  const userEmail = userResult.rows[0]?.email;
  const userName = userResult.rows[0]?.name;
  if (!userEmail) return null;

  const fallbackResult = await pool.query(
    `SELECT cgm.id AS member_id, cg.id, cg.name, cg.course_code, cg.days_key, cg.times_key, cg.meet_link, cg.meet_space_name
     FROM course_group_members cgm
     JOIN course_groups cg ON cg.id = cgm.group_id
     WHERE LOWER(cgm.email) = LOWER($1)
     ORDER BY cgm.created_at DESC
     LIMIT 1`,
    [userEmail]
  );

  if (fallbackResult.rows.length === 0) return null;

  const memberId = fallbackResult.rows[0].member_id;
  await pool.query(
    `UPDATE course_group_members
     SET user_id = $1
     WHERE id = $2 AND user_id IS NULL`,
    [userId, memberId]
  );

  return {
    ...fallbackResult.rows[0],
    user_name: userName || 'Student',
  };
}

async function getUserById(userId) {
  const result = await pool.query('SELECT id, role, name, email FROM users WHERE id = $1 LIMIT 1', [userId]);
  return result.rows[0] || null;
}

async function getGoogleTokensByUser(userId) {
  const result = await pool.query(
    `SELECT access_token, refresh_token, scope, token_type, expiry_date
     FROM user_google_tokens
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
}

function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function toEventPayload(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    location: row.location || '',
    meetLink: row.meet_link || '',
    startAt: row.start_at ? new Date(row.start_at).toISOString() : null,
    endAt: row.end_at ? new Date(row.end_at).toISOString() : null,
    googleEventId: row.google_event_id || null,
    syncedAt: row.synced_at ? new Date(row.synced_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

function normalizeEventTitle(value, fallback = 'Speaking lesson') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const cleaned = raw.replace(/[?\s]+/g, '');
  if (!cleaned) return fallback;
  return raw;
}

router.get('/next', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const row = await findLatestGroupByUser(userId);
    if (!row) {
      return res.status(404).json({ error: 'No group assigned yet.' });
    }

    const firstTime = String(row.times_key || '18:00').split(',')[0];
    const nextStart = computeNextLesson(row.days_key, firstTime);

    if (!nextStart) {
      return res.status(404).json({ error: 'No upcoming lessons found.' });
    }

    const nextEnd = new Date(nextStart);
    nextEnd.setHours(nextEnd.getHours() + 1);

    res.json({
      groupName: row.name,
      courseCode: String(row.course_code || '').toUpperCase(),
      studentName: row.user_name,
      meetLink: row.meet_link || process.env.DEFAULT_MEET_LINK || 'https://meet.google.com/',
      lesson: {
        title: `${String(row.course_code || '').toUpperCase()} Speaking`,
        startAt: nextStart.toISOString(),
        endAt: nextEnd.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/meet-link', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const user = await getUserById(userId);
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({ error: 'Лише викладач може змінювати посилання Google Meet.' });
    }

    const { meetLink, groupName } = req.body || {};
    const safeMeetLink = String(meetLink || '').trim();
    const safeGroupName = String(groupName || '').trim();

    if (!safeMeetLink) {
      return res.status(400).json({ error: 'Посилання Google Meet є обовʼязковим.' });
    }

    if (!safeMeetLink.startsWith('https://meet.google.com/')) {
      return res.status(400).json({ error: 'Вкажіть коректне посилання Google Meet.' });
    }

    let group = await findLatestGroupByUser(userId);
    if (!group && safeGroupName) {
      const byNameResult = await pool.query(
        `SELECT id, name, course_code, days_key, times_key, meet_link, meet_space_name
         FROM course_groups
         WHERE name = $1
         LIMIT 1`,
        [safeGroupName]
      );
      group = byNameResult.rows[0] || null;
    }

    if (!group) {
      return res.status(404).json({ error: 'Групу не знайдено. Передайте назву групи.' });
    }

    await pool.query('UPDATE course_groups SET meet_link = $1 WHERE id = $2', [safeMeetLink, group.id]);

    res.json({
      ok: true,
      meetLink: safeMeetLink,
      groupName: group.name,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/calendar', requireAuth, async (req, res, next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      return res.status(500).json({ error: 'Google OAuth не налаштовано.' });
    }

    const userId = req.session.userId;
    const tokens = await getGoogleTokensByUser(userId);
    if (!tokens?.refresh_token) {
      return res.status(401).json({ error: 'Google Calendar не підключено.', needsGoogleConnect: true });
    }

    const now = new Date();
    const timeMin = req.query.from ? new Date(String(req.query.from)) : now;
    const timeMax = req.query.to
      ? new Date(String(req.query.to))
      : new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14);

    if (Number.isNaN(timeMin.getTime()) || Number.isNaN(timeMax.getTime())) {
      return res.status(400).json({ error: 'Некоректні параметри періоду.' });
    }

    const auth = getGoogleOAuthClient();
    auth.setCredentials({
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || undefined,
      scope: tokens.scope || undefined,
      token_type: tokens.token_type || undefined,
      expiry_date: tokens.expiry_date || undefined,
    });

    const calendar = google.calendar({ version: 'v3', auth });
    const response = await calendar.events.list({
      calendarId: 'primary',
      singleEvents: true,
      orderBy: 'startTime',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 100,
    });

    const events = (response.data.items || [])
      .filter((item) => item.status !== 'cancelled')
      .map((item) => {
        const startValue = item.start?.dateTime || item.start?.date || null;
        const endValue = item.end?.dateTime || item.end?.date || null;
        return {
          id: item.id,
          title: item.summary || 'Подія',
          description: item.description || '',
          location: item.location || '',
          meetLink: item.hangoutLink || '',
          startAt: startValue,
          endAt: endValue,
          htmlLink: item.htmlLink || '',
          isAllDay: Boolean(item.start?.date && !item.start?.dateTime),
        };
      });

    res.json({ events });
  } catch (error) {
    if (error?.code === 401 || error?.status === 401) {
      return res.status(401).json({ error: 'Потрібно повторно підключити Google Calendar.', needsGoogleConnect: true });
    }
    next(error);
  }
});

router.get('/events', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const result = await pool.query(
      `SELECT id, title, description, location, meet_link, start_at, end_at, google_event_id, synced_at, created_at
       FROM class_events
       WHERE user_id = $1
       ORDER BY start_at ASC, id ASC`,
      [userId]
    );
    res.json({ events: result.rows.map(toEventPayload) });
  } catch (error) {
    next(error);
  }
});

router.post('/events', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const title = normalizeEventTitle(req.body?.title);
    const description = String(req.body?.description || '').trim();
    const location = String(req.body?.location || '').trim();
    const meetLink = String(req.body?.meetLink || '').trim();
    const startAtRaw = String(req.body?.startAt || '').trim();
    const endAtRaw = String(req.body?.endAt || '').trim();

    if (!title || !startAtRaw || !endAtRaw) {
      return res.status(400).json({ error: 'Title, startAt, and endAt are required.' });
    }

    const startAt = new Date(startAtRaw);
    const endAt = new Date(endAtRaw);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return res.status(400).json({ error: 'Invalid event dates.' });
    }

    const result = await pool.query(
      `INSERT INTO class_events (user_id, title, description, location, meet_link, start_at, end_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, title, description, location, meet_link, start_at, end_at, google_event_id, synced_at, created_at`,
      [userId, title, description || null, location || null, meetLink || null, startAt.toISOString(), endAt.toISOString()]
    );

    res.status(201).json({ event: toEventPayload(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.post('/events/:id/sync', requireAuth, async (req, res, next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      return res.status(500).json({ error: 'Google OAuth is not configured.' });
    }

    const userId = req.session.userId;
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ error: 'Invalid event id.' });
    }

    const eventResult = await pool.query(
      `SELECT id, user_id, title, description, location, meet_link, start_at, end_at, google_event_id, synced_at, created_at
       FROM class_events
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [eventId, userId]
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const tokens = await getGoogleTokensByUser(userId);
    if (!tokens?.refresh_token) {
      return res.status(401).json({ error: 'Google Calendar is not connected.', needsGoogleConnect: true });
    }

    const auth = getGoogleOAuthClient();
    auth.setCredentials({
      access_token: tokens.access_token || undefined,
      refresh_token: tokens.refresh_token || undefined,
      scope: tokens.scope || undefined,
      token_type: tokens.token_type || undefined,
      expiry_date: tokens.expiry_date || undefined,
    });

    const local = eventResult.rows[0];
    const calendar = google.calendar({ version: 'v3', auth });
    const resource = {
      summary: normalizeEventTitle(local.title),
      description: local.description || undefined,
      location: local.location || local.meet_link || undefined,
      start: { dateTime: new Date(local.start_at).toISOString() },
      end: { dateTime: new Date(local.end_at).toISOString() },
    };

    let googleEventId = local.google_event_id || null;
    let googleHtmlLink = null;
    if (googleEventId) {
      const updated = await calendar.events.update({
        calendarId: 'primary',
        eventId: googleEventId,
        requestBody: resource,
      });
      googleHtmlLink = updated?.data?.htmlLink || null;
    } else {
      const created = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: resource,
      });
      googleEventId = created.data.id || null;
      googleHtmlLink = created?.data?.htmlLink || null;
    }

    const updateResult = await pool.query(
      `UPDATE class_events
       SET google_event_id = $1, synced_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING id, title, description, location, meet_link, start_at, end_at, google_event_id, synced_at, created_at`,
      [googleEventId, eventId]
    );

    res.json({ ok: true, event: toEventPayload(updateResult.rows[0]), htmlLink: googleHtmlLink });
  } catch (error) {
    if (error?.code === 401 || error?.status === 401) {
      return res.status(401).json({ error: 'Reconnect Google Calendar and try again.', needsGoogleConnect: true });
    }
    if (
      error?.code === 403 ||
      error?.status === 403 ||
      error?.errors?.some((item) => item?.reason === 'insufficientPermissions')
    ) {
      return res.status(403).json({
        error: 'Google Calendar permissions are insufficient. Reconnect Google Calendar and grant edit access.',
        needsGoogleConnect: true,
      });
    }
    next(error);
  }
});

router.delete('/events/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const eventId = Number(req.params.id);
    const deleteGoogle = String(req.query.deleteGoogle || 'true') !== 'false';

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ error: 'Invalid event id.' });
    }

    const eventResult = await pool.query(
      `SELECT id, user_id, google_event_id
       FROM class_events
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [eventId, userId]
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const local = eventResult.rows[0];
    if (deleteGoogle && local.google_event_id) {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
        return res.status(500).json({ error: 'Google OAuth is not configured.' });
      }

      const tokens = await getGoogleTokensByUser(userId);
      if (!tokens?.refresh_token) {
        return res.status(401).json({ error: 'Google Calendar is not connected.', needsGoogleConnect: true });
      }

      const auth = getGoogleOAuthClient();
      auth.setCredentials({
        access_token: tokens.access_token || undefined,
        refresh_token: tokens.refresh_token || undefined,
        scope: tokens.scope || undefined,
        token_type: tokens.token_type || undefined,
        expiry_date: tokens.expiry_date || undefined,
      });

      const calendar = google.calendar({ version: 'v3', auth });
      try {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: String(local.google_event_id),
        });
      } catch (googleDeleteError) {
        const status = googleDeleteError?.code || googleDeleteError?.status;
        if (status !== 404 && status !== 410) {
          throw googleDeleteError;
        }
      }
    }

    await pool.query('DELETE FROM class_events WHERE id = $1 AND user_id = $2', [eventId, userId]);
    res.json({ ok: true });
  } catch (error) {
    if (error?.code === 401 || error?.status === 401) {
      return res.status(401).json({ error: 'Reconnect Google Calendar and try again.', needsGoogleConnect: true });
    }
    if (
      error?.code === 403 ||
      error?.status === 403 ||
      error?.errors?.some((item) => item?.reason === 'insufficientPermissions')
    ) {
      return res.status(403).json({
        error: 'Google Calendar permissions are insufficient. Reconnect Google Calendar and grant edit access.',
        needsGoogleConnect: true,
      });
    }
    next(error);
  }
});


function toMaterialPayload(row) {
  return {
    id: row.id,
    userId: Number(row.user_id || 0),
    title: row.title,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileMime: row.file_mime || '',
    fileSize: Number(row.file_size || 0),
    uploadedBy: row.user_name || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

function toHomeworkPayload(row) {
  return {
    id: row.id,
    userId: Number(row.user_id || 0),
    title: row.title,
    dueText: row.due_text || '',
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileMime: row.file_mime || '',
    fileSize: Number(row.file_size || 0),
    uploadedBy: row.user_name || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

async function ensureClassMaterialsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS class_materials (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      file_url TEXT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_mime VARCHAR(190),
      file_size BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function ensureClassHomeworksTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS class_homeworks (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      due_text VARCHAR(255),
      file_url TEXT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_mime VARCHAR(190),
      file_size BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

router.get('/materials', requireAuth, async (req, res, next) => {
  try {
    await ensureClassMaterialsTable();
    const result = await pool.query(
      `SELECT cm.id, cm.user_id, cm.title, cm.file_url, cm.file_name, cm.file_mime, cm.file_size, cm.created_at, u.name AS user_name
       FROM class_materials cm
       JOIN users u ON u.id = cm.user_id
       ORDER BY cm.created_at DESC, cm.id DESC`
    );
    res.json({ materials: result.rows.map(toMaterialPayload) });
  } catch (error) {
    next(error);
  }
});

router.post('/materials', requireAuth, handleMaterialUpload, async (req, res, next) => {
  try {
    await ensureClassMaterialsTable();
    const userId = req.session.userId;
    const user = await getUserById(userId);
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({ error: `Лише викладач може додавати матеріали. Поточна роль: ${user?.role || 'unknown'}.` });
    }

    const title = String(req.body?.title || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Назва матеріалу є обовʼязковою.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Файл є обовʼязковим.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const inserted = await pool.query(
      `INSERT INTO class_materials (user_id, title, file_url, file_name, file_mime, file_size)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, title, file_url, file_name, file_mime, file_size, created_at`,
      [userId, title, fileUrl, req.file.originalname, req.file.mimetype || null, req.file.size || null]
    );

    res.status(201).json({
      material: toMaterialPayload({
        ...inserted.rows[0],
        user_name: user.name,
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/materials/:id', requireAuth, async (req, res, next) => {
  try {
    await ensureClassMaterialsTable();
    const materialId = Number(req.params.id);
    if (!Number.isInteger(materialId) || materialId <= 0) {
      return res.status(400).json({ error: 'Некоректний id матеріалу.' });
    }

    const userId = req.session.userId;
    const user = await getUserById(userId);
    const found = await pool.query(
      `SELECT id, user_id, file_url
       FROM class_materials
       WHERE id = $1
       LIMIT 1`,
      [materialId]
    );
    if (found.rows.length === 0) {
      return res.status(404).json({ error: 'Матеріал не знайдено.' });
    }

    const material = found.rows[0];
    const isOwner = Number(material.user_id) === Number(userId);
    const isTeacher = user?.role === 'teacher';
    if (!isOwner && !isTeacher) {
      return res.status(403).json({ error: 'Недостатньо прав для видалення матеріалу.' });
    }

    await pool.query('DELETE FROM class_materials WHERE id = $1', [materialId]);

    const relative = String(material.file_url || '').replace(/^\/+/, '');
    if (relative) {
      const absPath = path.join(__dirname, '..', relative);
      fs.unlink(absPath, () => {});
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get('/homeworks', requireAuth, async (req, res, next) => {
  try {
    await ensureClassHomeworksTable();
    const result = await pool.query(
      `SELECT ch.id, ch.user_id, ch.title, ch.due_text, ch.file_url, ch.file_name, ch.file_mime, ch.file_size, ch.created_at, u.name AS user_name
       FROM class_homeworks ch
       JOIN users u ON u.id = ch.user_id
       ORDER BY ch.created_at DESC, ch.id DESC`
    );
    res.json({ homeworks: result.rows.map(toHomeworkPayload) });
  } catch (error) {
    next(error);
  }
});

router.post('/homeworks', requireAuth, handleMaterialUpload, async (req, res, next) => {
  try {
    await ensureClassHomeworksTable();
    const userId = req.session.userId;
    const user = await getUserById(userId);
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({ error: `Лише викладач може додавати домашні завдання. Поточна роль: ${user?.role || 'unknown'}.` });
    }

    const title = String(req.body?.title || '').trim();
    const dueText = String(req.body?.dueText || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Назва домашнього завдання є обовʼязковою.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Файл є обовʼязковим.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const inserted = await pool.query(
      `INSERT INTO class_homeworks (user_id, title, due_text, file_url, file_name, file_mime, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, title, due_text, file_url, file_name, file_mime, file_size, created_at`,
      [userId, title, dueText || null, fileUrl, req.file.originalname, req.file.mimetype || null, req.file.size || null]
    );

    res.status(201).json({
      homework: toHomeworkPayload({
        ...inserted.rows[0],
        user_name: user.name,
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/homeworks/:id', requireAuth, async (req, res, next) => {
  try {
    await ensureClassHomeworksTable();
    const homeworkId = Number(req.params.id);
    if (!Number.isInteger(homeworkId) || homeworkId <= 0) {
      return res.status(400).json({ error: 'Некоректний id домашнього завдання.' });
    }

    const userId = req.session.userId;
    const user = await getUserById(userId);
    const found = await pool.query(
      `SELECT id, user_id, file_url
       FROM class_homeworks
       WHERE id = $1
       LIMIT 1`,
      [homeworkId]
    );
    if (found.rows.length === 0) {
      return res.status(404).json({ error: 'Домашнє завдання не знайдено.' });
    }

    const homework = found.rows[0];
    const isOwner = Number(homework.user_id) === Number(userId);
    const isTeacher = user?.role === 'teacher';
    if (!isOwner && !isTeacher) {
      return res.status(403).json({ error: 'Недостатньо прав для видалення домашнього завдання.' });
    }

    await pool.query('DELETE FROM class_homeworks WHERE id = $1', [homeworkId]);

    const relative = String(homework.file_url || '').replace(/^\/+/, '');
    if (relative) {
      const absPath = path.join(__dirname, '..', relative);
      fs.unlink(absPath, () => {});
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
module.exports = router;




