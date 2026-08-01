import { type Provider } from '@angular/core';
import { MockGraphqlService } from './mock-graphql.service';

export function provideQuenetiqTesting(): Provider[] {
	return [MockGraphqlService];
}
