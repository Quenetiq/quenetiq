<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
	color?: 'primary' | 'accent' | 'warn' | 'inherit';
	label?: string;
	showLabel?: boolean;
}>(), {
	size: 'md',
	color: 'primary',
	label: 'Loading...',
	showLabel: false,
});

const sizePx = computed(() => ({ xs: 14, sm: 18, md: 28, lg: 40, xl: 56 }[props.size]));
</script>

<template>
	<div
		:class="['dumbql-spinner', `dumbql-spinner--${color}`]"
		style="display: inline-flex; flex-direction: column; align-items: center; gap: 8px"
		role="status"
		aria-label="Loading"
	>
		<svg :width="sizePx" :height="sizePx" viewBox="0 0 50 50" class="dumbql-spinner__svg">
			<circle
				class="dumbql-spinner__circle"
				cx="25" cy="25" r="20"
				fill="none" stroke="currentColor" stroke-width="4"
				stroke-linecap="round"
			/>
		</svg>
		<span v-if="showLabel" class="dumbql-spinner__label">{{ label }}</span>
	</div>
</template>

<style scoped>
.dumbql-spinner__svg { animation: dumbql-spin 0.8s linear infinite; }
.dumbql-spinner__circle { stroke-linecap: round; stroke-dasharray: 90, 150; stroke-dashoffset: 0; animation: dumbql-dash 1.4s ease-in-out infinite; }
.dumbql-spinner__label { font-size: 12px; opacity: 0.7; }

.dumbql-spinner--primary .dumbql-spinner__circle { stroke: var(--dumbql-primary, #3b82f6); }
.dumbql-spinner--accent .dumbql-spinner__circle { stroke: var(--dumbql-accent, #8b5cf6); }
.dumbql-spinner--warn .dumbql-spinner__circle { stroke: var(--dumbql-warn, #ef4444); }
.dumbql-spinner--inherit .dumbql-spinner__circle { stroke: currentColor; }

@keyframes dumbql-spin { 100% { transform: rotate(360deg); } }
@keyframes dumbql-dash {
	0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
	50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
	100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
}
</style>
