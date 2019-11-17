import { ELEMENT_PROPS, ELEMENT_IGNORE_ATTR } from "../constants";
import { createHookCollection } from "../hooks";
import { render } from "../render/render";
import {
    formatType,
    setAttr,
    propToAttr,
    attrToProp,
    dispatchEvent
} from "./utils";

import { isFunction } from "../utils";
import { createElement } from "../vnode";
import { addQueue } from "../task";

let promise = callback => new Promise(callback);

export class Element extends HTMLElement {
    constructor() {
        super();
        /**
         * identifier to store the virtual-dom state,
         * this is unique between instances of the
         * component to securely consider the host status
         */
        let id = Symbol("vnode");

        let isPrevent;
        let isUnmount;

        this[ELEMENT_PROPS] = {};

        let isMounted;

        let resolveUpdate;

        let rerender = () => {
            isPrevent = false;
            try {
                render(
                    hooks.load(this.render, { ...this[ELEMENT_PROPS] }),
                    this,
                    id
                );
                hooks.updated();

                resolveUpdate();
            } catch (e) {
                this.error(e);
            }
        };

        this.update = () => {
            if (isUnmount) return;
            let rendered = this.rendered;
            if (!isPrevent) {
                isPrevent = true;

                rendered = promise(resolve => (resolveUpdate = resolve));

                isMounted
                    ? addQueue(rerender)
                    : this.mounted.then(() => {
                          isMounted = true;
                          addQueue(rerender);
                      });
            }

            return (this.rendered = rendered);
        };

        let hooks = createHookCollection(() => addQueue(this.update), this);
        /**
         * creates a collection of microtask
         * associated with the mounted of the component
         */
        this.mounted = promise(
            resolve =>
                (this.mount = () => {
                    isMounted = false;
                    // allows the reuse of the component when it is isUnmounted and mounted
                    if (isUnmount == true) {
                        isUnmount = false;
                        this.mounted = this.update();
                    }
                    resolve();
                })
        );
        /**
         * creates a collection of microtask
         * associated with the unmounted of the component
         */
        this.unmounted = promise(
            resolve =>
                (this.unmount = () => {
                    isUnmount = true;
                    hooks.unmount();
                    resolve();
                })
        );

        this.initialize();

        this.update();
    }
    connectedCallback() {
        this.mount();
    }
    disconnectedCallback() {
        this.unmount();
    }
    attributeChangedCallback(attr, oldValue, value) {
        if (attr === this[ELEMENT_IGNORE_ATTR] || oldValue === value) return;
        this[attrToProp(attr)] = value;
    }
}

/**
 * register the component, be it a class or function
 * @param {string} nodeType
 * @param {Function} component
 * @return {Function} returns a jsx component
 */
export function customElement(nodeType, component) {
    if (isFunction(nodeType)) {
        component = nodeType;

        let CustomElement = class extends Element {};
        let prototype = CustomElement.prototype;

        let props = component.props;

        prototype.error = component.error || console.error;
        prototype.render = component;

        prototype.initialize = function() {
            let length = initialize.length;
            while (length--) initialize[length](this);
        };

        let initialize = [];

        let attrs = [];

        for (let prop in props)
            setProperty(prototype, initialize, attrs, prop, props[prop]);

        CustomElement.observedAttributes = attrs;

        return CustomElement;
    } else {
        customElements.define(
            nodeType,
            component instanceof Element ? component : customElement(component)
        );

        return props => createElement(nodeType, props);
    }
}

function setProperty(prototype, initialize, attrs, prop, schema) {
    let attr = propToAttr(prop);

    schema = schema.name ? { type: schema } : schema;

    if (prop in prototype) return;

    function set(nextValue) {
        let { value, error } = formatType(nextValue, schema.type);
        let prevValue = this[ELEMENT_PROPS][prop];

        if (error && value != null) {
            throw `the observable [${prop}] must be of the type [${schema.type.name}]`;
        }

        if (value == prevValue) return;
        if (schema.type == Function) {
            if (prevValue && value == prevValue.base) {
                return;
            }
            let base = value;
            value = value.bind(this);
            value.base = base;
        }

        if (schema.reflect) {
            // the default properties are only reflected once the web-component is mounted
            this.mounted.then(() => {
                this[ELEMENT_IGNORE_ATTR] = attr; //update is prevented
                setAttr(
                    this,
                    attr,
                    schema.type == Boolean && !value ? null : value //
                );
                this[ELEMENT_IGNORE_ATTR] = false; // an upcoming update is allowed
            });
        }

        this[ELEMENT_PROPS][prop] = value;
        let rendered = this.update();

        if (schema.dispatchEvent) {
            rendered.then(() =>
                dispatchEvent(
                    this,
                    schema.dispatchEvent.type || prop,
                    schema.dispatchEvent
                )
            );
        }
    }

    function get() {
        return this[ELEMENT_PROPS][prop];
    }

    Object.defineProperty(prototype, prop, { set, get });

    if ("value" in schema) {
        initialize.push(self => (self[prop] = schema.value));
    }
    attrs.push(attr);
}
