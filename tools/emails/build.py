"""Builds the Jamivia email templates into /emails.

Run:  python3 tools/emails/build.py
Each email is a standalone, table-based HTML file with inline styles that works in Gmail, Outlook and Apple Mail.
Personalisation and unsubscribe tags use Klaviyo syntax. Swap them if another platform is chosen.
"""
import html, os, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "emails"
SITE = "https://barcoleonfx-hub.github.io/jamivia/"
JAR = SITE + "img/jamivia-jar.png"
FOUNDER = SITE + "img/founder.jpg"

GREEN, DEEP, GOLD, INK, MUTED, PAPER, STONE = "#1E392C", "#11231A", "#CDB07A", "#17241D", "#56635B", "#F6F5F0", "#E9E7E0"
SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"
SANS = "'Jost', 'Helvetica Neue', Helvetica, Arial, sans-serif"
NAME = "{{ first_name|default:'there' }}"

def p(text):
    return f'<p style="margin:0 0 18px;font-family:{SANS};font-size:16px;line-height:1.65;color:{INK};">{text}</p>'

def h(text):
    return f'<h1 style="margin:0 0 22px;font-family:{SERIF};font-weight:400;font-size:38px;line-height:1.1;color:{GREEN};">{text}</h1>'

def btn(label, url):
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 26px;"><tr>'
            f'<td style="background:{GREEN};border-radius:999px;">'
            f'<a href="{url}" style="display:inline-block;padding:16px 30px;font-family:{SANS};font-size:13px;letter-spacing:2.5px;'
            f'text-transform:uppercase;color:#EEEBE1;text-decoration:none;">{label} &rarr;</a></td></tr></table>')

def box(title, rows):
    items = "".join(f'<tr><td style="padding:10px 0;border-bottom:1px solid #E2DED3;font-family:{SANS};font-size:15px;color:{INK};">{a}</td>'
                    f'<td align="right" style="padding:10px 0;border-bottom:1px solid #E2DED3;font-family:{SANS};font-size:15px;color:{MUTED};">{b}</td></tr>'
                    for a, b in rows)
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 26px;background:{STONE};border-radius:16px;">'
            f'<tr><td style="padding:22px 24px;"><div style="font-family:{SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#9A7843;margin-bottom:8px;">{title}</div>'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{items}</table></td></tr></table>')

def steps(items):
    out = ""
    for i, (t, d) in enumerate(items, 1):
        out += (f'<tr><td valign="top" style="width:46px;padding:0 0 18px;font-family:{SERIF};font-size:30px;line-height:1;color:#9A7843;">0{i}</td>'
                f'<td valign="top" style="padding:0 0 18px;font-family:{SANS};font-size:15px;line-height:1.6;color:{INK};"><b style="font-weight:500;">{t}</b><br>{d}</td></tr>')
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 14px;">{out}</table>'

def signoff(note=""):
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px 0 4px;"><tr>'
            f'<td valign="middle" style="padding-right:16px;"><img src="{FOUNDER}" width="64" height="80" alt="Dr Mohammed Jameel" style="display:block;border-radius:10px;object-fit:cover;"></td>'
            f'<td valign="middle" style="font-family:{SERIF};font-style:italic;font-size:24px;color:{GREEN};line-height:1.1;">Dr Mohammed Jameel'
            f'<div style="font-family:{SANS};font-style:normal;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:{MUTED};margin-top:6px;">Dentist &middot; Founder, Jamivia</div></td></tr></table>'
            + (f'<p style="margin:18px 0 0;font-family:{SANS};font-size:14px;line-height:1.6;color:{MUTED};"><i>{note}</i></p>' if note else ""))

def wrap(subject, preheader, body, show_jar=True):
    jar = (f'<tr><td align="center" style="background:{GREEN};padding:6px 32px 0;">'
           f'<img src="{JAR}" width="260" alt="Jamivia Daily Gut Formula jar" style="display:block;width:260px;max-width:70%;height:auto;"></td></tr>') if show_jar else ""
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting"><title>{html.escape(subject)}</title>
<!--[if mso]><style>*{{font-family:Georgia,serif!important}}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:{STONE};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{html.escape(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{STONE};"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:{PAPER};border-radius:22px;overflow:hidden;">
  <tr><td align="center" style="background:{GREEN};padding:30px 32px 22px;">
    <div style="font-family:{SERIF};font-size:30px;letter-spacing:10px;color:#EEEBE1;padding-left:10px;">JAMIVIA</div>
    <div style="font-family:{SANS};font-size:10px;letter-spacing:3.5px;text-transform:uppercase;color:{GOLD};margin-top:6px;">Daily Gut Formula</div>
  </td></tr>
  {jar}
  <tr><td style="padding:40px 40px 18px;">{body}</td></tr>
  <tr><td style="background:{DEEP};padding:28px 40px;">
    <div style="font-family:{SERIF};font-style:italic;font-size:20px;color:{GOLD};margin-bottom:12px;">Foundation before intervention.</div>
    <div style="font-family:{SANS};font-size:11.5px;line-height:1.7;color:#AEB8AE;">
      Food supplement. Do not exceed the recommended daily intake. Food supplements should not be used as a substitute for a varied and balanced diet and a healthy lifestyle.
      If you are pregnant, breastfeeding, taking medication or under medical supervision, consult your doctor or pharmacist before use.<br><br>
      Jamivia &middot; [Company name &amp; registered address] &middot; <a href="{SITE}" style="color:{GOLD};">Website</a><br>
      You're receiving this because you signed up at jamivia. <a href="{{% unsubscribe_url %}}" style="color:{GOLD};">Unsubscribe</a> &middot; <a href="{{% manage_preferences_url %}}" style="color:{GOLD};">Email preferences</a>
    </div>
  </td></tr>
</table></td></tr></table>
</body></html>'''

SCOOP = [("L-Glutamine", "4.99 g"), ("PHGG (guar fibre)", "4.99 g"), ("Glycine", "999 mg"), ("Taurine", "499 mg"), ("L-Carnosine", "59 mg"), ("Zinc", "16 mg &middot; 160% NRV")]

EMAILS = [
  # ---------------- WAITLIST ----------------
  dict(file="waitlist-1-welcome", flow="Waitlist", timing="Immediately after sign-up",
       subject="You're on the list", preheader="A short note from Dr Jameel, and what happens next.",
       body=h(f"Welcome, {NAME}.") +
         p("Thank you for joining the Jamivia waitlist. You'll hear about launch before anyone else, and you'll get first access to the first production batch.") +
         p("I'm a dentist. At 27 I was diagnosed with a long-term digestive condition, and I spent the years that followed reading everything I could about the gut. What I kept finding on the shelves were products crowded with sweeteners, fillers and hidden blends.") +
         p("Jamivia is the opposite: six ingredients, every dose on the label, nothing artificial. Over the next few weeks I'll send you a couple of short notes on what's inside and why.") +
         btn("See what's inside", SITE + "#inside") + signoff("P.S. Reply to this email and tell me what you've tried before. I read every reply.")),
  dict(file="waitlist-2-story", flow="Waitlist", timing="Day 3",
       subject="Why there are no probiotics in Jamivia", preheader="Most gut products add or remove something. We started somewhere else.",
       body=h("Probiotics add. Antimicrobials remove. Cleanses push.") +
         p(f"Hi {NAME},") +
         p("Most gut products ask your body to change something. When I was designing Jamivia I wanted to start somewhere quieter: a short list of well-understood nutrients you can take every day, without overhauling your routine.") +
         p("That's why Jamivia has no probiotics, no antimicrobials and no stimulants. It isn't a protocol or a 14-day reset. It's one scoop a day, for as long as it suits you.") +
         btn("Read our philosophy", SITE + "#manifesto") + signoff()),
  dict(file="waitlist-3-formula", flow="Waitlist", timing="Day 7",
       subject="Every milligram, on the label", preheader="The full formula, with nothing hidden.",
       body=h("Six ingredients. Nothing hidden.") +
         p(f"Hi {NAME}, here is exactly what's in every 11.6 g scoop of Restore:") +
         box("Per 11.6 g scoop", SCOOP) +
         p("Zinc contributes to the normal function of the immune system and has a role in the process of cell division.") +
         p("No artificial sweeteners, flavourings or colours, and no excipients. The guar fibre dissolves almost clear and the glycine adds a light natural sweetness, so it takes on the taste of whatever you mix it into.") +
         btn("Explore the formula", SITE + "#inside") + signoff()),
  dict(file="waitlist-4-launch", flow="Waitlist", timing="Launch day (one-off campaign)",
       subject="It's here: Jamivia Restore is live", preheader="First access for the waitlist, before we tell anyone else.",
       body=h(f"{NAME}, it's ready.") +
         p("The first production batch of Jamivia Restore has arrived, and as promised, you're hearing about it first.") +
         p("[Launch offer, e.g. waitlist price or free gift. Client to confirm.]") +
         btn("Shop Restore", SITE + "#shop") +
         p("Subscribers get a fresh tub every 30 days and can pause or cancel any time.") + signoff()),
  # ---------------- ABANDONED BASKET ----------------
  dict(file="basket-1-reminder", flow="Abandoned basket", timing="1 hour after leaving checkout",
       subject="Your Restore is waiting", preheader="We saved your basket for you.",
       body=h("Still thinking it over?") +
         p(f"Hi {NAME}, you left Jamivia Restore in your basket. We've kept it for you.") +
         box("In your basket", [("Jamivia Restore &middot; 348 g", "{{ event.ItemPrice|default:'' }}"), ("Servings", "30"), ("Delivery", "Free UK delivery on subscriptions")]) +
         btn("Return to your basket", SITE + "#shop") +
         p("Questions before you buy? Just reply. A real person reads every message.")),
  dict(file="basket-2-questions", flow="Abandoned basket", timing="24 hours later (if still no order)",
       subject="The three questions people ask before buying", preheader="Taste, how to start, and what's actually inside.",
       body=h("Before you decide.") +
         p(f"Hi {NAME}, these are the questions we hear most:") +
         steps([("What does it taste like?", "Close to neutral. No sweeteners or flavourings, so it takes on the taste of whatever you mix it into."),
                ("How do I start?", "Half a scoop a day for the first week, then a full scoop. Stir into 200–250 ml of water or a cold drink."),
                ("What's in it?", "Six ingredients, every dose on the label: L-glutamine, PHGG, glycine, taurine, L-carnosine and zinc.")]) +
         btn("Complete your order", SITE + "#shop") + signoff()),
  dict(file="basket-3-founder", flow="Abandoned basket", timing="72 hours later (final)",
       subject="A note from Dr Jameel", preheader="Why I made Jamivia the way I did.",
       body=h("Simple enough to trust. Honest enough to check.") +
         p(f"Hi {NAME},") +
         p("I made Jamivia because I couldn't find the product I wanted when I needed it: something quiet, transparent and easy to take every day. Every dose is printed on the label, every batch is traceable, and it's made here in the UK.") +
         p("[Risk reversal, e.g. money-back guarantee. Client to confirm before sending.]") +
         btn("Return to your basket", SITE + "#shop") + signoff("This is the last reminder we'll send about your basket.")),
  # ---------------- POST-PURCHASE ----------------
  dict(file="welcome-1-how-to-start", flow="Post-purchase welcome", timing="Day 1 (on dispatch or delivery)",
       subject="How to start with Jamivia", preheader="Thirty seconds, once a day. Here's the routine.",
       body=h(f"Welcome to Jamivia, {NAME}.") +
         p("Thank you for your order. Here's how to get the most from your first tub:") +
         steps([("Start gently", "Take half a scoop a day for the first week."),
                ("Stir, don't heat", "Mix into 200–250 ml of water or your usual cold drink. Not into hot drinks."),
                ("Keep it consistent", "Same time each day. Consistency matters more than timing.")]) +
         p("Your batch number is printed on the base of the tub. You'll be able to look up its certificate of analysis on our website.") +
         btn("View the daily ritual", SITE + "#top") + signoff("Any questions at all, just reply.")),
  dict(file="welcome-2-full-scoop", flow="Post-purchase welcome", timing="Day 7",
       subject="Time to move up to a full scoop", preheader="Week one done. Here's what's next.",
       body=h("Week one, done.") +
         p(f"Hi {NAME}, you've had a week of half scoops. If it's suited you, today's the day to move up to the full scoop: about 11.6 g, one level scoop.") +
         box("Your full daily scoop", SCOOP) +
         p("Tip: keep the tub somewhere you'll see it every morning, next to the kettle or your water glass. It's the easiest way to make it a habit.") +
         p("How are you finding the taste and the routine? Reply and let me know. Your feedback shapes what we do next.") + signoff()),
  dict(file="welcome-3-reorder", flow="Post-purchase welcome", timing="Day 21 (one-time buyers only)",
       subject="About a week left in your tub", preheader="Keep your routine going without a gap.",
       body=h("Running low?") +
         p(f"Hi {NAME}, if you've been taking Jamivia daily, you've got roughly a week left in your tub.") +
         p("To keep your routine going without a gap, reorder now, or switch to a subscription: a fresh tub every 30 days, free UK delivery, pause or cancel any time.") +
         btn("Reorder Restore", SITE + "#shop") +
         p("Already reordered? Thank you. Ignore this one.") + signoff()),
]

def main():
    OUT.mkdir(exist_ok=True)
    cards = ""
    flow = None
    for e in EMAILS:
        (OUT / f"{e['file']}.html").write_text(wrap(e["subject"], e["preheader"], e["body"]), encoding="utf-8")
        if e["flow"] != flow:
            flow = e["flow"]; cards += f'<h2>{flow}</h2>'
        cards += (f'<article><div class="meta"><span>{e["timing"]}</span><b>{html.escape(e["subject"])}</b><i>{html.escape(e["preheader"])}</i>'
                  f'<a href="{e["file"]}.html">Open full email</a></div><iframe src="{e["file"]}.html" loading="lazy" title="{html.escape(e["subject"])}"></iframe></article>')
    (OUT / "index.html").write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jamivia Emails</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;1,400&family=Jost:wght@300;400&display=swap">
<style>body{{margin:0;background:#E6E5DE;color:#17241D;font-family:Jost,system-ui,sans-serif;font-weight:300}}
header{{background:#1E392C;color:#EEEBE1;padding:56px max(16px,5vw) 40px}} header h1{{font-family:'Cormorant Garamond',serif;font-weight:400;font-size:clamp(2.4rem,5vw,4rem);margin:0}}
header p{{color:#AEB8AE;max-width:44em}} main{{padding:24px max(16px,5vw) 80px}} h2{{font-family:'Cormorant Garamond',serif;font-weight:400;font-size:2.4rem;margin:48px 0 16px}}
article{{display:grid;grid-template-columns:300px 1fr;gap:24px;background:#F1F0EA;border:1px solid rgba(23,36,29,.12);border-radius:22px;padding:20px;margin-bottom:16px}}
.meta{{display:grid;gap:8px;align-content:start}} .meta span{{font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:#9A7843}} .meta b{{font-family:'Cormorant Garamond',serif;font-weight:400;font-size:1.7rem;line-height:1.1}}
.meta i{{color:#56635B;font-size:.92rem}} .meta a{{color:#1E392C;font-size:.85rem}} iframe{{width:100%;height:640px;border:0;border-radius:14px;background:#E9E7E0}}
@media (max-width:820px){{article{{grid-template-columns:1fr}}}}</style></head><body>
<header><h1>Jamivia email flows</h1><p>Waitlist, abandoned basket and post-purchase series. Copy matches spec JMV02 and avoids unauthorised health claims. Text in [square brackets] needs a client decision before sending.</p></header>
<main>{cards}</main></body></html>''', encoding="utf-8")
    print(f"built {len(EMAILS)} emails into {OUT}")

if __name__ == "__main__":
    main()
