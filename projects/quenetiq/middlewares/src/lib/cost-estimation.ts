import { parse, visit } from 'graphql';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { GraphqlMiddleware, GraphQLResult } from '@quenetiq/core';

export interface QueryCost {
	/** Raw field count (each selection = 1). */
	fields: number;
	/** Maximum nesting depth. */
	depth: number;
	/** Weighted cost = sum of (1 + depth * depthFactor) per field. */
	cost: number;
	/** Number of fragment spreads used. */
	fragments: number;
	/** Number of aliased fields. */
	aliases: number;
	/** Human-readable breakdown. */
	details: string[];
}

export interface CostEstimationConfig {
	/** Maximum allowed cost. Requests above this are blocked (in 'block' mode). */
	maxCost?: number;
	/** Cost threshold for warnings. */
	warnAt?: number;
	/** Multiplier per nesting level. Default 0.5. */
	depthFactor?: number;
	/** Action when cost > maxCost. Default 'warn'. */
	mode?: 'block' | 'warn' | 'pass';
}

export function estimateQueryCost(query: string, depthFactor = 0.5): QueryCost {
	let doc;
	try {
		doc = parse(query);
	} catch {
		return { fields: 0, depth: 0, cost: 0, fragments: 0, aliases: 0, details: ['[parse error]'] };
	}

	let fields = 0;
	let maxDepth = 0;
	let fragments = 0;
	let aliases = 0;
	let currentDepth = 0;
	const details: string[] = [];

	visit(doc, {
		Field: {
			enter(node) {
				fields++;
				if (node.alias) aliases++;
				currentDepth++;
				if (currentDepth > maxDepth) maxDepth = currentDepth;
				const fieldCost = 1 + (currentDepth - 1) * depthFactor;
				details.push(
					`${'  '.repeat(currentDepth - 1)}${node.name.value}: cost=${fieldCost.toFixed(1)} ` +
						`(depth=${currentDepth - 1})`,
				);
			},
			leave() {
				currentDepth--;
			},
		},
		FragmentSpread() {
			fragments++;
		},
	});

	let totalCost = 0;
	let depth = 0;
	visit(doc, {
		Field: {
			enter() {
				depth++;
				totalCost += 1 + (depth - 1) * depthFactor;
			},
			leave() {
				depth--;
			},
		},
		FragmentSpread() {
			totalCost += 1 + depth * depthFactor;
		},
	});

	return {
		fields,
		depth: maxDepth,
		cost: Math.round(totalCost * 100) / 100,
		fragments,
		aliases,
		details,
	};
}

export function costEstimationMiddleware(config?: CostEstimationConfig): GraphqlMiddleware {
	const maxCost = config?.maxCost ?? 1000;
	const warnAt = config?.warnAt ?? 500;
	const depthFactor = config?.depthFactor ?? 0.5;
	const mode = config?.mode ?? 'warn';

	return (request, next) => {
		const cost = estimateQueryCost(request.query, depthFactor);

		if (cost.cost > maxCost && mode === 'block') {
			const errorResult: GraphQLResult<never> = {
				status: 'error',
				error:
					`Query cost ${cost.cost} exceeds maximum ${maxCost}. ` +
					`Reduce query complexity (fields: ${cost.fields}, depth: ${cost.depth}).`,
				errorCode: 'COMPLEXITY_EXCEEDED',
			};
			return of(errorResult);
		}

		if (cost.cost > warnAt && typeof console !== 'undefined') {
			console.warn(
				`[Quenetiq] Query complexity warning: cost=${cost.cost} (threshold=${warnAt}), ` +
					`fields=${cost.fields}, depth=${cost.depth}, fragments=${cost.fragments}`,
			);
		}

		return next(request).pipe(
			tap({
				next: (result) => {
					const meta = (result as Record<string, unknown>).extensions as Record<string, unknown> | undefined;
					if (meta?.cost) {
						const actualCost = Number(meta.cost);
						if (actualCost > cost.cost * 2 && typeof console !== 'undefined') {
							console.warn(
								`[Quenetiq] Server-reported cost (${actualCost}) is much higher than estimated (${cost.cost}). ` +
									'Consider reviewing query efficiency.',
							);
						}
					}
				},
			}),
		);
	};
}
