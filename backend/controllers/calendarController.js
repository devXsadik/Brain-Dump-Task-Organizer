import { google } from 'googleapis';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';

const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/calendar/callback'
  );
};

export const getAuthUrl = asyncHandler(async (req, res, next) => {
  const oauth2Client = getOAuth2Client();
  const scopes = ['https://www.googleapis.com/auth/calendar.events'];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: req.user._id.toString(), // pass user id in state to link on callback
  });

  res.status(200).json({ success: true, url });
});

export const oauthCallback = asyncHandler(async (req, res, next) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send('Missing code or state');
  }

  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  await User.findByIdAndUpdate(state, {
    googleTokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    }
  });

  // Redirect back to frontend settings/dashboard
  res.redirect('http://localhost:3000/dashboard?calendarLinked=true');
});

export const disconnectCalendar = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      'googleTokens.accessToken': null,
      'googleTokens.refreshToken': null,
      'googleTokens.expiryDate': null,
    }
  });

  res.status(200).json({ success: true, message: 'Calendar disconnected' });
});

export const toggleAlarms = asyncHandler(async (req, res, next) => {
  const { enabled } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { alarmsEnabled: enabled },
    { new: true, runValidators: true }
  );

  res.status(200).json({ success: true, alarmsEnabled: user.alarmsEnabled });
});
