// Formatting of reference-setting values (data/settings.yaml), shared by the build and the client.
// eleventy.config.js inlines this very file into assets/gen/site-data.js as KV.fmt (it only strips
// the "export" keywords), so keep it plain ES2017: no imports, no other exports, no Node APIs.
//
//   formatValue(640, "bytes")            -> "640 B"      formatValue(null, "int") -> "not measured"
//   fillTemplate("{d} elements", v, k)   -> "640 elements"   ({key} looked up in v, formatted by k[key].fmt)
//   templateKeys("{d} of {e}")           -> ["d", "e"]

export const NOT_MEASURED = "not measured";
export const FORMATS = ["int", "bytes", "pct", "ms", "gbps", "gb", "text"];

const THIN = " ";   // thin space, the site's thousands separator

function trim0(s) { return s.replace(/\.0+$/, ""); }

export function groupInt(n) {
  const s = String(Math.round(Math.abs(n)));
  const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, THIN);
  return (n < 0 ? "−" : "") + grouped;
}

export function formatValue(v, fmt) {
  if (v == null || v === "") return NOT_MEASURED;
  switch (fmt) {
    case "int": return typeof v === "number" ? groupInt(v) : String(v);
    case "bytes": {
      const n = Number(v);
      if (n < 1e3) return groupInt(n) + " B";
      if (n < 1e6) return trim0((n / 1e3).toFixed(1)) + " KB";
      if (n < 1e9) return trim0((n / 1e6).toFixed(1)) + " MB";
      if (n < 1e12) return trim0((n / 1e9).toFixed(1)) + " GB";
      return trim0((n / 1e12).toFixed(1)) + " TB";
    }
    case "pct": return trim0((Number(v) * 100).toFixed(1)) + " %";
    case "ms": return trim0(Number(v).toFixed(1)) + " ms";
    case "gbps": return trim0(Number(v).toFixed(1)) + " GB/s";
    case "gb": return trim0(Number(v).toFixed(1)) + " GB";
    case "text": return String(v);
    default: return String(v);
  }
}

// The {key} placeholders of a template, in order of first appearance.
export function templateKeys(tpl) {
  const out = [];
  String(tpl == null ? "" : tpl).replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (m, k) => { if (!out.includes(k)) out.push(k); return m; });
  return out;
}

// Fill a template's {key} placeholders from one setting's values, formatted by the key table.
// A null value reads "not measured"; when every placeholder is null the whole line collapses to it.
// An unknown key is left as written (the build validates templates, so this only guards the client).
export function fillTemplate(tpl, values, keys) {
  const s = String(tpl == null ? "" : tpl);
  const known = templateKeys(s).filter(k => keys && keys[k]);
  if (known.length && known.every(k => values == null || values[k] == null || values[k] === "")) return NOT_MEASURED;
  return s.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (m, k) => {
    const spec = keys && keys[k];
    if (!spec) return m;
    return formatValue(values ? values[k] : null, spec.fmt);
  });
}
