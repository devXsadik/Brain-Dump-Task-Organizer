import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/context/TaskContext';
import { toast } from 'sonner';
import { Task } from '@/lib/types';

export function useAlarms() {
  const { user } = useAuth();
  const { todayTasks, weekTasks, backlogTasks } = useTasks();
  const allTasks = [...todayTasks, ...weekTasks, ...backlogTasks];
  
  // Keep track of alarms we've already fired to avoid duplicate toasts
  const firedAlarms = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only run if alarms are enabled
    if (!user?.alarmsEnabled) return;

    // Request notification permissions if we haven't already
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkAlarms = () => {
      const now = new Date().getTime();

      allTasks.forEach((task) => {
        if (!task.isMeeting || !task.meetingTime || task.isCompleted) return;

        const meetingTime = new Date(task.meetingTime).getTime();
        const diffMinutes = (meetingTime - now) / 60000;

        // We check for 30m, 10m, and 5m thresholds.
        // We use a small window (e.g., 1 minute) to catch it during the interval check
        const thresholds = [30, 10, 5];

        thresholds.forEach((threshold) => {
          const alarmId = `${task._id}-${threshold}`;
          
          if (
            diffMinutes > 0 && 
            diffMinutes <= threshold && 
            diffMinutes > (threshold - 1) && 
            !firedAlarms.current.has(alarmId)
          ) {
            firedAlarms.current.add(alarmId);
            
            // Show Toast (Toggle Message)
            toast.info(`Meeting in ${threshold} minutes!`, {
              description: task.title,
              duration: 10000,
            });

            // Show System Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Meeting in ${threshold} minutes!`, {
                body: task.title,
                icon: '/favicon.ico' // Assuming a favicon exists
              });
            }
          }
        });
      });
    };

    // Check immediately, then every 30 seconds
    checkAlarms();
    const interval = setInterval(checkAlarms, 30000);

    return () => clearInterval(interval);
  }, [user?.alarmsEnabled, allTasks]);
}
