
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.17.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/components/Control.svelte generated by Svelte v3.17.1 */
    const file = "src/components/Control.svelte";

    // (53:1) {#if coordonation.perspective}
    function create_if_block(ctx) {
    	let div;
    	let label;
    	let t0;
    	let span;
    	let t1_value = /*coordonation*/ ctx[1].depth + "";
    	let t1;
    	let t2;
    	let t3;
    	let input;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			label = element("label");
    			t0 = text("Depth");
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = text("cm");
    			t3 = space();
    			input = element("input");
    			attr_dev(span, "class", "svelte-1v0ntl0");
    			add_location(span, file, 54, 22, 1553);
    			attr_dev(label, "for", "");
    			attr_dev(label, "class", "svelte-1v0ntl0");
    			add_location(label, file, 54, 3, 1534);
    			attr_dev(input, "type", "range");
    			attr_dev(input, "min", "1");
    			attr_dev(input, "max", "10");
    			attr_dev(input, "step", "1");
    			attr_dev(input, "class", "svelte-1v0ntl0");
    			add_location(input, file, 55, 3, 1602);
    			attr_dev(div, "class", "slide svelte-1v0ntl0");
    			add_location(div, file, 53, 2, 1511);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label);
    			append_dev(label, t0);
    			append_dev(label, span);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(div, t3);
    			append_dev(div, input);
    			set_input_value(input, /*coordonation*/ ctx[1].depth);

    			dispose = [
    				listen_dev(input, "change", /*input_change_input_handler*/ ctx[7]),
    				listen_dev(input, "input", /*input_change_input_handler*/ ctx[7])
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*coordonation*/ 2 && t1_value !== (t1_value = /*coordonation*/ ctx[1].depth + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*coordonation*/ 2) {
    				set_input_value(input, /*coordonation*/ ctx[1].depth);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(53:1) {#if coordonation.perspective}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div4;
    	let h1;
    	let t1;
    	let div0;
    	let label0;
    	let t2;
    	let span0;
    	let t3_value = /*coordonation*/ ctx[1].x + "";
    	let t3;
    	let t4;
    	let t5;
    	let input0;
    	let t6;
    	let div1;
    	let label1;
    	let t7;
    	let span1;
    	let t8_value = /*coordonation*/ ctx[1].y + "";
    	let t8;
    	let t9;
    	let t10;
    	let input1;
    	let t11;
    	let div2;
    	let label2;
    	let t12;
    	let span2;
    	let t13_value = /*coordonation*/ ctx[1].z + "";
    	let t13;
    	let t14;
    	let t15;
    	let input2;
    	let t16;
    	let input3;
    	let t17;
    	let strong;

    	let t18_value = (/*coordonation*/ ctx[1].perspective
    	? "Enabled"
    	: "Disabled") + "";

    	let t18;
    	let br0;
    	let br1;
    	let t19;
    	let t20;
    	let div3;
    	let t21;
    	let dispose;
    	let if_block = /*coordonation*/ ctx[1].perspective && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			h1 = element("h1");
    			h1.textContent = "CSS 3D Transformaions Generator";
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			t2 = text("Axe X ");
    			span0 = element("span");
    			t3 = text(t3_value);
    			t4 = text("deg");
    			t5 = space();
    			input0 = element("input");
    			t6 = space();
    			div1 = element("div");
    			label1 = element("label");
    			t7 = text("Axe Y ");
    			span1 = element("span");
    			t8 = text(t8_value);
    			t9 = text("deg");
    			t10 = space();
    			input1 = element("input");
    			t11 = space();
    			div2 = element("div");
    			label2 = element("label");
    			t12 = text("Axe Z ");
    			span2 = element("span");
    			t13 = text(t13_value);
    			t14 = text("deg");
    			t15 = space();
    			input2 = element("input");
    			t16 = space();
    			input3 = element("input");
    			t17 = text(" Perspective \n\t");
    			strong = element("strong");
    			t18 = text(t18_value);
    			br0 = element("br");
    			br1 = element("br");
    			t19 = space();
    			if (if_block) if_block.c();
    			t20 = space();
    			div3 = element("div");
    			t21 = text(/*transformation*/ ctx[0]);
    			attr_dev(h1, "class", "svelte-1v0ntl0");
    			add_location(h1, file, 32, 1, 725);
    			attr_dev(span0, "class", "svelte-1v0ntl0");
    			add_location(span0, file, 35, 22, 810);
    			attr_dev(label0, "for", "");
    			attr_dev(label0, "class", "svelte-1v0ntl0");
    			add_location(label0, file, 35, 2, 790);
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "180");
    			attr_dev(input0, "step", "10");
    			attr_dev(input0, "class", "svelte-1v0ntl0");
    			add_location(input0, file, 36, 2, 855);
    			attr_dev(div0, "class", "slide svelte-1v0ntl0");
    			add_location(div0, file, 34, 1, 768);
    			attr_dev(span1, "class", "svelte-1v0ntl0");
    			add_location(span1, file, 40, 22, 986);
    			attr_dev(label1, "for", "");
    			attr_dev(label1, "class", "svelte-1v0ntl0");
    			add_location(label1, file, 40, 2, 966);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "180");
    			attr_dev(input1, "step", "10");
    			attr_dev(input1, "class", "svelte-1v0ntl0");
    			add_location(input1, file, 41, 2, 1031);
    			attr_dev(div1, "class", "slide svelte-1v0ntl0");
    			add_location(div1, file, 39, 1, 944);
    			attr_dev(span2, "class", "svelte-1v0ntl0");
    			add_location(span2, file, 45, 22, 1162);
    			attr_dev(label2, "for", "");
    			attr_dev(label2, "class", "svelte-1v0ntl0");
    			add_location(label2, file, 45, 2, 1142);
    			attr_dev(input2, "type", "range");
    			attr_dev(input2, "min", "0");
    			attr_dev(input2, "max", "180");
    			attr_dev(input2, "step", "10");
    			attr_dev(input2, "class", "svelte-1v0ntl0");
    			add_location(input2, file, 46, 2, 1207);
    			attr_dev(div2, "class", "slide svelte-1v0ntl0");
    			add_location(div2, file, 44, 1, 1120);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "name", "perspective");
    			add_location(input3, file, 49, 1, 1296);
    			add_location(strong, file, 50, 1, 1395);
    			add_location(br0, file, 50, 73, 1467);
    			add_location(br1, file, 50, 77, 1471);
    			attr_dev(div3, "class", "code svelte-1v0ntl0");
    			add_location(div3, file, 59, 1, 1701);
    			attr_dev(div4, "class", "control svelte-1v0ntl0");
    			add_location(div4, file, 31, 0, 702);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, h1);
    			append_dev(div4, t1);
    			append_dev(div4, div0);
    			append_dev(div0, label0);
    			append_dev(label0, t2);
    			append_dev(label0, span0);
    			append_dev(span0, t3);
    			append_dev(span0, t4);
    			append_dev(div0, t5);
    			append_dev(div0, input0);
    			set_input_value(input0, /*coordonation*/ ctx[1].x);
    			append_dev(div4, t6);
    			append_dev(div4, div1);
    			append_dev(div1, label1);
    			append_dev(label1, t7);
    			append_dev(label1, span1);
    			append_dev(span1, t8);
    			append_dev(span1, t9);
    			append_dev(div1, t10);
    			append_dev(div1, input1);
    			set_input_value(input1, /*coordonation*/ ctx[1].y);
    			append_dev(div4, t11);
    			append_dev(div4, div2);
    			append_dev(div2, label2);
    			append_dev(label2, t12);
    			append_dev(label2, span2);
    			append_dev(span2, t13);
    			append_dev(span2, t14);
    			append_dev(div2, t15);
    			append_dev(div2, input2);
    			set_input_value(input2, /*coordonation*/ ctx[1].z);
    			append_dev(div4, t16);
    			append_dev(div4, input3);
    			input3.checked = /*coordonation*/ ctx[1].perspective;
    			append_dev(div4, t17);
    			append_dev(div4, strong);
    			append_dev(strong, t18);
    			append_dev(div4, br0);
    			append_dev(div4, br1);
    			append_dev(div4, t19);
    			if (if_block) if_block.m(div4, null);
    			append_dev(div4, t20);
    			append_dev(div4, div3);
    			append_dev(div3, t21);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[3]),
    				listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[3]),
    				listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[4]),
    				listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[4]),
    				listen_dev(input2, "change", /*input2_change_input_handler*/ ctx[5]),
    				listen_dev(input2, "input", /*input2_change_input_handler*/ ctx[5]),
    				listen_dev(input3, "change", /*input3_change_handler*/ ctx[6])
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*coordonation*/ 2 && t3_value !== (t3_value = /*coordonation*/ ctx[1].x + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*coordonation*/ 2) {
    				set_input_value(input0, /*coordonation*/ ctx[1].x);
    			}

    			if (dirty & /*coordonation*/ 2 && t8_value !== (t8_value = /*coordonation*/ ctx[1].y + "")) set_data_dev(t8, t8_value);

    			if (dirty & /*coordonation*/ 2) {
    				set_input_value(input1, /*coordonation*/ ctx[1].y);
    			}

    			if (dirty & /*coordonation*/ 2 && t13_value !== (t13_value = /*coordonation*/ ctx[1].z + "")) set_data_dev(t13, t13_value);

    			if (dirty & /*coordonation*/ 2) {
    				set_input_value(input2, /*coordonation*/ ctx[1].z);
    			}

    			if (dirty & /*coordonation*/ 2) {
    				input3.checked = /*coordonation*/ ctx[1].perspective;
    			}

    			if (dirty & /*coordonation*/ 2 && t18_value !== (t18_value = (/*coordonation*/ ctx[1].perspective
    			? "Enabled"
    			: "Disabled") + "")) set_data_dev(t18, t18_value);

    			if (/*coordonation*/ ctx[1].perspective) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div4, t20);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*transformation*/ 1) set_data_dev(t21, /*transformation*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let dispatch = createEventDispatcher();
    	let transformation;

    	let coordonation = {
    		x: 0,
    		y: 0,
    		z: 0,
    		depth: 2,
    		perspective: false
    	};

    	function input0_change_input_handler() {
    		coordonation.x = to_number(this.value);
    		$$invalidate(1, coordonation);
    	}

    	function input1_change_input_handler() {
    		coordonation.y = to_number(this.value);
    		$$invalidate(1, coordonation);
    	}

    	function input2_change_input_handler() {
    		coordonation.z = to_number(this.value);
    		$$invalidate(1, coordonation);
    	}

    	function input3_change_handler() {
    		coordonation.perspective = this.checked;
    		$$invalidate(1, coordonation);
    	}

    	function input_change_input_handler() {
    		coordonation.depth = to_number(this.value);
    		$$invalidate(1, coordonation);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("dispatch" in $$props) $$invalidate(2, dispatch = $$props.dispatch);
    		if ("transformation" in $$props) $$invalidate(0, transformation = $$props.transformation);
    		if ("coordonation" in $$props) $$invalidate(1, coordonation = $$props.coordonation);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*coordonation, transformation*/ 3) {
    			 {
    				if (coordonation.perspective) {
    					$$invalidate(0, transformation = `transform: perspective(${coordonation.depth}cm) 
												  rotateY(${coordonation.y}deg) 
												  rotateX(${coordonation.x}deg) 
												  rotateZ(${coordonation.z}deg)`);
    				} else {
    					$$invalidate(0, transformation = `transform: rotateY(${coordonation.y}deg) 
												  rotateX(${coordonation.x}deg) 
												  rotateZ(${coordonation.z}deg)`);
    				}

    				dispatch("generate", { transformation, coordonation });
    			}
    		}
    	};

    	return [
    		transformation,
    		coordonation,
    		dispatch,
    		input0_change_input_handler,
    		input1_change_input_handler,
    		input2_change_input_handler,
    		input3_change_handler,
    		input_change_input_handler
    	];
    }

    class Control extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Control",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/components/Space.svelte generated by Svelte v3.17.1 */

    const file$1 = "src/components/Space.svelte";

    // (7:2) {#if transformation.coordonation}
    function create_if_block$1(ctx) {
    	let span0;
    	let t0;
    	let t1_value = /*transformation*/ ctx[0].coordonation.x + "";
    	let t1;
    	let t2;
    	let t3;
    	let span1;
    	let t4;
    	let t5_value = /*transformation*/ ctx[0].coordonation.y + "";
    	let t5;
    	let t6;
    	let t7;
    	let span2;
    	let t8;
    	let t9_value = /*transformation*/ ctx[0].coordonation.z + "";
    	let t9;
    	let t10;
    	let t11;
    	let span3;
    	let t12;

    	let t13_value = (/*transformation*/ ctx[0].coordonation.perspective
    	? "Enabled"
    	: "Disabled") + "";

    	let t13;

    	const block = {
    		c: function create() {
    			span0 = element("span");
    			t0 = text("X: ");
    			t1 = text(t1_value);
    			t2 = text("deg");
    			t3 = space();
    			span1 = element("span");
    			t4 = text("Y: ");
    			t5 = text(t5_value);
    			t6 = text("deg");
    			t7 = space();
    			span2 = element("span");
    			t8 = text("Z: ");
    			t9 = text(t9_value);
    			t10 = text("deg");
    			t11 = space();
    			span3 = element("span");
    			t12 = text("3D: ");
    			t13 = text(t13_value);
    			attr_dev(span0, "class", "svelte-6inj9u");
    			add_location(span0, file$1, 7, 3, 116);
    			attr_dev(span1, "class", "svelte-6inj9u");
    			add_location(span1, file$1, 8, 3, 172);
    			attr_dev(span2, "class", "svelte-6inj9u");
    			add_location(span2, file$1, 9, 3, 228);
    			attr_dev(span3, "class", "svelte-6inj9u");
    			add_location(span3, file$1, 10, 3, 284);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span0, anchor);
    			append_dev(span0, t0);
    			append_dev(span0, t1);
    			append_dev(span0, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, span1, anchor);
    			append_dev(span1, t4);
    			append_dev(span1, t5);
    			append_dev(span1, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, span2, anchor);
    			append_dev(span2, t8);
    			append_dev(span2, t9);
    			append_dev(span2, t10);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, span3, anchor);
    			append_dev(span3, t12);
    			append_dev(span3, t13);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*transformation*/ 1 && t1_value !== (t1_value = /*transformation*/ ctx[0].coordonation.x + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*transformation*/ 1 && t5_value !== (t5_value = /*transformation*/ ctx[0].coordonation.y + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*transformation*/ 1 && t9_value !== (t9_value = /*transformation*/ ctx[0].coordonation.z + "")) set_data_dev(t9, t9_value);

    			if (dirty & /*transformation*/ 1 && t13_value !== (t13_value = (/*transformation*/ ctx[0].coordonation.perspective
    			? "Enabled"
    			: "Disabled") + "")) set_data_dev(t13, t13_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(span1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(span2);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(span3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(7:2) {#if transformation.coordonation}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let main;
    	let div0;
    	let t;
    	let div1;
    	let div1_style_value;
    	let if_block = /*transformation*/ ctx[0].coordonation && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			div1 = element("div");
    			attr_dev(div0, "class", "coords svelte-6inj9u");
    			add_location(div0, file$1, 5, 1, 56);
    			attr_dev(div1, "class", "element svelte-6inj9u");
    			attr_dev(div1, "style", div1_style_value = /*transformation*/ ctx[0].transformation);
    			add_location(div1, file$1, 14, 1, 390);
    			attr_dev(main, "class", "svelte-6inj9u");
    			add_location(main, file$1, 4, 0, 48);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			if (if_block) if_block.m(div0, null);
    			append_dev(main, t);
    			append_dev(main, div1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*transformation*/ ctx[0].coordonation) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*transformation*/ 1 && div1_style_value !== (div1_style_value = /*transformation*/ ctx[0].transformation)) {
    				attr_dev(div1, "style", div1_style_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { transformation } = $$props;
    	const writable_props = ["transformation"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Space> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("transformation" in $$props) $$invalidate(0, transformation = $$props.transformation);
    	};

    	$$self.$capture_state = () => {
    		return { transformation };
    	};

    	$$self.$inject_state = $$props => {
    		if ("transformation" in $$props) $$invalidate(0, transformation = $$props.transformation);
    	};

    	return [transformation];
    }

    class Space extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { transformation: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Space",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*transformation*/ ctx[0] === undefined && !("transformation" in props)) {
    			console.warn("<Space> was created without expected prop 'transformation'");
    		}
    	}

    	get transformation() {
    		throw new Error("<Space>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set transformation(value) {
    		throw new Error("<Space>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.17.1 */

    function create_fragment$2(ctx) {
    	let t;
    	let current;
    	const control = new Control({ $$inline: true });
    	control.$on("generate", /*transformate*/ ctx[1]);

    	const space_1 = new Space({
    			props: { transformation: /*transform*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(control.$$.fragment);
    			t = space();
    			create_component(space_1.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(control, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(space_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const space_1_changes = {};
    			if (dirty & /*transform*/ 1) space_1_changes.transformation = /*transform*/ ctx[0];
    			space_1.$set(space_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(control.$$.fragment, local);
    			transition_in(space_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(control.$$.fragment, local);
    			transition_out(space_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(control, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(space_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let transform = "";

    	const transformate = val => {
    		$$invalidate(0, transform = val.detail);
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("transform" in $$props) $$invalidate(0, transform = $$props.transform);
    	};

    	return [transform, transformate];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
