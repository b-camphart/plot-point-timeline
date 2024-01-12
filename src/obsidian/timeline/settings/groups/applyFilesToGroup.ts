import type { ColorSelector, ItemGroup } from "./FileGroup";
import type { TimelineItem } from "src/timeline/Timeline";
import type { TimelineFileItem } from "../../TimelineFileItem";
import type { TFile } from "obsidian";
import { selectGroupForFile } from "./selectGroupForFile";
import { longProcess } from "./longProcess";

/**
 * Context for applying files to a group
 */
interface Context {
    readonly groups: {
        getGroup(groupId: string): ItemGroup | undefined;
        saveGroup(group: ItemGroup): void;
        list(): readonly ItemGroup[];
    }

    readonly items: {
        list(): readonly TimelineFileItem[];
    }

    recolorProcess: { stop: () => void; } | undefined;
}

interface Output {
    presentRequeriedGroup(group: ItemGroup): void;
    presentRecoloredItem(item: TimelineItem): void;
}

export async function applyFileToGroup(this: Context, groupId: string, query: string, output: Output) {

    // parse the query to get the filter and apply that to the group
    const group = this.groups.getGroup(groupId)
    if (group == null) return;

    this.recolorProcess?.stop();
    this.recolorProcess = undefined;

    group.query = query

    this.groups.saveGroup(group)

    output.presentRequeriedGroup(group)

    const groups = this.groups.list();
    const selectGroup = selectGroupForFile.bind(null, groups)

    for (const item of this.items.list()) {
        item.forgetGroup()
    }

    const process = longProcess(this.items.list(), async (item) => {
        const group = await selectGroup(item.obsidianFile)
        item.applyGroup(group)
        output.presentRecoloredItem(item)
    })

    this.recolorProcess = process

    try {
        await process.completion();
    } catch(e: unknown) {
        if (typeof e === "string" && e === "Cancelled") {

        } else {
            throw e
        }
    }

    this.recolorProcess = undefined
    
}