/*! smartanchor.js - fixed/sticky header friendly anchor correction (BSD-3-Clause) */
/*!
 * SmartAnchor.js v1.0.0
 * Copyright (c) 2026 門王 (https://monou.jp)
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

(function (window, document) {
    'use strict';

    // =========================
    // Defaults (edit here for 1-file operation)
    // =========================
    var DEFAULT_CONFIG = {
        // Basic
        selector: 'a[href^="#"]',
        offset: 0,                 // fixed header height
        animate: true,
        duration: 280,
        easing: 'easeOut',         // linear | easeOut | easeInOut
        respectReducedMotion: true,

        // Recommended (production-friendly)
        updateHash: true,
        historyMode: 'push',       // push | replace
        focus: true,               // focus target for a11y (adds tabindex=-1 temporarily)
        ignoreAttr: 'data-smartanchor-ignore', // per-link escape hatch

        // Optional "smart" offset
        // - Keep OFF by default. Turn ON when you can reliably select your header.
        autoOffset: false,
        headerSelector: 'header',

        // Optional: ignore if inside these containers (e.g., modals/sidebars with inner scroll)
        // NOTE: lightweight heuristic. If you use nested scrolling areas heavily, keep empty.
        ignoreWithin: '',          // e.g. '.modal, .drawer'

        // Auto init
        autoInit: false,

        // Hooks
        onBeforeScroll: null,
        onAfterScroll: null
    };

    // =========================
    // Helpers (ES5-safe)
    // =========================
    function extend(to, from) {
        if (!from) return to;
        for (var k in from) {
            if (Object.prototype.hasOwnProperty.call(from, k)) to[k] = from[k];
        }
        return to;
    }

    function now() {
        return (window.performance && performance.now) ? performance.now() : +new Date();
    }

    function prefersReducedMotion() {
        if (!window.matchMedia) return false;
        try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
        catch (e) { return false; }
    }

    function closestTag(el, tagName) {
        tagName = (tagName || '').toLowerCase();
        while (el && el !== document) {
            if (el.tagName && el.tagName.toLowerCase() === tagName) return el;
            el = el.parentNode;
        }
        return null;
    }

    function hasAttr(el, attr) {
        return !!(el && el.getAttribute && el.getAttribute(attr) != null);
    }

    function matchesSelector(el, selector) {
        if (!el || !selector) return false;
        var p = Element.prototype;
        var fn = p.matches || p.matchesSelector || p.msMatchesSelector || p.webkitMatchesSelector || p.mozMatchesSelector || p.oMatchesSelector;
        if (fn) {
            try { return fn.call(el, selector); } catch (e) { return false; }
        }
        // minimal fallback: no selector match support
        return false;
    }

    function closestMatch(el, selector) {
        if (!selector) return null;
        while (el && el !== document) {
            if (matchesSelector(el, selector)) return el;
            el = el.parentNode;
        }
        return null;
    }

    function getHashFromLink(a) {
        if (!a) return '';
        var href = a.getAttribute('href') || '';
        if (href === '#' || href === '') return '';
        if (href.charAt(0) === '#') return href;
        return '';
    }

    function decodeHash(hash) {
        if (!hash || hash.charAt(0) !== '#') return '';
        var id = hash.slice(1);
        try { id = decodeURIComponent(id); } catch (e) {}
        return id;
    }

    function getTargetElement(id) {
        if (!id) return null;
        var el = document.getElementById(id);
        if (el) return el;
        var byName = document.getElementsByName(id);
        if (byName && byName.length) return byName[0];
        return null;
    }

    function getScrollY() {
        return window.pageYOffset != null ? window.pageYOffset :
            (document.documentElement && document.documentElement.scrollTop) ? document.documentElement.scrollTop :
                (document.body ? document.body.scrollTop : 0);
    }

    function scrollToY(y) { window.scrollTo(0, y); }

    function getAbsoluteTop(el) {
        var rect = el.getBoundingClientRect();
        return rect.top + getScrollY();
    }

    function clamp(n, min, max) {
        return n < min ? min : (n > max ? max : n);
    }

    function easingFn(name, t) {
        if (name === 'linear') return t;
        if (name === 'easeInOut') {
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        }
        // easeOut default
        return 1 - Math.pow(1 - t, 3);
    }

    function supportsRAF() { return !!window.requestAnimationFrame; }

    function animateScroll(fromY, toY, duration, easingName, done) {
        var start = now();
        var diff = toY - fromY;

        function step() {
            var t = (now() - start) / duration;
            t = t >= 1 ? 1 : t;
            var eased = easingFn(easingName, t);
            scrollToY(fromY + diff * eased);
            if (t < 1) window.requestAnimationFrame(step);
            else if (done) done();
        }
        window.requestAnimationFrame(step);
    }

    function safeUpdateHash(hash, mode) {
        if (!hash) return;
        if (!window.history || !history.pushState) {
            window.location.hash = hash;
            return;
        }
        try {
            if (mode === 'replace') history.replaceState(null, '', hash);
            else history.pushState(null, '', hash);
        } catch (e) {
            window.location.hash = hash;
        }
    }

    function focusTarget(el) {
        if (!el) return;
        var had = el.hasAttribute && el.hasAttribute('tabindex');
        var prev = had ? el.getAttribute('tabindex') : null;

        try {
            if (!had) el.setAttribute('tabindex', '-1');
            el.focus({ preventScroll: true });
        } catch (e) {
            try { el.focus(); } catch (e2) {}
        }

        if (!had) {
            try { el.removeAttribute('tabindex'); } catch (e3) {}
        } else if (prev !== null) {
            try { el.setAttribute('tabindex', prev); } catch (e4) {}
        }
    }

    function getAnchorURLParts(a) {
        // ES5-safe: use <a> parser
        var tmp = document.createElement('a');
        tmp.href = a.href;
        return {
            hostname: tmp.hostname,
            pathname: tmp.pathname,
            hash: tmp.hash
        };
    }

    function computeAutoOffset(cfg) {
        if (!cfg.autoOffset) return cfg.offset || 0;
        if (!document.querySelector) return cfg.offset || 0;

        var header = null;
        try { header = document.querySelector(cfg.headerSelector || 'header'); } catch (e) {}
        if (!header) return cfg.offset || 0;

        // Keep it cheap: offsetHeight
        var h = header.offsetHeight || 0;
        return h || (cfg.offset || 0);
    }

    function makeConfig(userConfig) {
        var cfg = {};
        extend(cfg, DEFAULT_CONFIG);
        extend(cfg, window.SMARTANCHOR_CONFIG);
        extend(cfg, userConfig);

        cfg.offset = +cfg.offset || 0;
        cfg.duration = +cfg.duration || 0;

        if (cfg.respectReducedMotion && prefersReducedMotion()) {
            cfg.animate = false;
        }
        return cfg;
    }

    function addListener(el, type, handler) {
        if (el.addEventListener) el.addEventListener(type, handler, false);
        else if (el.attachEvent) el.attachEvent('on' + type, handler);
    }

    // =========================
    // Core
    // =========================
    var last = { hash: '', cfg: null };

    function scrollToAnchor(hash, cfg, options) {
        options = options || {};
        if (!hash || hash.charAt(0) !== '#') return false;

        var id = decodeHash(hash);
        if (!id) return false;

        var target = getTargetElement(id);
        if (!target) return false;

        var offset = computeAutoOffset(cfg);
        var top = getAbsoluteTop(target) - offset;
        top = clamp(top, 0, Number.MAX_SAFE_INTEGER || 9007199254740991);

        if (typeof cfg.onBeforeScroll === 'function') {
            try { cfg.onBeforeScroll({ hash: hash, target: target, top: top, offset: offset }); } catch (e) {}
        }

        var fromY = getScrollY();
        var shouldAnimate = !!cfg.animate && cfg.duration > 0 && supportsRAF() && !options.immediate;

        if (shouldAnimate) {
            animateScroll(fromY, top, cfg.duration, cfg.easing, function () {
                if (cfg.focus) focusTarget(target);
                if (typeof cfg.onAfterScroll === 'function') {
                    try { cfg.onAfterScroll({ hash: hash, target: target, top: top, offset: offset }); } catch (e2) {}
                }
            });
        } else {
            scrollToY(top);
            if (cfg.focus) focusTarget(target);
            if (typeof cfg.onAfterScroll === 'function') {
                try { cfg.onAfterScroll({ hash: hash, target: target, top: top, offset: offset }); } catch (e3) {}
            }
        }

        last.hash = hash;
        last.cfg = cfg;
        return true;
    }

    function isModifiedClick(e) {
        return !!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
    }

    function shouldIgnoreByContainer(target, cfg) {
        if (!cfg.ignoreWithin) return false;
        // If selector matching isn't supported, fail open (do not ignore).
        if (!Element.prototype || !(Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector)) {
            return false;
        }
        return !!closestMatch(target, cfg.ignoreWithin);
    }

    function onDocumentClick(e, cfg) {
        if (!e) return;
        if (e.defaultPrevented) return;
        if (e.button != null && e.button !== 0) return; // left click only
        if (isModifiedClick(e)) return;

        if (shouldIgnoreByContainer(e.target, cfg)) return;

        var a = closestTag(e.target, 'a');
        if (!a) return;

        if (hasAttr(a, cfg.ignoreAttr)) return;

        var hash = getHashFromLink(a);
        if (!hash) return;

        // Ignore external path/host anchors (safety)
        try {
            var parts = getAnchorURLParts(a);
            if (parts.hostname && window.location.hostname && parts.hostname !== window.location.hostname) return;
            // normalize pathname (some browsers omit leading "/")
            var p1 = parts.pathname || '';
            var p2 = window.location.pathname || '';
            if (p1 && p2 && p1 !== p2) return;
        } catch (ex) {}

        var did = scrollToAnchor(hash, cfg, { immediate: false });
        if (!did) return;

        if (e.preventDefault) e.preventDefault();

        if (cfg.updateHash) safeUpdateHash(hash, cfg.historyMode);
    }

    function onInitialHash(cfg) {
        var hash = window.location.hash;
        if (!hash) return;

        // 1 tick delay to avoid layout race (fonts/headers) while staying minimal
        setTimeout(function () {
            // immediate to avoid double-animate on load
            scrollToAnchor(hash, cfg, { immediate: true });
        }, 0);
    }

    function onResize() {
        if (!last.hash || !last.cfg) return;
        scrollToAnchor(last.hash, last.cfg, { immediate: true });
    }

    // =========================
    // Public
    // =========================
    function smartAnchor(userConfig) {
        var cfg = makeConfig(userConfig);

        // Event delegation (1 listener)
        addListener(document, 'click', function (e) { onDocumentClick(e, cfg); });

        // Initial hash correction
        if (document.readyState === 'loading') {
            addListener(document, 'DOMContentLoaded', function () { onInitialHash(cfg); });
        } else {
            onInitialHash(cfg);
        }

        // Follow viewport changes
        addListener(window, 'resize', onResize);
        addListener(window, 'orientationchange', onResize);

        return cfg;
    }

    window.smartAnchor = smartAnchor;

    // Optional auto init (recommended for "drop-in")
    if (window.SMARTANCHOR_CONFIG && window.SMARTANCHOR_CONFIG.autoInit) {
        smartAnchor();
    }

})(window, document);
