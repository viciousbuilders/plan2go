import { describe, expect, it } from "vitest";
import { editLinkParts, slugFromLink } from "./trip-link";

describe("slugFromLink", () => {
  it("reads the slug out of the read only link", () => {
    expect(slugFromLink("https://plan2go.vietbrosinaus.com/t/amber-arcade-23456789ab")).toBe(
      "amber-arcade-23456789ab",
    );
  });

  it("reads the slug out of the editing link and leaves the key", () => {
    expect(
      slugFromLink(
        "https://plan2go.vietbrosinaus.com/t/amber-arcade-23456789ab/edit/Zm9vYmFyYmF6cXV4cXV1eGNvcmdlZ3JhdWx0",
      ),
    ).toBe("amber-arcade-23456789ab");
  });

  it("reads a link to the printed page, or with a query after it", () => {
    expect(slugFromLink("https://plan2go.vietbrosinaus.com/t/teal-pier-23456789ab/print")).toBe(
      "teal-pier-23456789ab",
    );
    expect(slugFromLink("http://localhost:3000/t/teal-pier-23456789ab?view=map")).toBe(
      "teal-pier-23456789ab",
    );
  });

  it("reads a link without its address, or with a full stop after it", () => {
    expect(slugFromLink("plan2go.vietbrosinaus.com/t/sage-quay-23456789ab")).toBe(
      "sage-quay-23456789ab",
    );
    expect(slugFromLink("/t/sage-quay-23456789ab")).toBe("sage-quay-23456789ab");
    expect(slugFromLink("  https://plan2go.vietbrosinaus.com/t/sage-quay-23456789ab.  ")).toBe(
      "sage-quay-23456789ab",
    );
  });

  it("finds no trip in anything else", () => {
    expect(slugFromLink("https://plan2go.vietbrosinaus.com/")).toBeNull();
    expect(slugFromLink("https://example.com/cat/sage-quay")).toBeNull();
    expect(slugFromLink("sage-quay-23456789ab")).toBeNull();
    expect(slugFromLink(`https://plan2go.vietbrosinaus.com/t/${"a".repeat(81)}`)).toBeNull();
  });
});

describe("editLinkParts", () => {
  const KEY = "Zm9vYmFyYmF6cXV4cXV1eGNvcmdlZ3JhdWx0";

  it("reads the slug and the key out of the editing link", () => {
    expect(
      editLinkParts(`https://plan2go.vietbrosinaus.com/t/amber-arcade-23456789ab/edit/${KEY}`),
    ).toEqual({ slug: "amber-arcade-23456789ab", key: KEY });
    expect(editLinkParts(`/t/amber-arcade-23456789ab/edit/${KEY}.`)).toEqual({
      slug: "amber-arcade-23456789ab",
      key: KEY,
    });
  });

  it("finds no key in the read only link, or in anything else", () => {
    expect(editLinkParts("https://plan2go.vietbrosinaus.com/t/amber-arcade-23456789ab")).toBeNull();
    expect(editLinkParts("https://plan2go.vietbrosinaus.com/t/amber-arcade-23456789ab/edit/")).toBeNull();
    expect(editLinkParts(`https://example.com/edit/${KEY}`)).toBeNull();
  });
});
