# ABE Nest Health & Wellbeing Website

This is a responsive, static HTML/CSS/JavaScript prototype for ABE Nest: a Rwanda-rooted health education and wellbeing platform. It has no build step or package dependencies.

## Files

- `index.html` — page content, navigation, learning resources, nutrition guidance, and illustrations
- `style.css` — brand styles, responsive layouts, accessibility states, and motion preferences
- `script.js` — resource and food filters, quiz, on-page information guide, and temporary cycle/check-in interactions

The homepage uses the project illustrations `digital.jpg` and `wellness 2.jfif` from the project root. The bilingual video section uses `VIDEO1.MP4` (English) and `VISEO.mp4` (Kinyarwanda), also in the project root. Keep those files, `abenest pictures/`, and `kit/` in place when hosting the site.

## How to run it

1. Open the folder in Visual Studio Code.
2. Install the **Live Server** extension.
3. Right-click `index.html`.
4. Select **Open with Live Server**.

You can also double-click `index.html`, but Live Server is better while editing.

## Static hosting

The site has no build step. Upload this folder with `index.html` at the host's document root, and keep the `abenest pictures/` and `kit/` folders and their exact names intact. Keep `VIDEO1.MP4` and `VISEO.mp4` alongside `index.html` so the English and Kinyarwanda players and download links work. The page's internal navigation uses section anchors, so it can be hosted as a single-page static site.

## Interactions and privacy

Health topics, filters, FAQs, quiz, and educational articles work entirely in the browser. Cycle estimates and optional wellbeing reflections are held only in the open page and are not saved or sent. The optional calorie estimate is for adults only and is educational, not a diet prescription. An older version of the site may have saved cycle data in this browser; this version does not read it, and the cycle section offers a control to remove that older saved entry.

ABE Nest does not require an account to browse. There is no authentication or database. The contact and Join forms open WhatsApp with the submitted details prefilled for +250 787 248 328. The visitor must review and send the draft in WhatsApp; the website does not send or store form submissions on its own. A direct server-to-WhatsApp submission would require a secure backend and WhatsApp Business Platform/API setup. Do not enter passwords or sensitive information. Community polls and “save for this visit” controls do not submit or persist data.

The ABE Nest Guide uses prewritten, local responses; it is not AI, medical care, or an emergency service. Messages stay in the browser unless a deployment configures `window.ABENEST_CHAT_ENDPOINT`. If configured, the guide first displays an unchecked consent option; a message is sent to that endpoint only after the visitor opts in. A real deployment still needs a secure, reviewed backend, clear privacy terms, and safe health-content moderation.

## Before public launch

ABE Nest is an educational platform, not a substitute for a qualified health professional. Have health information reviewed by qualified people, cite and periodically check reliable sources, and verify local support and emergency-service details before publishing them. The following also require additional setup:

- secure authentication
- a secure backend for any form or account submission
- privacy policy, consent, and data-retention procedures
- verified Rwanda-based support information
- moderation and support-response workflows
- accessible Kinyarwanda translations and local review

Do not present calendar estimates as contraception or a diagnosis, and do not publish unverified hotline numbers, hospitals, legal resources, medical claims, or impact statistics.
