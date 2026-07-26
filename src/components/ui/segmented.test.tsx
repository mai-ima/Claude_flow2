import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Segmented } from "./segmented";

describe("Segmented", () => {
  it("選択中の項目に aria-checked が付く", () => {
    render(
      <Segmented
        value="dark"
        onChange={() => {}}
        options={[
          { value: "light", label: "ライト" },
          { value: "dark", label: "ダーク" },
          { value: "system", label: "自動" },
        ]}
      />,
    );
    expect(screen.getByRole("radio", { name: "ダーク" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "ライト" })).toHaveAttribute("aria-checked", "false");
  });

  it("ラベルが語中で折り返さない（「ライ/ト」防止）", () => {
    render(
      <Segmented
        value="light"
        onChange={() => {}}
        options={[
          { value: "light", label: "ライト" },
          { value: "dark", label: "ダーク" },
        ]}
      />,
    );
    // whitespace-nowrap が外れると狭い画面で2行に割れる回帰が起きる
    expect(screen.getByRole("radio", { name: "ライト" }).className).toContain("whitespace-nowrap");
  });

  it("クリックで onChange に値が渡る", () => {
    const onChange = vi.fn();
    render(
      <Segmented
        value="light"
        onChange={onChange}
        options={[
          { value: "light", label: "ライト" },
          { value: "dark", label: "ダーク" },
        ]}
      />,
    );
    screen.getByRole("radio", { name: "ダーク" }).click();
    expect(onChange).toHaveBeenCalledWith("dark");
  });
});
