import { Pipe, type PipeTransform } from '@angular/core';
import type { GraphQLResult } from '../graphql.service';

@Pipe({
	name: 'graphqlStatus',
	standalone: true,
	pure: true,
})
export class GraphqlStatusPipe implements PipeTransform {
	transform<T>(result: GraphQLResult<T> | null | undefined): 'success' | 'error' | null {
		if (!result) return null;
		return result.status;
	}
}
