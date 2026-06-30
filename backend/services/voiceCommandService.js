import Task from '../models/Task.js';
import { runVoicePipeline } from './voicePipeline.js';

export const executeVoiceCommand = async (userId, transcript, tasks, confirmDelete = false) => {
  return runVoicePipeline(userId, transcript, tasks, confirmDelete);
};

export const loadUserTasks = async (userId) =>
  Task.find({ userId }).sort({ createdAt: -1 });
