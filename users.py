"""Cutroom Web logins - Lachlan is the admin; everyone else gets their own personal code.

  python users.py list                      who has access
  python users.py add "Sammy"               make Sammy a code (a random, easy-to-type one)
  python users.py add "Sammy" --code xyz    ... or choose the code yourself
  python users.py remove "Sammy"            take Sammy's access away (locked out on their next visit)
  python users.py publish                   put the change on the live site (git push)

Only a hash of each code goes in config.js (which is public). The plain codes are kept in
codes.txt on this laptop only - it is never uploaded (.gitignore), so you can look them up later.
This keeps strangers who find the link out; it is not bank-level security, and nobody's
video is ever uploaded either way.
"""
import argparse, hashlib, json, os, re, secrets, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(HERE, "config.js")
CODES = os.path.join(HERE, "codes.txt")
WORDS = ["tiger", "maple", "coral", "river", "comet", "cedar", "ember", "lotus", "orbit", "pixel",
         "storm", "frost", "amber", "delta", "lunar", "otter", "piano", "quill", "solar", "tulip",
         "viper", "wagon", "zebra", "bison", "cobra", "eagle", "flint", "gecko", "heron", "ivory"]


def h(code):
    return hashlib.sha256(code.strip().lower().encode()).hexdigest()


def load():
    s = open(CONFIG, encoding="utf-8").read()
    m = re.search(r"export const USERS = (\[.*?\]);", s, re.S)
    return json.loads(m.group(1)) if m else []


def save(users):
    s = open(CONFIG, encoding="utf-8").read()
    body = json.dumps(users, indent=1) if users else "[]"
    s = re.sub(r"export const USERS = \[.*?\];", lambda _: f"export const USERS = {body};", s, flags=re.S)
    open(CONFIG, "w", encoding="utf-8").write(s)


def codes():
    out = {}
    if os.path.exists(CODES):
        for ln in open(CODES, encoding="utf-8"):
            if ":" in ln and not ln.startswith("#"):
                k, v = ln.split(":", 1)
                out[k.strip()] = v.strip()
    return out


def save_codes(c):
    with open(CODES, "w", encoding="utf-8") as f:
        f.write("# Cutroom Web personal codes - on this laptop only, never uploaded. Name: code\n")
        for k, v in c.items():
            f.write(f"{k}: {v}\n")


def new_code(taken):
    while True:
        c = f"{secrets.choice(WORDS)}-{secrets.randbelow(9000) + 1000}"
        if h(c) not in taken:
            return c


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("action", choices=["list", "add", "remove", "publish"])
    ap.add_argument("name", nargs="?")
    ap.add_argument("--code")
    ap.add_argument("--admin", action="store_true", help="mark this person as the admin")
    a = ap.parse_args()
    users, c = load(), codes()

    if a.action == "list":
        if not users:
            print("No logins: anyone with the link can use the site.")
        for u in users:
            print(f"{u['name']:<16} {'(admin) ' if u.get('admin') else ''}code: {c.get(u['name'], '(not on this laptop)')}")
        return

    if a.action in ("add", "remove") and not a.name:
        sys.exit("Give a name, e.g. python users.py add \"Sammy\"")

    if a.action == "add":
        name = a.name.strip()
        if any(u["name"].lower() == name.lower() for u in users):
            sys.exit(f"{name} already has a code (python users.py list). Remove them first to give a new one.")
        code = (a.code or new_code({u["hash"] for u in users})).strip()
        if len(code) < 6:
            sys.exit("Codes need at least 6 characters.")
        if any(u["hash"] == h(code) for u in users):
            sys.exit("Someone else already has that code - pick another.")
        users.append({"name": name, "hash": h(code), **({"admin": True} if a.admin else {})})
        c[name] = code
        save(users); save_codes(c)
        print(f"Added {name}. Their code: {code}")
        print("Now run: python users.py publish   (or choose 'Publish' in USERS.bat)")

    elif a.action == "remove":
        keep = [u for u in users if u["name"].lower() != a.name.strip().lower()]
        if len(keep) == len(users):
            sys.exit(f"No one called {a.name} (python users.py list).")
        if users and not any(u.get("admin") for u in keep) and keep:
            sys.exit("That would remove the admin - add another admin first.")
        c.pop(next(u["name"] for u in users if u not in keep), None)
        save(keep); save_codes(c)
        print(f"Removed {a.name}. Now run: python users.py publish")

    elif a.action == "publish":
        git = lambda *x: subprocess.run(["git", "-C", HERE, *x], capture_output=True, text=True)
        git("add", "config.js")
        r = git("-c", "user.name=Lachlan", "-c", "user.email=moffatlachlan534@gmail.com",
                "commit", "-m", "Update site logins")
        if "nothing to commit" in (r.stdout + r.stderr):
            print("No login changes to publish.")
        p = subprocess.run(["git", "-C", HERE, "push", "origin", "main"], text=True)
        print("Published - live in about a minute." if p.returncode == 0 else
              "Couldn't publish (GitHub sign-in?). Ask Claude to put it online.")


if __name__ == "__main__":
    main()
