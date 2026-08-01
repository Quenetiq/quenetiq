<script setup lang="ts">
const props = withDefaults(defineProps<{
	variant?: 'text' | 'circle' | 'rect' | 'card' | 'table' | 'list' | 'paragraph';
	animation?: 'pulse' | 'wave' | 'none';
	width?: string;
	height?: string;
	textWidth?: string;
	tableRows?: number;
	listItems?: number;
	paragraphLines?: number;
}>(), {
	variant: 'text',
	animation: 'pulse',
	textWidth: '100%',
	tableRows: 5,
	listItems: 4,
	paragraphLines: 4,
});
</script>

<template>
	<div
		:class="['dumbql-skeleton', `dumbql-skeleton--${variant}`, `dumbql-skeleton--${animation}`]"
		:style="{ width, height }"
		role="status"
		aria-label="Loading content"
	>
		<template v-if="variant === 'text'">
			<div class="dumbql-skeleton__line" :style="{ width: textWidth }"></div>
		</template>
		<template v-else-if="variant === 'circle'">
			<div class="dumbql-skeleton__circle"></div>
		</template>
		<template v-else-if="variant === 'rect'">
			<div class="dumbql-skeleton__rect"></div>
		</template>
		<template v-else-if="variant === 'card'">
			<div class="dumbql-skeleton__card">
				<div class="dumbql-skeleton__card-img"></div>
				<div class="dumbql-skeleton__card-body">
					<div class="dumbql-skeleton__line dumbql-skeleton__line--title"></div>
					<div class="dumbql-skeleton__line"></div>
					<div class="dumbql-skeleton__line dumbql-skeleton__line--short"></div>
				</div>
			</div>
		</template>
		<template v-else-if="variant === 'table'">
			<div class="dumbql-skeleton__table">
				<div v-for="n in tableRows" :key="n" class="dumbql-skeleton__table-row">
					<div class="dumbql-skeleton__table-cell"></div>
					<div class="dumbql-skeleton__table-cell"></div>
					<div class="dumbql-skeleton__table-cell"></div>
				</div>
			</div>
		</template>
		<template v-else-if="variant === 'list'">
			<div class="dumbql-skeleton__list">
				<div v-for="n in listItems" :key="n" class="dumbql-skeleton__list-item">
					<div class="dumbql-skeleton__circle dumbql-skeleton__circle--sm"></div>
					<div class="dumbql-skeleton__list-text">
						<div class="dumbql-skeleton__line dumbql-skeleton__line--title"></div>
						<div class="dumbql-skeleton__line dumbql-skeleton__line--short"></div>
					</div>
				</div>
			</div>
		</template>
		<template v-else-if="variant === 'paragraph'">
			<div class="dumbql-skeleton__paragraph">
				<div
					v-for="n in paragraphLines"
					:key="n"
					class="dumbql-skeleton__line"
					:style="{ width: n === paragraphLines ? '60%' : '100%' }"
				></div>
			</div>
		</template>
	</div>
</template>

<style scoped>
.dumbql-skeleton { border-radius: 4px; overflow: hidden; }
.dumbql-skeleton__line { height: 14px; border-radius: 4px; width: 100%; background: var(--dumbql-skeleton-bg, #e2e8f0); }
.dumbql-skeleton__line--title { width: 70%; height: 18px; }
.dumbql-skeleton__line--short { width: 50%; }
.dumbql-skeleton__circle { width: 48px; height: 48px; border-radius: 50%; background: var(--dumbql-skeleton-bg, #e2e8f0); }
.dumbql-skeleton__circle--sm { width: 32px; height: 32px; }
.dumbql-skeleton__rect { width: 100%; height: 120px; border-radius: 4px; background: var(--dumbql-skeleton-bg, #e2e8f0); }
.dumbql-skeleton__card { border: 1px solid var(--dumbql-skeleton-border, #e2e8f0); border-radius: 8px; overflow: hidden; }
.dumbql-skeleton__card-img { width: 100%; height: 160px; background: var(--dumbql-skeleton-bg, #e2e8f0); }
.dumbql-skeleton__card-body { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.dumbql-skeleton__table { width: 100%; }
.dumbql-skeleton__table-row { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--dumbql-skeleton-border, #e2e8f0); }
.dumbql-skeleton__table-cell { flex: 1; height: 16px; border-radius: 4px; background: var(--dumbql-skeleton-bg, #e2e8f0); }
.dumbql-skeleton__table-cell:last-child { flex: 0.5; }
.dumbql-skeleton__list { display: flex; flex-direction: column; gap: 16px; }
.dumbql-skeleton__list-item { display: flex; gap: 12px; align-items: center; }
.dumbql-skeleton__list-text { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.dumbql-skeleton__paragraph { display: flex; flex-direction: column; gap: 10px; }

.dumbql-skeleton--pulse .dumbql-skeleton__line,
.dumbql-skeleton--pulse .dumbql-skeleton__circle,
.dumbql-skeleton--pulse .dumbql-skeleton__rect,
.dumbql-skeleton--pulse .dumbql-skeleton__card-img,
.dumbql-skeleton--pulse .dumbql-skeleton__table-cell { animation: dumbql-pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

.dumbql-skeleton--wave .dumbql-skeleton__line,
.dumbql-skeleton--wave .dumbql-skeleton__circle,
.dumbql-skeleton--wave .dumbql-skeleton__rect,
.dumbql-skeleton--wave .dumbql-skeleton__card-img,
.dumbql-skeleton--wave .dumbql-skeleton__table-cell { animation: dumbql-wave 1.6s ease-in-out infinite; background: linear-gradient(90deg, var(--dumbql-skeleton-bg, #e2e8f0) 25%, var(--dumbql-skeleton-shine, #f1f5f9) 50%, var(--dumbql-skeleton-bg, #e2e8f0) 75%); background-size: 200% 100%; }

@keyframes dumbql-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes dumbql-wave { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
