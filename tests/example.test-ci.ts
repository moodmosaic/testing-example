import {
  beforeEach,
  Context,
  describe,
  it,
  run,
} from "../deps.ts";
import fc from "../fast-check.ts";
import { CompositionRoot } from './ci/example.commands.ts'

let ctx: Context;

beforeEach(() => {
  ctx = new Context();
});

describe("[Contract]", () => {
  describe("example.clar", () => {
    it("appears to behave correctly when arbitrarily calling its API", () => {
      const currentState = { valuesMap: new Map(), isInitialized: false };
      fc.assert(fc.property(
        CompositionRoot(ctx), (cmds) => {
          const initialState = () =>
            ({ model: currentState, real: ctx.chain });
          fc.modelRun(initialState, cmds);
      }), { numRuns: 10, verbose: true });
    });
  });
});

run();
