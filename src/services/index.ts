import { mockAuthService, type AuthService } from './auth';
import { mockVerificationService, type VerificationService } from './verification';
import { mockProfileService, type ProfileService } from './profile';
import { mockAppointmentsService, type AppointmentsService } from './appointments';
import { mockRecordsService, type RecordsService } from './records';
import { mockPrescriptionsService, type PrescriptionsService } from './prescriptions';
import { mockAvailabilityService, type AvailabilityService } from './availability';
import { mockEarningsService, type EarningsService } from './earnings';
import { mockNotificationsService, type NotificationsService } from './notifications';
import { mockSupportService, type SupportService } from './support';
import { LIVE } from './config';
import { liveAuthService } from './live/auth';
import { liveVerificationService } from './live/verification';
import { liveProfileService } from './live/profile';
import { liveAppointmentsService } from './live/appointments';
import { liveRecordsService } from './live/records';
import { livePrescriptionsService } from './live/prescriptions';
import { liveAvailabilityService } from './live/availability';
import { liveEarningsService } from './live/earnings';
import { liveNotificationsService } from './live/notifications';
import { liveSupportService } from './live/support';
// Each registers its stores' loaders with services/live/sync.ts.
import './live/sync-schedule';
import './live/sync-records';
import './live/sync-account';

export interface Services {
  auth: AuthService;
  verification: VerificationService;
  profile: ProfileService;
  appointments: AppointmentsService;
  records: RecordsService;
  prescriptions: PrescriptionsService;
  availability: AvailabilityService;
  earnings: EarningsService;
  notifications: NotificationsService;
  support: SupportService;
}

const demo: Services = {
  auth: mockAuthService,
  verification: mockVerificationService,
  profile: mockProfileService,
  appointments: mockAppointmentsService,
  records: mockRecordsService,
  prescriptions: mockPrescriptionsService,
  availability: mockAvailabilityService,
  earnings: mockEarningsService,
  notifications: mockNotificationsService,
  support: mockSupportService,
};

/**
 * Live builds: the KDC+ backend (services/live/), with the stores loaded through the
 * sync domains registered by sync-schedule, sync-records and sync-account.
 */
const live: Services = {
  auth: liveAuthService,
  verification: liveVerificationService,
  profile: liveProfileService,
  appointments: liveAppointmentsService,
  records: liveRecordsService,
  prescriptions: livePrescriptionsService,
  availability: liveAvailabilityService,
  earnings: liveEarningsService,
  notifications: liveNotificationsService,
  support: liveSupportService,
};

/** The one switch point (services/config.ts). */
export const services: Services = LIVE ? live : demo;

export { ServiceError, injectFailure, mockControl } from './mock';
