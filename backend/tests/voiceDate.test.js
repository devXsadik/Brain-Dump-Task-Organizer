import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseVoiceSchedule,
  hasDateTimeSignals,
  cleanTitleFromSchedule,
  todayContext,
  categoryFromScheduledDate,
} from '../services/voiceDateParser.js';
import { tryVoiceFastPath } from '../services/voiceFastPaths.js';

describe('voiceDateParser', () => {
  const ref = new Date('2026-06-29T10:00:00Z'); // Sunday

  it('detects date/time signals', () => {
    assert.equal(hasDateTimeSignals('call mom tomorrow at 3pm'), true);
    assert.equal(hasDateTimeSignals('buy milk'), false);
  });

  it('parses tomorrow at 3pm into this_week', () => {
    const r = parseVoiceSchedule('call dentist tomorrow at 3pm', ref);
    assert.ok(r);
    assert.equal(r.isMeeting, false);
    assert.ok(r.reminderAt);
    assert.equal(r.category, 'this_week');
    assert.match(r.cleanTitle.toLowerCase(), /dentist|call/);
  });

  it('routes today to today column', () => {
    const r = parseVoiceSchedule('call mom today at 5pm', ref);
    assert.ok(r);
    assert.equal(r.category, 'today');
  });

  it('routes yesterday to backlog', () => {
    const r = parseVoiceSchedule('submit report yesterday at 2pm', ref);
    assert.ok(r);
    assert.equal(r.category, 'backlog');
  });

  it('parses meeting with time', () => {
    const r = parseVoiceSchedule('meeting with John Friday at 2pm', ref);
    assert.ok(r);
    assert.equal(r.isMeeting, true);
    assert.ok(r.meetingTime);
  });

  it('cleans title from date fragments', () => {
    const clean = cleanTitleFromSchedule('buy groceries tomorrow at 5pm');
    assert.doesNotMatch(clean.toLowerCase(), /tomorrow|5pm/);
    assert.match(clean.toLowerCase(), /groceries/);
  });

  it('returns today context', () => {
    const ctx = todayContext();
    assert.ok(ctx.isoDate);
    assert.ok(ctx.spoken);
  });

  it('categoryFromScheduledDate rules', () => {
    const today = new Date('2026-06-29T12:00:00');
    assert.equal(categoryFromScheduledDate(new Date('2026-06-29T15:00:00'), today), 'today');
    assert.equal(categoryFromScheduledDate(new Date('2026-06-30T10:00:00'), today), 'this_week');
    assert.equal(categoryFromScheduledDate(new Date('2026-06-28T10:00:00'), today), 'backlog');
  });
});

describe('voiceFastPaths dates', () => {
  const userId = 'date-test-user';
  const tasks = [
    {
      _id: '1',
      title: 'Team sync',
      category: 'today',
      isCompleted: false,
      isMeeting: true,
      meetingTime: new Date('2026-06-29T15:00:00Z'),
    },
  ];

  it('answers what is the date', async () => {
    const res = await tryVoiceFastPath(userId, "what's the date", tasks);
    assert.equal(res.intent, 'query');
    assert.match(res.spokenReply, /Today is/);
  });

  it('lists meetings', async () => {
    const res = await tryVoiceFastPath(userId, 'what meetings today', tasks);
    assert.equal(res.intent, 'query');
    assert.match(res.spokenReply, /Team sync|No scheduled/);
  });
});
