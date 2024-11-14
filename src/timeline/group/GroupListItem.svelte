<script lang="ts">
	import type { TimelineGroup } from "src/timeline/group/group";
	import GroupColorInput from "src/timeline/group/GroupColorInput.svelte";
	import GroupQueryInput from "src/timeline/group/GroupQueryInput.svelte";
	import ActionButton from "src/view/inputs/ActionButton.svelte";
	import { onDestroy } from "svelte";

	interface $$Props {
		group: TimelineGroup;
		class?: string;
		style?: string;
		onRecolored?(group: TimelineGroup): void;
		onRequeried?(group: TimelineGroup): void;
		onRemove?: () => void;
		onPressDragHandle?(event: {
			readonly currentTarget: HTMLElement;
			readonly offsetX: number;
			readonly offsetY: number;
			readonly clientX: number;
			readonly clientY: number;
		}): void;
	}

	export let group: $$Props["group"];
	let className: $$Props["class"] = undefined;
	export { className as class };
	export let style: $$Props["style"] = undefined;
	export let onRecolored: $$Props["onRecolored"] = undefined;
	export let onRequeried: $$Props["onRequeried"] = undefined;
	export let onRemove: $$Props["onRemove"] = undefined;
	export let onPressDragHandle: $$Props["onPressDragHandle"] = undefined;

	let element: HTMLElement | null = null;

	function onDragHandeMouseDown(
		event: MouseEvent & { currentTarget: HTMLElement },
	) {
		if (onPressDragHandle && element) {
			const currentTarget = element;
			onPressDragHandle({
				get currentTarget() {
					return currentTarget;
				},
				offsetX: event.offsetX + event.currentTarget.offsetLeft,
				offsetY: event.offsetY + event.currentTarget.offsetTop,
				clientX: event.clientX,
				clientY: event.clientY,
			});
		}
	}
</script>

<li
	bind:this={element}
	class="timeline-view-color-group {className ?? ''}"
	{style}
>
	<GroupQueryInput
		queriable={group}
		onchanged={onRequeried ? () => onRequeried(group) : undefined}
	/>
	<GroupColorInput
		colorable={group}
		onchanged={onRecolored ? () => onRecolored(group) : undefined}
		onmousedown={onPressDragHandle ? onDragHandeMouseDown : undefined}
	/>
	<ActionButton
		class="clickable-icon"
		aria-label="Delete group"
		data-tooltip-position="left"
		on:action={onRemove}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="svg-icon lucide-x"
			><line x1="18" y1="6" x2="6" y2="18"></line><line
				x1="6"
				y1="6"
				x2="18"
				y2="18"
			></line></svg
		>
	</ActionButton>
</li>

<style>
	.timeline-view-color-group {
		--swatch-height: 18px;
		--swatch-width: 18px;
		display: flex;
		align-items: center;
		background-color: var(--timeline-settings-background);
	}

	.timeline-view-color-group :global(input[type="text"]) {
		width: 100%;
	}
	.timeline-view-color-group > :global(button) {
		padding: var(--size-2-2) !important;
	}
</style>
