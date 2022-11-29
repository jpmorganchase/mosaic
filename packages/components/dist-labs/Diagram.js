var f = Object.defineProperty;
var i = Object.getOwnPropertySymbols;
var m = Object.prototype.hasOwnProperty,
  n = Object.prototype.propertyIsEnumerable;
var t = (r, a, e) =>
    a in r ? f(r, a, { enumerable: !0, configurable: !0, writable: !0, value: e }) : (r[a] = e),
  s = (r, a) => {
    for (var e in a || (a = {})) m.call(a, e) && t(r, e, a[e]);
    if (i) for (var e of i(a)) n.call(a, e) && t(r, e, a[e]);
    return r;
  };
var d = (r, a) => {
  var e = {};
  for (var o in r) m.call(r, o) && a.indexOf(o) < 0 && (e[o] = r[o]);
  if (r != null && i) for (var o of i(r)) a.indexOf(o) < 0 && n.call(r, o) && (e[o] = r[o]);
  return e;
};
import p, { useEffect as g } from 'react';
import { Mermaid as l } from 'mdx-mermaid/lib/Mermaid';
import u from 'warning';
var c;
function w(e) {
  var o = e,
    { className: r } = o,
    a = d(o, ['className']);
  return (
    g(() => {
      u(c, 'Diagram component is an alpha Lab component and not ready for Production use'),
        (c = !0);
    }, []),
    p.createElement('div', { className: r }, p.createElement(l, s({}, a)))
  );
}
export { w as Diagram };
