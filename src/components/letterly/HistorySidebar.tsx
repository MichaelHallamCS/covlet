import { useMemo, useState } from "react";
import { Copy, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { filterEntries, groupEntries, relativeTime, type HistoryEntry } from "@/lib/history";

type Confirm = { kind: "delete"; entry: HistoryEntry } | { kind: "clear" } | null;

export function HistorySidebar({
  entries,
  available,
  activeId,
  onOpen,
  onNew,
  onRename,
  onDelete,
  onDuplicate,
  onClearAll,
}: {
  entries: HistoryEntry[];
  available: boolean;
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onClearAll: () => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState<Confirm>(null);

  const groups = useMemo(() => groupEntries(filterEntries(entries, query)), [entries, query]);
  const closeMobile = () => isMobile && setOpenMobile(false);

  const commitRename = () => {
    if (editing) onRename(editing, draft);
    setEditing(null);
  };

  return (
    <Sidebar collapsible="offcanvas" aria-label="Letter history">
      <SidebarHeader className="gap-2 p-3">
        <Button
          className="w-full justify-start"
          onClick={() => {
            onNew();
            closeMobile();
          }}
        >
          <Plus className="h-4 w-4" /> New letter
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search letters"
            placeholder="Search letters"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 bg-background pl-8"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {!available ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">History isn't available in this browser.</p>
        ) : entries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Your letters will show up here.</p>
        ) : groups.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No letters match “{query}”.</p>
        ) : (
          groups.map((g) => (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
              <SidebarMenu>
                {g.entries.map((e) => (
                  <SidebarMenuItem key={e.id}>
                    {editing === e.id ? (
                      <Input
                        autoFocus
                        aria-label="Rename letter"
                        value={draft}
                        onChange={(ev) => setDraft(ev.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") commitRename();
                          if (ev.key === "Escape") setEditing(null);
                        }}
                        className="h-9"
                        maxLength={120}
                      />
                    ) : (
                      <>
                        <SidebarMenuButton
                          isActive={e.id === activeId}
                          className="h-auto flex-col items-start gap-0.5 py-2 pr-8"
                          onClick={() => {
                            onOpen(e.id);
                            closeMobile();
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === "Delete") {
                              ev.preventDefault();
                              setConfirm({ kind: "delete", entry: e });
                            }
                          }}
                        >
                          <span className="w-full truncate font-medium">{e.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {relativeTime(e.updatedAt)} · {e.versions.length} {e.versions.length === 1 ? "draft" : "drafts"}
                          </span>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction showOnHover aria-label={`Actions for ${e.title}`} className="top-2.5">
                              <MoreHorizontal className="h-4 w-4" />
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start">
                            <DropdownMenuItem
                              onSelect={() => {
                                setDraft(e.title);
                                setEditing(e.id);
                              }}
                            >
                              <Pencil className="h-4 w-4" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onDuplicate(e.id)}>
                              <Copy className="h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onSelect={() => setConfirm({ kind: "delete", entry: e })}>
                              <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      {entries.length > 0 && (
        <SidebarFooter className="p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setConfirm({ kind: "clear" })}>
            <Trash2 className="h-4 w-4" /> Clear all history
          </Button>
        </SidebarFooter>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.kind === "clear" ? "Clear all history?" : "Delete this letter?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "clear"
                ? "This removes every saved letter from this browser. Your saved resume stays."
                : `“${confirm?.kind === "delete" ? confirm.entry.title : ""}” and all its drafts will be removed from this browser.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirm?.kind === "clear") onClearAll();
                else if (confirm?.kind === "delete") onDelete(confirm.entry.id);
                setConfirm(null);
              }}
            >
              {confirm?.kind === "clear" ? "Clear all" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
