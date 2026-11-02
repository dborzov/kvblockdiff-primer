#!/usr/bin/env python3
"""Quote front-matter scalar values (q, a, why, lede, title, nav) that contain ': ' or ' #' and are not quoted yet.
Usage: python3 scripts/fix-frontmatter-quotes.py content/<part>/*.md"""
import re, sys
pat = re.compile(r'^(\s*(?:- )?(?:q|a|why|lede|title|nav|group):\s)(.*)$')
for path in sys.argv[1:]:
    lines = open(path).read().split('\n')
    if lines[0] != '---': continue
    end = lines.index('---', 1)
    changed = False
    for i in range(1, end):
        m = pat.match(lines[i])
        if not m: continue
        val = m.group(2)
        if not val or val[0] in "'\"[{>|": continue
        if ': ' in val or ' #' in val or val.endswith(':'):
            lines[i] = m.group(1) + "'" + val.replace("'", "''") + "'"
            changed = True
    if changed:
        open(path, 'w').write('\n'.join(lines)); print('quoted:', path)
