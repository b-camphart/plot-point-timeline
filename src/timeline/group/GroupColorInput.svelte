<script lang="ts">
	import type * as colors from "src/color";
	import type * as svelteElements from "svelte/elements";

	interface $$Props
		extends Omit<
			svelteElements.HTMLAttributes<HTMLElement>,
			keyof svelteElements.DOMAttributes<HTMLInputElement>
		> {
		onmousedown?(
			event: MouseEvent & { currentTarget: HTMLInputElement },
		): void;
		onchanged?(color: string): void;
		colorable: colors.ColoredColorable;
	}

	export let colorable: $$Props["colorable"];
	export let onchanged: $$Props["onchanged"] = undefined;
	export let onmousedown: $$Props["onmousedown"] = undefined;

	let color = colorable.color();
	function onNewColorable(colorable: colors.ColoredColorable) {
		color = colorable.color();
	}
	$: onNewColorable(colorable);

	function onColorInput(color: string) {
		if (color !== colorable.color()) {
			colorable.recolor(color);
			color = colorable.color();
			if (onchanged != null) onchanged(color);
		}
	}

	$: onColorInput(color);
</script>

<input
	type="color"
	aria-label={"Click to change color\nDrag to reorder groups"}
	data-tooltip-position="left"
	bind:value={color}
	on:mousedown={onmousedown}
	{...$$restProps}
/>

<style>
	input[type="color"] {
		margin: 0 2px 0 6px;
	}
</style>
