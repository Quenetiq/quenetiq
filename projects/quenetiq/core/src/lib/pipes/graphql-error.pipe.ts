import { Pipe, type PipeTransform } from '@angular/core';
import type { GraphQLResult } from '../graphql.service';

@Pipe({
	name: 'graphqlError',
	standalone: true,
	pure: true,
})
export class GraphqlErrorPipe implements PipeTransform {
	transform<T>(result: GraphQLResult<T> | null | undefined): string | null {
		if (!result || result.status !== 'error') return null;
		return result.error;
	}
}
