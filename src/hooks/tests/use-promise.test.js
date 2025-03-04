import { expect } from "@esm-bundle/chai";
import { createHooks } from "../create-hooks.js";
import { usePromise } from "../custom-hooks/use-promise.js";

describe("usePromise", () => {
    it("fulfilled", (done) => {
        let cycle = 0;

        const load = () => {
            const promise = usePromise(async () => 10, []);

            switch (cycle++) {
                case 0:
                    expect(promise).to.deep.equal({ pending: true });
                    break;
                case 1:
                    expect(promise).to.deep.equal({
                        result: 10,
                        fulfilled: true,
                    });
                    done();
                    break;
            }
        };

        const render = () => hooks.load(load);

        const hooks = createHooks(render);

        render();

        hooks.cleanEffects()()();
    });
    it("rejected", (done) => {
        let cycle = 0;

        const load = () => {
            const promise = usePromise(() => Promise.reject(10), []);
            switch (cycle++) {
                case 0:
                    expect(promise).to.deep.equal({ pending: true });
                    break;

                case 1:
                    expect(promise).to.deep.equal({
                        result: 10,
                        rejected: true,
                    });
                    done();
                    break;
            }
        };

        const render = () => hooks.load(load);

        const hooks = createHooks(render);

        render();

        hooks.cleanEffects()()();
    });
});
