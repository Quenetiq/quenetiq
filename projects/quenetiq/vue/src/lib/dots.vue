<script setup lang="ts">
const props = withDefaults(defineProps<{
	size?: 'sm' | 'md' | 'lg';
	color?: 'primary' | 'accent' | 'warn' | 'inherit';
	label?: string;
	showLabel?: boolean;
}>(), {
	size: 'md',
	color: 'primary',
	label: 'Loading',
	showLabel: false,
});

const dotPx = { sm: 6, md: 10, lg: 14 }[props.size];
</script>

<template>
	<div
		:class="['dumbql-dots', `dumbql-dots--${color}`]"
		style="display: inline-flex; align-items: center; gap: 6px"
		role="status"
		aria-label="Loading"
	>
		<span v-for="i in 3" :key="i" class="dumbql-dots__dot" :style="{ width: dotPx + 'px', height: dotPx + 'px', animationDelay: (-0.32 + (i - 1) * 0.16) + 's' }"></span>
		<span v-if="showLabel" class="dumbql-dots__label">{{ label }}</span>
	</div>
</template>

<style scoped>
.dumbql-dots__dot { border-radius: 50%; animation: dumbql-bounce 1.4s infinite ease-in-out both; }
.dumbql-dots__label { margin-left: 8px; font-size: 12px; opacity: 0.7; }

.dumbql-dots--primary .dumbql-dots__dot { background: var(--dumbql-primary, #3b82f6); }
.dumbql-dots--accent .dumbql-dots__dot { background: var(--dumbql-accent, #8b5cf6); }
.dumbql-dots--warn .dumbql-dots__dot { background: var(--dumbql-warn, #ef4444); }
.dumbql-dots--inherit .dumbql-dots__dot { background: currentColor; }

@keyframes dumbql-bounce {
	0%, 80%, 100% { transform: scale(0); }
	40% { transform: scale(1); }
}
</style>
