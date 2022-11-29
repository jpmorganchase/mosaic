var pt = Object.defineProperty;
var B = Object.getOwnPropertySymbols;
var V = Object.prototype.hasOwnProperty,
  _ = Object.prototype.propertyIsEnumerable;
var Y = (t, e, n) =>
    e in t ? pt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (t[e] = n),
  d = (t, e) => {
    for (var n in e || (e = {})) V.call(e, n) && Y(t, n, e[n]);
    if (B) for (var n of B(e)) _.call(e, n) && Y(t, n, e[n]);
    return t;
  };
var u = (t, e) => {
  var n = {};
  for (var a in t) V.call(t, a) && e.indexOf(a) < 0 && (n[a] = t[a]);
  if (t != null && B) for (var a of B(t)) e.indexOf(a) < 0 && _.call(t, a) && (n[a] = t[a]);
  return n;
};
import ct from 'react';
import lt from 'classnames';
import mt from 'hoist-non-react-statics';
var E = {
  none: 'pdl72e4 pdl72e5 pdl72e6 pdl72e7',
  regular: 'pdl72eo pdl72ep pdl72eq pdl72er',
  inline: 'pdl72ecs pdl72ect pdl72ecu pdl72ecv'
};
function W(t, e = 'regular', n = !1) {
  let a = m => {
    var g = m,
      { className: p = '', spacing: s } = g,
      i = u(g, ['className', 'spacing']);
    return ct.createElement(t, d({ className: lt(E[s || e], p, { [E.inline]: n }) }, i));
  };
  return mt(a, t), a;
}
import K, { useEffect as dt } from 'react';
import { Mermaid as gt } from 'mdx-mermaid/lib/Mermaid';
import ut from 'warning';
var X;
function Q(n) {
  var a = n,
    { className: t } = a,
    e = u(a, ['className']);
  return (
    dt(() => {
      ut(X, 'Diagram component is an alpha Lab component and not ready for Production use'),
        (X = !0);
    }, []),
    K.createElement('div', { className: t }, K.createElement(gt, d({}, e)))
  );
}
import l, { useEffect as Ct, useRef as nt, useState as N } from 'react';
import { json as Bt, select as st, stratify as jt } from 'd3';
import { Dropdown as Tt, DropdownButton as Nt, Spinner as Ft } from '@jpmorganchase/uitk-lab';
import It from 'warning';
import U from 'react';
import { icons as Z } from '@jpmorganchase/mosaic-theme';
var q = { small: '_12vahby0', medium: '_12vahby1', large: '_12vahby2' };
var z = { tick: 'successTick' },
  J = p => {
    var s = p,
      { className: t, name: e, size: n = 'small' } = s,
      a = u(s, ['className', 'name', 'size']);
    if (e === 'none') return null;
    let i = e;
    if (
      (z[e] &&
        (console.warn(`icon ${e} has been deprecated and should be replaced by ${z[e]}`),
        console.warn(`icon ${e} will be removed after March 2023`),
        (i = z[e])),
      !Z || !Z[i])
    )
      throw new Error(`icon ${i} is not supported`);
    let m = Z[i];
    return U.createElement('span', d({ className: t }, a), U.createElement(m, { className: q[n] }));
  };
import { create as ft, linkHorizontal as yt, tree as ht } from 'd3';
function R(
  t,
  {
    label: e = null,
    title: n = null,
    width: a = 640,
    height: p = void 0,
    r: s = 3,
    padding: i = 1,
    fill: m = '#999',
    stroke: g = '#555',
    strokeWidth: f = 1.5,
    strokeOpacity: A = 0.4,
    strokeLinejoin: h = void 0,
    strokeLinecap: F = void 0,
    halo: S = '#fff',
    haloWidth: L = 3
  } = {}
) {
  let H = t.descendants(),
    O = e == null ? null : H.map(o => e(o.data, o)),
    I = 20,
    D = a / (t.height + i);
  ht().nodeSize([I, D])(t);
  let v = 1 / 0,
    c = -v;
  t.each(o => {
    o.x > c && (c = o.x), o.x < v && (v = o.x);
  });
  let y = p === void 0 ? c - v + I * 2 : p,
    M = ft('svg')
      .attr('viewBox', [(-D * i) / 2, v - I, a, y])
      .attr('width', a)
      .attr('height', y)
      .attr('style', 'max-width: 100%; height: auto; overflow: visible;')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10);
  M.append('g')
    .attr('fill', 'none')
    .attr('stroke', g)
    .attr('stroke-opacity', A)
    .attr('stroke-linecap', F)
    .attr('stroke-linejoin', h)
    .attr('stroke-width', f)
    .selectAll('path')
    .data(t.links())
    .join('path')
    .attr(
      'd',
      yt()
        .x(o => o.y)
        .y(o => o.x)
    );
  let x = M.append('g')
    .selectAll('a')
    .data(t.descendants())
    .join('a')
    .attr('transform', o => `translate(${o.y},${o.x})`);
  return (
    x
      .append('circle')
      .attr('fill', o => (o.children ? g : m))
      .attr('r', s),
    n != null && x.append('title').text(o => n(o.data, o)),
    O &&
      x
        .append('text')
        .attr('dy', '0.32em')
        .attr('x', o => (o.children ? -6 : 6))
        .attr('text-anchor', o => (o.children ? 'end' : 'start'))
        .attr('paint-order', 'stroke')
        .attr('stroke', S)
        .attr('stroke-width', L)
        .text((o, k) => O[k])
        .on('click', (o, k) => {
          let { data: j } = k.data;
          window.open(j.link, '_blank');
        })
        .style('cursor', 'pointer'),
    M
  );
}
var G = {
  toolbar: 'pk1hfu0',
  feedback:
    'pk1hfu1 pdl72e80 pdl72e81 pdl72e82 pdl72e83 pdl72ebk pdl72ebl pdl72ebm pdl72ebn pdl72edg pdl72edh pdl72edi pdl72edj pdl72e9w pdl72e9x pdl72e9y pdl72e9z',
  pageCount: 'pk1hfu2 pdl72e9s pdl72e9t pdl72e9u pdl72e9v'
};
import {
  action as b,
  amount as St,
  caption as P,
  emphasis as tt,
  eyebrow as kt,
  heading as w,
  paragraph as C,
  subtitle as T,
  watermark as Pt
} from '@jpmorganchase/mosaic-theme';
import bt from 'react';
import vt from 'classnames';
import wt from 'hoist-non-react-statics';
import xt from 'react';
var $ = function (p) {
  var s = p,
    { component: e = 'p', children: n } = s,
    a = u(s, ['component', 'children']);
  return xt.createElement(e, d({}, a), n);
};
function r(t, e = 'p', n = {}) {
  let a = i => {
    var m = i,
      { className: p } = m,
      s = u(m, ['className']);
    return bt.createElement($, d(d({ className: vt(t, p), component: e }, n), s));
  };
  return wt(a, $), a;
}
var fe = r(b({ variant: 'action1' })),
  ye = r(b({ variant: 'action2' })),
  xe = r(b({ variant: 'action3' })),
  be = r(b({ variant: 'action4' })),
  ve = r(b({ variant: 'action5' })),
  we = r(b({ variant: 'action6' })),
  Se = r(b({ variant: 'action7' })),
  ke = r(b({ variant: 'action8' })),
  Pe = r(w({ variant: 'heading0' }), 'h1'),
  Ce = r(w({ variant: 'heading1' }), 'h1'),
  Te = r(w({ variant: 'heading2' }), 'h2'),
  Ne = r(w({ variant: 'heading3' }), 'h3'),
  Fe = r(w({ variant: 'heading4' }), 'h4'),
  Ie = r(w({ variant: 'heading5' }), 'h5'),
  De = r(w({ variant: 'heading6' }), 'h6'),
  Me = r(C({ variant: 'paragraph1' })),
  Ae = r(C({ variant: 'paragraph2' })),
  Oe = r(C({ variant: 'paragraph3' })),
  je = r(C({ variant: 'paragraph4' })),
  Be = r(C({ variant: 'paragraph5' })),
  Ge = r(C({ variant: 'paragraph6' })),
  Le = r(P({ variant: 'caption1' })),
  et = r(P({ variant: 'caption2' })),
  He = r(P({ variant: 'caption3' })),
  Ee = r(P({ variant: 'caption4' })),
  We = r(P({ variant: 'caption5' })),
  Ze = r(P({ variant: 'caption6' })),
  ze = r(T({ variant: 'subtitle1' })),
  $e = r(T({ variant: 'subtitle2' })),
  Ve = r(T({ variant: 'subtitle3' })),
  _e = r(T({ variant: 'subtitle4' })),
  Ye = r(T({ variant: 'subtitle5' })),
  Ke = r(T({ variant: 'subtitle6' })),
  Xe = r(St()),
  Qe = r(kt()),
  qe = r(Pt({ variant: 'regular' })),
  Ue = r(tt({ variant: 'regular' }), 'span'),
  Je = r(tt({ variant: 'strong' }), 'span');
var rt,
  at = (t, e) => {
    let n = s => {
        if (!e.length) return !0;
        let i = s.match(/\/([^/]*)/);
        if (!i) return !1;
        let m = i[1];
        return e.indexOf(m) !== -1;
      },
      a = s => Mt(s) && n(s);
    return t.filter(a);
  },
  ot = (t, e) => {
    if (!(e == null ? void 0 : e.current)) throw new Error('no container ref defined for sitemap');
    st(e.current).html(''),
      st(e.current).append(() =>
        R(Dt(t), {
          label: n => n.name.substring(n.name.lastIndexOf('/') + 1),
          link: n => n.link,
          width: 1152
        }).node()
      );
  },
  Dt = t => {
    let e = t.reduce(
      (n, a) => {
        let p = a.split('/'),
          s = p.reduce((i, m, g) => {
            if (g === 0) return i;
            let f = p.slice(0, g + 1).join('/');
            if (/\/index$/.test(f) || n.some(F => F.name === f)) return i;
            let h;
            return (
              g <= 1 ? (h = '/') : (h = f.substring(0, f.lastIndexOf('/'))),
              [...i, { name: f, parent: h, data: { name: f, link: a } }]
            );
          }, []);
        return [...n, ...s];
      },
      [{ name: '/', parent: void 0, data: { name: 'root', link: '/' } }]
    );
    return jt()
      .id(n => n.name)
      .parentId(n => n.parent)(e);
  },
  Mt = t => /\/[^.]*$/.test(t),
  At = t => (!t || t.length === 0 ? 'All' : t.length === 1 ? t[0] : `${t.length} Items Selected`),
  Ot = () => l.createElement(J, { name: 'chevronDown' }),
  it = a => {
    var p = a,
      { href: t, initialNamespaceFilters: e = [] } = p,
      n = u(p, ['href', 'initialNamespaceFilters']);
    let s = nt(null),
      i = nt(),
      [m, g] = N(!0),
      [f, A] = N(!1),
      [h, F] = N(),
      [S, L] = N(e),
      [H, O] = N([]),
      [I, D] = N(0);
    Ct(() => {
      if (
        (It(rt, 'Sitemap component is an alpha Lab component and is not ready for Production use'),
        (rt = !0),
        !i.current)
      )
        Bt(t)
          .then(c => {
            let { slugs: y } = c;
            g(!1);
            let M = y.reduce((x, o) => {
              let k = o.match(/\/([^/]*)/);
              if (!k) return x;
              let j = k[1];
              return x.indexOf(j) === -1 && x.push(j), x;
            }, []);
            return (i.current = y), O(M), y;
          })
          .finally(() => {
            if (i.current) {
              let c = at(i.current, S);
              ot(c, s), D(c.length);
            }
          })
          .catch(c => {
            console.error(c), g(!1), F(c.message);
          });
      else {
        let c = at(i.current, S);
        ot(c, s), D(c.length);
      }
    }, [t, S]);
    let v = (c, y) => {
      L(y);
    };
    return l.createElement(
      'div',
      d({}, n),
      l.createElement(
        'div',
        { className: G.toolbar },
        m
          ? null
          : l.createElement(
              l.Fragment,
              null,
              l.createElement(et, { className: G.pageCount }, 'Number of pages: ', I),
              l.createElement(Tt, {
                triggerComponent: l.createElement(Nt, { IconComponent: Ot, label: At(S) }),
                width: 200,
                onOpenChange: A,
                onSelectionChange: v,
                selectionStrategy: 'multiple',
                source: H
              })
            )
      ),
      l.createElement(
        'div',
        { className: G.feedback },
        !h && m
          ? l.createElement(l.Fragment, null, l.createElement(Ft, { size: 'large' }), 'Loading Map')
          : null,
        h ? l.createElement(l.Fragment, null, 'An error occurred: ', h) : null
      ),
      !m && !h ? l.createElement('div', { ref: s }) : null
    );
  };
var fn = () => ({ Diagram: W(Q), Sitemap: W(it) });
export { Q as Diagram, it as Sitemap, fn as getLabMarkdownComponents };
