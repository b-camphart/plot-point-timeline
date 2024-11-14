import * as obsidian from "obsidian";
import {LUCID_ICON, OBSIDIAN_LEAF_VIEW_TYPE} from "./main";
import type {ObsidianNoteRepository} from "src/note/obsidian-repository";
import type {ObsidianNotePropertyRepository} from "src/note/property/obsidian-repository";
import {get, writable} from "svelte/store";
import type {Note} from "src/note";
import {titleEl} from "../ItemVIew";
import {preventOpenFileWhen, workspaceLeafExt} from "../WorkspaceLeaf";
import {writableProperties} from "src/timeline/Persistence";
import NoteTimeline from "../timeline/NoteTimeline.svelte";
import {openFileContextMenu, openMultipleFileContextMenu} from "../FileExporer";
import {openNewLeafFromEvent} from "../Workspace";
import {exists} from "src/utils/null";
import * as json from "src/utils/json";
import {openModal} from "src/obsidian/view/Modal";

export class TimelineItemView extends obsidian.ItemView {
	getIcon(): string {
		return LUCID_ICON;
	}

	getViewType(): string {
		return OBSIDIAN_LEAF_VIEW_TYPE;
	}

	private group: string | undefined;

	constructor(
		leaf: obsidian.WorkspaceLeaf,
		vault: obsidian.Vault,
		metadata: obsidian.MetadataCache,
		private workspace: obsidian.Workspace,
		private fileManager: obsidian.FileManager,
		private notes: ObsidianNoteRepository,
		private noteProperties: ObsidianNotePropertyRepository,
	) {
		super(leaf);
		this.navigation = true;

		this.scope = new obsidian.Scope(this.app.scope);
		this.scope.register(["Shift"], " ", () => {
			this.component?.zoomToFit();
		});

		this.initialization = new Promise(resolve => {
			this.completeInitialization = resolve;
		});

		// events
		[
			vault.on("create", file => {
				if (file instanceof obsidian.TFile) {
					this.component?.addFile(this.notes.getNoteForFile(file));
				}
			}),
			vault.on("rename", (file, oldPath) => {
				if (file instanceof obsidian.TFile) {
					this.component?.renameFile(
						this.notes.getNoteForFile(file),
						oldPath,
					);
				}
			}),
			metadata.on("changed", file => {
				if (file instanceof obsidian.TFile) {
					this.component?.modifyFile(this.notes.getNoteForFile(file));
				}
			}),
			vault.on("delete", file => {
				if (file instanceof obsidian.TFile) {
					this.component?.deleteFile(this.notes.getNoteForFile(file));
				}
			}),
			this.leaf.on("group-change", group => {
				this.group = group;
			}),
			this.workspace.on("active-leaf-change", activeLeaf => {
				if (activeLeaf === this.leaf || !activeLeaf) {
					return;
				}
				if (!this.group) {
					return;
				}

				const state = activeLeaf.getViewState().state;
				if (!state) {
					return;
				}

				if (!("file" in state) || typeof state.file !== "string") {
					return;
				}

				const leavesInGroup = this.workspace.getGroupLeaves(this.group);
				if (!leavesInGroup.includes(activeLeaf)) {
					return;
				}

				const file = vault.getAbstractFileByPath(state.file);
				if (file instanceof obsidian.TFile) {
					const note = this.notes.getNoteForFile(file);
					if (!note) {
						return;
					}
					this.component?.focusOnNote(note);
				}
			}),
		].forEach(eventRef => this.registerEvent(eventRef));

		preventOpenFileWhen(
			this,
			() =>
				this.group != null &&
				this.group.length > 0 &&
				this.workspace.getGroupLeaves(this.group).length > 1,
		);
	}

	private $mode: EditMode = EditMode.Edit;
	private mode = writable(this.$mode);

	onPaneMenu(
		menu: obsidian.Menu,
		source: "more-options" | "tab-header" | string,
	): void {
		super.onPaneMenu(menu, source);
		menu.addItem(item => {
			item.setIcon("book-open")
				.setChecked(this.$mode === EditMode.View)
				.setSection("pane")
				.setTitle("View-only timeline")
				.onClick(() => {
					this.mode.set(this.$mode === EditMode.View 
						? EditMode.Edit 
						: EditMode.View);
				});
		});
	}

	private openNoteInLinkedLeaf(note: Note): boolean {
		if (!this.group) {
			return false;
		}
		const leavesInGroup = this.workspace.getGroupLeaves(this.group);
		if (leavesInGroup.length === 1) {
			return false;
		}

		const file = this.notes.getFileFromNote(note);
		if (!file) {
			return false;
		}
		leavesInGroup.forEach(leaf => {
			if (leaf === this.leaf) return;
			leaf.openFile(file);
		});
		return true;
	}

	private computeDisplayText() {
		const query = this.state?.settings?.filter?.query ?? "";
		if (query !== "") {
			return `Timeline view - ${query}`;
		}
		return "Timeline view";
	}
	#displayText = this.computeDisplayText();
	private get displayText() {
		return this.#displayText;
	}
	private set displayText(value: string) {
		if (this.#displayText !== value) {
			this.#displayText = value;

			titleEl(this)?.setText?.(value);

			// the leaf pulls its text from the title, so just have it update
			workspaceLeafExt(this.leaf)?.updateHeader();
		}
	}

	getDisplayText(): string {
		return this.displayText;
	}

	private component: NoteTimeline | null = null;
	private initialization?: Promise<TimelineItemViewState>;
	private completeInitialization(_state: TimelineItemViewState) {}

	private state: TimelineItemViewState | undefined;
	setState(state: unknown, result: obsidian.ViewStateResult): Promise<void> {
		this.state = timelineItemViewStateSchema.parseOrDefault(state);
		this.displayText = this.computeDisplayText();
		this.completeInitialization(this.state);
		return super.setState(state, result);
	}

	getState(): Omit<TimelineItemViewState, "isNew"> | undefined {
		if (this.state != null && "isNew" in this.state) {
			delete this.state.isNew;
		}
		return this.state;
	}

	protected async onOpen(): Promise<void> {
		const content = this.contentEl;

		content.createEl("progress");

		this.initialization?.then(state => {
			delete this.initialization;
			content.empty();
			content.setAttribute(
				"style",
				"padding:0;position: relative;overflow-x:hidden;overflow-y:hidden",
			);

			const isNew = state.isNew;

			const viewModel = writableProperties(state, (key, newValue) => {
				state[key] = newValue;
				this.displayText = this.computeDisplayText();
				this.workspace.requestSaveLayout();
			});

			const persistedMode = viewModel.make("mode", this.$mode);
			if (get(persistedMode) === "edit") {
				this.mode.set(EditMode.Edit);
			} else if (get(persistedMode) === "view") {
				this.mode.set(EditMode.View);
			}
			this.mode.subscribe(mode => persistedMode.set(mode));
			const switchToViewMode = this.addAction(
				"book-open",
				"Current view: editing\nClick to view-only",
				() => this.mode.set(EditMode.View),
			);
			const switchToEditMode = this.addAction(
				"edit-3",
				"Current view: view-only\nClick to edit",
				() => this.mode.set(EditMode.Edit),
			);
			this.mode.subscribe(newMode => {
				this.$mode = newMode;
				switchToViewMode.toggle(newMode === EditMode.Edit);
				switchToEditMode.toggle(newMode === EditMode.View);
			});

			this.component = new NoteTimeline({
				target: content,
				props: {
					noteRepository: this.notes,
					notePropertyRepository: this.noteProperties,
					isNew,
					viewModel,
					oncontextmenu: (e, notes) => {
						if (notes.length === 1) {
							const file = this.notes.getFileFromNote(notes[0]);
							if (!file) return;
							openFileContextMenu(
								e,
								file,
								this.workspace,
								this.fileManager,
							);
						} else if (notes.length > 1) {
							const files: obsidian.TFile[] = notes
								.map(it => this.notes.getFileFromNote(it))
								.filter(exists);
							if (files.length === 0) return;
							if (files.length === 1)
								openFileContextMenu(
									e,
									files[0],
									this.workspace,
									this.fileManager,
								);
							else
								openMultipleFileContextMenu(
									e,
									files,
									this.workspace,
									this.fileManager,
								);
						}
					},
					openModal: open => {
						openModal(this.app, open);
					},
				},
			});

			this.component.$on("noteSelected", event => {
				const file = this.notes.getFileFromNote(event.detail.note);
				if (!file) return;
				const cause = event.detail.event;
				openNewLeafFromEvent(this.workspace, cause).openFile(file);
			});

			this.component?.$on("noteFocused", event => {
				if (event.detail) {
					this.openNoteInLinkedLeaf(event.detail);
				}
			});

			this.component?.$on("createNote", async event => {
				const note = await this.notes.createNote(event.detail);
				if (!this.openNoteInLinkedLeaf(note)) {
					const file = this.notes.getFileFromNote(note);
					if (!file) return;
					this.workspace.getLeaf(true).openFile(file);
				}
			});

			this.component?.$on("modifyNote", async event => {
				const note = event.detail.note;
				if ("created" in event.detail.modification) {
					await this.notes.modifyNote(note, {
						created: event.detail.modification.created,
					});
				} else if ("modified" in event.detail.modification) {
					await this.notes.modifyNote(note, {
						modified: event.detail.modification.modified,
					});
				} else {
					await this.notes.modifyNote(note, {
						property: {
							[event.detail.modification.property.name]:
								event.detail.modification.property.value,
						},
					});
				}
			});
		});
	}

	private static closedState?: Omit<TimelineItemViewState, "isNew">;
	static hasClosedState() {
		return !!this.closedState;
	}
	static getPreviouslyClosedState() {
		return this.closedState;
	}

	protected onClose(): Promise<void> {
		TimelineItemView.closedState = this.getState();
		this.component?.$destroy();
		return super.onClose();
	}
}

enum EditMode {
	View = "view",
	Edit = "edit",
}

const timelineItemViewStateSchema = json.expectObject({
	isNew: json.optional(json.expectBoolean(false)),
	focalValue: json.expectNumber(0),
	vScroll: json.expectNumber(0),
	mode: json.expectEnum(EditMode, EditMode.Edit),
	scale: json.expectNumber(1),
	settings: json.expectObject({
		isOpen: json.expectBoolean(false),
		property: json.expectObject({
			collapsed: json.expectBoolean(true),
			property: json.expectString("created"),
			propertiesUseWholeNumbers: json.expectRecord({
				key: json.expectString(""),
				value: json.expectBoolean(true),
			}),
		}),
		filter: json.expectObject({
			collapsed: json.expectBoolean(true),
			query: json.expectString(""),
		}),
		groups: json.expectObject({
			collapsed: json.expectBoolean(true),
			groups: json.expectArray(
				json.expectObject({
					query: json.expectString(""),
					color: json.expectString(""),
				}),
			),
		}),
		display: json.expectObject({
			collapsed: json.expectBoolean(true),
			names: json.expectBoolean(false),
		}),
	}),
});

export type TimelineItemViewState = json.Parsed<
	typeof timelineItemViewStateSchema
>;
