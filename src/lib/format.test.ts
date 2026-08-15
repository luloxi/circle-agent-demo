import assert from "node:assert/strict";
import { test } from "node:test";
import { serviceDetail, serviceName, serviceTitle } from "./format";
import type { ServiceListing } from "./types";

function allium(path: string, description: string): ServiceListing {
  return {
    resource: `https://agents.allium.so${path}`,
    type: "http",
    x402Version: 2,
    accepts: [],
    metadata: {
      provider: { name: "Allium" },
      path,
      method: "POST",
      description,
    },
  };
}

test("serviceTitle distinguishes Allium endpoints that share a provider name", () => {
  const spot = allium(
    "/api/v1/developer/prices",
    "Retrieve the latest spot price for one or more tokens by chain and contract address.",
  );
  const history = allium(
    "/api/v1/developer/prices/history",
    "Retrieve historical OHLC token prices for one or more tokens over a timestamp range.",
  );
  const sql = allium(
    "/api/v1/explorer/queries/run-async",
    "Execute a SQL query against Allium's cross-chain blockchain datasets asynchronously.",
  );
  assert.equal(serviceName(spot), "Allium");
  assert.equal(serviceName(history), "Allium");
  assert.match(serviceTitle(spot), /spot price/i);
  assert.match(serviceTitle(history), /historical|OHLC/i);
  assert.match(serviceTitle(sql), /SQL/i);
  assert.notEqual(serviceTitle(spot), serviceTitle(history));
  assert.match(serviceDetail(spot), /Allium · POST · \/developer\/prices/);
});
