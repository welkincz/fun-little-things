# Backlog

A daily routine takes the **top item**, ships it, and deletes it. Each one is a real change that fits in a single sitting. Later items can assume the ones above them have already shipped.

1. **Drum Kit — name the pads.** Show the instrument under each pad (Tom 1, Tom 2, Tom 3, Tom 4, Snare, Crash, Kick) in small type that sits outside the photo. Keep the letter as the big label.
2. **TinDog — swipe the quotes.** On the testimonial, a horizontal drag of at least 30px moves to the next quote (drag left) or the previous one (drag right). Keep the Previous and Next buttons.
3. **Guess My Number.** Add `guess/`, a Vite React rebuild of [05-Guess-My-Number](https://github.com/welkincz/05-Guess-My-Number): secret number from 1 to 20, score starts at 20, one point off for a miss, high score for the session, Again starts a new round. `npm ci && npm run build` writes `guess/dist` with relative asset paths. Add it to the README list as **Guess My Number** — Guess a number from 1 to 20. — https://fun-guess.pages.dev
4. **Drum Kit — volume.** One slider from quiet to full, default at 80%, applied to every new hit. It can forget the setting on refresh.
5. **TinDog — monthly or yearly.** A control on the pricing section switches the paid plans between per month and per year. A year is the monthly price times 10. Free stays Free. Nothing is charged.
6. **Dice.** Add `dice/`: two dice, Roll button and the space bar, each face shown plus the total. Same build contract as the other tools. README line: **Dice** — Roll two dice. — https://fun-dice.pages.dev
7. **Drum Kit — record a take.** Record stores up to 16 hits and the gap before each one, with any gap longer than 1.5 seconds cut down to 1.5. Play replays that take on the pads. Starting Record again clears the previous take.
8. **TinDog — Labrador first on a phone.** Below 700px, stack the plans with Labrador on top. At 700px and up, keep Chihuahua, Labrador, Mastiff.
9. **Countdown.** Add `countdown/`: presets for 1, 5, and 25 minutes, plus Start, Pause, and Reset. At zero, beep with the Web Audio API (no audio file) and show "Time's up". README line: **Countdown** — A timer with three presets. — https://fun-countdown.pages.dev
10. **Drum Kit — one hit per key press.** Ignore the browser's auto-repeat so holding a key down plays that drum once, until the key is released.
11. **Home page.** Add `home/`: a single page that lists every tool with the same one-line description and live link as the README. Same build contract. README can point at https://fun-little-things.pages.dev
12. **TinDog — sign-up is a demo.** Each Sign up button opens a dialog that says there is no account because this is a demo. Escape and a Close button dismiss it, and focus returns to the button that opened it.
