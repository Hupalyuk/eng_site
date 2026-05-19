const crypto = require('crypto');
const express = require('express');
const { google } = require('googleapis');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const getOAuthClient = () =>
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const result = await pool.query(
      'SELECT id, refresh_token FROM user_google_tokens WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    res.json({ connected: result.rows.length > 0 && Boolean(result.rows[0].refresh_token) });
  } catch (error) {
    next(error);
  }
});

router.get('/connect', requireAuth, async (req, res, next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      return res.status(500).json({ error: 'Google OAuth не налаштований у змінних середовища.' });
    }

    const oAuth2Client = getOAuthClient();
    const state = crypto.randomBytes(16).toString('hex');
    req.session.googleOAuthState = state;

    const url = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      state,
    });

    res.json({ url });
  } catch (error) {
    next(error);
  }
});

router.get('/callback', async (req, res, next) => {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const expectedState = req.session?.googleOAuthState;
    const frontendBase = String(process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',')[0].trim();

    if (!code) {
      return res.redirect(`${frontendBase}/class?google=error`);
    }

    if (!expectedState || state !== expectedState) {
      return res.redirect(`${frontendBase}/class?google=state_error`);
    }

    if (!req.session?.userId) {
      return res.redirect(`${frontendBase}/login?google=auth_required`);
    }

    const userId = req.session.userId;
    const oAuth2Client = getOAuthClient();
    const tokenResponse = await oAuth2Client.getToken(code);
    const tokens = tokenResponse.tokens || {};

    await pool.query(
      `INSERT INTO user_google_tokens (user_id, access_token, refresh_token, scope, token_type, expiry_date, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = COALESCE(EXCLUDED.refresh_token, user_google_tokens.refresh_token),
         scope = EXCLUDED.scope,
         token_type = EXCLUDED.token_type,
         expiry_date = EXCLUDED.expiry_date,
         updated_at = NOW()`,
      [
        userId,
        tokens.access_token || null,
        tokens.refresh_token || null,
        tokens.scope || null,
        tokens.token_type || null,
        tokens.expiry_date || null,
      ]
    );

    delete req.session.googleOAuthState;
    res.redirect(`${frontendBase}/class?google=connected`);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

