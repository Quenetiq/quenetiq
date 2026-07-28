import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import type { Observable } from 'rxjs';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTaiga, TuiNotificationService } from '@taiga-ui/core';
import {
	provideQuenetiq,
	loggingMiddleware,
	devtoolsMiddleware,
	provideDevtools,
	nullDetectionMiddleware,
	provideNullDetection,
} from '@quenetiq/core';
import type { DevtoolsConfig } from '@quenetiq/core';
import quenetiqConfig from '../../quenetiq.config';

import { routes } from './app.routes';

const devtoolsCfg: DevtoolsConfig | undefined =
	typeof quenetiqConfig.devtools === 'object' ? quenetiqConfig.devtools : undefined;

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideHttpClient(),
		provideTaiga(),
		provideQuenetiq({
			...quenetiqConfig,
			middleware: [
				loggingMiddleware('Quenetiq'),
				...(devtoolsCfg ? [devtoolsMiddleware(devtoolsCfg)] : []),
				nullDetectionMiddleware(),
			],
			onError: {
				provide: TuiNotificationService,
				use: (service: unknown, error: string) =>
					(service as TuiNotificationService).open(error, { label: 'GraphQL Error', appearance: 'negative' }) as Observable<unknown>,
			},
		}),
		...(devtoolsCfg ? provideDevtools(devtoolsCfg) : []),
		provideNullDetection(),
		provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })),
	],
};
