import { Pipe, type PipeTransform } from '@angular/core';
import type { GraphQLResult } from '../graphql.service';

@Pipe({
	name: 'graphqlData',
	standalone: true,
	pure: true,
})
export class GraphqlDataPipe implements PipeTransform {
	transform<T>(result: GraphQLResult<T> | null | undefined): T | null {
		if (!result || result.status !== 'success') return null;
		return result.data;
	}
}
