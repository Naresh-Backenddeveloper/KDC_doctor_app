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

/** The one switch point: point this at a NestJS client when the API exists. */
export const services: Services = {
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

export { ServiceError, injectFailure, mockControl } from './mock';
