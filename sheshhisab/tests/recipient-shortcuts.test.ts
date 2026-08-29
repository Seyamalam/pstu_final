import { describe, expect, it } from "vitest";

import {
  type RecipientShortcut,
  recipientShortcutGroups,
} from "../src/lib/recipient-shortcuts";

function person(handle: string): RecipientShortcut {
  return {
    id: handle,
    handle,
    displayName: handle,
    avatarSeed: handle,
  };
}

describe("recipient shortcut groups", () => {
  it("keeps favorites first and removes them from recent", () => {
    const groups = recipientShortcutGroups({
      favorites: [person("alice"), person("alice")],
      recent: [person("alice"), person("bob"), person("bob")],
    });

    expect(groups.favorites.map((item) => item.handle)).toEqual(["alice"]);
    expect(groups.recent.map((item) => item.handle)).toEqual(["bob"]);
  });

  it("caps each group without changing source order", () => {
    const groups = recipientShortcutGroups({
      favorites: [person("a1"), person("a2"), person("a3")],
      recent: [person("b1"), person("b2"), person("b3")],
      limit: 2,
    });

    expect(groups.favorites.map((item) => item.handle)).toEqual(["a1", "a2"]);
    expect(groups.recent.map((item) => item.handle)).toEqual(["b1", "b2"]);
  });
});
