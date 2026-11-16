# tasks/

Every practice task on the site is one JSON file in here. A page reads
`tasks/index.json` to know which tasks exist and in what order, then
fetches a task's own file when a student opens it. No build step: add a
file, add a line to the index, done.

```
tasks/
  index.json    the list of tasks, grouped by week (order matters)
  web/          types "html-editor", "inspect" and "walkthrough", weeks 6 and 7
```

The Python and AI tasks get folders of their own when they move in.

`tests/tasks.test.js` checks that the index and the files agree. Run it
from the repository folder with `node --test`.

## index.json

```json
{
  "weeks": [
    {
      "week": 6,
      "title": "The frontend: HTML, CSS and accessibility",
      "tasks": [
        {
          "id": "web-w6-01",
          "type": "html-editor",
          "file": "web/w6-01.json",
          "title": "Page structure and headings",
          "concept": "Elements, headings and the title tag"
        }
      ]
    }
  ]
}
```

`file` is relative to the `tasks/` folder. Spell it exactly as the file is
named: GitHub Pages treats `W6-01.json` and `w6-01.json` as two different
files, while a Mac finds either. `title` is repeated here so the task list
can be drawn without fetching every task file; it must be the same as the
title in the task's own file. `concept` is one short line shown under the
title in the task list.

## Fields every web task has

| field | meaning |
|---|---|
| `id` | unique; used in the page address (`practice-web.html?task=web-w6-01`) |
| `week` | the teaching week it belongs to |
| `type` | `html-editor`, `inspect` or `walkthrough`. The index entry carries the same `type` |
| `title` | the task's name, the same as in the index |
| `concepts` | short tags: the ideas the task practises |
| `brief` | what to do. It is the only instruction the student sees, so make it complete. Separate paragraphs with a blank line (`\n\n`). A sample between two lines of three backticks is shown as code |
| `vocabulary` | terms with a one-line gloss; shown beside the brief |
| `hints` | revealed one at a time. Two to four while the site is being rebuilt; three each after the task-by-task review |

Inside a sentence of a `brief`, a hint or a gloss, text between two
backticks is shown as code:

    "hints": ["Use `print()` to show the text."]

Anyone can read these files on GitHub, solutions included, so put nothing
secret in them.

## `html-editor`

```json
"starterHtml": "<!DOCTYPE html>…", "starterCss": "body { … }",
"checks": [
  { "label": "There is exactly one h1", "kind": "count", "selector": "h1", "exact": 1 },
  { "label": "At least three paragraphs", "kind": "count", "selector": "p", "min": 3 },
  { "label": "The page has a title", "kind": "title" },
  { "label": "The h1 is not black", "kind": "style", "selector": "h1", "property": "color", "notIn": ["rgb(0, 0, 0)"] },
  { "label": "Text is at least 18px", "kind": "style", "selector": "p", "property": "font-size", "min": 18 }
]
```

The checks run against the live preview every time it updates. `count`
takes `exact`, `min` and/or `max`; `style` reads the computed style of the
first matching element and takes `equals`, `notIn` (a list of values that
fail) or `min` (numeric, in px); `title` passes when `<title>` is not
empty. `solutionHtml` / `solutionCss` are for the teachers' page.

Three more kinds, added for the second round of tasks (w6-07 to w6-09):

```json
{ "label": "Every input has a label", "kind": "labelled", "selector": "input" },
{ "label": "Every image has alt text", "kind": "every", "selector": "img", "matches": "[alt]:not([alt=''])" },
{ "label": "Paragraph text has enough contrast", "kind": "contrast", "selector": "p", "min": 4.5 }
```

`labelled` passes when every form control matching `selector` is either
inside a `<label>` or has an `id` that some `<label for="…">` points at.
`every` passes when every element matching `selector` also matches the
CSS selector in `matches` (and there is at least one). `contrast` works
out the WCAG contrast ratio between the text colour of the first matching
element and the first solid background behind it (walking up its parents;
white if none) and passes at `min` or above: 4.5 is the rule for normal
text, 3 for large text.

## `inspect`

```json
"sample": "samples/cafe-site.html",
"problems": [
  { "id": "alt", "label": "An image has no alt text", "why": "model answer shown after Reveal" },
  { "id": "d1",  "label": "The page has no <title>", "decoy": true }
]
```

`displayUrl` (optional) is the address shown in the pretend browser
window around the sample page, e.g. `thecornercafe.example.com`; without
it the window shows the file path.

The sample page must mark each real problem with `data-flaw="…"` so
`samples/reveal.js` can outline it when the page is loaded with
`?reveal=1`. Items with `"decoy": true` are not problems on that page;
ticking one fails the check. Complete when every real problem is ticked
with a sentence of at least four words and no decoy is ticked.

The `data-flaw` value is also the key of the label `reveal.js` writes
under the outlined element, so a new kind of flaw needs a line in its
`LABELS` table. The kinds so far: `alt`, `heading`, `contrast`,
`divbutton`, `label` (the cafe, gym and library), then `badalt`,
`clickhere`, `tiny`, `colouronly` (the students' union page) and
`lowcontrast`, `noth`, `iconlink` (the repair shop). Each sample page has
its own look on purpose: a new one should not borrow another's
stylesheet, so students see that the same problems hide in very
different-looking sites.

## `walkthrough`

`steps` (each `{term, title, text}`: the term is shown in bold inside
the text), `matching` (each `{term, definition}`; definitions are shown in
a fixed shuffled order with a dropdown of all terms) and `writingPrompt`.
Complete when all matches are right and the writing has at least 15
words.

Optional wording, so the box at the top can be something other than an
address bar: `urlLabel` (default "Type a website address and press
Enter"), `urlPlaceholder` ("www.beds.ac.uk"), `goLabel` ("Go") and
`writingHint`, the advice added when the writing is too short ("Say what
it is, then what it does."). The login walkthrough (w7-02) uses all
four.
