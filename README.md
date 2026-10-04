# Zombie Slayer

A browser story set in Millford on day 3 of the outbreak. Your mom has Leo and is heading for the army bridge. Your sister Mia found you at the community center. The dead are already learning your voices.

You walk, fight, and choose. A bite does not get better. Between the fights, the dark talks back. The sword from Saturday class is still locked at the school.

## Play

On Windows, double-click `start.bat`. It opens [http://localhost:8123](http://localhost:8123) and serves this folder with Python. Close that window to stop the game.

From a terminal in this folder:

```
python -m http.server 8123
```

Then open [http://localhost:8123](http://localhost:8123). The game needs that local server. Opening `index.html` as a file will not load it.

Python 3 is the only install. The 3D view uses the copy of Three.js in `vendor/`. There is no build step.

## Controls

- **WASD** move
- **Arrow keys** or the **mouse** turn
- **1** pipe, **2** knife, **3** sword once you find it
- **Click** cuts
- **Right mouse** blocks
- **Space** dodges
- **E** approaches
- **J** journal
- **C** every choice
- **Esc** pauses

**People** is on the title screen and in the pause menu. It lists who you can still meet, and what has started using their voices. Arrow keys move through the names.

**Every choice** keeps what you said and what it did. Open it from the journal, the pause menu, or the ending. Older saves rebuild that list from the journal.

Sound uses the browser's own voices. Each person keeps one voice for the road, and questions, shouts, and short lines change how they speak.

## Save

Progress stays in this browser. **Begin** asks before it erases the saved road. The next story starts on day 3, at the community center.

If you fall, you can stand back up in the same hour. What you were holding stays where it fell. The nick in the edge stays too, and so does whatever heard you drop.

The name on the title screen is what they call you. It starts as Alex.
