import { Pipe, type PipeTransform } from '@angular/core';
import type { GraphQLResult } from '../graphql.service';

@Pipe({
	name: 'graphqlIsError',
	standalone: true,
	pure: true,
})
export class GraphqlIsErrorPipe implements PipeTransform {
	transform<T>(result: GraphQLResult<T> | null | undefined): boolean {
		return result?.status === 'error';
	}
}
