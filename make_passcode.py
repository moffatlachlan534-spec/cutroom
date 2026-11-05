"""Set (or clear) the site's passcode: python make_passcode.py "your code"   |   python make_passcode.py --off
The code is stored only as a hash. It keeps strangers who find the link out of the page;
nobody's video is ever uploaded either way (everything runs on the visitor's own device)."""
import hashlib, re, sys
code = None if len(sys.argv) < 2 or sys.argv[1] == "--off" else sys.argv[1]
h = hashlib.sha256(code.strip().lower().encode()).hexdigest() if code else ""
p = "config.js"
s = open(p, encoding="utf-8").read()
s = re.sub(r'PASSCODE_HASH = "[^"]*"', f'PASSCODE_HASH = "{h}"', s)
open(p, "w", encoding="utf-8").write(s)
print("passcode set" if code else "passcode removed")
