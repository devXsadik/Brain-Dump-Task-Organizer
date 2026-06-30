import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getVoiceSession,
  clearVoiceSession,
  resolveClarificationChoice,
  isAffirmative,
  setPendingClarification,
} from '../services/voiceSession.js';
import { tryVoiceFastPath } from '../services/voiceFastPaths.js';

const userId = 'test-user-1';

describe('voiceSession', () => {
  it('resolves clarification by number', () => {
    clearVoiceSession(userId);
    setPendingClarification(
      userId,
      [{ _id: 'a', title: 'Buy milk' }, { _id: 'b', title: 'Call dentist' }],
      'complete'
    );
    assert.equal(resolveClarificationChoice(userId, '2'), 'b');
    assert.equal(resolveClarificationChoice(userId, 'first'), 'a');
  });

  it('detects affirmative confirm phrases', () => {
    assert.equal(isAffirmative('confirm'), true);
    assert.equal(isAffirmative('হ্যাঁ'), true);
    assert.equal(isAffirmative('maybe'), false);
  });

  it('tracks lastTaskId in session', () => {
    clearVoiceSession(userId);
    const s = getVoiceSession(userId);
    s.lastTaskId = 'task-123';
    assert.equal(getVoiceSession(userId).lastTaskId, 'task-123');
  });
});

describe('voiceFastPaths', () => {
  const tasks = [
    { _id: '1', title: 'Buy milk', category: 'today', isCompleted: false },
    { _id: '2', title: 'Buy eggs', category: 'today', isCompleted: false },
    { _id: '3', title: 'Report draft', category: 'this_week', isCompleted: false },
  ];

  it('lists today tasks on query', async () => {
    const res = await tryVoiceFastPath(userId, "what's on my plate", tasks);
    assert.equal(res.intent, 'query');
    assert.match(res.spokenReply, /Buy milk/);
  });

  it('counts open tasks', async () => {
    const res = await tryVoiceFastPath(userId, 'how many tasks', tasks);
    assert.match(res.spokenReply, /3 open/);
  });

  it('returns clarification for ambiguous complete', async () => {
    const res = await tryVoiceFastPath(userId, 'complete buy', tasks);
    assert.equal(res.needsClarification, true);
    assert.ok(res.clarificationOptions.length >= 2);
  });

  it('returns clarification for ambiguous move', async () => {
    const res = await tryVoiceFastPath(userId, 'move buy to backlog', tasks);
    assert.equal(res.needsClarification, true);
    assert.equal(res.clarificationAction, 'move');
  });

  it('asks confirmation before delete', async () => {
    const res = await tryVoiceFastPath(userId, 'delete report', tasks);
    assert.equal(res.needsConfirmation, true);
    assert.equal(res.intent, 'delete');
  });
});
