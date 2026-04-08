import { seedRoleInboxIfNeeded, deriveInboxFromData } from './inbox';
import { seedNotificationCenterIfNeeded, deriveQueueNotifications } from './notifications';
import { seedAppointmentsIfNeeded } from './appointments';
import { trackTelemetry } from './observability';

let bootstrapped = false;

export function bootstrapEnhancements(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  seedRoleInboxIfNeeded();
  seedNotificationCenterIfNeeded();
  seedAppointmentsIfNeeded();
  deriveInboxFromData();
  deriveQueueNotifications();

  trackTelemetry({
    name: 'enhancements.bootstrap.completed',
    level: 'info',
    route: 'app-bootstrap',
    context: {
      features: [
        'role-inbox-sla',
        'notifications',
        'clinical-safety-engine',
        'follow-up-scheduling',
        'timeline-search',
        'data-quality-rules',
        'permissions',
        'observability',
      ],
    },
  });
}
