import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { HistorySidebar } from "@/components/letterly/HistorySidebar";
import { entry } from "./history.test";

describe("HistorySidebar", () => {
  it("renders entries and opens one on click", () => {
    const onOpen = vi.fn();
    const noop = () => {};
    render(
      <SidebarProvider>
        <HistorySidebar
          entries={[entry("a", Date.now(), { title: "Writer at Acme" }), entry("b", Date.now() - 5000, { title: "Editor at Globex" })]}
          available
          activeId={null}
          onOpen={onOpen}
          onNew={noop}
          onRename={noop}
          onDelete={noop}
          onDuplicate={noop}
          onClearAll={noop}
        />
      </SidebarProvider>,
    );
    expect(screen.getByText("Editor at Globex")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Writer at Acme"));
    expect(onOpen).toHaveBeenCalledWith("a");
  });
});
