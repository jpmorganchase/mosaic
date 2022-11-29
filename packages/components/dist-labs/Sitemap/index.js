var nt = Object.defineProperty;
var H = Object.getOwnPropertySymbols;
var M = Object.prototype.hasOwnProperty,
  $ = Object.prototype.propertyIsEnumerable;
var V = (t, e, n) =>
    e in t ? nt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : (t[e] = n),
  h = (t, e) => {
    for (var n in e || (e = {})) M.call(e, n) && V(t, n, e[n]);
    if (H) for (var n of H(e)) $.call(e, n) && V(t, n, e[n]);
    return t;
  };
var x = (t, e) => {
  var n = {};
  for (var o in t) M.call(t, o) && e.indexOf(o) < 0 && (n[o] = t[o]);
  if (t != null && H) for (var o of H(t)) e.indexOf(o) < 0 && $.call(t, o) && (n[o] = t[o]);
  return n;
};
import c, { useEffect as gt, useRef as q, useState as N } from 'react';
import { json as kt, select as et, stratify as St } from 'd3';
import { Dropdown as ut, DropdownButton as ht, Spinner as ft } from '@jpmorganchase/uitk-lab';
import yt from 'warning';
import Y from 'react';
import { icons as Z } from '@jpmorganchase/mosaic-theme';
var _ = { small: '_12vahby0', medium: '_12vahby1', large: '_12vahby2' };
var E = { tick: 'successTick' },
  K = l => {
    var s = l,
      { className: t, name: e, size: n = 'small' } = s,
      o = x(s, ['className', 'name', 'size']);
    if (e === 'none') return null;
    let i = e;
    if (
      (E[e] &&
        (console.warn(`icon ${e} has been deprecated and should be replaced by ${E[e]}`),
        console.warn(`icon ${e} will be removed after March 2023`),
        (i = E[e])),
      !Z || !Z[i])
    )
      throw new Error(`icon ${i} is not supported`);
    let d = Z[i];
    return Y.createElement('span', h({ className: t }, o), Y.createElement(d, { className: _[n] }));
  };
import { create as at, linkHorizontal as ot, tree as rt } from 'd3';
function X(
  t,
  {
    label: e = null,
    title: n = null,
    width: o = 640,
    height: l = void 0,
    r: s = 3,
    padding: i = 1,
    fill: d = '#999',
    stroke: g = '#555',
    strokeWidth: u = 1.5,
    strokeOpacity: B = 0.4,
    strokeLinejoin: m = void 0,
    strokeLinecap: P = void 0,
    halo: S = '#fff',
    haloWidth: D = 3
  } = {}
) {
  let W = t.descendants(),
    G = e == null ? null : W.map(a => e(a.data, a)),
    F = 20,
    A = o / (t.height + i);
  rt().nodeSize([F, A])(t);
  let v = 1 / 0,
    p = -v;
  t.each(a => {
    a.x > p && (p = a.x), a.x < v && (v = a.x);
  });
  let f = l === void 0 ? p - v + F * 2 : l,
    j = at('svg')
      .attr('viewBox', [(-A * i) / 2, v - F, o, f])
      .attr('width', o)
      .attr('height', f)
      .attr('style', 'max-width: 100%; height: auto; overflow: visible;')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10);
  j.append('g')
    .attr('fill', 'none')
    .attr('stroke', g)
    .attr('stroke-opacity', B)
    .attr('stroke-linecap', P)
    .attr('stroke-linejoin', m)
    .attr('stroke-width', u)
    .selectAll('path')
    .data(t.links())
    .join('path')
    .attr(
      'd',
      ot()
        .x(a => a.y)
        .y(a => a.x)
    );
  let y = j
    .append('g')
    .selectAll('a')
    .data(t.descendants())
    .join('a')
    .attr('transform', a => `translate(${a.y},${a.x})`);
  return (
    y
      .append('circle')
      .attr('fill', a => (a.children ? g : d))
      .attr('r', s),
    n != null && y.append('title').text(a => n(a.data, a)),
    G &&
      y
        .append('text')
        .attr('dy', '0.32em')
        .attr('x', a => (a.children ? -6 : 6))
        .attr('text-anchor', a => (a.children ? 'end' : 'start'))
        .attr('paint-order', 'stroke')
        .attr('stroke', S)
        .attr('stroke-width', D)
        .text((a, k) => G[k])
        .on('click', (a, k) => {
          let { data: O } = k.data;
          window.open(O.link, '_blank');
        })
        .style('cursor', 'pointer'),
    j
  );
}
var L = {
  toolbar: 'pk1hfu0',
  feedback:
    'pk1hfu1 pdl72e80 pdl72e81 pdl72e82 pdl72e83 pdl72ebk pdl72ebl pdl72ebm pdl72ebn pdl72edg pdl72edh pdl72edi pdl72edj pdl72e9w pdl72e9x pdl72e9y pdl72e9z',
  pageCount: 'pk1hfu2 pdl72e9s pdl72e9t pdl72e9u pdl72e9v'
};
import {
  action as b,
  amount as lt,
  caption as C,
  emphasis as Q,
  eyebrow as dt,
  heading as w,
  paragraph as T,
  subtitle as I,
  watermark as mt
} from '@jpmorganchase/mosaic-theme';
import st from 'react';
import pt from 'classnames';
import ct from 'hoist-non-react-statics';
import it from 'react';
var z = function (l) {
  var s = l,
    { component: e = 'p', children: n } = s,
    o = x(s, ['component', 'children']);
  return it.createElement(e, h({}, o), n);
};
function r(t, e = 'p', n = {}) {
  let o = i => {
    var d = i,
      { className: l } = d,
      s = x(d, ['className']);
    return st.createElement(z, h(h({ className: pt(t, l), component: e }, n), s));
  };
  return ct(o, z), o;
}
var Kt = r(b({ variant: 'action1' })),
  Xt = r(b({ variant: 'action2' })),
  Qt = r(b({ variant: 'action3' })),
  Ut = r(b({ variant: 'action4' })),
  qt = r(b({ variant: 'action5' })),
  Jt = r(b({ variant: 'action6' })),
  Rt = r(b({ variant: 'action7' })),
  te = r(b({ variant: 'action8' })),
  ee = r(w({ variant: 'heading0' }), 'h1'),
  ne = r(w({ variant: 'heading1' }), 'h1'),
  re = r(w({ variant: 'heading2' }), 'h2'),
  ae = r(w({ variant: 'heading3' }), 'h3'),
  oe = r(w({ variant: 'heading4' }), 'h4'),
  ie = r(w({ variant: 'heading5' }), 'h5'),
  se = r(w({ variant: 'heading6' }), 'h6'),
  pe = r(T({ variant: 'paragraph1' })),
  ce = r(T({ variant: 'paragraph2' })),
  le = r(T({ variant: 'paragraph3' })),
  de = r(T({ variant: 'paragraph4' })),
  me = r(T({ variant: 'paragraph5' })),
  ge = r(T({ variant: 'paragraph6' })),
  ue = r(C({ variant: 'caption1' })),
  U = r(C({ variant: 'caption2' })),
  he = r(C({ variant: 'caption3' })),
  fe = r(C({ variant: 'caption4' })),
  ye = r(C({ variant: 'caption5' })),
  xe = r(C({ variant: 'caption6' })),
  be = r(I({ variant: 'subtitle1' })),
  ve = r(I({ variant: 'subtitle2' })),
  we = r(I({ variant: 'subtitle3' })),
  Se = r(I({ variant: 'subtitle4' })),
  ke = r(I({ variant: 'subtitle5' })),
  Ce = r(I({ variant: 'subtitle6' })),
  Te = r(lt()),
  Ie = r(dt()),
  Ne = r(mt({ variant: 'regular' })),
  Pe = r(Q({ variant: 'regular' }), 'span'),
  Fe = r(Q({ variant: 'strong' }), 'span');
var J,
  R = (t, e) => {
    let n = s => {
        if (!e.length) return !0;
        let i = s.match(/\/([^/]*)/);
        if (!i) return !1;
        let d = i[1];
        return e.indexOf(d) !== -1;
      },
      o = s => bt(s) && n(s);
    return t.filter(o);
  },
  tt = (t, e) => {
    if (!(e == null ? void 0 : e.current)) throw new Error('no container ref defined for sitemap');
    et(e.current).html(''),
      et(e.current).append(() =>
        X(xt(t), {
          label: n => n.name.substring(n.name.lastIndexOf('/') + 1),
          link: n => n.link,
          width: 1152
        }).node()
      );
  },
  xt = t => {
    let e = t.reduce(
      (n, o) => {
        let l = o.split('/'),
          s = l.reduce((i, d, g) => {
            if (g === 0) return i;
            let u = l.slice(0, g + 1).join('/');
            if (/\/index$/.test(u) || n.some(P => P.name === u)) return i;
            let m;
            return (
              g <= 1 ? (m = '/') : (m = u.substring(0, u.lastIndexOf('/'))),
              [...i, { name: u, parent: m, data: { name: u, link: o } }]
            );
          }, []);
        return [...n, ...s];
      },
      [{ name: '/', parent: void 0, data: { name: 'root', link: '/' } }]
    );
    return St()
      .id(n => n.name)
      .parentId(n => n.parent)(e);
  },
  bt = t => /\/[^.]*$/.test(t),
  vt = t => (!t || t.length === 0 ? 'All' : t.length === 1 ? t[0] : `${t.length} Items Selected`),
  wt = () => c.createElement(K, { name: 'chevronDown' }),
  Me = o => {
    var l = o,
      { href: t, initialNamespaceFilters: e = [] } = l,
      n = x(l, ['href', 'initialNamespaceFilters']);
    let s = q(null),
      i = q(),
      [d, g] = N(!0),
      [u, B] = N(!1),
      [m, P] = N(),
      [S, D] = N(e),
      [W, G] = N([]),
      [F, A] = N(0);
    gt(() => {
      if (
        (yt(J, 'Sitemap component is an alpha Lab component and is not ready for Production use'),
        (J = !0),
        !i.current)
      )
        kt(t)
          .then(p => {
            let { slugs: f } = p;
            g(!1);
            let j = f.reduce((y, a) => {
              let k = a.match(/\/([^/]*)/);
              if (!k) return y;
              let O = k[1];
              return y.indexOf(O) === -1 && y.push(O), y;
            }, []);
            return (i.current = f), G(j), f;
          })
          .finally(() => {
            if (i.current) {
              let p = R(i.current, S);
              tt(p, s), A(p.length);
            }
          })
          .catch(p => {
            console.error(p), g(!1), P(p.message);
          });
      else {
        let p = R(i.current, S);
        tt(p, s), A(p.length);
      }
    }, [t, S]);
    let v = (p, f) => {
      D(f);
    };
    return c.createElement(
      'div',
      h({}, n),
      c.createElement(
        'div',
        { className: L.toolbar },
        d
          ? null
          : c.createElement(
              c.Fragment,
              null,
              c.createElement(U, { className: L.pageCount }, 'Number of pages: ', F),
              c.createElement(ut, {
                triggerComponent: c.createElement(ht, { IconComponent: wt, label: vt(S) }),
                width: 200,
                onOpenChange: B,
                onSelectionChange: v,
                selectionStrategy: 'multiple',
                source: W
              })
            )
      ),
      c.createElement(
        'div',
        { className: L.feedback },
        !m && d
          ? c.createElement(c.Fragment, null, c.createElement(ft, { size: 'large' }), 'Loading Map')
          : null,
        m ? c.createElement(c.Fragment, null, 'An error occurred: ', m) : null
      ),
      !d && !m ? c.createElement('div', { ref: s }) : null
    );
  };
export { Me as Sitemap };
