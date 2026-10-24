# Your desk

On maps with desks, every employee can have a desk of their own and make it feel like home.

## Getting a desk

- **The first time you enter** a map that has a free desk you can take, a message offers to find one for you. Choose
  **Find me a desk** and your character walks to the nearest free desk. Choose **Not now** and you will not be asked
  again in this browser.
- **At any time**, open the map menu and choose **Find a free desk** (it is shown only while you have no desk and one
  is free for you).
- Walking into a free desk opens the usual question: **Claim this desk?** Confirm, and it is yours.

You can have one desk. To pick another, release yours first (map menu, **Unclaim my desk**).

A desk may be assigned by an administrator instead (it cannot be claimed by anybody else), reserved for a team, or taken
out of service. In those cases the game says so, and it is the administrator who changes it (see the AdminSpace
`docs/DESKS.md`).

## Decorating your desk

After you claim a desk, a message offers **Decorate my desk**. You can also use it from the map menu at any time.

1. The object picker opens. **Drag an object** from the picker and drop it on your desk. (Clicking an object and then
   clicking on the desk still works.)
2. Drag objects on your desk to move them; delete them with the trash tool.
3. You can only place, move and delete objects **on your own desk**. Dropping an object anywhere else says so, and
   nothing changes for other people.

When you release your desk, what you put on it stays for the next person or for an administrator to clear.

## Sitting down

Chairs, armchairs, sofas, stools and benches placed on the map are seats.

- Walk next to a seat: a message offers **[SPACE] to sit down** (on a phone or tablet, touch the message). Your character
  sits on it, facing the way the seat faces, and everybody in the office sees you sitting.
- **Go to my desk** (map menu, or <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>D</kbd>) walks you to your desk and sits you on its
  chair. If your desk is in another map of the office, it takes you there first.
- Clicking a desk opens its card: **Sit here** when you may sit there, **Stand up** while you sit.
- Walk away (any arrow key, or clicking somewhere) to stand up, or press **[SPACE]** again.

Who may sit where is decided by the server, not by your browser:

- one person per seat;
- the chair of a desk that belongs to someone is theirs alone (the game tells you whose desk it is);
- a desk an administrator keeps for someone for a while (a reservation) is for that person during that time;
- a free desk, or a hot desk, is open to anyone it is open to.

If your desk is given to someone else while you sit at it, you stand up. Reloading the page or leaving also frees your
seat.

## Desks in the office

A small sign above each desk tells, even while its owner is away:

| Sign               | Meaning                                                              |
| ------------------ | -------------------------------------------------------------------- |
| A name, green      | The desk of that person, and they are at it now                      |
| A name, grey       | The desk of that person, who is not at it                            |
| A name, blue-green | Nobody owns this desk; this person sits at it now                    |
| **Free desk**      | Nobody owns it: claim it, or just sit there                          |
| **Hot desk**       | Nobody owns it: anyone it is open to sits there while a seat is free |
| **Kept for …**     | An administrator keeps it for someone right now                      |
| **Out of service** | Nobody can take it                                                   |

Desks come in three kinds, set by an administrator: **personal** desks (one owner, claimed or given), **hot** desks
(nobody owns them) and **shared** desks (a few named people, for instance colleagues who come on different days).

## Booking a hot desk

Click a hot desk to see its card. Under **Book this desk**, pick **Next 2 hours**, **Today until 19:00** or **Tomorrow
9:00–19:00** (in your own time). A choice that cannot be booked is greyed out; hover it to see why (someone booked part
of that time, or you already booked another desk then). While your booking lasts, the sign above the desk says
**Kept for** your name, and only you can sit there; if someone is still sitting there when it begins, they give you the
seat as soon as you sit down. **Your bookings** on the card lists the bookings you hold on that desk, with **Cancel**.

The rules are checked by the server, whatever the browser sends: you book only in your own name, only hot desks that are
in service and open to you, at most 12 hours at a time, up to 14 days ahead, never over someone else's booking, never two
desks at the same time, and at most 10 bookings at once. Administrators can still keep any desk for anyone from the map
editor or from AdminSpace.

## Focus, local time and calendar

- **Focus** (profile menu, under your status): choose 25, 50 or 90 minutes. You show as _Do not disturb_ until then, even
  while walking around, and others see "🎧 Focusing" on your name unless you set a status of your own. **End** stops it.
- **Local time**: clicking someone shows what time it is for them, from the time zone of their browser.
- **What you listen to, what you work on**: if you chose, in AdminSpace (_My integrations_), to share the music you play on
  Spotify or your recent GitHub/GitLab activity, people who click you see "🎵 title — artist" or "💻 Working on
  repository". It is read every minute; turning sharing off removes it.
- **Tell me when free**: click someone who is busy, away, in a meeting or in a silent zone and choose **Tell me when free**. As soon as they
  are available again, on any map of the world, a message offers to go to them, wave or write to them (with a desktop
  notification when WorkAdventure is in the background). It is said once; **Stop waiting** cancels it, and a wait is
  forgotten after 8 hours.
- **Calendar**: if your organization's back office lets you connect your Google or Microsoft calendar (AdminSpace:
  _My integrations_), your meetings appear in the agenda with reminders, and you show as _Busy_ during them. The back
  office reads the calendar: your calendar tokens never reach the browser or WorkAdventure.

## Signing in

If your organization asks you to sign in, the first visit shows a welcome screen with **Sign in**. Use the account your
administrator created for you. After signing in you come back to the map you were opening.
