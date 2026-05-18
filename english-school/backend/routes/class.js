const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

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

async function createGoogleMeetSpace() {
  const accessToken = process.env.GOOGLE_MEET_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('Не налаштовано GOOGLE_MEET_ACCESS_TOKEN для Google Meet API.');
  }

  const response = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || 'Не вдалося створити простір Google Meet.';
    throw new Error(message);
  }

  return {
    meetingUri: payload.meetingUri,
    spaceName: payload.name,
  };
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

router.post('/meet-link', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const row = await findLatestGroupByUser(userId);
    if (!row) {
      return res.status(404).json({ error: 'Групу користувача не знайдено.' });
    }

    if (row.meet_link) {
      return res.json({ ok: true, meetLink: row.meet_link, spaceName: row.meet_space_name || null, reused: true });
    }

    const created = await createGoogleMeetSpace();
    await pool.query(
      `UPDATE course_groups
       SET meet_link = $1, meet_space_name = $2
       WHERE id = $3`,
      [created.meetingUri, created.spaceName || null, row.id]
    );

    res.json({
      ok: true,
      meetLink: created.meetingUri,
      spaceName: created.spaceName || null,
      reused: false,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
