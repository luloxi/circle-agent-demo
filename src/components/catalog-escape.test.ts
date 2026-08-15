import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import { CatalogEscape } from "./catalog-escape";

test("CatalogEscape on Base without allowLiveEmpty is empty (wallet path)", () => {
  const html = renderToStaticMarkup(
    createElement(CatalogEscape, {
      network: "BASE",
      onDemo: () => undefined,
      onNetwork: () => undefined,
    }),
  );
  assert.equal(html, "");
});

test("CatalogEscape on empty Base plan shows the note and Demo", () => {
  const note =
    "Discovery returned no payable x402 sellers on Base (eip155:8453) for this query.";
  const html = renderToStaticMarkup(
    createElement(CatalogEscape, {
      network: "BASE",
      onDemo: () => undefined,
      onNetwork: () => undefined,
      note,
      allowLiveEmpty: true,
    }),
  );
  assert.match(html, /eip155:8453/);
  assert.match(html, /Use Demo/);
  assert.doesNotMatch(html, /Switch to/);
});
