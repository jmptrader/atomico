import { expect } from "@esm-bundle/chai";
import { createHooks } from "../create-hooks";
import { useEffect } from "../hooks";

describe("src/hooks/use-effect", () => {
    /**
     * By not using parameters to prevent the execution of useEffect,
     * the effect must execute the same number of times as the render
     */
    it("execution between updates without memorizing arguments", () => {
        let hooks = createHooks();
        let cycles = 0;
        let cyclesEffect = 0;
        let load = () => {
            cycles++;
            useEffect(() => {
                cyclesEffect++;
            });
        };

        let update = () => {
            hooks.load(load);
            hooks.cleanEffects()()();
        };

        update();
        update();
        update();

        expect(cycles).to.equal(cyclesEffect);
    });
    /**
     * When using parameters to prevent useEffect from executing,
     * the effect should execute the same amount on parameter changes
     */
    it("execution between updates without memorizing arguments", () => {
        let hooks = createHooks();
        // counter of the execution of each render
        let cycles = 0;
        // Counter of each execution of the effect execution
        let cyclesEffect = 0;
        // Counter for each run of the effect collector run
        let cycleDiff = 0;

        let load = (param) => {
            cycles++;
            useEffect(() => {
                cyclesEffect++;
                return () => cycleDiff++;
            }, [param]);
        };

        let update = (param) => {
            hooks.load(() => load(param));
            hooks.cleanEffects()()();
        };

        update(1);
        update(1);
        update(2);
        update(2);
        update(3);

        expect(cycles - cycleDiff).to.equal(cyclesEffect);
    });
    /**
     * If the effect has been instantiated and the hook is unmounted,
     * the effect collector must be executed.
     */
    it("useEffect cleaning effect", (done) => {
        function load() {
            useEffect(() => done, []);
        }
        let hooks = createHooks();

        hooks.load(load);
        // Initialize the effect
        hooks.cleanEffects()()();
        // Unmount effect
        hooks.cleanEffects(true)()();
    });
});
