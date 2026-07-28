import { Pipe, type PipeTransform } from '@angular/core';
import { parse, type DocumentNode } from 'graphql';

@Pipe({
	name: 'gql',
	standalone: true,
	pure: true,
})
export class GqlPipe implements PipeTransform {
	transform(value: string): DocumentNode {
		return parse(value);
	}
}
