<script lang="ts">
	import ActionButton from "../../../view/inputs/ActionButton.svelte";
	import LucideIcon from "src/obsidian/view/LucideIcon.svelte";
	import type { Collapsable } from "src/view/collapsable";

	interface $$Props {
		collapsable: Collapsable;
	}

	export let collapsable: $$Props["collapsable"];

	let isOpen = !collapsable.isCollapsed();
	function onNewCollapsable(collapsable: $$Props["collapsable"]) {
		isOpen = !collapsable.isCollapsed();
	}
	function onOpenChanged(collapsed: boolean) {
		if (collapsed) {
			collapsable.collapse();
		} else {
			collapsable.expand();
		}
		isOpen = !collapsable.isCollapsed();
	}

	$: onNewCollapsable(collapsable);
	$: onOpenChanged(!isOpen);
</script>

<form
	class="timeline-settings control-group{isOpen ? ' open' : ' closed'}"
	on:submit|preventDefault|stopPropagation
>
	{#if !isOpen}
		<ActionButton
			id="toggle-button"
			class="open-button clickable-icon"
			aria-label="Open"
			data-tooltip-position="left"
			on:action={() => (isOpen = true)}
		>
			<LucideIcon id="settings" />
		</ActionButton>
	{:else}
		<ActionButton
			id="toggle-button"
			class="close-button clickable-icon"
			aria-label="Close"
			data-tooltip-position="left"
			on:action={() => (isOpen = false)}
		>
			<LucideIcon id="x" />
		</ActionButton>
	{/if}
	<slot />
	<!-- <TimelineDisplaySettings
		namespacedWritable={namespacedWritable.namespace("display")}
	/>
	<CollapsableSection name="Layout">
		<span>Coming Soon!</span>
	</CollapsableSection> -->
</form>

<style>
	.timeline-settings {
		width: var(--timeline-settings-width);
	}
	.timeline-settings.closed {
		width: auto;
	}
	form.closed > :global(*:not(#toggle-button)) {
		display: none;
	}

	.timeline-settings {
		position: relative;
	}
	.timeline-settings.open :global(#toggle-button) {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
	}

	.timeline-settings :global(button#toggle-button) {
		padding: var(--timeline-settings-button-padding);
		border-bottom: 1px solid var(--background-modifier-border);
	}
	.timeline-settings.open :global(#toggle-button) {
		border: none;
	}
	.timeline-settings.closed :global(#toggle-button) {
		background-color: var(--interactive-normal);
	}
	.timeline-settings :global(#toggle-button):hover {
		background-color: var(--interactive-hover);
	}

	.timeline-settings :global(section.collapsable) {
		padding: var(--size-2-3) var(--size-4-3);
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.timeline-settings :global(section.collapsable .header) {
		color: var(--text-normal);
		font-weight: var(--font-semibold);
		font-size: var(--font-ui-small);
		padding: var(--nav-item-parent-padding);
		padding-inline-start: 0;
		display: flex;
		justify-content: flex-start;
		width: 100%;
		gap: var(--size-2-3);
		margin-block-end: var(--size-2-1);
	}
	.timeline-settings
		:global(section.collapsable .header.clickable-icon):hover {
		background-color: var(--timeline-settings-background);
		color: var(--text-normal);
	}
	.timeline-settings :global(section.collapsable .header .svg-icon) {
		margin-inline-start: calc(-1 * var(--size-2-3));
	}

	.timeline-settings :global(section.collapsable .content) {
		padding-block: var(
			--nav-item-children-padding-start,
			var(--nav-item-children-padding-left)
		);
	}
</style>
