<script setup lang="ts">
const props = withDefaults(defineProps<{
	value?: number;
	color?: 'primary' | 'accent' | 'warn' | 'success' | 'inherit';
	size?: 'sm' | 'md' | 'lg';
	width?: string;
	showLabel?: boolean;
	indeterminate?: boolean;
}>(), {
	value: 0,
	color: 'primary',
	size: 'md',
	showLabel: false,
	indeterminate: false,
});

const trackH = { sm: 4, md: 8, lg: 14 }[props.size];
</script>

<template>
	<div
		:class="['dumbql-progress', `dumbql-progress--${color}`]"
		:style="{ width }"
		role="progressbar"
		:aria-valuenow="value"
		aria-valuemin="0"
		aria-valuemax="100"
	>
		<div class="dumbql-progress__track" :style="{ height: trackH + 'px' }">
			<div
				class="dumbql-progress__fill"
				:class="{ 'dumbql-progress__fill--indeterminate': indeterminate }"
				:style="indeterminate ? {} : { width: Math.min(100, Math.max(0, value)) + '%' }"
			></div>
		</div>
		<span v-if="showLabel" class="dumbql-progress__label">{{ value }}%</span>
	</div>
</template>

<style scoped>
.dumbql-progress { display: flex; align-items: center; gap: 10px; }
.dumbql-progress__track { flex: 1; border-radius: 999px; overflow: hidden; background: var(--dumbql-progress-track, #e2e8f0); }
.dumbql-progress__fill { height: 100%; border-radius: 999px; transition: width 0.3s ease; }
.dumbql-progress__label { font-size: 12px; min-width: 32px; text-align: right; opacity: 0.8; font-variant-numeric: tabular-nums; }

.dumbql-progress--primary .dumbql-progress__fill { background: var(--dumbql-primary, #3b82f6); }
.dumbql-progress--accent .dumbql-progress__fill { background: var(--dumbql-accent, #8b5cf6); }
.dumbql-progress--warn .dumbql-progress__fill { background: var(--dumbql-warn, #ef4444); }
.dumbql-progress--success .dumbql-progress__fill { background: var(--dumbql-success, #22c55e); }
.dumbql-progress--inherit .dumbql-progress__fill { background: currentColor; }

.dumbql-progress__fill--indeterminate { width: 100% !important; animation: dumbql-indeterminate 1.8s ease-in-out infinite; transform-origin: left; }

@keyframes dumbql-indeterminate {
	0% { transform: translateX(-100%) scaleX(0.3); }
	50% { transform: translateX(30%) scaleX(0.6); }
	100% { transform: translateX(100%) scaleX(0.3); }
}
</style>
